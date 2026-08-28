-- Limite serveur temporaire du bucket "drive" : 50 MB par fichier.
-- Aligne le comportement Storage avec le plan Supabase Free.

update storage.buckets
set file_size_limit = 52428800
where id = 'drive';
