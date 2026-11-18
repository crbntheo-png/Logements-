-- Prochaines sorties : chacun dit "ça m'intéresse" ; les fonctions les plus attendues sortent en premier.
create table if not exists public.envies (
  fonction text not null check (fonction ~ '^[a-z0-9-]{2,40}$'),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (fonction, user_id)
);
alter table public.envies enable row level security;
drop policy if exists envies_lire on public.envies;
create policy envies_lire on public.envies for select to authenticated using (user_id = auth.uid());
drop policy if exists envies_ajouter on public.envies;
create policy envies_ajouter on public.envies for insert to authenticated with check (user_id = auth.uid());
drop policy if exists envies_retirer on public.envies;
create policy envies_retirer on public.envies for delete to authenticated using (user_id = auth.uid());
create or replace function public.envies_compte() returns table (fonction text, nb bigint)
language sql stable security definer set search_path = public as $$ select fonction, count(*) from public.envies group by fonction $$;
revoke all on function public.envies_compte() from public, anon;
grant execute on function public.envies_compte() to authenticated;
