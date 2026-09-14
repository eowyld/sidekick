import Image, { type StaticImageData } from "next/image";
import { cn, hoverZoom } from "@/lib/utils";

type ProductShotProps = {
  src: StaticImageData;
  /**
   * Variante affichée sous 640 px. Une capture d'écran complète réduite à la
   * largeur d'un téléphone tombe à ~0,3× : on distingue des formes, plus un mot.
   * On lui substitue un recadrage de détail (une zone de ~470 px de l'app), qui
   * s'affiche lui à ~0,73× et reste lisible.
   */
  mobileSrc?: StaticImageData;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

/**
 * Cadre de capture produit : bordure fine, fond sombre, halo jaune diffus.
 *
 * L'image est importée statiquement, donc Next connaît ses dimensions réelles :
 * on affiche chaque capture à son ratio naturel plutôt que de la forcer dans un
 * cadre fixe. Les captures vont de 1.31 (Édition) à 2.20 (Revenus) — un ratio
 * imposé en rognerait une partie.
 */
export function ProductShot({
  src,
  mobileSrc,
  alt,
  className,
  priority = false,
  sizes = "(max-width: 1024px) 100vw, 576px",
}: ProductShotProps) {
  const frame = cn(
    "overflow-hidden rounded-sm border border-[rgba(245,245,245,0.12)] bg-[#0a0a0a] shadow-[0_24px_80px_-24px_rgba(240,255,0,0.18)]",
    // Agrandissement au survol, comme les cartes de l'app.
    hoverZoom,
    className
  );

  if (!mobileSrc) {
    return (
      <div className={frame}>
        <Image
          src={src}
          alt={alt}
          priority={priority}
          sizes={sizes}
          quality={90}
          placeholder="blur"
          className="h-auto w-full"
        />
      </div>
    );
  }

  /*
   * Deux `Image` plutôt qu'un `<picture>` : chacune garde ses dimensions
   * intrinsèques, donc son propre ratio, sans déformation ni saut de mise en
   * page. Le `sizes` à `1px` sur la variante masquée fait choisir au navigateur
   * la plus petite déclinaison du srcSet : l'image cachée ne coûte presque rien.
   */
  return (
    <div className={frame}>
      <Image
        src={mobileSrc}
        alt={alt}
        priority={priority}
        sizes="(max-width: 639px) 100vw, 1px"
        quality={90}
        placeholder="blur"
        className="h-auto w-full sm:hidden"
      />
      <Image
        src={src}
        alt={alt}
        priority={priority}
        sizes={`(max-width: 639px) 1px, ${sizes}`}
        quality={90}
        placeholder="blur"
        className="hidden h-auto w-full sm:block"
      />
    </div>
  );
}
