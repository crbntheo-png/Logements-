-- Quand la banque directe remplace Pennylane : on oublie le jeton et les opérations Pennylane de l'espace (la banque directe les relit)
create or replace function public.banque_vider_pennylane(e uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  delete from vault.secrets where name = 'pennylane_' || e;
  delete from public.banque where espace_id = e; delete from public.banque_comptes where espace_id = e;
end $$;
revoke all on function public.banque_vider_pennylane(uuid) from public, anon, authenticated;
