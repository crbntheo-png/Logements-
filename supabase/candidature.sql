-- Candidatures en ligne : un lien public par logement à louer (jeton secret, seule son empreinte est gardée ici).
-- Le propriétaire publie une "photo" de l'annonce ; le candidat la lit et dépose son dossier par la fonction serveur
-- "candidature", sans compte. Les dossiers ne sont écrits que par cette fonction ; seuls les membres de l'espace les lisent.
create table if not exists public.annonces_publiques (
  jeton_hash text primary key check (length(jeton_hash) = 64),
  espace_id uuid not null references public.espaces(id) on delete cascade,
  bien_id text not null check (length(bien_id) between 1 and 120),
  donnees jsonb not null default '{}'::jsonb check (octet_length(donnees::text) < 200000),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  unique (espace_id, bien_id)
);
alter table public.annonces_publiques enable row level security;
drop policy if exists annonces_lire on public.annonces_publiques;
create policy annonces_lire on public.annonces_publiques for select to authenticated using (public.est_membre(espace_id));
drop policy if exists annonces_ajouter on public.annonces_publiques;
create policy annonces_ajouter on public.annonces_publiques for insert to authenticated with check (public.est_editeur(espace_id));
drop policy if exists annonces_modifier on public.annonces_publiques;
create policy annonces_modifier on public.annonces_publiques for update to authenticated using (public.est_editeur(espace_id)) with check (public.est_editeur(espace_id));
drop policy if exists annonces_supprimer on public.annonces_publiques;
create policy annonces_supprimer on public.annonces_publiques for delete to authenticated using (public.est_editeur(espace_id));

create table if not exists public.candidatures (
  id bigserial primary key,
  espace_id uuid not null references public.espaces(id) on delete cascade,
  bien_id text not null,
  nom text not null check (length(nom) between 1 and 200),
  email text check (length(email) <= 200),
  tel text check (length(tel) <= 40),
  situation text, revenus numeric, garantie text, garant_info text check (length(garant_info) <= 300),
  occupants int, message text check (length(message) <= 3000),
  pieces jsonb not null default '[]'::jsonb,
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'vue', 'importee', 'refusee')),
  cree_le timestamptz not null default now()
);
create index if not exists candidatures_espace on public.candidatures (espace_id, statut, cree_le desc);
alter table public.candidatures enable row level security;
drop policy if exists candidatures_lire on public.candidatures;
create policy candidatures_lire on public.candidatures for select to authenticated using (public.est_membre(espace_id));
drop policy if exists candidatures_traiter on public.candidatures;
create policy candidatures_traiter on public.candidatures for update to authenticated using (public.est_editeur(espace_id)) with check (public.est_editeur(espace_id));
drop policy if exists candidatures_supprimer on public.candidatures;
create policy candidatures_supprimer on public.candidatures for delete to authenticated using (public.est_editeur(espace_id));
-- (pas de politique d'ajout : seule la fonction serveur écrit)
