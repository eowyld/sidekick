"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Écran affiché à la place d'une page fermée pour l'alpha.
 * Volontairement sobre : la fonctionnalité existe, elle n'est pas encore ouverte.
 */
export function ComingSoon({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)]">
        <Lock size={20} className="text-[#F0FF00]" />
      </div>
      <h1 className="mb-2 text-xl font-semibold tracking-tight">
        {label ? `${label} arrive prochainement` : "Cette section arrive prochainement"}
      </h1>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        Elle n&apos;est pas encore ouverte pendant l&apos;alpha. Tu seras prévenu dès
        qu&apos;elle sera disponible.
      </p>
      <Button asChild variant="secondary" size="sm">
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}
