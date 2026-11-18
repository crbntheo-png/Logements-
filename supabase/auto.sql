-- 18/11/2026 : distinguer ce que fait une PERSONNE de ce que fait l'APPLI toute seule (pointage des virements, quittances automatiques, indice IRL…)
-- L'appli envoie l'en-tête x-auto: 1 pour ses écritures automatiques ; le serveur le note sur la ligne et dans l'historique.
alter table public.docs add column if not exists auto boolean not null default false;
alter table public.docs_historique add column if not exists auto boolean not null default false;
alter table public.docs_supprimes add column if not exists auto boolean not null default false;
create or replace function public.ecriture_auto() returns boolean language sql stable as $$
  select coalesce((nullif(current_setting('request.headers', true), '')::json ->> 'x-auto') = '1', false) $$;
create or replace function public.docs_auteur() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then new.maj_par := auth.uid(); end if;
  new.auto := public.ecriture_auto();
  if tg_op = 'UPDATE' then new.cree_le := old.cree_le; end if;
  return new;
end $$;
create or replace function public.docs_historiser() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.espaces e where e.id = old.espace_id) then return coalesce(new, old); end if;
  if old.coll not in ('paiements', 'depenses', 'baux', 'biens', 'fichiers', 'taxes', 'relances', 'rappels', 'edl', 'prets') then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' then
    if new.data is distinct from old.data then insert into public.docs_historique (espace_id, coll, doc_id, action, avant, apres, par, auto) values (old.espace_id, old.coll, old.doc_id, 'modif', old.data, new.data, auth.uid(), public.ecriture_auto()); end if;
    return new;
  end if;
  insert into public.docs_historique (espace_id, coll, doc_id, action, avant, par, auto) values (old.espace_id, old.coll, old.doc_id, 'suppr', old.data, auth.uid(), public.ecriture_auto());
  delete from public.docs_historique where le < now() - interval '60 days';
  return old;
end $$;
create or replace function public.docs_suppression() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and old.coll in ('paiements', 'depenses', 'baux', 'biens') and exists (select 1 from public.espaces e where e.id = old.espace_id) then
    insert into public.docs_supprimes (espace_id, coll, doc_id, data, par, auto) values (old.espace_id, old.coll, old.doc_id, old.data, auth.uid(), public.ecriture_auto());
  end if;
  delete from public.docs_supprimes where le < now() - interval '60 days';
  return old;
end $$;
-- l'incident de ce midi : ce que le téléphone de Gab a fait à 13 h 50 était automatique (l'appli), pas lui
update public.docs_historique set auto = true where espace_id = '1be09613-be2e-49f7-85ca-583ebecc723c' and le between '2026-11-18 12:50:00+00' and '2026-11-18 12:51:00+00';
update public.docs_supprimes set auto = true where espace_id = '1be09613-be2e-49f7-85ca-583ebecc723c' and le between '2026-11-18 12:50:00+00' and '2026-11-18 12:51:00+00';
update public.docs set auto = true where espace_id = '1be09613-be2e-49f7-85ca-583ebecc723c' and coll = 'paiements' and maj_le between '2026-11-18 12:50:00+00' and '2026-11-18 12:51:00+00';
