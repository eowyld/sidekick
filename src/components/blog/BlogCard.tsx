import Link from "next/link";
import type { BlogArticleMeta } from "../../../types/blog";
import { CATEGORIE_LABELS } from "../../../types/blog";

const NIVEAU_LABELS: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

type Props = {
  article: BlogArticleMeta;
};

export function BlogCard({ article }: Props) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group flex flex-col rounded-[2px] border border-white/10 bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 gap-4 transition-all duration-200 hover:border-[#F0FF00]/50 hover:shadow-[0_0_16px_rgba(240,255,0,0.08)]"
    >
      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-[2px] bg-[#F0FF00] text-[#101010] uppercase tracking-wider">
          {CATEGORIE_LABELS[article.categorie]}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-[2px] border border-white/20 text-white/50">
          {NIVEAU_LABELS[article.niveau]}
        </span>
      </div>

      {/* Titre */}
      <h2 className="text-lg font-bold leading-snug text-white group-hover:text-[#F0FF00] transition-colors" style={{ fontStretch: "125%", letterSpacing: "-0.015em" }}>
        {article.title}
      </h2>

      {/* Description */}
      <p className="text-sm text-white/60 leading-relaxed flex-1">
        {article.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
        <span className="text-xs text-white/40">
          {new Date(article.date).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {" · "}
          {article.readingTime} min de lecture
        </span>
        <span className="text-xs font-medium text-[#F0FF00] group-hover:underline">
          Lire l'article →
        </span>
      </div>
    </Link>
  );
}
