"use client";

import { useEffect } from "react";

/**
 * Message unique de toutes les sorties de page à saisie non enregistrée.
 *
 * Exporté pour que les boutons « Annuler » et « Retour au catalogue », qui
 * confirment eux-mêmes avant de naviguer, posent exactement la même question
 * que le garde-fou ci-dessous. Deux formulations pour une même décision se
 * liraient comme deux comportements différents.
 */
export const UNSAVED_CHANGES_MESSAGE =
  "Abandonner les modifications non enregistrées ?";

/**
 * Empêche de quitter une page d'édition sur une saisie non enregistrée.
 *
 * Deux sorties à couvrir, et une seule ne suffit pas :
 *
 * - `beforeunload` ne couvre que la fermeture ou le rechargement réels de
 *   l'onglet. Une navigation interne (lien de la sidebar, fil d'Ariane…) est
 *   gérée côté client par Next et ne le déclenche jamais.
 * - L'App Router de Next n'expose aucun évènement « avant changement de
 *   route ». On intercepte donc les clics sur un lien en amont, au niveau du
 *   document : un `<Link>` rend une vraie balise `<a>`, où qu'il vive dans
 *   l'arbre, donc ce garde-ci couvre aussi les liens qui n'existent pas
 *   encore.
 *
 * Les boutons qui naviguent par `router.push` sans passer par un `<a>`
 * (« Annuler », « Retour au catalogue ») ne sont pas interceptés ici : ils
 * confirment eux-mêmes, avec `UNSAVED_CHANGES_MESSAGE`.
 *
 * @param dirty `true` tant que le formulaire porte une saisie non enregistrée.
 */
export function useUnsavedChangesGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      // Ouverture dans un nouvel onglet/une nouvelle fenêtre : cette page-ci
      // continue d'exister telle quelle, rien n'y est perdu.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;
      if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [dirty]);
}
