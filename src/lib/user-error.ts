import { authErrorMessage } from "@/lib/auth-errors";

/**
 * Message d'erreur affichable pour n'importe quelle erreur (base, stockage,
 * réseau, route API, authentification). Règle de l'app : aucun texte technique
 * en anglais ne s'affiche. Toute erreur montrée à l'écran passe par ici, ou par
 * `authErrorMessage` pour les écrans de connexion et de compte.
 *
 * Trois cas, dans l'ordre :
 * 1. Erreur connue (Postgres, Storage, réseau, Auth) : phrase française dédiée.
 * 2. Message déjà écrit par nous (en français) : gardé tel quel, il est précis.
 * 3. Tout le reste, en anglais ou vide : `fallback`, qui dit ce qui a échoué.
 */

const KNOWN: Array<[RegExp, string]> = [
  // Réseau
  [/failed to fetch|networkerror|network request failed|load failed|err_network|err_internet_disconnected/i,
    "Connexion au serveur impossible. Vérifie ton réseau et réessaie."],
  [/timeout|timed out|etimedout|aborted due to timeout/i, "Le serveur met trop de temps à répondre. Réessaie."],
  // Session
  [/jwt expired|invalid jwt|auth session missing|not authenticated|unauthorized|invalid refresh token/i,
    "Ta session a expiré. Reconnecte-toi."],
  // Postgres / PostgREST
  [/row-level security|violates row level security|permission denied/i, "Tu n'as pas les droits pour faire ça."],
  [/duplicate key|already exists|unique constraint/i, "Cet élément existe déjà."],
  [/violates foreign key/i, "Cet élément est lié à un autre qui n'existe plus. Recharge la page."],
  [/violates not-null|null value in column/i, "Un champ obligatoire est vide."],
  [/violates check constraint/i, "Une valeur saisie n'est pas acceptée."],
  [/value too long/i, "Un texte saisi est trop long."],
  [/invalid input syntax/i, "Une valeur saisie n'a pas le bon format."],
  [/could not find the .* column|column .* does not exist|relation .* does not exist|schema cache/i,
    "Cette fonctionnalité n'est pas encore disponible sur ton compte. Réessaie plus tard."],
  // Storage
  [/payload too large|entity too large|maximum allowed size|exceeded the maximum|file size/i, "Fichier trop volumineux."],
  [/mime type .* not supported|invalid mime|content type .* not allowed/i, "Ce type de fichier n'est pas accepté."],
  [/bucket not found|object not found|not found/i, "Élément introuvable. Il a peut-être été supprimé."],
  [/quota|storage limit/i, "Espace de stockage plein."],
  // Limites
  [/too many requests|rate limit/i, "Trop de tentatives. Réessaie dans quelques minutes."],
  // Serveur
  [/internal server error|bad gateway|service unavailable|gateway timeout/i,
    "Le serveur rencontre un problème. Réessaie dans un instant."],
];

/** Indices d'un message anglais : mots courants absents d'une phrase française. */
const ENGLISH = /\b(the|is|are|was|not|failed|failure|error|invalid|unable|cannot|can't|could|must|should|please|exceeded|violates|missing|required|unexpected|unknown|denied|forbidden|request|response|column|relation|row|value|key|constraint|null|undefined|object|function|property|read|of)\b/i;

function rawMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const o = err as { message?: unknown; error?: unknown; error_description?: unknown };
    for (const v of [o.message, o.error_description, o.error]) if (typeof v === "string") return v;
  }
  return "";
}

function hasAuthCode(err: unknown): boolean {
  return !!err && typeof err === "object" && "__isAuthError" in err;
}

export function userErrorMessage(err: unknown, fallback: string): string {
  if (hasAuthCode(err)) return authErrorMessage(err, fallback);
  const raw = rawMessage(err).trim();
  if (!raw) return fallback;
  for (const [pattern, fr] of KNOWN) if (pattern.test(raw)) return fr;
  // Nos messages sont en français : on les garde. Un message sans marque
  // anglaise mais inconnu (un code seul, « TypeError ») part au repli.
  if (
    ENGLISH.test(raw) ||
    /^[A-Z][a-zA-Z]*Error\b/.test(raw) ||
    /^[\w.-]+$/.test(raw) ||
    /^HTTP \d{3}\b/i.test(raw)
  )
    return fallback;
  return raw;
}
