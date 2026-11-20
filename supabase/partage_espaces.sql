-- Plusieurs espaces (une SCI avec Paul, une autre avec Marc…) : chaque dossier Drive partagé avec l'appli
-- appartient à UN espace. Un sous-dossier peut être envoyé dans un autre espace (le plus proche décide).
create table if not exists public.partage_dossiers (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dossier_id text not null,
  espace_id uuid not null references public.espaces(id) on delete cascade,
  le timestamptz not null default now(),
  primary key (user_id, dossier_id)
);
alter table public.partage_dossiers enable row level security;
drop policy if exists pd_lire on public.partage_dossiers;
create policy pd_lire on public.partage_dossiers for select to authenticated using (user_id = auth.uid());
drop policy if exists pd_ecrire on public.partage_dossiers;
create policy pd_ecrire on public.partage_dossiers for insert to authenticated with check (user_id = auth.uid() and public.est_editeur(espace_id));
drop policy if exists pd_changer on public.partage_dossiers;
create policy pd_changer on public.partage_dossiers for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.est_editeur(espace_id));
drop policy if exists pd_retirer on public.partage_dossiers;
create policy pd_retirer on public.partage_dossiers for delete to authenticated using (user_id = auth.uid());

-- Autres comptes Google de la personne (dossiers rangés sur le compte Google de la SCI, par exemple).
-- Ajoutés seulement par le serveur, après une connexion Google qui prouve que l'adresse est bien à elle.
create table if not exists public.google_adresses (
  user_id uuid not null references auth.users(id) on delete cascade,
  adresse text not null,
  le timestamptz not null default now(),
  primary key (user_id, adresse)
);
alter table public.google_adresses enable row level security;
drop policy if exists ga_lire on public.google_adresses;
create policy ga_lire on public.google_adresses for select to authenticated using (user_id = auth.uid());
drop policy if exists ga_retirer on public.google_adresses;
create policy ga_retirer on public.google_adresses for delete to authenticated using (user_id = auth.uid());
