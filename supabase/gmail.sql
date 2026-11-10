-- Envoi depuis le Gmail de chaque personne : adresse + mot de passe d'application (dans le coffre)
create table if not exists public.gmail_comptes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  adresse text not null,
  branche_le timestamptz not null default now()
);
alter table public.gmail_comptes enable row level security;
drop policy if exists gmail_lire on public.gmail_comptes;
create policy gmail_lire on public.gmail_comptes for select to authenticated using (user_id = auth.uid());

create or replace function public.gmail_brancher(adresse text, mdp text) returns void
language plpgsql security definer set search_path = public as $$
declare nom text := 'gmail_' || auth.uid();
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  mdp := regexp_replace(coalesce(mdp, ''), '\s', '', 'g');
  if length(mdp) <> 16 then raise exception 'Le mot de passe d''application fait 16 lettres'; end if;
  if exists (select 1 from vault.secrets where name = nom) then perform vault.update_secret((select id from vault.secrets where name = nom), mdp);
  else perform vault.create_secret(mdp, nom); end if;
  insert into public.gmail_comptes (user_id, adresse) values (auth.uid(), lower(trim(adresse)))
    on conflict (user_id) do update set adresse = excluded.adresse, branche_le = now();
end $$;
create or replace function public.gmail_debrancher() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from vault.secrets where name = 'gmail_' || auth.uid();
  delete from public.gmail_comptes where user_id = auth.uid();
end $$;
-- Réservé au serveur (fonction d'envoi)
create or replace function public.gmail_secret(u uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('adresse', g.adresse, 'mdp', (select decrypted_secret from vault.decrypted_secrets where name = 'gmail_' || u))
  from public.gmail_comptes g where g.user_id = u;
$$;
revoke all on function public.gmail_secret(uuid) from public, anon, authenticated;
grant execute on function public.gmail_secret(uuid) to service_role;
revoke all on function public.gmail_brancher(text, text) from public, anon;
grant execute on function public.gmail_brancher(text, text) to authenticated;
revoke all on function public.gmail_debrancher() from public, anon;
grant execute on function public.gmail_debrancher() to authenticated;
grant execute on function public.est_membre(uuid) to authenticated;
