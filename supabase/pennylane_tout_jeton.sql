-- 18/11/2026 (demande de Théo) : on accepte aussi un jeton Pennylane qui a des droits d'écriture.
-- Garantie : l'appli ne fait QUE des lectures chez Pennylane (requêtes GET sur /me, /bank_accounts, /transactions, rien d'autre),
-- et le jeton reste dans le coffre du serveur (jamais renvoyé à l'appli).
create or replace function public.banque_brancher(e uuid, jeton text) returns integer
language plpgsql security definer set search_path = public as $$
declare rep extensions.http_response;
begin
  if not public.est_proprietaire(e) then raise exception 'Seul le propriétaire de l''espace peut brancher la banque.'; end if;
  jeton := regexp_replace(coalesce(jeton, ''), '\s', '', 'g');
  if length(jeton) < 20 then raise exception 'Ce n''est pas un jeton Pennylane : colle le long code copié juste après sa création.'; end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');
  select * into rep from extensions.http(('GET', 'https://app.pennylane.com/api/external/v2/me',
    array[extensions.http_header('Authorization', 'Bearer ' || jeton)], null, null)::extensions.http_request);
  if rep.status = 401 then raise exception 'Pennylane ne reconnaît pas ce jeton : il est incomplet, expiré ou supprimé. Recopie-le en entier ou crée-en un nouveau.'; end if;
  if rep.status <> 200 then raise exception 'Pennylane a refusé le jeton (code %). Réessaie dans un instant.', rep.status; end if;
  -- les deux droits de lecture dont l'appli a besoin
  select * into rep from extensions.http(('GET', 'https://app.pennylane.com/api/external/v2/bank_accounts',
    array[extensions.http_header('Authorization', 'Bearer ' || jeton)], null, null)::extensions.http_request);
  if rep.status = 403 then raise exception 'Le jeton marche, mais il n''a pas le droit de lire les comptes bancaires. Recrée-le en cochant "Comptes bancaires" et "Transactions".'; end if;
  select * into rep from extensions.http(('GET', 'https://app.pennylane.com/api/external/v2/transactions?limit=1',
    array[extensions.http_header('Authorization', 'Bearer ' || jeton)], null, null)::extensions.http_request);
  if rep.status = 403 then raise exception 'Le jeton marche, mais il n''a pas le droit de lire les opérations. Recrée-le en cochant "Comptes bancaires" et "Transactions".'; end if;
  if exists (select 1 from vault.secrets where name = 'pennylane_' || e) then
    perform vault.update_secret((select id from vault.secrets where name = 'pennylane_' || e), jeton);
  else perform vault.create_secret(jeton, 'pennylane_' || e); end if;
  insert into public.banque_liens (espace_id) values (e) on conflict (espace_id) do update set erreur = null, source = 'pennylane';
  return public.pennylane_synchro_espace(e);
end $$;
