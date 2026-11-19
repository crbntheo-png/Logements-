-- Assistant "Pose ta question" : quota à part (nb_q par jour et par personne), coût compté dans le même budget global
alter table public.ia_usage add column if not exists nb_q integer not null default 0;

create or replace function public.ia_etat(u uuid) returns json language sql security definer set search_path to 'public' as $$
  select json_build_object(
    'jour', coalesce((select nb from ia_usage where user_id = u and jour = current_date), 0),
    'mois', coalesce((select sum(nb) from ia_usage where user_id = u and date_trunc('month', jour) = date_trunc('month', current_date)), 0),
    'jour_doc', coalesce((select nb_doc from ia_usage where user_id = u and jour = current_date), 0),
    'mois_doc', coalesce((select sum(nb_doc) from ia_usage where user_id = u and date_trunc('month', jour) = date_trunc('month', current_date)), 0),
    'jour_q', coalesce((select nb_q from ia_usage where user_id = u and jour = current_date), 0),
    'mois_q', coalesce((select sum(nb_q) from ia_usage where user_id = u and date_trunc('month', jour) = date_trunc('month', current_date)), 0),
    'global_cout', coalesce((select sum(cout) from ia_usage where date_trunc('month', jour) = date_trunc('month', current_date)), 0));
$$;

create or replace function public.ia_reserver_q(u uuid, max_jour integer, max_mois integer, budget bigint) returns text language plpgsql security definer set search_path to 'public' as $$
declare e json := public.ia_etat(u);
begin
  if (e->>'global_cout')::bigint >= budget then return 'budget'; end if;
  if (e->>'jour_q')::int >= max_jour then return 'jour'; end if;
  if (e->>'mois_q')::int >= max_mois then return 'mois'; end if;
  insert into ia_usage (user_id, jour, nb_q) values (u, current_date, 1) on conflict (user_id, jour) do update set nb_q = ia_usage.nb_q + 1;
  return 'ok';
end $$;

create or replace function public.ia_rembourser_q(u uuid) returns void language sql security definer set search_path to 'public' as $$
  update ia_usage set nb_q = greatest(0, nb_q - 1) where user_id = u and jour = current_date;
$$;

revoke all on function public.ia_reserver_q(uuid, integer, integer, bigint) from public, anon, authenticated;
revoke all on function public.ia_rembourser_q(uuid) from public, anon, authenticated;
