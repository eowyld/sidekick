# Configurer le bucket Espace Documents (Storage)

Si l’app affiche **« Espace Documents non configuré »** lors de l’ajout d’un fichier, le bucket Storage `drive` n’existe pas encore. Deux options :

---

## Option A : Tout exécuter en SQL (recommandé)

1. Ouvre ton **projet Supabase** → **SQL Editor** → **New query**.
2. Copie-colle le contenu de **`setup_drive_bucket.sql`** (dans ce dossier).
3. Clique sur **Run**.
4. Si tout est vert : c’est bon, réessaie d’ajouter un fichier dans l’app.

Si tu as une erreur sur l’`INSERT into storage.buckets` (ex. permission denied), utilise l’option B.

---

## Option B : Créer le bucket à la main, puis les policies en SQL

### Étape 1 : Créer le bucket dans le Dashboard

1. **Storage** → **New bucket**.
2. **Name** : `drive` (exactement).
3. **Public bucket** : **ON** (pour que les liens des fichiers soient utilisables).
4. **File size limit** : `50` MB (ou laisse vide).
5. **Create bucket**.

### Étape 2 : Appliquer les policies RLS en SQL

1. **SQL Editor** → **New query**.
2. Ouvre le fichier **`drive_storage_policies_only.sql`** (dans ce dossier), copie tout son contenu, colle dans l’éditeur.
3. **Run**.

Ensuite, réessaie d’ajouter un fichier dans l’app.
