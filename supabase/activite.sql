-- Activité entre associés : qui a ajouté / modifié / supprimé quoi (pour éviter les doublons, ex. deux relances du même locataire)
alter table public.docs add column if not exists cree_le timestamptz not null default now();
create or replace function public.docs_auteur() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then new.maj_par := auth.uid(); end if;
  if tg_op = 'UPDATE' then new.cree_le := old.cree_le; end if;
  return new;
end $$;
drop trigger if exists docs_auteur on public.docs;
create trigger docs_auteur before insert or update on public.docs for each row execute function public.docs_auteur();

create table if not exists public.docs_supprimes (
  id bigserial primary key,
  espace_id uuid not null references public.espaces(id) on delete cascade,
  coll text not null, doc_id text not null, data jsonb,
  par uuid, le timestamptz not null default now()
);
create index if not exists docs_supprimes_espace on public.docs_supprimes (espace_id, le desc);
alter table public.docs_supprimes enable row level security;
drop policy if exists docs_supprimes_lire on public.docs_supprimes;
create policy docs_supprimes_lire on public.docs_supprimes for select to authenticated using (public.est_membre(espace_id));
create or replace function public.docs_suppression() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and old.coll in ('paiements', 'depenses', 'baux', 'biens') then
    insert into public.docs_supprimes (espace_id, coll, doc_id, data, par) values (old.espace_id, old.coll, old.doc_id, old.data, auth.uid());
  end if;
  delete from public.docs_supprimes where le < now() - interval '60 days';
  return old;
end $$;
drop trigger if exists docs_suppression on public.docs;
create trigger docs_suppression after delete on public.docs for each row execute function public.docs_suppression();
