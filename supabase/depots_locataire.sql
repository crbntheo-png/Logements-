-- Documents déposés par le locataire depuis son espace (attestation d'assurance habitation…), écrits seulement par la
-- fonction serveur "locataire" (action "deposer"). L'appli du propriétaire les range dans le logement puis les marque traités.
create table if not exists public.depots_locataire (
  id bigserial primary key,
  espace_id uuid not null references public.espaces(id) on delete cascade,
  bail_id text not null,
  type text not null default 'assurance' check (type in ('assurance', 'autre')),
  nom text, chemin text not null, mime text,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'traite')),
  cree_le timestamptz not null default now()
);
create index if not exists depots_locataire_espace on public.depots_locataire (espace_id, statut);
alter table public.depots_locataire enable row level security;
drop policy if exists depots_lire on public.depots_locataire;
create policy depots_lire on public.depots_locataire for select to authenticated using (public.est_membre(espace_id));
drop policy if exists depots_traiter on public.depots_locataire;
create policy depots_traiter on public.depots_locataire for update to authenticated using (public.est_editeur(espace_id)) with check (public.est_editeur(espace_id));
drop policy if exists depots_supprimer on public.depots_locataire;
create policy depots_supprimer on public.depots_locataire for delete to authenticated using (public.est_editeur(espace_id));
