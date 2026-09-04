// src/modules/phono/lib/audio-limits.ts

/**
 * Plafonds de stockage audio, pilotés par l'environnement.
 *
 * Les valeurs par défaut correspondent au plan Supabase Free. Le passage à Pro
 * est planifié à la sortie de l'alpha (voir ALPHA.md, « Recette de
 * déploiement ») : il se fait alors en changeant ces deux variables sur Vercel,
 * sans redéploiement de code.
 *
 * Un master WAV 44,1 kHz / 24 bits de 4 minutes pèse ~64 Mo : au-dessus du
 * plafond Free de 50 Mo. C'est attendu, et le message d'erreur doit le dire.
 */

function readNumber(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Plafond par fichier audio, en octets. Défaut : 50 Mo (Supabase Free). */
export const MAX_AUDIO_BYTES =
  readNumber(process.env.NEXT_PUBLIC_MAX_AUDIO_MB, 50) * 1024 * 1024;

/** Quota de stockage par utilisateur, en octets. Défaut : 1 Go (Supabase Free). */
export const STORAGE_QUOTA_BYTES =
  readNumber(process.env.NEXT_PUBLIC_STORAGE_QUOTA_GB, 1) * 1024 * 1024 * 1024;

/** « 64,2 Mo », « 2,41 Go » — séparateur décimal français. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0).replace(".", ",")} Ko`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace(".", ",")} Go`;
}

/**
 * Message d'erreur d'upload, ou `null` si le fichier passe.
 * Chiffré des deux côtés : l'artiste doit savoir de combien il dépasse.
 */
export function audioUploadError(
  fileBytes: number,
  currentUsedBytes: number
): string | null {
  if (fileBytes > MAX_AUDIO_BYTES) {
    return `Fichier trop volumineux : ${formatBytes(fileBytes)}, limite actuelle ${formatBytes(MAX_AUDIO_BYTES)}.`;
  }
  if (currentUsedBytes + fileBytes > STORAGE_QUOTA_BYTES) {
    return `Espace insuffisant : ${formatBytes(currentUsedBytes)} utilisés sur ${formatBytes(STORAGE_QUOTA_BYTES)}, ce fichier pèse ${formatBytes(fileBytes)}.`;
  }
  return null;
}
