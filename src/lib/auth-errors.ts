/**
 * Traduit les erreurs Supabase Auth (anglais, techniques) en phrases françaises
 * lisibles. Tout message d'erreur d'authentification affiché à l'utilisateur
 * passe par `authErrorMessage` : un `error.message` brut ne s'affiche jamais.
 *
 * Deux niveaux : le `code` de l'erreur (`AuthApiError.code`, stable d'une
 * version à l'autre), puis le texte anglais pour les erreurs sans code ou les
 * messages à valeur variable (« after 42 seconds », « at least 8 characters »).
 */

const BY_CODE: Record<string, string> = {
  email_exists: "Un compte existe déjà avec cette adresse.",
  user_already_exists: "Un compte existe déjà avec cette adresse.",
  identity_already_exists: "Ce compte est déjà relié à un autre utilisateur.",
  invalid_credentials: "Email ou mot de passe incorrect.",
  email_not_confirmed:
    "Ton adresse n'est pas encore confirmée. Ouvre le lien qu'on t'a envoyé par email pour activer ton compte.",
  email_address_invalid: "Le format de l'adresse email n'est pas valide.",
  email_address_not_authorized: "Impossible d'envoyer un email à cette adresse pour le moment.",
  same_password: "Le nouveau mot de passe doit être différent de l'actuel.",
  weak_password: "Mot de passe trop faible. Mélange lettres, chiffres et symboles, ou allonge-le.",
  over_email_send_rate_limit: "Trop d'emails envoyés. Réessaie dans quelques minutes.",
  over_request_rate_limit: "Trop de tentatives. Réessaie dans quelques minutes.",
  otp_expired: "Ce lien a expiré ou a déjà servi. Refais une demande.",
  flow_state_expired: "Ce lien a expiré. Refais une demande.",
  flow_state_not_found: "Ce lien a expiré. Refais une demande depuis le même navigateur.",
  bad_code_verifier:
    "Ouvre le lien dans le navigateur où tu as fait la demande, ou refais une demande.",
  session_not_found: "Ta session a expiré. Reconnecte-toi.",
  session_expired: "Ta session a expiré. Reconnecte-toi.",
  refresh_token_not_found: "Ta session a expiré. Reconnecte-toi.",
  refresh_token_already_used: "Ta session a expiré. Reconnecte-toi.",
  user_not_found: "Aucun compte ne correspond.",
  user_banned: "Ce compte est suspendu.",
  signup_disabled: "Les inscriptions sont momentanément fermées.",
  email_provider_disabled: "La connexion par email est momentanément désactivée.",
  provider_disabled: "Ce mode de connexion est momentanément désactivé.",
  reauthentication_needed: "Confirme ton identité avant ce changement.",
  reauthentication_not_valid: "Code de confirmation invalide.",
  captcha_failed: "La vérification anti-robot a échoué. Réessaie.",
  validation_failed: "Une information saisie n'est pas valide.",
  request_timeout: "Le serveur met trop de temps à répondre. Réessaie.",
  hook_timeout: "Le serveur met trop de temps à répondre. Réessaie.",
  unexpected_failure: "Une erreur est survenue côté serveur. Réessaie dans un instant.",
};

/** Texte anglais → français, pour les erreurs sans code. Premier motif trouvé. */
const BY_MESSAGE: Array<[RegExp, string | ((m: RegExpMatchArray) => string)]> = [
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/user already registered|already been registered|email address already/i, BY_CODE.email_exists],
  [/password should be at least (\d+) characters/i, (m) => `Le mot de passe doit faire au moins ${m[1]} caractères.`],
  [/password should contain at least one character/i, BY_CODE.weak_password],
  [/password is known to be weak|pwned/i, "Ce mot de passe circule dans des fuites de données connues. Choisis-en un autre."],
  [/new password should be different/i, BY_CODE.same_password],
  [/unable to validate email address|email address .* is invalid|invalid email/i, BY_CODE.email_address_invalid],
  [/email address not authorized/i, BY_CODE.email_address_not_authorized],
  [/you can only request this after (\d+) seconds?/i, (m) => `Attends ${m[1]} secondes avant de redemander un email.`],
  [/email rate limit exceeded|rate limit/i, BY_CODE.over_email_send_rate_limit],
  [/error sending .*email|error sending/i, "L'email n'a pas pu partir. Réessaie dans un instant."],
  [/email link is invalid or has expired|token has expired or is invalid|otp.*expired/i, BY_CODE.otp_expired],
  [/code verifier|both auth code and code verifier/i, BY_CODE.bad_code_verifier],
  [/auth session missing|session not found|invalid refresh token|jwt expired/i, BY_CODE.session_not_found],
  [/signups not allowed/i, BY_CODE.signup_disabled],
  [/user not found/i, BY_CODE.user_not_found],
  [/failed to fetch|network ?error|load failed/i, "Connexion au serveur impossible. Vérifie ton réseau."],
];

const GENERIC = "Une erreur est survenue. Réessaie.";

function rawMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "";
}

function errorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * Message français pour une erreur d'authentification. `fallback` remplace la
 * phrase générique quand l'erreur est inconnue (« Impossible de changer
 * l'adresse. »), pour garder le contexte de l'action.
 */
export function authErrorMessage(err: unknown, fallback: string = GENERIC): string {
  const code = errorCode(err);
  if (code && BY_CODE[code]) return BY_CODE[code];
  const raw = rawMessage(err);
  if (!raw) return fallback;
  for (const [pattern, fr] of BY_MESSAGE) {
    const match = raw.match(pattern);
    if (match) return typeof fr === "function" ? fr(match) : fr;
  }
  return fallback;
}

export function isEmailNotConfirmed(err: unknown): boolean {
  return errorCode(err) === "email_not_confirmed" || /email not confirmed/i.test(rawMessage(err));
}
