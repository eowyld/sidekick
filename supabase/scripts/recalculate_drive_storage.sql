-- Recalcule l'espace utilisé par chaque utilisateur à partir des documents (file_size_bytes).
-- À exécuter dans le SQL Editor du Dashboard Supabase.
-- Après suppression de tous les documents, l'espace utilisé repasse à 0.

update public.user_drive_storage s
set
  storage_used_bytes = coalesce((
    select sum(d.file_size_bytes)::bigint
    from public.user_documents d
    where d.user_id = s.user_id and d.file_size_bytes is not null
  ), 0),
  updated_at = now();
