-- Connecteur Claude : "ranger avec Claude" (écriture) seulement si le propriétaire l'autorise. Jamais de suppression ni d'envoi.
alter table public.connecteurs add column if not exists ecriture boolean not null default false;
-- les éditeurs peuvent republier les chiffres, mais seul le propriétaire change l'autorisation d'écrire (fonction ci-dessous)
revoke update on public.connecteurs from authenticated;
grant update (donnees, maj_le) on public.connecteurs to authenticated;
create or replace function public.connecteur_ecriture(e uuid, oui boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_proprietaire(e) then raise exception 'Seul le propriétaire de l''espace peut autoriser Claude à ranger.'; end if;
  update public.connecteurs set ecriture = oui where espace_id = e;
end $$;
revoke all on function public.connecteur_ecriture(uuid, boolean) from public, anon;
grant execute on function public.connecteur_ecriture(uuid, boolean) to authenticated;
