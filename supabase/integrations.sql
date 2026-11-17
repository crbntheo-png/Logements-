-- Demandes d'intégration (type 'integration' dans signalements) : la liste n'est visible que par l'administrateur
create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(lower(auth.jwt() ->> 'email') = lower((select decrypted_secret from vault.decrypted_secrets where name = 'admin_email')), false);
$$;
create or replace function public.demandes_integrations() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.est_admin() then raise exception 'Réservé à l''administrateur'; end if;
  return coalesce((select jsonb_agg(x order by x.nb desc, x.dernier desc) from (
    select coalesce(nullif(contexte ->> 'appli', ''), 'Autre') appli, count(*) nb, count(distinct email) personnes, max(cree_le) dernier,
      jsonb_agg(jsonb_build_object('email', email, 'message', message, 'importance', contexte ->> 'importance', 'date', cree_le) order by cree_le desc) demandes
    from public.signalements where type = 'integration' group by 1) x), '[]'::jsonb);
end $$;
revoke all on function public.demandes_integrations() from public, anon;
grant execute on function public.demandes_integrations() to authenticated;
grant execute on function public.est_admin() to authenticated;
