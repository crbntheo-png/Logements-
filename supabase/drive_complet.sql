-- Drive "dossiers entiers" : un second projet Google (lecture seule de tout le Drive) à côté de "fichiers choisis" (drive.file)
-- mode = 'choix' (drive.file, projet principal) ou 'complet' (drive.readonly, projet Drive) : le serveur renouvelle avec le bon client
alter table public.drive_comptes add column if not exists mode text not null default 'choix';
