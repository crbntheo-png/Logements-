-- Banque en direct (Enable Banking, accès DSP2 en lecture seule) : la session de la banque de chaque espace.
-- Les opérations et soldes vont dans les mêmes tables que Pennylane (banque, banque_comptes, banque_liens source = 'enablebanking').
create table if not exists public.banque_directe (
  espace_id uuid primary key references public.espaces(id) on delete cascade,
  banque text not null,
  type_compte text not null default 'business',
  etat text,                      -- jeton "state" pendant la connexion à la banque
  session_id text,
  comptes jsonb not null default '[]'::jsonb,
  valide_jusqua timestamptz,
  maj_le timestamptz not null default now()
);
alter table public.banque_directe enable row level security;
drop policy if exists banque_directe_lire on public.banque_directe;
create policy banque_directe_lire on public.banque_directe for select to authenticated using (public.est_membre(espace_id));
-- écriture : seulement la fonction serveur "banque-directe" (clé de service)
