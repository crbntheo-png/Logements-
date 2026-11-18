-- Connecteur pour Claude (et autres assistants compatibles MCP) : un lien secret par espace, lecture seule.
-- L'appli publie une photo des chiffres de l'espace ; la fonction "mcp" la sert à l'assistant. Seule l'empreinte du jeton est gardée.
create table if not exists public.connecteurs (
  jeton_hash text primary key check (length(jeton_hash) = 64),
  espace_id uuid not null unique references public.espaces(id) on delete cascade,
  donnees jsonb not null default '{}'::jsonb check (octet_length(donnees::text) < 3000000),
  maj_le timestamptz not null default now(),
  lu_le timestamptz
);
alter table public.connecteurs enable row level security;
drop policy if exists connecteurs_lire on public.connecteurs;
create policy connecteurs_lire on public.connecteurs for select to authenticated using (public.est_membre(espace_id));
drop policy if exists connecteurs_ajouter on public.connecteurs;
create policy connecteurs_ajouter on public.connecteurs for insert to authenticated with check (public.est_proprietaire(espace_id));
drop policy if exists connecteurs_modifier on public.connecteurs;
create policy connecteurs_modifier on public.connecteurs for update to authenticated using (public.est_editeur(espace_id)) with check (public.est_editeur(espace_id));
drop policy if exists connecteurs_supprimer on public.connecteurs;
create policy connecteurs_supprimer on public.connecteurs for delete to authenticated using (public.est_proprietaire(espace_id));
