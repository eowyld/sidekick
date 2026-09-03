import Image from "next/image";
import { cn } from "@/lib/utils";

type SidekickLogoProps = {
  className?: string;
  priority?: boolean;
};

/**
 * Logo complet (onde + wordmark), format horizontal 1024×349.
 *
 * Le dimensionnement se fait sur l'image elle-même, sans conteneur `w-full` :
 * un parent large étirait le logo jusqu'à déborder de la hauteur de son
 * bandeau. Dans une barre ou un pied de page, contraindre la hauteur
 * (`h-8 w-auto`) plutôt que la largeur — le ratio fait le reste.
 *
 * Aucune taille par défaut ici : `cn()` concatène sans dédoublonner, une
 * classe de base entrerait en conflit avec celle de l'appelant et c'est
 * l'ordre du CSS qui trancherait. L'appelant dimensionne, toujours.
 */
export function SidekickLogo({ className, priority = false }: SidekickLogoProps) {
  return (
    <Image
      src="/images/sidekick-logo.png"
      alt="Logo Sidekick"
      width={1024}
      height={349}
      priority={priority}
      className={cn("object-contain", className)}
    />
  );
}

type SidekickMarkProps = {
  className?: string;
  /** Côté du carré rendu, en pixels. */
  size?: number;
  priority?: boolean;
};

/**
 * Symbole seul (l'onde), carré 1080×1080. Pour les contextes où le wordmark
 * ne tient pas : sidebar repliée, favicon, avatar, partages sociaux.
 */
export function SidekickMark({
  className,
  size = 32,
  priority = false,
}: SidekickMarkProps) {
  return (
    <Image
      src="/images/sidekick-mark.png"
      alt="Sidekick"
      width={size}
      height={size}
      priority={priority}
      className={cn("object-contain", className)}
    />
  );
}
