-- Crédits IA : limite par personne (jour, mois) + budget global de l'appli par mois (en millionièmes de dollar)
alter table public.ia_usage add column if not exists cout bigint not null default 0;
create or replace function public.ia_etat(u uuid) returns json
language sql security definer set search_path = public as $$
  select json_build_object(
    'jour', coalesce((select nb from ia_usage where user_id = u and jour = current_date), 0),
    'mois', coalesce((select sum(nb) from ia_usage where user_id = u and date_trunc('month', jour) = date_trunc('month', current_date)), 0),
    'global_cout', coalesce((select sum(cout) from ia_usage where date_trunc('month', jour) = date_trunc('month', current_date)), 0));
$$;
-- Réserve une analyse si c'est permis : 'ok', ou la raison du refus ('budget', 'jour', 'mois')
create or replace function public.ia_reserver(u uuid, max_jour int, max_mois int, budget bigint) returns text
language plpgsql security definer set search_path = public as $$
declare e json := public.ia_etat(u);
begin
  if (e->>'global_cout')::bigint >= budget then return 'budget'; end if;
  if (e->>'jour')::int >= max_jour then return 'jour'; end if;
  if (e->>'mois')::int >= max_mois then return 'mois'; end if;
  insert into ia_usage (user_id, jour, nb) values (u, current_date, 1) on conflict (user_id, jour) do update set nb = ia_usage.nb + 1;
  return 'ok';
end $$;
create or replace function public.ia_cout(u uuid, c bigint) returns void
language sql security definer set search_path = public as $$
  update ia_usage set cout = cout + greatest(c, 0) where user_id = u and jour = current_date;
$$;
create or replace function public.ia_rembourser(u uuid) returns void
language sql security definer set search_path = public as $$
  update ia_usage set nb = greatest(nb - 1, 0) where user_id = u and jour = current_date;
$$;
revoke all on function public.ia_etat(uuid), public.ia_reserver(uuid, int, int, bigint), public.ia_cout(uuid, bigint), public.ia_rembourser(uuid) from public, anon, authenticated;
grant execute on function public.ia_etat(uuid), public.ia_reserver(uuid, int, int, bigint), public.ia_cout(uuid, bigint), public.ia_rembourser(uuid) to service_role;
drop function if exists public.ia_compter(uuid, int);
