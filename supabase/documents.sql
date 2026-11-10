-- Documents par bien (PDF, photos, scans) : stockage privé, rangé par espace
alter table public.docs drop constraint if exists docs_coll_check;
alter table public.docs add constraint docs_coll_check check (coll in ('biens', 'baux', 'paiements', 'depenses', 'relances', 'rappels', 'taxes', 'meta', 'edl', 'fichiers'));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists documents_lire on storage.objects;
create policy documents_lire on storage.objects for select to authenticated using (bucket_id = 'documents' and public.est_membre(public.photo_espace(name)));
drop policy if exists documents_ajouter on storage.objects;
create policy documents_ajouter on storage.objects for insert to authenticated with check (bucket_id = 'documents' and public.est_membre(public.photo_espace(name)));
drop policy if exists documents_supprimer on storage.objects;
create policy documents_supprimer on storage.objects for delete to authenticated using (bucket_id = 'documents' and public.est_membre(public.photo_espace(name)));
