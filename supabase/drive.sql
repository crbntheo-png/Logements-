-- Google Drive de chaque personne : connexion en lecture seule, gardée sur le serveur
-- (la clé de renouvellement Google est rangée dans le coffre, jamais visible par l'appli)
create table if not exists public.drive_comptes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  adresse text not null default '',
  branche_le timestamptz not null default now()
);
alter table public.drive_comptes enable row level security;
drop policy if exists drive_lire on public.drive_comptes;
create policy drive_lire on public.drive_comptes for select to authenticated using (user_id = auth.uid());

-- Réservé au serveur (fonction "drive")
create or replace function public.drive_enregistrer(u uuid, adresse text, rt text) returns void
language plpgsql security definer set search_path = public as $$
declare nom text := 'drive_' || u;
begin
  if rt is not null and rt <> '' then
    if exists (select 1 from vault.secrets where name = nom) then perform vault.update_secret((select id from vault.secrets where name = nom), rt);
    else perform vault.create_secret(rt, nom); end if;
  end if;
  insert into public.drive_comptes (user_id, adresse) values (u, lower(trim(coalesce(adresse, ''))))
    on conflict (user_id) do update set adresse = excluded.adresse, branche_le = now();
end $$;
create or replace function public.drive_secret(u uuid) returns text
language sql security definer set search_path = public as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'drive_' || u;
$$;
create or replace function public.drive_oublier(u uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from vault.secrets where name = 'drive_' || u;
  delete from public.drive_comptes where user_id = u;
end $$;
revoke all on function public.drive_enregistrer(uuid, text, text) from public, anon, authenticated;
revoke all on function public.drive_secret(uuid) from public, anon, authenticated;
revoke all on function public.drive_oublier(uuid) from public, anon, authenticated;
grant execute on function public.drive_enregistrer(uuid, text, text) to service_role;
grant execute on function public.drive_secret(uuid) to service_role;
grant execute on function public.drive_oublier(uuid) to service_role;
