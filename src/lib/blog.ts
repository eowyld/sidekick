import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { BlogArticle, BlogArticleMeta, BlogCategorie } from "../../types/blog";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function readArticleFile(filename: string): BlogArticleMeta | null {
  const filePath = path.join(BLOG_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data } = matter(raw);

  if (!data.published) return null;

  return {
    slug: data.slug as string,
    title: data.title as string,
    description: data.description as string,
    categorie: data.categorie as BlogCategorie,
    tags: (data.tags as string[]) ?? [],
    module: data.module as string,
    date: data.date as string,
    readingTime: data.readingTime as number,
    niveau: data.niveau as BlogArticleMeta["niveau"],
    published: data.published as boolean,
  };
}

export function getArticles(): BlogArticleMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));

  const articles = files
    .map((filename) => {
      try {
        return readArticleFile(filename);
      } catch {
        return null;
      }
    })
    .filter((a): a is BlogArticleMeta => a !== null);

  return articles.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getArticleBySlug(slug: string): BlogArticle | null {
  if (!fs.existsSync(BLOG_DIR)) return null;

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));

  for (const filename of files) {
    const filePath = path.join(BLOG_DIR, filename);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    if (data.slug === slug && data.published) {
      return {
        slug: data.slug as string,
        title: data.title as string,
        description: data.description as string,
        categorie: data.categorie as BlogCategorie,
        tags: (data.tags as string[]) ?? [],
        module: data.module as string,
        date: data.date as string,
        readingTime: data.readingTime as number,
        niveau: data.niveau as BlogArticle["niveau"],
        published: data.published as boolean,
        content,
      };
    }
  }

  return null;
}

export function getArticlesByCategorie(categorie: BlogCategorie): BlogArticleMeta[] {
  return getArticles().filter((a) => a.categorie === categorie);
}

export function getArticlesLies(
  article: BlogArticleMeta,
  limit = 3
): BlogArticleMeta[] {
  return getArticles()
    .filter((a) => a.slug !== article.slug && a.categorie === article.categorie)
    .slice(0, limit);
}

export function getAllCategories(): BlogCategorie[] {
  const articles = getArticles();
  const cats = new Set(articles.map((a) => a.categorie));
  return Array.from(cats);
}
