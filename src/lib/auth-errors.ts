/**
 * Traduit les messages d'erreur Supabase Auth (anglais, techniques) en phrases
 * françaises lisibles. Les clés sont les `error.message` renvoyés tels quels par
 * `@supabase/supabase-js`.
 */
const AUTH_ERROR_MAP: Record<string, string> = {
  "Email not confirmed":
    "Ton adresse n'est pas encore confirmée. Ouvre le lien qu'on t'a envoyé par email pour activer ton compte.",
  "Invalid login credentials": "Email ou mot de passe incorrect.",
  "User already registered": "Un compte existe déjà avec cette adresse.",
  "Password should be at least 6 characters":
    "Le mot de passe doit faire au moins 6 caractères.",
  "Unable to validate email address: invalid format":
    "Le format de l'adresse email n'est pas valide.",
  "Email rate limit exceeded":
    "Trop de tentatives. Réessaie dans quelques minutes.",
  "For security purposes, you can only request this after 60 seconds":
    "Attends une minute avant de redemander un email.",
  "Signups not allowed for this instance":
    "Les inscriptions sont momentanément fermées.",
};

function rawMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "";
}

export function authErrorMessage(err: unknown): string {
  const raw = rawMessage(err);
  if (!raw) return "Une erreur est survenue. Réessaie.";
  if (AUTH_ERROR_MAP[raw]) return AUTH_ERROR_MAP[raw];
  const lower = raw.toLowerCase();
  for (const key of Object.keys(AUTH_ERROR_MAP)) {
    if (lower.includes(key.toLowerCase())) return AUTH_ERROR_MAP[key];
  }
  return "Une erreur est survenue. Réessaie.";
}

export function isEmailNotConfirmed(err: unknown): boolean {
  return rawMessage(err).toLowerCase().includes("email not confirmed");
}
