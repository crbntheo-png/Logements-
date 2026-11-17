-- Espace locataire : un lien privé par locataire (jeton secret, seul son empreinte est gardée ici).
-- Le propriétaire (ou un associé éditeur) publie une "photo" des infos du locataire (donnees) ; le locataire la lit
-- par la fonction serveur "locataire" avec son jeton, sans compte. Il ne voit rien d'autre de l'espace.
create table if not exists public.portails_locataire (
  jeton_hash text primary key check (length(jeton_hash) = 64),
  espace_id uuid not null references public.espaces(id) on delete cascade,
  bail_id text not null check (length(bail_id) between 1 and 120),
  donnees jsonb not null default '{}'::jsonb check (octet_length(donnees::text) < 2000000),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  vu_le timestamptz,
  unique (espace_id, bail_id)
);
alter table public.portails_locataire enable row level security;
drop policy if exists portails_lire on public.portails_locataire;
create policy portails_lire on public.portails_locataire for select to authenticated using (public.est_membre(espace_id));
drop policy if exists portails_ajouter on public.portails_locataire;
create policy portails_ajouter on public.portails_locataire for insert to authenticated with check (public.est_editeur(espace_id));
drop policy if exists portails_modifier on public.portails_locataire;
create policy portails_modifier on public.portails_locataire for update to authenticated using (public.est_editeur(espace_id)) with check (public.est_editeur(espace_id));
drop policy if exists portails_supprimer on public.portails_locataire;
create policy portails_supprimer on public.portails_locataire for delete to authenticated using (public.est_editeur(espace_id));

-- Problèmes signalés par les locataires (fuite, panne…), écrits seulement par la fonction serveur
create table if not exists public.demandes_locataire (
  id bigserial primary key,
  espace_id uuid not null references public.espaces(id) on delete cascade,
  bail_id text not null,
  nom text,
  texte text not null check (length(texte) between 1 and 3000),
  photo text,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'traite')),
  cree_le timestamptz not null default now(),
  traite_le timestamptz
);
create index if not exists demandes_locataire_espace on public.demandes_locataire (espace_id, statut);
alter table public.demandes_locataire enable row level security;
drop policy if exists demandes_lire on public.demandes_locataire;
create policy demandes_lire on public.demandes_locataire for select to authenticated using (public.est_membre(espace_id));
drop policy if exists demandes_traiter on public.demandes_locataire;
create policy demandes_traiter on public.demandes_locataire for update to authenticated using (public.est_editeur(espace_id)) with check (public.est_editeur(espace_id));
drop policy if exists demandes_supprimer on public.demandes_locataire;
create policy demandes_supprimer on public.demandes_locataire for delete to authenticated using (public.est_editeur(espace_id));
