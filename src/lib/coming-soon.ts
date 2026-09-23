/**
 * Fonctionnalités développées mais fermées pour l'alpha.
 *
 * À distinguer des préférences de modules (`enabled_modules`) : celles-ci sont
 * un choix de l'utilisateur, réactivable depuis les réglages. Ce qui suit est
 * une décision produit, fermée pour tous les comptes.
 *
 * Le code reste en place : rouvrir une entrée consiste à la retirer d'ici.
 *
 * Source de vérité unique — consommée par la Sidebar (cadenas), par
 * `ModuleGuard` (écran « Bientôt ») et par `proxy.ts` (presskit public).
 */
export const COMING_SOON_PREFIXES = [
  "/marketing",
  "/edition/sync",
  "/admin/comptabilite",
  "/admin/contrats",
] as const;

/** Pages publiques fermées en même temps (hors app shell, gérées par proxy.ts). */
export const COMING_SOON_PUBLIC_PREFIXES = ["/presskit", "/accord"] as const;

/**
 * Accord de répartition en ligne entre co-auteurs (module Édition), fermé le
 * 21/09 : l'espace membre SACEM fait déjà valider chaque co-auteur. Pas une
 * route mais une fonctionnalité de la fiche d'œuvre, d'où un interrupteur.
 * Rouvrir : passer à `true`, retirer `/accord` ci-dessus, et remettre la
 * migration de `supabase/pending/` dans `supabase/migrations/`. Voir BETA.md,
 * chantier 7.
 */
export const EDITION_AGREEMENTS_OPEN = false;

export function isComingSoon(pathname: string): boolean {
  return COMING_SOON_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
