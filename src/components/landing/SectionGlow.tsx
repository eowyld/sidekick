import { cn } from "@/lib/utils";

type Props = {
  /** Position du halo sur la largeur de la section hôte. */
  align?: "left" | "center" | "right";
  className?: string;
};

/**
 * Halo néon décoratif posé à cheval sur une jointure de sections : deux barres
 * de lumière jaune floutées qui tournent lentement en sens inverse autour d'un
 * même centre. Parce qu'elles tournent, elles ne sont jamais alignées sur la
 * grille de la page — c'est ce qui casse la géométrie.
 *
 * Purement ornemental : `aria-hidden`, `pointer-events-none`, `transform` seul
 * (GPU), figé sous `prefers-reduced-motion`. La section hôte doit être
 * `relative overflow-hidden` et son conteneur de contenu `relative` (pour
 * passer au-dessus du halo).
 */
export function SectionGlow({ align = "center", className }: Props) {
  const x =
    align === "left"
      ? "left-[6%]"
      : align === "right"
        ? "right-[6%]"
        : "left-1/2 -translate-x-1/2";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-0 z-0 h-[420px] w-[420px] -translate-y-1/2 sm:h-[560px] sm:w-[560px]",
        x,
        className,
      )}
    >
      {/* Halo diffus — l'ambiance lumineuse derrière le trait. */}
      <div className="glow-orbit absolute inset-0">
        <div className="absolute inset-x-0 top-1/2 h-[120px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,transparent_22%,rgba(240,255,0,0.13)_50%,transparent_80%)] blur-[46px]" />
      </div>
      {/* Le trait néon : une fine filandre nette qui balaie en sens inverse. */}
      <div className="glow-orbit-rev absolute inset-0">
        <div className="absolute inset-x-[6%] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,transparent,rgba(240,255,0,0.55)_50%,transparent)] blur-[6px]" />
      </div>
    </div>
  );
}
