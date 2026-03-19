-- Dossier verrouillé Marketing/Presskit dans l'espace Documents.
-- Crée le template et provisionne le dossier pour tous les utilisateurs existants.

insert into public.drive_locked_storage_templates (path, is_active)
values ('Marketing/Presskit', true)
on conflict (path) do update set is_active = true;

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
