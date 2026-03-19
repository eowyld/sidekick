-- Helpers admin pour gerer les templates de dossiers verrouilles
-- et les appliquer facilement aux utilisateurs existants.

create or replace function public.backfill_locked_drive_templates()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
begin
  for u in select id from auth.users loop
    perform public.provision_locked_drive_storage_for_user(u.id);
  end loop;
end;
$$;

comment on function public.backfill_locked_drive_templates() is
  'Re-applique tous les templates verrouilles actifs a tous les utilisateurs existants.';

create or replace function public.add_locked_drive_template(
  p_path text,
  p_backfill boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_path text;
begin
  normalized_path := public.normalize_drive_locked_path(p_path);

  if normalized_path = '' then
    raise exception 'Locked template path cannot be empty';
  end if;

  insert into public.drive_locked_storage_templates (path, is_active)
  values (normalized_path, true)
  on conflict (path) do update set is_active = true;

  if p_backfill then
    perform public.backfill_locked_drive_templates();
  end if;
end;
$$;

comment on function public.add_locked_drive_template(text, boolean) is
  'Ajoute/active un template verrouille. Si p_backfill=true, provisionne aussi tous les utilisateurs existants.';
