/**
 * Origine vue par le navigateur, pour construire une URL de retour OAuth.
 *
 * `req.nextUrl.origin` donne l'adresse d'écoute du serveur, pas celle que
 * l'utilisateur a tapée : avec `next dev -H 0.0.0.0`, l'app envoyait à Google
 * `redirect_uri=http://0.0.0.0:3000/…`, refusé d'office (« doesn't comply with
 * Google's OAuth 2.0 policy », invalid_request). L'en-tête `Host` (ou
 * `X-Forwarded-Host` derrière le proxy Vercel) porte la bonne valeur.
 *
 * Un `Host` forgé ne mène nulle part : Google n'accepte que les URI de retour
 * enregistrées sur le client OAuth.
 */
export function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  const first = (value: string | null) => value?.split(",")[0]?.trim() || null;
  const host = first(req.headers.get("x-forwarded-host")) ?? first(req.headers.get("host"));
  if (!host) return url.origin;
  const proto = first(req.headers.get("x-forwarded-proto")) ?? url.protocol.replace(/:$/, "");
  return `${proto}://${host}`;
}
