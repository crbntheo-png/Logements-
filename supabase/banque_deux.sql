-- Banque directe ET Pennylane en même temps (18/11/2026) : chaque opération et chaque compte savent d'où ils viennent.
-- banque_liens = Pennylane seulement ; banque_directe = état de la banque directe (dernière lecture, erreur).
alter table public.banque add column if not exists source text not null default 'pennylane';
alter table public.banque_comptes add column if not exists source text not null default 'pennylane';
alter table public.banque_directe add column if not exists derniere_synchro timestamptz;
alter table public.banque_directe add column if not exists erreur text;
-- ce qui est déjà là pour GTP vient de la banque directe
update public.banque b set source = 'enablebanking' from public.banque_liens l where l.espace_id = b.espace_id and l.source = 'enablebanking';
update public.banque_comptes b set source = 'enablebanking' from public.banque_liens l where l.espace_id = b.espace_id and l.source = 'enablebanking';
update public.banque_directe d set derniere_synchro = l.derniere_synchro, erreur = l.erreur from public.banque_liens l where l.espace_id = d.espace_id and l.source = 'enablebanking';
delete from public.banque_liens where source = 'enablebanking';
-- débrancher Pennylane n'efface plus que ce qui vient de Pennylane
create or replace function public.banque_debrancher(e uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_proprietaire(e) then raise exception 'Seul le propriétaire de l''espace peut débrancher la banque.'; end if;
  delete from vault.secrets where name = 'pennylane_' || e;
  delete from public.banque_liens where espace_id = e;
  delete from public.banque where espace_id = e and source = 'pennylane';
  delete from public.banque_comptes where espace_id = e and source = 'pennylane';
end $$;
drop function if exists public.banque_vider_pennylane(uuid);
