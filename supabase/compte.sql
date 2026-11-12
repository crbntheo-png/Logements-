-- Supprimer son compte soi-même (droit à l'effacement, RGPD)
-- Espaces dont on est seul : supprimés avec toutes leurs données. Espaces partagés : on les laisse aux autres membres.
create or replace function public.supprimer_mon_compte() returns integer
language plpgsql security definer set search_path = public, auth as $$
declare moi uuid := auth.uid(); e record; n integer := 0; suivant uuid;
begin
  if moi is null then raise exception 'Connexion requise'; end if;
  for e in select m.espace_id from public.membres m where m.user_id = moi loop
    if not exists (select 1 from public.membres x where x.espace_id = e.espace_id and x.user_id <> moi) then
      delete from public.espaces where id = e.espace_id; n := n + 1;
    elsif exists (select 1 from public.membres x where x.espace_id = e.espace_id and x.user_id = moi and x.role = 'proprietaire') then
      select x.user_id into suivant from public.membres x where x.espace_id = e.espace_id and x.user_id <> moi order by (x.role = 'membre') desc, x.ajoute_le limit 1;
      update public.membres set role = 'proprietaire' where espace_id = e.espace_id and user_id = suivant;
    end if;
  end loop;
  delete from auth.users where id = moi;
  return n;
end $$;
revoke all on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;
