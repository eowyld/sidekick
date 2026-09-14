export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Anneau de focus clavier — l'accent néon #F0FF00 sur fond sombre fait un
 * indicateur net. À poser sur tout élément interactif « nu » (`<a>`, `<button>`,
 * `<Link>`) ; les primitives `src/components/ui/*` l'ont déjà.
 */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]";

/** Variante pour un élément dans un conteneur `overflow-hidden` (l'anneau extérieur serait rogné). */
export const focusRingInset =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F0FF00]";

/**
 * Agrandissement au survol — le même geste que les cartes de l'app (transform
 * seul, jamais width/height, pour rester à 60 fps). Sur un élément voisin
 * d'autres, ajouter `relative hover:z-10` pour qu'il passe au-dessus.
 */
export const hoverZoom =
  "transition-transform duration-200 ease-out hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100";

/** Affiche une heure sans secondes (ex. événements perso stockés en HH:MM:SS). */
export function formatTimeForDisplay(time: string): string {
  const t = String(time).trim();
  const m = t.match(/^(\d{1,2}:\d{2})(?::\d{2})?/);
  return m ? m[1] : t;
}

