import Link from "next/link";
import type { BlogArticleMeta } from "../../../types/blog";
import { BlogCard } from "./BlogCard";

type Props = {
  articlesLies: BlogArticleMeta[];
};

export function BlogSidebar({ articlesLies }: Props) {
  return (
    <aside className="hidden lg:flex flex-col gap-8 w-72 shrink-0">
      {/* CTA inscription */}
      <div className="rounded-[2px] border border-[#F0FF00]/40 bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 flex flex-col gap-3">
        <p
          className="text-xl text-white"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em" }}
        >
          Gère ta carrière avec SIDEKICK
        </p>
        <p className="text-sm text-white/60">
          L'outil tout-en-un pour les artistes indépendants français.
        </p>
        <Link
          href="/register"
          className="mt-1 px-4 py-2 rounded-[2px] bg-[#F0FF00] text-[#101010] text-sm font-semibold text-center hover:shadow-[0_0_16px_rgba(240,255,0,0.4)] transition-shadow"
        >
          Créer mon compte gratuit
        </Link>
      </div>

      {/* Articles liés */}
      {articlesLies.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Articles liés
          </h3>
          <div className="flex flex-col gap-3">
            {articlesLies.map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="group flex flex-col gap-1.5 p-3 rounded-[2px] border border-white/10 hover:border-[#F0FF00]/30 transition-colors"
              >
                <span className="text-sm font-medium text-white group-hover:text-[#F0FF00] transition-colors leading-snug">
                  {article.title}
                </span>
                <span className="text-xs text-white/40">
                  {article.readingTime} min
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
