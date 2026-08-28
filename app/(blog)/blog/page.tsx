import type { Metadata } from "next";
import Link from "next/link";
import { getArticles } from "@/lib/blog";
import { BlogCard } from "@/components/blog/BlogCard";
import type { BlogCategorie } from "../../../types/blog";
import { CATEGORIE_LABELS } from "../../../types/blog";

export const metadata: Metadata = {
  title: "Blog SIDEKICK — Ressources pour artistes indépendants",
  description:
    "Droits d'auteur, SACEM, distribution musicale, intermittence, royalties… Toutes les ressources pour gérer ta carrière d'artiste indépendant en France.",
  openGraph: {
    title: "Blog SIDEKICK — Ressources pour artistes indépendants",
    description:
      "Droits d'auteur, SACEM, distribution musicale, intermittence, royalties… Toutes les ressources pour gérer ta carrière d'artiste indépendant en France.",
    url: "/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog SIDEKICK — Ressources pour artistes indépendants",
    description:
      "Droits d'auteur, SACEM, distribution musicale, intermittence, royalties… Toutes les ressources pour gérer ta carrière d'artiste indépendant en France.",
  },
};

function BlogJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SIDEKICK",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://sidekick.app",
    description:
      "L'outil tout-en-un pour les artistes musicaux indépendants français.",
  };
  // JSON-LD est du JSON statique généré côté serveur — pas d'input utilisateur
  // eslint-disable-next-line react/no-danger
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

const ALL_CATEGORIES: { value: BlogCategorie | "all"; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "edition", label: "Édition" },
  { value: "phono", label: "Phonographie" },
  { value: "live", label: "Live" },
  { value: "revenus", label: "Revenus" },
  { value: "admin", label: "Administration" },
  { value: "marketing", label: "Marketing" },
  { value: "contacts", label: "Réseau" },
  { value: "organisation", label: "Organisation" },
];

export default function BlogIndexPage() {
  const articles = getArticles();

  return (
    <>
      <BlogJsonLd />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero */}
        <div className="mb-14 flex flex-col gap-4">
          <h1
            className="text-6xl md:text-8xl text-white"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.02em" }}
          >
            Le Blog SIDEKICK
          </h1>
          <p className="text-lg text-white/60 max-w-xl">
            Tout ce que tu dois savoir pour gérer ta carrière d'artiste indépendant en France —
            droits, distribution, live, revenus et administration.
          </p>
        </div>

        {/* Filtres catégories */}
        <div className="flex items-center gap-2 flex-wrap mb-10">
          {ALL_CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={cat.value === "all" ? "/blog" : `/blog/categorie/${cat.value}`}
              className="px-3 py-1.5 rounded-[2px] border border-white/15 text-sm text-white/60 hover:border-[#F0FF00]/50 hover:text-[#F0FF00] transition-colors"
            >
              {cat.label}
            </Link>
          ))}
        </div>

        {/* Grille d'articles */}
        {articles.length === 0 ? (
          <div className="py-20 text-center text-white/40">
            Les premiers articles arrivent bientôt.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article) => (
              <BlogCard key={article.slug} article={article} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
