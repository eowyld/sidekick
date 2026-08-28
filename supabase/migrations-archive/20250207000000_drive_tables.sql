-- Drive personnel par utilisateur : dossiers et documents.
-- Exécuter dans le SQL Editor du projet Supabase (Dashboard → SQL Editor).

-- Dossiers créés par l'utilisateur (les dossiers prédéfinis par module ne sont pas stockés)
create table if not exists public.user_document_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create index if not exists idx_user_document_folders_user_id on public.user_document_folders(user_id);

alter table public.user_document_folders enable row level security;

drop policy if exists "Users can manage own folders" on public.user_document_folders;
create policy "Users can manage own folders"
  on public.user_document_folders for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Documents du drive (liens, métadonnées)
create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  folder_id text,
  link text,
  category text,
  source_module text,
  notes text,
  date_added date,
  date_modified date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_documents_user_id on public.user_documents(user_id);
create index if not exists idx_user_documents_folder_id on public.user_documents(folder_id);

alter table public.user_documents enable row level security;

drop policy if exists "Users can manage own documents" on public.user_documents;
create policy "Users can manage own documents"
  on public.user_documents for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Stockage utilisé par utilisateur (optionnel, pour quota 1 Go)
create table if not exists public.user_drive_storage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  storage_used_bytes bigint not null default 0,
  updated_at timestamptz default now()
);

alter table public.user_drive_storage enable row level security;

drop policy if exists "Users can manage own storage" on public.user_drive_storage;
create policy "Users can manage own storage"
  on public.user_drive_storage for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
