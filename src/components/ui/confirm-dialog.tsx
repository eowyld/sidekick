"use client";

import * as React from "react";

import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

export type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  /** Libellé du bouton de confirmation. Par défaut « Supprimer ». */
  confirmLabel?: string;
};

/**
 * Friction protectrice avant une suppression : un clic de plus, dans un
 * dialogue plutôt que `window.confirm` (natif, hors design system).
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   onClick={async () => { if (await confirm({ title: "Supprimer ?" })) remove(id); }}
 *   …
 *   {confirmDialog}
 *
 * Le focus s'ouvre sur « Annuler » : Entrée ne supprime pas par réflexe.
 */
export function useConfirm() {
  const [open, setOpen] = React.useState(false);
  // Les options survivent à la fermeture pour que le texte ne disparaisse
  // pas pendant l'animation de sortie.
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const settle = React.useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOpen(false);
  }, []);

  const confirm = React.useCallback((opts: ConfirmOptions) => {
    resolveRef.current?.(false);
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const confirmDialog = (
    <Dialog open={open} onOpenChange={(next) => !next && settle(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{options?.title}</DialogTitle>
          {options?.description ? (
            <DialogDescription>{options.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => settle(false)}>
            Annuler
          </Button>
          <Button type="button" variant="destructive" onClick={() => settle(true)}>
            {options?.confirmLabel ?? "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, confirmDialog } as const;
}
