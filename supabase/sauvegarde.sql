-- Copie de sauvegarde envoyée chaque semaine par e-mail au propriétaire de l'espace (14/11/2026)
-- Le projet est sur l'offre gratuite de Supabase : aucune sauvegarde automatique côté Supabase.
create table if not exists public.sauvegarde_hebdo (
  espace_id uuid primary key references public.espaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  derniere timestamptz,
  erreur text
);
alter table public.sauvegarde_hebdo enable row level security;
drop policy if exists sauvegarde_lire on public.sauvegarde_hebdo;
create policy sauvegarde_lire on public.sauvegarde_hebdo for select to authenticated using (public.est_membre(espace_id));

create or replace function public.sauvegarde_activer(e uuid, actif boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_proprietaire(e) then raise exception 'Seul le propriétaire de l''espace peut recevoir la copie de sauvegarde.'; end if;
  insert into public.sauvegarde_hebdo (espace_id, user_id, active) values (e, auth.uid(), actif)
    on conflict (espace_id) do update set user_id = auth.uid(), active = actif, erreur = null;
end $$;
revoke all on function public.sauvegarde_activer(uuid, boolean) from public, anon;
grant execute on function public.sauvegarde_activer(uuid, boolean) to authenticated;

-- Chaque lundi à 6 h UTC (7 h à Paris en hiver, 8 h en été)
select cron.unschedule('sauvegarde') where exists (select 1 from cron.job where jobname = 'sauvegarde');
select cron.schedule('sauvegarde', '0 6 * * 1', $$
  select net.http_post(url := 'https://bcfcrqmpeyaoovluvhhn.supabase.co/functions/v1/sauvegarde',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cle-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'cle_cron_notifier')),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
$$);
