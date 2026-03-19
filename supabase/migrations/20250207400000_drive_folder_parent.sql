-- Hiérarchie des dossiers : parent_id pour Marketing > Calendrier éditorial > Date.

alter table public.user_document_folders
  add column if not exists parent_id uuid references public.user_document_folders(id) on delete cascade;

create index if not exists idx_user_document_folders_parent_id on public.user_document_folders(parent_id);

comment on column public.user_document_folders.parent_id is 'Dossier parent (null = racine). Permet Marketing > Calendrier éditorial > DD-MM-YYYY.';
