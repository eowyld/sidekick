-- Ajoute un dossier verrouille imbrique dans Marketing:
-- "Marketing/Calendrier éditorial"
-- puis applique aux utilisateurs existants.

do $$
begin
  if to_regprocedure('public.add_locked_drive_template(text, boolean)') is not null then
    perform public.add_locked_drive_template('Marketing/Calendrier éditorial', true);
  else
    insert into public.drive_locked_storage_templates (path, is_active)
    values ('Marketing/Calendrier éditorial', true)
    on conflict (path) do update
    set is_active = true;

    if to_regprocedure('public.backfill_locked_drive_templates()') is not null then
      perform public.backfill_locked_drive_templates();
    else
      perform public.provision_locked_drive_storage_for_user(u.id)
      from auth.users u;
    end if;
  end if;
end $$;
