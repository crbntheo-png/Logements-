-- Erreurs de l'appli chez les utilisateurs : notées toutes seules (sans données personnelles) pour être corrigées.
-- Personne ne peut les lire depuis l'appli : seulement l'administrateur (SQL).
create table if not exists public.erreurs (
  id bigserial primary key,
  cree_le timestamptz not null default now(),
  user_id uuid default auth.uid(),
  espace_id uuid,
  version text check (length(version) <= 40),
  page text check (length(page) <= 60),
  message text not null check (length(message) between 1 and 400),
  pile text check (length(pile) <= 1200),
  navigateur text check (length(navigateur) <= 200)
);
alter table public.erreurs enable row level security;
create index if not exists erreurs_cree_le on public.erreurs (cree_le desc);

create or replace function public.noter_erreur(version text, page text, message text, pile text, navigateur text, espace uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- au plus 30 par personne (ou par visiteur non connecté, tous ensemble : 200) par heure
  if auth.uid() is not null and (select count(*) from public.erreurs e where e.user_id = auth.uid() and e.cree_le > now() - interval '1 hour') >= 30 then return; end if;
  if auth.uid() is null and (select count(*) from public.erreurs e where e.user_id is null and e.cree_le > now() - interval '1 hour') >= 200 then return; end if;
  if espace is not null and (auth.uid() is null or not public.est_membre(espace)) then espace := null; end if;
  insert into public.erreurs (version, page, message, pile, navigateur, espace_id)
  values (left(version, 40), left(page, 60), left(coalesce(nullif(message, ''), '?'), 400), left(pile, 1200), left(navigateur, 200), espace);
end $$;
revoke all on function public.noter_erreur(text, text, text, text, text, uuid) from public;
grant execute on function public.noter_erreur(text, text, text, text, text, uuid) to anon, authenticated;
