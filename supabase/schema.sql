-- Gestion locative : un « espace » par propriétaire (une SCI, des biens perso…).
-- Chaque donnée appartient à un espace ; seuls les membres de l'espace la voient (règles RLS).

create extension if not exists pg_net with schema extensions;

create table if not exists public.espaces (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(trim(nom)) between 1 and 120),
  cree_par uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cree_le timestamptz not null default now()
);

create table if not exists public.membres (
  espace_id uuid not null references public.espaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  role text not null default 'membre' check (role in ('proprietaire', 'membre')),
  ajoute_le timestamptz not null default now(),
  primary key (espace_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces(id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  invite_par uuid default auth.uid(),
  cree_le timestamptz not null default now(),
  unique (espace_id, email)
);

create table if not exists public.docs (
  espace_id uuid not null references public.espaces(id) on delete cascade,
  coll text not null check (coll in ('biens', 'baux', 'paiements', 'depenses', 'relances', 'rappels', 'taxes', 'meta')),
  doc_id text not null check (length(doc_id) between 1 and 120),
  data jsonb not null,
  maj_le timestamptz not null default now(),
  maj_par uuid default auth.uid(),
  primary key (espace_id, coll, doc_id)
);
create index if not exists docs_espace_idx on public.docs (espace_id);

-- Envois d'e-mails (journal)
create table if not exists public.envois (
  id bigserial primary key,
  espace_id uuid not null references public.espaces(id) on delete cascade,
  par uuid default auth.uid(),
  destinataires text[] not null,
  objet text,
  requete_id bigint,
  cree_le timestamptz not null default now()
);

-- Est-ce que la personne connectée fait partie de l'espace ?
create or replace function public.est_membre(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membres m where m.espace_id = e and m.user_id = auth.uid());
$$;
create or replace function public.est_proprietaire(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membres m where m.espace_id = e and m.user_id = auth.uid() and m.role = 'proprietaire');
$$;

alter table public.espaces enable row level security;
alter table public.membres enable row level security;
alter table public.invitations enable row level security;
alter table public.docs enable row level security;
alter table public.envois enable row level security;

drop policy if exists espaces_lire on public.espaces;
create policy espaces_lire on public.espaces for select to authenticated using (public.est_membre(id));
drop policy if exists espaces_renommer on public.espaces;
create policy espaces_renommer on public.espaces for update to authenticated using (public.est_membre(id)) with check (public.est_membre(id));
drop policy if exists espaces_supprimer on public.espaces;
create policy espaces_supprimer on public.espaces for delete to authenticated using (public.est_proprietaire(id));

drop policy if exists membres_lire on public.membres;
create policy membres_lire on public.membres for select to authenticated using (public.est_membre(espace_id));
drop policy if exists membres_retirer on public.membres;
create policy membres_retirer on public.membres for delete to authenticated using (public.est_proprietaire(espace_id) or user_id = auth.uid());

drop policy if exists invitations_lire on public.invitations;
create policy invitations_lire on public.invitations for select to authenticated using (public.est_membre(espace_id) or lower(email) = lower(auth.jwt() ->> 'email'));
drop policy if exists invitations_creer on public.invitations;
create policy invitations_creer on public.invitations for insert to authenticated with check (public.est_membre(espace_id));
drop policy if exists invitations_annuler on public.invitations;
create policy invitations_annuler on public.invitations for delete to authenticated using (public.est_membre(espace_id));

drop policy if exists docs_tout on public.docs;
create policy docs_tout on public.docs for all to authenticated using (public.est_membre(espace_id)) with check (public.est_membre(espace_id));

drop policy if exists envois_lire on public.envois;
create policy envois_lire on public.envois for select to authenticated using (public.est_membre(espace_id));

-- Créer un espace : la personne qui le crée en devient propriétaire
create or replace function public.creer_espace(nom text) returns uuid
language plpgsql security definer set search_path = public as $$
declare nouvel uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  insert into public.espaces (nom, cree_par) values (trim(nom), auth.uid()) returning id into nouvel;
  insert into public.membres (espace_id, user_id, email, role) values (nouvel, auth.uid(), auth.jwt() ->> 'email', 'proprietaire');
  return nouvel;
end $$;

-- À la connexion : rejoindre les espaces où l'on a été invité
create or replace function public.accepter_invitations() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0; mail text := lower(auth.jwt() ->> 'email');
begin
  if auth.uid() is null or mail is null then return 0; end if;
  insert into public.membres (espace_id, user_id, email, role)
    select i.espace_id, auth.uid(), mail, 'membre' from public.invitations i where lower(i.email) = mail
    on conflict do nothing;
  get diagnostics n = row_count;
  delete from public.invitations where lower(email) = mail;
  return n;
end $$;

-- Envoyer un e-mail (quittance, relance…) via Brevo, avec la clé gardée côté serveur (coffre « vault »)
create or replace function public.envoyer_mail(espace uuid, a text[], objet text, texte text, nom_fichier text default null, pdf_base64 text default null, repondre_a text default null)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare cle text; expediteur text; nom_exp text; corps jsonb; req bigint;
begin
  if not public.est_membre(espace) then raise exception 'Accès refusé'; end if;
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

-- Résultat d'un envoi (Brevo répond 201 si accepté)
create or replace function public.statut_envoi(requete bigint) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r record;
begin
  if not exists (select 1 from public.envois e where e.requete_id = requete and public.est_membre(e.espace_id)) then raise exception 'Accès refusé'; end if;
  select status_code, left(content, 300) as content, error_msg into r from net._http_response where id = requete;
  if not found then return jsonb_build_object('etat', 'en_cours'); end if;
  return jsonb_build_object('etat', case when r.status_code between 200 and 299 then 'ok' else 'erreur' end, 'code', r.status_code, 'detail', coalesce(r.error_msg, r.content));
end $$;

revoke all on function public.envoyer_mail(uuid, text[], text, text, text, text, text) from public, anon;
grant execute on function public.envoyer_mail(uuid, text[], text, text, text, text, text) to authenticated;
revoke all on function public.statut_envoi(bigint) from public, anon;
grant execute on function public.statut_envoi(bigint) to authenticated;
revoke all on function public.creer_espace(text) from public, anon;
grant execute on function public.creer_espace(text) to authenticated;
revoke all on function public.accepter_invitations() from public, anon;
grant execute on function public.accepter_invitations() to authenticated;

-- Mises à jour en direct entre associés
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'docs') then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;
alter table public.docs replica identity full;
