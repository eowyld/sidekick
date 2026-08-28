-- Fichiers "système" : non modifiables, non supprimables par l'utilisateur.
-- À utiliser pour les fichiers fournis par le module à l'avenir.

alter table public.user_documents
  add column if not exists is_system boolean not null default false;

comment on column public.user_documents.is_system is 'Si true, le document est verrouillé (module/système) : pas de renommage, déplacement ni suppression par l''utilisateur.';
