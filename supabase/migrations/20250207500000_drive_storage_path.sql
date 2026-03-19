-- Chemin de l'objet dans le bucket Storage (pour suppression du fichier à la suppression du document).
-- Prérequis : le bucket "drive" doit exister (migration 20250207000001_drive_storage_bucket.sql).
alter table public.user_documents
  add column if not exists storage_path text;

comment on column public.user_documents.storage_path is 'Chemin de l''objet dans le bucket Storage (ex: userId/dossier/fichier.pdf). Permet de supprimer le fichier lors de la suppression du document.';
