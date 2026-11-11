-- Signalements (bug, idée, question) envoyés depuis l'appli, transmis par e-mail à l'administrateur
create table if not exists public.signalements (
  id bigserial primary key,
  user_id uuid default auth.uid(),
  email text,
  espace_id uuid,
  type text not null check (type in ('bug', 'idee', 'question')),
  message text not null check (length(message) between 1 and 5000),
  page text,
  contexte jsonb,
  capture_b64 text,
  cree_le timestamptz not null default now(),
  statut text not null default 'nouveau'
);
alter table public.signalements enable row level security;
drop policy if exists signalements_lire on public.signalements;
create policy signalements_lire on public.signalements for select to authenticated using (user_id = auth.uid());

create or replace function public.signaler(type text, message text, page text, contexte jsonb, capture_b64 text default null)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare cle text; expediteur text; admin text; nid bigint; nom_esp text; esp uuid; corps jsonb; mail text := auth.jwt() ->> 'email';
  libelle text := case type when 'bug' then 'Problème' when 'idee' then 'Idée' else 'Question' end;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if (select count(*) from public.signalements s where s.user_id = auth.uid() and s.cree_le > now() - interval '1 day') >= 30 then raise exception 'Trop de messages aujourd''hui, réessaie demain'; end if;
  if capture_b64 is not null and length(capture_b64) > 3000000 then capture_b64 := null; end if;
  esp := nullif(contexte ->> 'espace', '')::uuid;
  if esp is not null and not public.est_membre(esp) then esp := null; end if;
  insert into public.signalements (email, espace_id, type, message, page, contexte, capture_b64) values (mail, esp, type, message, page, contexte, capture_b64) returning id into nid;
  select decrypted_secret into cle from vault.decrypted_secrets where name = 'brevo_api_key';
  select decrypted_secret into expediteur from vault.decrypted_secrets where name = 'brevo_sender';
  select decrypted_secret into admin from vault.decrypted_secrets where name = 'admin_email';
  select nom into nom_esp from public.espaces where id = esp;
  if cle is not null and expediteur is not null and admin is not null then
    corps := jsonb_build_object('sender', jsonb_build_object('name', 'Gestion SCI – signalements', 'email', expediteur),
      'to', jsonb_build_array(jsonb_build_object('email', admin)), 'replyTo', jsonb_build_object('email', coalesce(mail, admin)),
      'subject', '[' || libelle || ' n°' || nid || '] ' || left(regexp_replace(message, '\s+', ' ', 'g'), 70),
      'textContent', libelle || ' envoyé(e) par ' || coalesce(mail, '?') || coalesce(' (espace « ' || nom_esp || ' »)', '') || E'\n\n' || message
        || E'\n\n— Page : ' || coalesce(page, '?') || E'\n— Appareil : ' || coalesce(contexte ->> 'appareil', '?') || E'\n— Écran : ' || coalesce(contexte ->> 'ecran', '?')
        || E'\n— Date : ' || to_char(now() at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI') || E'\n\nRéponds directement à ce mail pour répondre à la personne.');
    if capture_b64 is not null then corps := corps || jsonb_build_object('attachment', jsonb_build_array(jsonb_build_object('name', 'capture-' || nid || '.jpg', 'content', capture_b64))); end if;
    perform net.http_post(url := 'https://api.brevo.com/v3/smtp/email', body := corps,
      headers := jsonb_build_object('api-key', cle, 'content-type', 'application/json', 'accept', 'application/json'), timeout_milliseconds := 15000);
  end if;
  return nid;
end $$;
revoke all on function public.signaler(text, text, text, jsonb, text) from public, anon;
grant execute on function public.signaler(text, text, text, jsonb, text) to authenticated;
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'admin_email') then perform vault.create_secret('crbntheo@gmail.com', 'admin_email'); end if;
end $$;
