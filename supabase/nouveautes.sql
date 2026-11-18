-- Canal "Quoi de neuf" : chaque mise à jour visible de l'appli, en une phrase simple. Lu par tous les utilisateurs
-- connectés ; écrit seulement par l'équipe (tests/nouveaute.py). annonce_le : la notification est déjà partie (jamais deux fois).
create table if not exists public.nouveautes (
  id text primary key check (length(id) between 3 and 80),
  date date not null default current_date,
  icone text not null default '🆕',
  titre text not null check (length(titre) between 3 and 120),
  texte text not null check (length(texte) between 3 and 600),
  lien text check (lien is null or lien ~ '^#[a-z0-9-]*$'),
  annonce_le timestamptz,
  cree_le timestamptz not null default now()
);
alter table public.nouveautes enable row level security;
drop policy if exists nouveautes_lire on public.nouveautes;
create policy nouveautes_lire on public.nouveautes for select to authenticated using (true);
