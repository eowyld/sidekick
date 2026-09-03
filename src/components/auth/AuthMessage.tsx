import type { ReactNode } from "react";

/**
 * Encart de message pour les pages d'auth. Volontairement sobre : filet
 * vertical accent, fond quasi transparent, texte gris — pas de couleur
 * d'alerte, pas de pictogramme.
 */
export function AuthMessage({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="border-l-2 border-[#F0FF00]/50 bg-[rgba(245,245,245,0.03)] px-4 py-3 text-sm leading-relaxed text-[#f5f5f5]/80"
    >
      {children}
    </div>
  );
}
