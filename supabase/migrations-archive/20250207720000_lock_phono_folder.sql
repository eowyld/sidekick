-- Verrouille le dossier Phono (correction du template "Phone").
-- 1) Active/cree le template "Phono"
-- 2) Desactive l'ancien template "Phone" s'il existe
-- 3) Re-provisionne les utilisateurs existants

insert into public.drive_locked_storage_templates (path, is_active)
values ('Phono', true)
on conflict (path) do update
set is_active = true;

update public.drive_locked_storage_templates
set is_active = false
where lower(path) = 'phone';

do $$
declare
  u record;
begin
  if to_regprocedure('public.backfill_locked_drive_templates()') is not null then
    perform public.backfill_locked_drive_templates();
  else
    for u in select id from auth.users loop
      perform public.provision_locked_drive_storage_for_user(u.id);
    end loop;
  end if;
end $$;
