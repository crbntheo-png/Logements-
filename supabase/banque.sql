-- Banque via Pennylane : le serveur lit les opérations du compte et les range par espace.
create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

create table if not exists public.banque (
  espace_id uuid not null references public.espaces(id) on delete cascade,
  tx_id bigint not null,
  date date not null,
  montant numeric(12,2) not null,
  libelle text,
  compte text,
  primary key (espace_id, tx_id)
);
create index if not exists banque_date_idx on public.banque (espace_id, date desc);

create table if not exists public.banque_comptes (
  espace_id uuid not null references public.espaces(id) on delete cascade,
  compte_id bigint not null,
  nom text,
  solde numeric(12,2),
  maj_le timestamptz not null default now(),
  primary key (espace_id, compte_id)
);

create table if not exists public.banque_liens (
  espace_id uuid primary key references public.espaces(id) on delete cascade,
  source text not null default 'pennylane',
  branche_le timestamptz not null default now(),
  derniere_synchro timestamptz,
  erreur text
);

alter table public.banque enable row level security;
alter table public.banque_comptes enable row level security;
alter table public.banque_liens enable row level security;
drop policy if exists banque_lire on public.banque;
create policy banque_lire on public.banque for select to authenticated using (public.est_membre(espace_id));
drop policy if exists banque_comptes_lire on public.banque_comptes;
create policy banque_comptes_lire on public.banque_comptes for select to authenticated using (public.est_membre(espace_id));
drop policy if exists banque_liens_lire on public.banque_liens;
create policy banque_liens_lire on public.banque_liens for select to authenticated using (public.est_membre(espace_id));

-- Synchronise un espace (les 200 dernières opérations + les soldes). Renvoie le nombre d'opérations lues.
create or replace function public.pennylane_synchro_espace(e uuid) returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare jeton text; rep extensions.http_response; corps jsonb; it jsonb; n integer := 0; curseur text := null; page integer := 0;
begin
  select decrypted_secret into jeton from vault.decrypted_secrets where name = 'pennylane_' || e;
  if jeton is null then return 0; end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');
  -- soldes
  select * into rep from extensions.http((
    'GET', 'https://app.pennylane.com/api/external/v2/bank_accounts',
    array[extensions.http_header('Authorization', 'Bearer ' || jeton)], null, null)::extensions.http_request);
  if rep.status <> 200 then
    update public.banque_liens set erreur = 'Pennylane a répondu ' || rep.status where espace_id = e; return -1;
  end if;
  for it in select * from jsonb_array_elements((rep.content::jsonb) -> 'items') loop
    insert into public.banque_comptes (espace_id, compte_id, nom, solde, maj_le)
      values (e, (it->>'id')::bigint, it->>'name', (it->>'balance')::numeric, now())
      on conflict (espace_id, compte_id) do update set nom = excluded.nom, solde = excluded.solde, maj_le = now();
  end loop;
  -- opérations (les plus récentes d'abord), 2 pages de 100
  loop
    select * into rep from extensions.http((
      'GET', 'https://app.pennylane.com/api/external/v2/transactions?limit=100' || coalesce('&cursor=' || extensions.urlencode(curseur), ''),
      array[extensions.http_header('Authorization', 'Bearer ' || jeton)], null, null)::extensions.http_request);
    exit when rep.status <> 200;
    corps := rep.content::jsonb;
    for it in select * from jsonb_array_elements(corps -> 'items') loop
      insert into public.banque (espace_id, tx_id, date, montant, libelle, compte)
        values (e, (it->>'id')::bigint, (it->>'date')::date, (it->>'amount')::numeric, it->>'label', it #>> '{bank_account,id}')
        on conflict (espace_id, tx_id) do update set date = excluded.date, montant = excluded.montant, libelle = excluded.libelle;
      n := n + 1;
    end loop;
    page := page + 1; curseur := corps ->> 'next_cursor';
    exit when page >= 2 or curseur is null or not coalesce((corps ->> 'has_more')::boolean, false);
  end loop;
  update public.banque_liens set derniere_synchro = now(), erreur = null where espace_id = e;
  return n;
end $$;

-- Appelé par l'appli (bouton Actualiser / à l'ouverture), au plus une fois toutes les 2 minutes
create or replace function public.banque_actualiser(e uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare d timestamptz;
begin
  if not public.est_membre(e) then raise exception 'Accès refusé'; end if;
  select derniere_synchro into d from public.banque_liens where espace_id = e;
  if not found then return 0; end if;
  if d is not null and d > now() - interval '2 minutes' then return 0; end if;
  return public.pennylane_synchro_espace(e);
end $$;

-- Brancher / débrancher Pennylane (le jeton reste dans le coffre du serveur, jamais renvoyé à l'appli)
create or replace function public.banque_brancher(e uuid, jeton text) returns integer
language plpgsql security definer set search_path = public as $$
declare rep extensions.http_response;
begin
  if not public.est_membre(e) then raise exception 'Accès refusé'; end if;
  jeton := trim(jeton);
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');
  select * into rep from extensions.http(('GET', 'https://app.pennylane.com/api/external/v2/me',
    array[extensions.http_header('Authorization', 'Bearer ' || jeton)], null, null)::extensions.http_request);
  if rep.status <> 200 then raise exception 'Jeton refusé par Pennylane (code %)', rep.status; end if;
  if exists (select 1 from vault.secrets where name = 'pennylane_' || e) then
    perform vault.update_secret((select id from vault.secrets where name = 'pennylane_' || e), jeton);
  else perform vault.create_secret(jeton, 'pennylane_' || e); end if;
  insert into public.banque_liens (espace_id) values (e) on conflict (espace_id) do update set erreur = null;
  return public.pennylane_synchro_espace(e);
end $$;

create or replace function public.banque_debrancher(e uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_membre(e) then raise exception 'Accès refusé'; end if;
  delete from vault.secrets where name = 'pennylane_' || e;
  delete from public.banque_liens where espace_id = e;
  delete from public.banque where espace_id = e;
  delete from public.banque_comptes where espace_id = e;
end $$;

-- Tous les espaces branchés, toutes les heures
create or replace function public.banque_synchro_tous() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select espace_id from public.banque_liens loop
    begin perform public.pennylane_synchro_espace(r.espace_id);
    exception when others then update public.banque_liens set erreur = left(sqlerrm, 200) where espace_id = r.espace_id; end;
  end loop;
end $$;

revoke all on function public.pennylane_synchro_espace(uuid) from public, anon, authenticated;
revoke all on function public.banque_synchro_tous() from public, anon, authenticated;
revoke all on function public.banque_actualiser(uuid) from public, anon;
grant execute on function public.banque_actualiser(uuid) to authenticated;
revoke all on function public.banque_brancher(uuid, text) from public, anon;
grant execute on function public.banque_brancher(uuid, text) to authenticated;
revoke all on function public.banque_debrancher(uuid) from public, anon;
grant execute on function public.banque_debrancher(uuid) to authenticated;

select cron.unschedule('banque-synchro') where exists (select 1 from cron.job where jobname = 'banque-synchro');
select cron.schedule('banque-synchro', '17 * * * *', 'select public.banque_synchro_tous()');
