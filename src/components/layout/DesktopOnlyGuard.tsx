"use client";

import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import type { ReactNode } from "react";

/** Seuil aligné sur le breakpoint `md` de Tailwind. */
const MIN_WIDTH = 768;

/**
 * Écran étroit ET appareil tactile sans survol : la largeur seule ne suffit
 * pas, un ordinateur passe sous 768px CSS dès qu'on réduit la fenêtre ou
 * qu'on zoome (150% sur 1100px → ~733px CSS).
 */
const MOBILE_QUERY = `(max-width: ${MIN_WIDTH - 1}px) and (pointer: coarse) and (hover: none)`;

/**
 * L'application n'a pas de mise en page mobile : le shell repose sur une
 * sidebar fixe. Plutôt que de laisser un artiste découvrir SIDEKICK sur un
 * écran cassé, on l'accueille avec un message explicite.
 *
 * Ne couvre que l'app shell — la landing et les pages d'authentification
 * restent accessibles sur mobile, ce sont elles qui portent la vente.
 */
export function DesktopOnlyGuard({ children }: { children: ReactNode }) {
  // `null` tant que l'appareil n'est pas connu : évite d'afficher un écran
  // pour rien pendant l'hydratation, et de monter l'app sur mobile.
  const [isNarrow, setIsNarrow] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (isNarrow === null) return null;

  if (isNarrow) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8 text-center text-foreground">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)]">
          <Monitor size={20} className="text-[#F0FF00]" />
        </div>
        <h1 className="mb-2 text-xl font-semibold tracking-tight">
          SIDEKICK s&apos;utilise sur ordinateur
        </h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          L&apos;application n&apos;est pas encore adaptée aux petits écrans. Retrouve
          ton espace depuis un ordinateur — la version mobile arrive.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
