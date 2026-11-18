-- Boîte à documents : une adresse e-mail par espace (code@sci-gestion-locative.com). Les pièces jointes transférées
-- arrivent dans les documents de l'espace (à ranger). Seuls les membres de l'espace (et les expéditeurs ajoutés) peuvent y envoyer.
create table if not exists public.boites (
  code text primary key check (code ~ '^[a-z0-9-]{6,40}$'),
  espace_id uuid not null unique references public.espaces(id) on delete cascade,
  expediteurs text[] not null default '{}',
  cree_le timestamptz not null default now()
);
alter table public.boites enable row level security;
drop policy if exists boites_lire on public.boites;
create policy boites_lire on public.boites for select to authenticated using (public.est_membre(espace_id));
drop policy if exists boites_ajouter on public.boites;
create policy boites_ajouter on public.boites for insert to authenticated with check (public.est_editeur(espace_id));
drop policy if exists boites_modifier on public.boites;
create policy boites_modifier on public.boites for update to authenticated using (public.est_editeur(espace_id)) with check (public.est_editeur(espace_id));
drop policy if exists boites_supprimer on public.boites;
create policy boites_supprimer on public.boites for delete to authenticated using (public.est_editeur(espace_id));
