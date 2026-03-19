-- À exécuter SEULEMENT si tu as créé le bucket "drive" à la main (Storage → New bucket).
-- Policies RLS : chaque utilisateur ne peut accéder qu'à son dossier drive/{user_id}/...

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
