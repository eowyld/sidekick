-- Type de fichier (extension) pour affichage dans le Drive
alter table public.user_documents
  add column if not exists file_extension text;

comment on column public.user_documents.file_extension is 'Extension du fichier (pdf, jpg, etc.) pour affichage dans la colonne Type de fichier';
