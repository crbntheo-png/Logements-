-- Analyse du Drive par l'IA : compteur par personne et par jour (limite les abus, l'appli paie les appels)
create table if not exists public.ia_usage (user_id uuid not null references auth.users(id) on delete cascade, jour date not null default current_date, nb int not null default 0, primary key (user_id, jour));
alter table public.ia_usage enable row level security;
create or replace function public.ia_compter(u uuid, maxi int) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.ia_usage (user_id, jour, nb) values (u, current_date, 1)
    on conflict (user_id, jour) do update set nb = ia_usage.nb + 1 returning nb into n;
  return case when n > maxi then -1 else n end;
end $$;
revoke all on function public.ia_compter(uuid, int) from public, anon, authenticated;
grant execute on function public.ia_compter(uuid, int) to service_role;
