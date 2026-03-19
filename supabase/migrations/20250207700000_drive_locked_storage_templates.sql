-- Templates de dossiers verrouilles du Drive (Storage-only).
-- Objectif:
-- 1) Definir en base les chemins de dossiers verrouilles.
-- 2) A la creation d'un utilisateur, provisionner automatiquement ces dossiers
--    via un fichier placeholder invisible pour chaque dossier.
-- 3) Permettre d'ajouter de nouveaux dossiers verrouilles (y compris imbriques)
--    qui seront automatiquement appliques aux futurs utilisateurs.

create table if not exists public.drive_locked_storage_templates (
  id bigserial primary key,
  path text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.drive_locked_storage_templates is
  'Template des dossiers verrouilles Storage. path est relatif a la racine utilisateur (ex: Admin, Admin/Finance).';

comment on column public.drive_locked_storage_templates.path is
  'Chemin relatif a la racine Storage utilisateur (sans user_id).';

alter table public.drive_locked_storage_templates enable row level security;

drop policy if exists "Authenticated can read locked storage templates" on public.drive_locked_storage_templates;
create policy "Authenticated can read locked storage templates"
  on public.drive_locked_storage_templates
  for select
  using (auth.role() = 'authenticated');

-- Templates de base
insert into public.drive_locked_storage_templates (path, is_active)
values
  ('Admin', true),
  ('Contacts', true),
  ('Edition', true),
  ('Live', true),
  ('Marketing', true),
  ('Phone', true),
  ('Revenus', true)
on conflict (path) do update set is_active = excluded.is_active;

create or replace function public.normalize_drive_locked_path(input_path text)
returns text
language sql
immutable
as $$
  select trim(both '/' from regexp_replace(coalesce(input_path, ''), '/+', '/', 'g'));
$$;

create or replace function public.provision_locked_drive_storage_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tmpl record;
  normalized_path text;
  object_name text;
begin
  for tmpl in
    select path
    from public.drive_locked_storage_templates
    where is_active = true
  loop
    normalized_path := public.normalize_drive_locked_path(tmpl.path);
    if normalized_path = '' then
      continue;
    end if;

    -- Placeholder invisible pour representer le dossier meme vide.
    object_name := p_user_id::text || '/' || normalized_path || '/.emptyfolderplaceholder';

    insert into storage.objects (bucket_id, name)
    values ('drive', object_name)
    on conflict (bucket_id, name) do nothing;
  end loop;
end;
$$;

comment on function public.provision_locked_drive_storage_for_user(uuid) is
  'Provisionne les dossiers verrouilles Storage (via placeholder invisible) pour un utilisateur.';

create or replace function public.handle_new_user_locked_drive_storage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_locked_drive_storage_for_user(new.id);
  return new;
end;
$$;

drop trigger if exists trg_new_user_locked_drive_storage on auth.users;
create trigger trg_new_user_locked_drive_storage
after insert on auth.users
for each row execute procedure public.handle_new_user_locked_drive_storage();

-- Backfill utilisateurs existants (idempotent).
do $$
declare
  u record;
begin
  for u in select id from auth.users loop
    perform public.provision_locked_drive_storage_for_user(u.id);
  end loop;
end $$;
