-- 16/11/2026 : plus aucun e-mail envoyé par un serveur commun (Brevo).
-- Chacun envoie depuis son propre Gmail branché (fonction envoyer-gmail). Remplace envoyer_mail et l'envoi des signalements.

-- 1. Envoi de documents par le serveur : fermé
create or replace function public.envoyer_mail(espace uuid, a text[], objet text, texte text, nom_fichier text default null, pdf_base64 text default null, repondre_a text default null)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  raise exception 'L''appli n''envoie plus d''e-mails par son serveur : branche ton Gmail (Réglages › Envoi des e-mails).';
end $$;
revoke all on function public.envoyer_mail(uuid, text[], text, text, text, text, text) from public, anon, authenticated;

-- 2. Destinataire des signalements (réservé au serveur)
create or replace function public.admin_destinataire() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('email', a.decrypted_secret, 'user_id', (select id from auth.users u where lower(u.email) = lower(a.decrypted_secret)))
  from vault.decrypted_secrets a where a.name = 'admin_email';
$$;
revoke all on function public.admin_destinataire() from public, anon, authenticated;
grant execute on function public.admin_destinataire() to service_role;

-- 3. Signalements : gardés dans la table ; l'alerte part du Gmail de l'administrateur (fonction notifier), pas de Brevo
create or replace function public.signaler(type text, message text, page text, contexte jsonb, capture_b64 text default null)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare nid bigint; esp uuid; mail text := auth.jwt() ->> 'email';
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if (select count(*) from public.signalements s where s.user_id = auth.uid() and s.cree_le > now() - interval '1 day') >= 30 then raise exception 'Trop de messages aujourd''hui, réessaie demain'; end if;
  if capture_b64 is not null and length(capture_b64) > 3000000 then capture_b64 := null; end if;
  esp := nullif(contexte ->> 'espace', '')::uuid;
  if esp is not null and not public.est_membre(esp) then esp := null; end if;
  insert into public.signalements (email, espace_id, type, message, page, contexte, capture_b64) values (mail, esp, type, message, page, contexte, capture_b64) returning id into nid;
  perform net.http_post(url := 'https://bcfcrqmpeyaoovluvhhn.supabase.co/functions/v1/notifier',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cle-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'cle_cron_notifier')),
    body := jsonb_build_object('signalement', nid), timeout_milliseconds := 30000);
  return nid;
end $$;
revoke all on function public.signaler(text, text, text, jsonb, text) from public, anon;
grant execute on function public.signaler(text, text, text, jsonb, text) to authenticated;
