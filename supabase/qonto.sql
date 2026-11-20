-- Qonto (clé API de l'utilisateur, lecture seule) : la clé "identifiant:clé secrète" est gardée chiffrée dans le coffre (vault),
-- lisible seulement par le serveur (service_role). Les opérations vont dans les tables de la banque comme la banque en direct.
create or replace function public.qonto_cle_poser(e uuid, cle text) returns void language plpgsql security definer set search_path to 'public', 'vault' as $$
begin
  if exists (select 1 from vault.secrets where name = 'qonto_' || e) then
    perform vault.update_secret((select id from vault.secrets where name = 'qonto_' || e), cle);
  else perform vault.create_secret(cle, 'qonto_' || e); end if;
end $$;
create or replace function public.qonto_cle_lire(e uuid) returns text language sql security definer set search_path to 'public', 'vault' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'qonto_' || e;
$$;
create or replace function public.qonto_cle_retirer(e uuid) returns void language sql security definer set search_path to 'public', 'vault' as $$
  delete from vault.secrets where name = 'qonto_' || e;
$$;
revoke all on function public.qonto_cle_poser(uuid, text) from public, anon, authenticated;
revoke all on function public.qonto_cle_lire(uuid) from public, anon, authenticated;
revoke all on function public.qonto_cle_retirer(uuid) from public, anon, authenticated;
grant execute on function public.qonto_cle_poser(uuid, text) to service_role;
grant execute on function public.qonto_cle_lire(uuid) to service_role;
grant execute on function public.qonto_cle_retirer(uuid) to service_role;
