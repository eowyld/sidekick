/**
 * Lecture du refus d'un fournisseur (Google, Microsoft) à l'échange d'un
 * refresh token.
 *
 * `invalid_grant` est définitif : token révoqué, expiré (app Google encore en
 * mode test : 7 jours) ou mot de passe changé. Réessayer ne sert à rien, seule
 * une reconnexion règle le problème. Toute autre réponse peut être passagère.
 */
/**
 * Un jeton enregistré est-il vraiment un refresh token ?
 *
 * Jusqu'au 21/09, la connexion « Continuer avec Google » stockait un access
 * token Google (préfixe `ya29.`) sous `gmail_refresh_token`. Ces comptes
 * paraissent connectés mais ne peuvent rien envoyer : on les traite comme non
 * connectés, ce qui fait apparaître le bouton de connexion.
 */
export function isUsableRefreshToken(token: unknown): token is string {
  return typeof token === "string" && token.length > 0 && !token.startsWith("ya29.");
}

export type RefreshFailureKind = "reauth_required" | "transient";

export function classifyRefreshFailure(body: string): RefreshFailureKind {
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    if (parsed.error === "invalid_grant") return "reauth_required";
  } catch {
    // corps non JSON (page d'erreur d'un proxy, par exemple) : on reste prudent
  }
  return "transient";
}
