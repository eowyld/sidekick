-- Bucket Storage pour les fichiers du Drive (upload).
-- Chaque utilisateur a son dossier : drive/{user_id}/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'drive',
  'drive',
  true,
  52428800,
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- RLS : l'utilisateur ne peut accéder qu'à son dossier (premier segment = user_id)
drop policy if exists "Users can read own drive files" on storage.objects;
create policy "Users can read own drive files"
  on storage.objects for select
  using (bucket_id = 'drive' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload to own drive" on storage.objects;
create policy "Users can upload to own drive"
  on storage.objects for insert
  with check (bucket_id = 'drive' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own drive files" on storage.objects;
create policy "Users can update own drive files"
  on storage.objects for update
  using (bucket_id = 'drive' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own drive files" on storage.objects;
create policy "Users can delete own drive files"
  on storage.objects for delete
  using (bucket_id = 'drive' and (storage.foldername(name))[1] = auth.uid()::text);
