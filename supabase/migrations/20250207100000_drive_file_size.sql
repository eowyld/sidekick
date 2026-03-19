-- Taille des fichiers pour le quota Drive (affichage + décompte à la suppression)
alter table public.user_documents
  add column if not exists file_size_bytes bigint;

comment on column public.user_documents.file_size_bytes is 'Taille du fichier en octets (pour quota 1 Go par utilisateur)';
