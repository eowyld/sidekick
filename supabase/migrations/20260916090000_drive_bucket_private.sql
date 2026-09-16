-- Bucket `drive` privé.
--
-- Il était public : la route /storage/v1/object/public/drive/… servait tout
-- fichier sans vérification, et les chemins sont prévisibles
-- ({userId}/phono/audio/{nom}). Les policies RLS ne protégeaient que l'accès
-- authentifié. Masters, contrats et documents administratifs étaient donc
-- lisibles par quiconque obtenait ou devinait une URL.
--
-- Après cette migration, un fichier ne s'ouvre plus que par une URL signée à
-- durée courte, émise après vérification du propriétaire :
--   - Drive, signatures de contrats : /api/drive/file (60 s)
--   - lecteur Phono : /api/phono/signed-audio (1 h)
--   - liens d'écoute : /api/listening/[slug]/… (audio, téléchargement, pochette)
--
-- À appliquer APRÈS le déploiement du code qui utilise ces routes, sinon le
-- Drive affiche des liens morts dans l'intervalle.

update storage.buckets set public = false where id = 'drive';
