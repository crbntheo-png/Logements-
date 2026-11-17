-- Lectures de documents par l'IA (bail…) : compteur séparé des analyses du Drive, même budget global
alter table public.ia_usage add column if not exists nb_doc int not null default 0;
create or replace function public.ia_etat(u uuid) returns json
language sql security definer set search_path = public as $$
  select json_build_object(
    'jour', coalesce((select nb from ia_usage where user_id = u and jour = current_date), 0),
    'mois', coalesce((select sum(nb) from ia_usage where user_id = u and date_trunc('month', jour) = date_trunc('month', current_date)), 0),
    'jour_doc', coalesce((select nb_doc from ia_usage where user_id = u and jour = current_date), 0),
    'mois_doc', coalesce((select sum(nb_doc) from ia_usage where user_id = u and date_trunc('month', jour) = date_trunc('month', current_date)), 0),
    'global_cout', coalesce((select sum(cout) from ia_usage where date_trunc('month', jour) = date_trunc('month', current_date)), 0));
$$;
create or replace function public.ia_reserver_doc(u uuid, max_jour int, max_mois int, budget bigint) returns text
language plpgsql security definer set search_path = public as $$
declare e json := public.ia_etat(u);
begin
  if (e->>'global_cout')::bigint >= budget then return 'budget'; end if;
  if (e->>'jour_doc')::int >= max_jour then return 'jour'; end if;
  if (e->>'mois_doc')::int >= max_mois then return 'mois'; end if;
  insert into ia_usage (user_id, jour, nb_doc) values (u, current_date, 1) on conflict (user_id, jour) do update set nb_doc = ia_usage.nb_doc + 1;
  return 'ok';
end $$;
create or replace function public.ia_rembourser_doc(u uuid) returns void
language sql security definer set search_path = public as $$
  update ia_usage set nb_doc = greatest(nb_doc - 1, 0) where user_id = u and jour = current_date;
$$;
revoke all on function public.ia_reserver_doc(uuid, int, int, bigint), public.ia_rembourser_doc(uuid) from public, anon, authenticated;
grant execute on function public.ia_reserver_doc(uuid, int, int, bigint), public.ia_rembourser_doc(uuid) to service_role;
