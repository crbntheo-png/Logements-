-- États des lieux : nouvelle collection + photos dans un espace de stockage privé, rangé par espace
alter table public.docs drop constraint if exists docs_coll_check;
alter table public.docs add constraint docs_coll_check check (coll in ('biens', 'baux', 'paiements', 'depenses', 'relances', 'rappels', 'taxes', 'meta', 'edl'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Le 1er dossier du chemin est l'identifiant de l'espace : seuls ses membres y accèdent
create or replace function public.photo_espace(nom text) returns uuid
language sql immutable as $$ select case when split_part(nom, '/', 1) ~ '^[0-9a-f-]{36}$' then split_part(nom, '/', 1)::uuid end $$;
drop policy if exists photos_lire on storage.objects;
create policy photos_lire on storage.objects for select to authenticated using (bucket_id = 'photos' and public.est_membre(public.photo_espace(name)));
drop policy if exists photos_ajouter on storage.objects;
create policy photos_ajouter on storage.objects for insert to authenticated with check (bucket_id = 'photos' and public.est_membre(public.photo_espace(name)));
drop policy if exists photos_supprimer on storage.objects;
create policy photos_supprimer on storage.objects for delete to authenticated using (bucket_id = 'photos' and public.est_membre(public.photo_espace(name)));
