-- Agenda abonné : un lien secret par espace (seule l'empreinte du jeton est gardée). L'appli publie le calendrier (format .ics),
-- Google Agenda, l'iPhone ou Outlook le relisent tout seuls par la fonction "agenda".
create table if not exists public.agendas (
  jeton_hash text primary key check (length(jeton_hash) = 64),
  espace_id uuid not null unique references public.espaces(id) on delete cascade,
  ics text not null default '' check (octet_length(ics) < 1000000),
  maj_le timestamptz not null default now(),
  lu_le timestamptz
);
alter table public.agendas enable row level security;
drop policy if exists agendas_lire on public.agendas;
create policy agendas_lire on public.agendas for select to authenticated using (public.est_membre(espace_id));
drop policy if exists agendas_ajouter on public.agendas;
create policy agendas_ajouter on public.agendas for insert to authenticated with check (public.est_editeur(espace_id));
drop policy if exists agendas_modifier on public.agendas;
create policy agendas_modifier on public.agendas for update to authenticated using (public.est_editeur(espace_id)) with check (public.est_editeur(espace_id));
drop policy if exists agendas_supprimer on public.agendas;
create policy agendas_supprimer on public.agendas for delete to authenticated using (public.est_editeur(espace_id));
