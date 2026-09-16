// src/modules/phono/lib/audio-cleanup.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { DRIVE_BUCKET, deleteStorageFile } from "@/lib/drive-db";

/**
 * Dossier de repli, sous `<userId>/`, pour les fichiers qu'on choisit de
 * garder dans le Drive plutôt que de les supprimer. Volontairement hors de
 * `Phono/Catalogue` (scanné par `pruneOrphanAudio`) : y rester les remettrait
 * en jeu pour le nettoyage automatique dès l'heure de sursis passée, alors que
 * l'utilisateur vient justement de dire qu'il voulait les garder.
 */
const KEPT_SUBFOLDER = "phono/depuis-catalogue";

async function moveToKept(supabase: SupabaseClient, path: string): Promise<void> {
  const parts = path.split("/");
  const userId = parts[0];
  const fileName = parts[parts.length - 1];
  const destDir = `${userId}/${KEPT_SUBFOLDER}`;
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : "";

  const { error } = await supabase.storage.from(DRIVE_BUCKET).move(path, `${destDir}/${fileName}`);
  if (!error) return;

  // Collision de nom la plus probable : un autre fichier "gardé" du même nom
  // existe déjà. Un seul nouvel essai, avec un suffixe qui ne peut pas entrer
  // en collision une seconde fois.
  const { error: retryError } = await supabase.storage
    .from(DRIVE_BUCKET)
    .move(path, `${destDir}/${base}-${Date.now()}${ext}`);
  if (retryError) throw new Error(retryError.message ?? String(retryError));
}

/**
 * Décide du sort d'un ou plusieurs fichiers audio qui viennent de quitter le
 * catalogue (suppression de piste/version/mix, détachement, remplacement).
 *
 * `deleteFromDrive` vient directement de la case à cocher présentée à
 * l'utilisateur au moment de l'action : cochée, le fichier est supprimé du
 * bucket ; décochée, il est déplacé hors de `Phono/Catalogue` pour échapper
 * définitivement à `pruneOrphanAudio` et rester consultable dans le Drive.
 *
 * N'échoue jamais bruyamment : l'action principale (suppression en base) a
 * déjà eu lieu quand cette fonction est appelée, un problème de stockage ne
 * doit pas donner l'impression que la suppression/le remplacement a échoué.
 * En cas d'échec du déplacement, le fichier reste dans `Phono/Catalogue` non
 * référencé et sera rattrapé par `pruneOrphanAudio` après son sursis d'1h.
 */
export async function handleDetachedAudio(
  paths: Array<string | undefined | null>,
  deleteFromDrive: boolean
): Promise<void> {
  const unique = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  if (unique.length === 0) return;

  const supabase = createClient();
  for (const path of unique) {
    try {
      if (deleteFromDrive) {
        await deleteStorageFile(supabase, path);
      } else {
        await moveToKept(supabase, path);
      }
    } catch (e) {
      console.error(`[audio-cleanup] échec sur ${path}`, e);
    }
  }
}
