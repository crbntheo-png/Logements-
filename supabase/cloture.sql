-- Mois clôturés : une fois un mois vérifié et clôturé par le propriétaire, plus aucun paiement ni dépense
-- de ce mois (ou d'avant) ne peut être ajouté, modifié ou supprimé — ni par une personne, ni par l'appli toute seule,
-- ni par un ancien téléphone pas à jour, ni par Claude. Le mois compte d'après la date de l'opération
-- (un loyer d'octobre payé le 3 novembre est une opération de novembre : il reste possible de l'enregistrer).
alter table public.espaces add column if not exists cloture_jusqua text;  -- 'AAAA-MM' (inclus) ou null
alter table public.espaces add column if not exists cloture_par uuid;
alter table public.espaces add column if not exists cloture_le timestamptz;

create table if not exists public.clotures_journal (
  id bigserial primary key,
  espace_id uuid not null references public.espaces(id) on delete cascade,
  avant text, apres text, par uuid, le timestamptz not null default now()
);
alter table public.clotures_journal enable row level security;
drop policy if exists clotures_journal_lire on public.clotures_journal;
create policy clotures_journal_lire on public.clotures_journal for select to authenticated using (public.est_membre(espace_id));

-- Seul le propriétaire de l'espace clôture ou rouvre (p_mois = null : plus rien de clôturé)
create or replace function public.cloturer(p_espace uuid, p_mois text) returns text
language plpgsql security definer set search_path = public as $$
declare v_avant text;
begin
  if not exists (select 1 from public.membres m where m.espace_id = p_espace and m.user_id = auth.uid() and m.role = 'proprietaire') then
    raise exception 'Seul le propriétaire de l''espace peut clôturer ou rouvrir un mois';
  end if;
  if p_mois is not null and p_mois !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Mois invalide'; end if;
  if p_mois is not null and p_mois >= to_char(now() at time zone 'Europe/Paris', 'YYYY-MM') then
    raise exception 'On ne peut clôturer que des mois terminés';
  end if;
  select cloture_jusqua into v_avant from public.espaces where id = p_espace;
  update public.espaces set cloture_jusqua = p_mois, cloture_par = auth.uid(), cloture_le = now() where id = p_espace;
  insert into public.clotures_journal (espace_id, avant, apres, par) values (p_espace, v_avant, p_mois, auth.uid());
  return p_mois;
end $$;
revoke all on function public.cloturer(uuid, text) from public, anon;
grant execute on function public.cloturer(uuid, text) to authenticated;

-- Le mois comptable d'un paiement ou d'une dépense : sa date (à défaut, le mois du loyer)
create or replace function public.mois_compta(d jsonb) returns text language sql immutable as $$
  select nullif(left(coalesce(nullif(d->>'date', ''), d->>'mois', ''), 7), '')
$$;

create or replace function public.docs_cloture() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_c text; v_esp uuid; v_coll text; v_avant text; v_apres text;
begin
  v_coll := case when tg_op = 'DELETE' then old.coll else new.coll end;
  if v_coll not in ('paiements', 'depenses') then return case when tg_op = 'DELETE' then old else new end; end if;
  -- correction technique explicite (session SQL) : autorisée
  if coalesce(current_setting('app.cloture_off', true), '') = '1' then return case when tg_op = 'DELETE' then old else new end; end if;
  v_esp := case when tg_op = 'DELETE' then old.espace_id else new.espace_id end;
  select cloture_jusqua into v_c from public.espaces where id = v_esp;
  -- espace en cours de suppression (n'existe plus) ou rien de clôturé : on laisse faire
  if v_c is null then return case when tg_op = 'DELETE' then old else new end; end if;
  if tg_op <> 'INSERT' then v_avant := public.mois_compta(old.data); end if;
  if tg_op <> 'DELETE' then v_apres := public.mois_compta(new.data); end if;
  if (v_avant is not null and v_avant <= v_c) or (v_apres is not null and v_apres <= v_c) then
    return null;  -- mois clôturé : l'écriture est ignorée, rien ne change
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists docs_cloture on public.docs;
-- nommé "a_..." pour passer avant les autres déclencheurs (historique, auteur) : rien n'est noté si c'est refusé
drop trigger if exists a_docs_cloture on public.docs;
create trigger a_docs_cloture before insert or update or delete on public.docs for each row execute function public.docs_cloture();
