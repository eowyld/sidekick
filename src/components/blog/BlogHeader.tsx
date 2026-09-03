import type { BlogArticleMeta } from "../../../types/blog";
import { CATEGORIE_LABELS } from "../../../types/blog";
import Link from "next/link";

const NIVEAU_LABELS: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

type Props = {
  article: BlogArticleMeta;
};

export function BlogHeader({ article }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Catégorie */}
      <Link
        href={`/blog/categorie/${article.categorie}`}
        className="inline-flex w-fit"
      >
        <span className="text-xs font-semibold px-2 py-0.5 rounded-[2px] bg-[#F0FF00] text-[#101010] uppercase tracking-wider hover:opacity-80 transition-opacity">
          {CATEGORIE_LABELS[article.categorie]}
        </span>
      </Link>

      {/* Titre H1 */}
      <h1
        className="text-4xl md:text-5xl lg:text-6xl text-white leading-tight"
        style={{ fontStretch: "125%", letterSpacing: "-0.015em" }}
      >
        {article.title}
      </h1>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-wrap text-sm text-white/50">
        <span>
          {new Date(article.date).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        <span aria-hidden>·</span>
        <span>{article.readingTime} min de lecture</span>
        <span aria-hidden>·</span>
        <span className="px-2 py-0.5 rounded-[2px] border border-white/20 text-white/50 text-xs">
          {NIVEAU_LABELS[article.niveau]}
        </span>
      </div>

      {/* Description */}
      <p className="text-lg text-white/70 leading-relaxed max-w-2xl">
        {article.description}
      </p>
    </div>
  );
}
