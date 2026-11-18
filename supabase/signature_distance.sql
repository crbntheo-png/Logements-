-- Signature à distance : le propriétaire envoie un document (bail, avenant, état des lieux) dans l'espace du locataire ;
-- le locataire le lit et signe avec le doigt depuis son lien privé (fonction "locataire", action "signer").
-- Preuve gardée : empreinte SHA-256 du document, date et heure, adresse IP, appareil. Signature électronique simple.
create table if not exists public.signatures_distance (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces(id) on delete cascade,
  bail_id text not null check (length(bail_id) between 1 and 120),
  bien_id text,
  titre text not null check (length(titre) between 1 and 200),
  base_html text not null check (length(base_html) < 1500000),
  empreinte text not null check (length(empreinte) = 64),
  sigs jsonb not null default '{}'::jsonb,          -- signatures déjà faites (le bailleur, sur son téléphone)
  index_locataire int not null default 1,           -- quelle case de signature est celle du locataire
  nom_locataire text,
  statut text not null default 'attente' check (statut in ('attente', 'signe', 'range', 'annule')),
  signature jsonb,                                   -- { img, w, h, nom, lu, quand }
  signe_le timestamptz, ip text, appareil text,
  cree_le timestamptz not null default now(), cree_par uuid default auth.uid()
);
create index if not exists signatures_distance_espace on public.signatures_distance (espace_id, statut);
alter table public.signatures_distance enable row level security;
drop policy if exists sigd_lire on public.signatures_distance;
create policy sigd_lire on public.signatures_distance for select to authenticated using (public.est_membre(espace_id));
drop policy if exists sigd_ajouter on public.signatures_distance;
create policy sigd_ajouter on public.signatures_distance for insert to authenticated with check (public.est_editeur(espace_id) and statut = 'attente' and signature is null);
drop policy if exists sigd_modifier on public.signatures_distance;
-- le propriétaire peut seulement annuler ou marquer "rangé" ; la signature elle-même n'est écrite que par la fonction serveur
create policy sigd_modifier on public.signatures_distance for update to authenticated using (public.est_editeur(espace_id)) with check (public.est_editeur(espace_id) and statut in ('range', 'annule', 'attente', 'signe'));
drop policy if exists sigd_supprimer on public.signatures_distance;
create policy sigd_supprimer on public.signatures_distance for delete to authenticated using (public.est_editeur(espace_id));
-- la signature, la date, l'IP et l'empreinte ne peuvent pas être réécrites par un membre (seulement le statut)
revoke update on public.signatures_distance from authenticated;
grant update (statut) on public.signatures_distance to authenticated;
