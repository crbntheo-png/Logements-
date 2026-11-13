-- Banque (Pennylane) : branchement réservé au propriétaire de l'espace, messages clairs (14/11/2026)
-- Remplace banque_brancher, banque_debrancher et pennylane_synchro_espace (même logique, contrôles et messages en plus).
create or replace function public.banque_brancher(e uuid, jeton text) returns integer
language plpgsql security definer set search_path = public as $$
declare rep extensions.http_response;
begin
  if not public.est_proprietaire(e) then raise exception 'Seul le propriétaire de l''espace peut brancher la banque.'; end if;
  jeton := regexp_replace(coalesce(jeton, ''), '\s', '', 'g');
  if length(jeton) < 20 then raise exception 'Ce n''est pas un jeton Pennylane : colle le long code copié juste après sa création.'; end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');
  select * into rep from extensions.http(('GET', 'https://app.pennylane.com/api/external/v2/me',
    array[extensions.http_header('Authorization', 'Bearer ' || jeton)], null, null)::extensions.http_request);
  if rep.status = 401 then raise exception 'Pennylane ne reconnaît pas ce jeton : il est incomplet, expiré ou supprimé. Recopie-le en entier ou crée-en un nouveau.'; end if;
  if rep.status <> 200 then raise exception 'Pennylane a refusé le jeton (code %). Réessaie dans un instant.', rep.status; end if;
  -- les deux droits dont l'appli a besoin
  select * into rep from extensions.http(('GET', 'https://app.pennylane.com/api/external/v2/bank_accounts',
    array[extensions.http_header('Authorization', 'Bearer ' || jeton)], null, null)::extensions.http_request);
  if rep.status = 403 then raise exception 'Le jeton marche, mais il n''a pas le droit de lire les comptes bancaires. Recrée-le en cochant "Comptes bancaires" et "Transactions" (lecture seule).'; end if;
  select * into rep from extensions.http(('GET', 'https://app.pennylane.com/api/external/v2/transactions?limit=1',
    array[extensions.http_header('Authorization', 'Bearer ' || jeton)], null, null)::extensions.http_request);
  if rep.status = 403 then raise exception 'Le jeton marche, mais il n''a pas le droit de lire les opérations. Recrée-le en cochant "Comptes bancaires" et "Transactions" (lecture seule).'; end if;
  if exists (select 1 from vault.secrets where name = 'pennylane_' || e) then
    perform vault.update_secret((select id from vault.secrets where name = 'pennylane_' || e), jeton);
  else perform vault.create_secret(jeton, 'pennylane_' || e); end if;
  insert into public.banque_liens (espace_id) values (e) on conflict (espace_id) do update set erreur = null;
  return public.pennylane_synchro_espace(e);
end $$;

create or replace function public.banque_debrancher(e uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_proprietaire(e) then raise exception 'Seul le propriétaire de l''espace peut débrancher la banque.'; end if;
  delete from vault.secrets where name = 'pennylane_' || e;
  delete from public.banque_liens where espace_id = e;
  delete from public.banque where espace_id = e;
  delete from public.banque_comptes where espace_id = e;
end $$;

CREATE OR REPLACE FUNCTION public.pennylane_synchro_espace(e uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
    update public.banque_liens set erreur = case rep.status
      when 401 then 'Le jeton Pennylane a expiré ou a été supprimé : rebranche la banque avec un nouveau jeton.'
      when 403 then 'Le jeton Pennylane n''a pas le droit de lire les comptes bancaires : recrée-le en lecture seule (comptes bancaires et transactions).'
      else 'Pennylane ne répond pas (code ' || rep.status || '), nouvel essai dans une heure.' end where espace_id = e; return -1;
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
end $function$;
