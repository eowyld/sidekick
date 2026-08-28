import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { getArticles, getArticleBySlug, getArticlesLies } from "@/lib/blog";
import { BlogBreadcrumb } from "@/components/blog/BlogBreadcrumb";
import { BlogHeader } from "@/components/blog/BlogHeader";
import { BlogContent } from "@/components/blog/BlogContent";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import { BlogCTA } from "@/components/blog/BlogCTA";
import { BlogCard } from "@/components/blog/BlogCard";
import { CATEGORIE_LABELS } from "../../../../types/blog";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const articles = getArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sidekick.app";
  const canonical = `${siteUrl}/blog/${article.slug}`;

  return {
    title: `${article.title} | SIDEKICK Blog`,
    description: article.description,
    alternates: { canonical },
    openGraph: {
      title: `${article.title} | SIDEKICK Blog`,
      description: article.description,
      url: canonical,
      type: "article",
      publishedTime: article.date,
      tags: article.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: `${article.title} | SIDEKICK Blog`,
      description: article.description,
    },
    robots: { index: true, follow: true },
  };
}

// JSON-LD injecté côté serveur depuis des données statiques — pas d'input utilisateur
function JsonLdScript({ data }: { data: object }) {
  const json = JSON.stringify(data);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const articlesLies = getArticlesLies(article);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sidekick.app";

  // Compile MDX with @mdx-js/mdx using the same React runtime as the app
  const { default: MDXContent } = await evaluate(article.content ?? "", {
    ...(runtime as Parameters<typeof evaluate>[1]),
    baseUrl: import.meta.url,
  });

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    author: { "@type": "Organization", name: "SIDEKICK" },
    publisher: { "@type": "Organization", name: "SIDEKICK", url: siteUrl },
    url: `${siteUrl}/blog/${article.slug}`,
    keywords: article.tags.join(", "),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: CATEGORIE_LABELS[article.categorie], item: `${siteUrl}/blog/categorie/${article.categorie}` },
      { "@type": "ListItem", position: 4, name: article.title },
    ],
  };

  return (
    <>
      <JsonLdScript data={articleSchema} />
      <JsonLdScript data={breadcrumbSchema} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <BlogBreadcrumb categorie={article.categorie} articleTitle={article.title} />
        </div>

        <div className="mb-10">
          <BlogHeader article={article} />
        </div>

        <div className="flex gap-12 items-start">
          <div className="flex-1 min-w-0">
            <BlogContent>
              <MDXContent components={{ BlogCTA }} />
            </BlogContent>

            <BlogCTA
              module={article.module}
              moduleLabel={CATEGORIE_LABELS[article.categorie]}
              variant="end"
            />

            {articlesLies.length > 0 && (
              <div className="mt-12 lg:hidden">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
                  Articles liés
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {articlesLies.map((a) => (
                    <BlogCard key={a.slug} article={a} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <BlogSidebar articlesLies={articlesLies} />
        </div>
      </div>
    </>
  );
}
