-- Notifications : alertes sur le téléphone (Web Push) et résumé du mois par e-mail
create table if not exists public.push_abonnements (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh text not null, auth text not null,
  appareil text, cree_le timestamptz not null default now()
);
create table if not exists public.notif_prefs (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  push boolean not null default true,
  resume boolean not null default false,
  maj_le timestamptz not null default now()
);
create table if not exists public.notif_envoyes (cle text primary key, cree_le timestamptz not null default now());
alter table public.push_abonnements enable row level security;
alter table public.notif_prefs enable row level security;
alter table public.notif_envoyes enable row level security;
drop policy if exists push_moi on public.push_abonnements;
create policy push_moi on public.push_abonnements for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists prefs_moi on public.notif_prefs;
create policy prefs_moi on public.notif_prefs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tous les jours à 8 h (heure de Paris en hiver) : la fonction « notifier » regarde chaque espace
create extension if not exists pg_cron;
select cron.unschedule('notifier') where exists (select 1 from cron.job where jobname = 'notifier');
select cron.schedule('notifier', '5 7 * * *', $$
  select net.http_post(url := 'https://bcfcrqmpeyaoovluvhhn.supabase.co/functions/v1/notifier',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cle-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'cle_cron_notifier')),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
$$);
