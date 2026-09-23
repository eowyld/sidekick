"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
 * Avec `onSave`, un clic sur un lien ouvre un dialogue à trois issues
 * (enregistrer et quitter, quitter sans enregistrer, rester) au lieu du
 * `window.confirm` natif. Le dialogue est renvoyé par le hook : la page doit
 * le rendre. `onSave` résout `false` si l'enregistrement échoue ou est refusé
 * par la validation : on reste alors sur la page.
 *
 * Les boutons qui naviguent par `router.push` sans passer par un `<a>`
 * (« Annuler », « Retour au catalogue ») ne sont pas interceptés ici : ils
 * confirment eux-mêmes, avec `UNSAVED_CHANGES_MESSAGE`.
 *
 * @param dirty `true` tant que le formulaire porte une saisie non enregistrée.
 */
export function useUnsavedChangesGuard(
  dirty: boolean,
  options?: { onSave?: () => Promise<boolean> },
): ReactNode {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const onSave = useRef(options?.onSave);
  useEffect(() => {
    onSave.current = options?.onSave;
  });
  const withDialog = !!options?.onSave;

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
      // Téléchargement (PDF de fiche technique, feuille de route…) : la page
      // reste en place, rien n'est perdu. Sans cette exception, chaque export
      // pendant une saisie demandait d'abandonner les modifications.
      if (anchor.hasAttribute("download")) return;
      if (withDialog) {
        e.preventDefault();
        e.stopPropagation();
        setPending(href);
        return;
      }
      if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [dirty, withDialog]);

  if (!withDialog) return null;

  const leave = (href: string) => {
    setPending(null);
    const url = new URL(href, window.location.href);
    if (url.origin === window.location.origin) router.push(`${url.pathname}${url.search}${url.hash}`);
    else window.location.assign(url.href);
  };
  const saveAndLeave = async () => {
    if (!pending) return;
    setSaving(true);
    const ok = await onSave.current?.();
    setSaving(false);
    if (ok) leave(pending);
    else setPending(null);
  };

  return (
    <Dialog open={!!pending} onOpenChange={(open) => !open && !saving && setPending(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer avant de quitter la page ?</DialogTitle>
          <DialogDescription>Tu as des modifications non enregistrées sur cette page.</DialogDescription>
        </DialogHeader>
        {/* Trois issues ne tiennent pas sur une ligne à cette largeur : pile assumée, l'action principale en tête. */}
        <div className="flex flex-col gap-2 pt-2">
          <Button type="button" className="w-full" disabled={saving} onClick={() => void saveAndLeave()}>
            {saving ? "Enregistrement…" : "Enregistrer et quitter"}
          </Button>
          <Button type="button" variant="outline" className="w-full" disabled={saving} onClick={() => pending && leave(pending)}>
            Quitter sans enregistrer
          </Button>
          <Button type="button" variant="ghost" className="w-full" disabled={saving} onClick={() => setPending(null)}>
            Rester sur la page
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
