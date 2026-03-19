-- =============================================================================
-- Configuration du bucket Storage "drive" pour le module Documents
-- =============================================================================
-- À exécuter dans le Dashboard Supabase : SQL Editor → New query → coller ce script → Run
--
-- Si l'INSERT dans storage.buckets échoue (permission ou schéma) :
-- 1. Va dans Storage → New bucket
-- 2. Name: drive
-- 3. Public bucket: ON (pour que les liens des fichiers soient accessibles)
-- 4. File size limit: 50 MB
-- 5. Crée le bucket, puis exécute UNIQUEMENT la partie "POLICIES RLS" ci-dessous
-- =============================================================================

-- ----- 1. Création du bucket -----
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

-- ----- 2. Policies RLS (à exécuter dans tous les cas) -----
-- L'utilisateur ne peut accéder qu'à son dossier : drive/{user_id}/...

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
