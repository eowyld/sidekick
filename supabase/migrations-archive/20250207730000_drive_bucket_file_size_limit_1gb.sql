-- Aligne la limite serveur du bucket "drive" avec la limite applicative (1 GB).
-- Evite l'erreur Supabase "The object exceeded the maximum allowed size".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'drive',
  'drive',
  true,
  1073741824,
  null
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit;
