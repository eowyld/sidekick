// src/modules/phono/lib/audio-cleanup.ts

import { createClient } from "@/lib/supabase";
import { deleteStorageFile } from "@/lib/drive-db";

/**
 * Décide du sort d'un ou plusieurs fichiers audio qui viennent de quitter le
 * catalogue (suppression de piste/version/mix, détachement, remplacement).
 *
 * `deleteFromDrive` vient directement de la case à cocher présentée à
 * l'utilisateur au moment de l'action : cochée, le fichier est supprimé du
 * bucket ; décochée, il reste tel quel dans `Phono/Catalogue`, non référencé —
 * `pruneOrphanAudio` (`audio-gc.ts`) le ramassera après son sursis d'1h. Pas
 * de dossier de repli intermédiaire : la version précédente déplaçait le
 * fichier vers `Phono/depuis-catalogue` pour le garder indéfiniment, mais ce
 * détour n'apportait rien de plus qu'un délai de grâce plus généreux, pour
 * une case supplémentaire à comprendre.
 *
 * N'échoue jamais bruyamment : l'action principale (suppression en base) a
 * déjà eu lieu quand cette fonction est appelée, un problème de stockage ne
 * doit pas donner l'impression que la suppression/le remplacement a échoué.
 */
export async function handleDetachedAudio(
  paths: Array<string | undefined | null>,
  deleteFromDrive: boolean
): Promise<void> {
  if (!deleteFromDrive) return;

  const unique = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  if (unique.length === 0) return;

  const supabase = createClient();
  for (const path of unique) {
    try {
      await deleteStorageFile(supabase, path);
    } catch (e) {
      console.error(`[audio-cleanup] échec sur ${path}`, e);
    }
  }
}
