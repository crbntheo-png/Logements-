-- 18/11/2026 : quand la banque directe est branchée, les opérations Pennylane ne sont plus lisibles directement
-- (une ancienne version de l'appli encore ouverte les prenait pour de nouveaux loyers) ; la comparaison les lit par une fonction.
drop policy if exists banque_lire on public.banque;
create policy banque_lire on public.banque for select to authenticated using (
  public.est_membre(espace_id) and (source = 'enablebanking' or not exists (select 1 from public.banque_directe d where d.espace_id = banque.espace_id and d.session_id is not null)));
drop policy if exists banque_comptes_lire on public.banque_comptes;
create policy banque_comptes_lire on public.banque_comptes for select to authenticated using (
  public.est_membre(espace_id) and (source = 'enablebanking' or not exists (select 1 from public.banque_directe d where d.espace_id = banque_comptes.espace_id and d.session_id is not null)));
create or replace function public.banque_pennylane_comparaison(e uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.est_membre(e) then raise exception 'Accès refusé'; end if;
  return jsonb_build_object(
    'ops', coalesce((select jsonb_agg(jsonb_build_object('tx_id', tx_id::text, 'date', date, 'montant', montant, 'libelle', libelle) order by date desc) from (select * from public.banque where espace_id = e and source = 'pennylane' order by date desc limit 400) x), '[]'::jsonb),
    'comptes', coalesce((select jsonb_agg(jsonb_build_object('compte_id', compte_id, 'nom', nom, 'solde', solde)) from public.banque_comptes where espace_id = e and source = 'pennylane'), '[]'::jsonb));
end $$;
revoke all on function public.banque_pennylane_comparaison(uuid) from public, anon;
grant execute on function public.banque_pennylane_comparaison(uuid) to authenticated;

-- Historique de TOUTES les modifications et suppressions (60 jours), pour pouvoir revenir en arrière dans l'appli
create table if not exists public.docs_historique (
  id bigserial primary key,
  espace_id uuid not null references public.espaces(id) on delete cascade,
  coll text not null, doc_id text not null, action text not null check (action in ('modif', 'suppr')),
  avant jsonb, apres jsonb, par uuid, le timestamptz not null default now()
);
create index if not exists docs_historique_espace on public.docs_historique (espace_id, le desc);
alter table public.docs_historique enable row level security;
drop policy if exists docs_historique_lire on public.docs_historique;
create policy docs_historique_lire on public.docs_historique for select to authenticated using (public.est_membre(espace_id));
create or replace function public.docs_historiser() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.espaces e where e.id = old.espace_id) then return coalesce(new, old); end if;
  if old.coll not in ('paiements', 'depenses', 'baux', 'biens', 'fichiers', 'taxes', 'relances', 'rappels', 'edl', 'prets') then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' then
    if new.data is distinct from old.data then insert into public.docs_historique (espace_id, coll, doc_id, action, avant, apres, par) values (old.espace_id, old.coll, old.doc_id, 'modif', old.data, new.data, auth.uid()); end if;
    return new;
  end if;
  insert into public.docs_historique (espace_id, coll, doc_id, action, avant, par) values (old.espace_id, old.coll, old.doc_id, 'suppr', old.data, auth.uid());
  delete from public.docs_historique where le < now() - interval '60 days';
  return old;
end $$;
drop trigger if exists docs_historiser on public.docs;
create trigger docs_historiser after update or delete on public.docs for each row execute function public.docs_historiser();
