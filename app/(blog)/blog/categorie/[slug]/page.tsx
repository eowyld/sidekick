import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticlesByCategorie, getAllCategories } from "@/lib/blog";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogBreadcrumb } from "@/components/blog/BlogBreadcrumb";
import type { BlogCategorie } from "../../../../../types/blog";
import { CATEGORIE_LABELS } from "../../../../../types/blog";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const categories = getAllCategories();
  return categories.map((cat) => ({ slug: cat }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const categorie = slug as BlogCategorie;
  const label = CATEGORIE_LABELS[categorie];
  if (!label) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sidekick.app";

  return {
    title: `${label} — Articles | SIDEKICK Blog`,
    description: `Tous les articles SIDEKICK sur ${label.toLowerCase()} pour les artistes indépendants français.`,
    alternates: { canonical: `${siteUrl}/blog/categorie/${slug}` },
    openGraph: {
      title: `${label} — Articles | SIDEKICK Blog`,
      description: `Tous les articles SIDEKICK sur ${label.toLowerCase()} pour les artistes indépendants français.`,
      url: `${siteUrl}/blog/categorie/${slug}`,
    },
    robots: { index: true, follow: true },
  };
}

export default async function CategoriePage({ params }: Props) {
  const { slug } = await params;
  const categorie = slug as BlogCategorie;
  const label = CATEGORIE_LABELS[categorie];
  if (!label) notFound();

  const articles = getArticlesByCategorie(categorie);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <BlogBreadcrumb categorie={categorie} />
      </div>

      <div className="mb-12 flex flex-col gap-3">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-[2px] bg-[#F0FF00] text-[#101010] uppercase tracking-wider w-fit">
          {label}
        </span>
        <h1
          className="text-5xl md:text-7xl text-white"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.02em" }}
        >
          {label}
        </h1>
        <p className="text-white/60">
          {articles.length} article{articles.length !== 1 ? "s" : ""} dans cette catégorie
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="py-20 text-center text-white/40">
          Les premiers articles sur ce sujet arrivent bientôt.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((article) => (
            <BlogCard key={article.slug} article={article} />
          ))}
        </div>
      )}

      <div className="mt-10">
        <Link
          href="/blog"
          className="text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          ← Retour à tous les articles
        </Link>
      </div>
    </div>
  );
}
