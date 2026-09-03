import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SidekickLogo } from "@/components/branding/SidekickLogo";

/**
 * Gabarit des pages d'authentification : une colonne étroite, centrée, alignée
 * à gauche. Volontairement dépouillé — le logo porte la marque, le formulaire
 * n'a besoin de rien d'autre.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101010] px-6 py-16 text-[#f5f5f5]">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          aria-label="SIDEKICK — accueil"
          className="mb-12 block w-fit"
        >
          <SidekickLogo className="h-9 w-auto" priority />
        </Link>

        {children}

        <Link
          href="/"
          className="mt-12 flex w-fit items-center gap-1.5 text-xs text-[#f5f5f5]/40 transition-colors hover:text-[#f5f5f5]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
