-- Dossiers système (verrouillés) : non renommables, non supprimables par l'utilisateur.

alter table public.user_document_folders
  add column if not exists is_system boolean not null default false;

comment on column public.user_document_folders.is_system is 'Si true, le dossier est verrouillé (module) : pas de renommage ni suppression par l''utilisateur.';
