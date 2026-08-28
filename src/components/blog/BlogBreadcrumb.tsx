import Link from "next/link";
import { CATEGORIE_LABELS } from "../../../types/blog";
import type { BlogCategorie } from "../../../types/blog";

type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  categorie: BlogCategorie;
  articleTitle?: string;
};

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export function BlogBreadcrumb({ categorie, articleTitle }: Props) {
  const crumbs: Crumb[] = [
    { label: "Accueil", href: "/" },
    { label: "Blog", href: "/blog" },
    {
      label: CATEGORIE_LABELS[categorie],
      href: articleTitle ? `/blog/categorie/${categorie}` : undefined,
    },
  ];

  if (articleTitle) {
    crumbs.push({ label: truncate(articleTitle, 40) });
  }

  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-sm text-white/40 flex-wrap">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden>›</span>}
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="hover:text-white/70 transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-white/60">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
