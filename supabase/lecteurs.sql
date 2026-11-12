-- Accès en lecture seule (associé qui regarde, comptable) : rôle « lecteur »
alter table public.membres drop constraint if exists membres_role_check;
alter table public.membres add constraint membres_role_check check (role in ('proprietaire', 'membre', 'lecteur'));
alter table public.invitations add column if not exists role text not null default 'membre';
alter table public.invitations drop constraint if exists invitations_role_check;
alter table public.invitations add constraint invitations_role_check check (role in ('membre', 'lecteur'));

-- Peut modifier : propriétaire ou membre (pas lecteur)
create or replace function public.est_editeur(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membres m where m.espace_id = e and m.user_id = auth.uid() and m.role in ('proprietaire', 'membre'));
$$;
grant execute on function public.est_editeur(uuid) to authenticated;

drop policy if exists docs_tout on public.docs;
drop policy if exists docs_lire on public.docs;
drop policy if exists docs_ajouter on public.docs;
drop policy if exists docs_modifier on public.docs;
drop policy if exists docs_supprimer on public.docs;
create policy docs_lire on public.docs for select to authenticated using (public.est_membre(espace_id));
create policy docs_ajouter on public.docs for insert to authenticated with check (public.est_editeur(espace_id));
create policy docs_modifier on public.docs for update to authenticated using (public.est_editeur(espace_id)) with check (public.est_editeur(espace_id));
create policy docs_supprimer on public.docs for delete to authenticated using (public.est_editeur(espace_id));

drop policy if exists documents_ajouter on storage.objects;
create policy documents_ajouter on storage.objects for insert to authenticated with check (bucket_id = 'documents' and public.est_editeur(public.photo_espace(name)));
drop policy if exists documents_supprimer on storage.objects;
create policy documents_supprimer on storage.objects for delete to authenticated using (bucket_id = 'documents' and public.est_editeur(public.photo_espace(name)));
drop policy if exists photos_ajouter on storage.objects;
create policy photos_ajouter on storage.objects for insert to authenticated with check (bucket_id = 'photos' and public.est_editeur(public.photo_espace(name)));
drop policy if exists photos_supprimer on storage.objects;
create policy photos_supprimer on storage.objects for delete to authenticated using (bucket_id = 'photos' and public.est_editeur(public.photo_espace(name)));

drop policy if exists invitations_creer on public.invitations;
create policy invitations_creer on public.invitations for insert to authenticated with check (public.est_editeur(espace_id));

-- À la connexion : rejoindre les espaces où l'on a été invité, avec le bon rôle
create or replace function public.accepter_invitations() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0; mail text := lower(auth.jwt() ->> 'email');
begin
  if auth.uid() is null or mail is null then return 0; end if;
  insert into public.membres (espace_id, user_id, email, role)
    select i.espace_id, auth.uid(), mail, coalesce(i.role, 'membre') from public.invitations i where lower(i.email) = mail
    on conflict do nothing;
  get diagnostics n = row_count;
  delete from public.invitations where lower(email) = mail;
  return n;
end $$;

-- Le propriétaire change le rôle d'un membre (modifier / lecture seule)
create or replace function public.changer_role(e uuid, u uuid, r text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_proprietaire(e) then raise exception 'Seul le propriétaire de l''espace peut faire ça'; end if;
  if r not in ('membre', 'lecteur') then raise exception 'Rôle inconnu'; end if;
  update public.membres set role = r where espace_id = e and user_id = u and role <> 'proprietaire';
end $$;
revoke all on function public.changer_role(uuid, uuid, text) from public, anon;
grant execute on function public.changer_role(uuid, uuid, text) to authenticated;


-- Envoyer des e-mails : seulement ceux qui peuvent modifier
create or replace function public.envoyer_mail(espace uuid, a text[], objet text, texte text, nom_fichier text default null, pdf_base64 text default null, repondre_a text default null)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare cle text; expediteur text; nom_exp text; corps jsonb; req bigint;
begin
  if not public.est_editeur(espace) then raise exception 'Accès en lecture seule : tu ne peux pas envoyer de message'; end if;
  if a is null or array_length(a, 1) is null then raise exception 'Destinataire manquant'; end if;
  select decrypted_secret into cle from vault.decrypted_secrets where name = 'brevo_api_key';
  select decrypted_secret into expediteur from vault.decrypted_secrets where name = 'brevo_sender';
  if cle is null or expediteur is null then raise exception 'Envoi d''e-mails pas encore configuré'; end if;
  select nom into nom_exp from public.espaces where id = espace;
  corps := jsonb_build_object(
    'sender', jsonb_build_object('name', nom_exp, 'email', expediteur),
    'to', (select jsonb_agg(jsonb_build_object('email', x)) from unnest(a) x),
    'subject', objet,
    'textContent', texte,
    'replyTo', jsonb_build_object('email', coalesce(repondre_a, auth.jwt() ->> 'email', expediteur))
  );
  if pdf_base64 is not null then
    corps := corps || jsonb_build_object('attachment', jsonb_build_array(jsonb_build_object('name', coalesce(nom_fichier, 'document.pdf'), 'content', pdf_base64)));
  end if;
  select net.http_post(url := 'https://api.brevo.com/v3/smtp/email', body := corps,
    headers := jsonb_build_object('api-key', cle, 'content-type', 'application/json', 'accept', 'application/json'), timeout_milliseconds := 15000) into req;
  insert into public.envois (espace_id, destinataires, objet, requete_id) values (espace, a, objet, req);
  return req;
end $$;
drop function if exists public.envoyer_mail_garde();
