/**
 * Validation des URL de redirection sortante.
 *
 * Une route qui redirige vers une destination fournie dans la requête est une
 * redirection ouverte : elle transforme le domaine en tremplin de hameçonnage
 * (« le lien commence bien par sidekickartists.com… ») et fait tomber la
 * réputation d'expéditeur péniblement construite avec SPF, DKIM et DMARC.
 *
 * On n'autorise donc que http et https, et on refuse tout le reste —
 * `javascript:`, `data:`, `file:`, les schémas d'application.
 */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Renvoie l'URL absolue si elle est sûre à suivre, sinon `null`.
 * L'appelant décide du repli (généralement la page d'accueil).
 */
export function safeExternalUrl(candidate: string | null | undefined): string | null {
  if (!candidate) return null;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    // URL relative ou malformée : hors du contrat de cette fonction.
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;

  // `new URL("https://")` échoue déjà, mais une URL sans hôte reste possible
  // avec certains schémas — on s'en assure explicitement.
  if (!parsed.hostname) return null;

  return parsed.toString();
}
