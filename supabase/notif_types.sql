-- Notifications par type et par canal (téléphone / e-mail) : { "loyer_recu": { "push": true, "mail": false }, ... }
alter table public.notif_prefs add column if not exists types jsonb not null default '{}'::jsonb;
