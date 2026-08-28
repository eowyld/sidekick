# Blog SIDEKICK — Spec technique

**Date :** 2026-04-05  
**Statut :** Approuvé  
**Scope :** Blog public SSG avec SEO technique, plan éditorial, et premier article MDX complet

---

## Contexte

SIDEKICK est une app Next.js 16 (App Router, TypeScript, Tailwind, Supabase) pour artistes indépendants français. Le blog a deux objectifs :

1. **Interne** — ressources contextuelles accessibles depuis les modules de l'app (intralinks)
2. **Externe** — SEO/IA pour attirer des artistes indépendants et les convertir en utilisateurs

Le blog est **public** (sans authentification), rendu **statiquement** (SSG), et hébergé dans le même repo/déploiement Vercel que l'app.

---

## Décisions d'architecture

| Décision | Choix | Raison |
|----------|-------|--------|
| Isolation layout | Route group `(blog)` | Layout dédié sans sidebar/AuthGuard app, URL `/blog` inchangée |
| Stockage contenu | Fichiers MDX locaux (`content/blog/`) | Solo dev pré-beta, SSG natif, workflow simple (commit = publication) |
| Parser MDX | `@next/mdx` + `gray-matter` | Officiel Next.js, SSG natif, zéro runtime client |
| Polices | `next/font/google` (Bebas Neue + DM Sans) | Auto-hébergement Next.js, zéro requête externe en prod |
| Détection session (CTA) | Client-side uniquement | Pages restent 100% statiques, hydratation ~100ms imperceptible |
| Tags `/blog/tag/[slug]` | Reporté | YAGNI — 0 articles au départ |

---

## Structure de fichiers

```
app/
├── (blog)/
│   ├── layout.tsx                        ← header léger + footer blog
│   └── blog/
│       ├── page.tsx                      ← index blog
│       ├── [slug]/
│       │   └── page.tsx                  ← article individuel
│       └── categorie/
│           └── [slug]/
│               └── page.tsx              ← articles par catégorie

content/
└── blog/
    └── *.mdx                             ← articles (ex: sacem-guide-complet.mdx)

src/
├── components/
│   └── blog/
│       ├── BlogCard.tsx
│       ├── BlogHeader.tsx
│       ├── BlogContent.tsx
│       ├── BlogSidebar.tsx
│       ├── BlogCTA.tsx
│       ├── BlogBreadcrumb.tsx
│       └── BlogInternalLink.tsx
└── lib/
    └── blog.ts

types/
└── blog.ts

docs/
└── editorial/
    └── plan-editorial.md                 ← plan éditorial complet (livrable 3)

app/
├── sitemap.ts                            ← sitemap dynamique
└── robots.ts                             ← robots.txt
```

---

## Types TypeScript (`types/blog.ts`)

```typescript
export type BlogCategorie = 
  | "phono" | "edition" | "live" | "revenus" | "admin" | "marketing" 
  | "contacts" | "organisation"

export type BlogNiveau = "debutant" | "intermediaire" | "avance"

export type BlogArticle = {
  slug: string
  title: string
  description: string        // 155 chars max
  categorie: BlogCategorie
  tags: string[]
  module: string             // module SIDEKICK lié (/phono, /edition, etc.)
  date: string               // "YYYY-MM-DD"
  readingTime: number        // minutes
  niveau: BlogNiveau
  published: boolean
  content?: string           // contenu MDX compilé (optionnel sur l'index)
}

export type BlogArticleMeta = Omit<BlogArticle, "content">
```

---

## Frontmatter MDX (schéma)

```yaml
---
title: "Titre de l'article"
slug: "titre-de-larticle"
description: "Meta description 155 caractères max"
categorie: "edition"
tags: ["SACEM", "droits d'auteur", "DEP", "DRM"]
module: "edition"
date: "2026-04-05"
readingTime: 8
niveau: "debutant"
published: true
---
```

---

## Helpers (`src/lib/blog.ts`)

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `getArticles` | `() => BlogArticleMeta[]` | Tous les articles publiés, triés par date desc |
| `getArticleBySlug` | `(slug: string) => BlogArticle \| null` | Article complet avec contenu |
| `getArticlesByCategorie` | `(cat: BlogCategorie) => BlogArticleMeta[]` | Filtre par catégorie |
| `getArticlesLies` | `(article: BlogArticleMeta, limit?: number) => BlogArticleMeta[]` | Même catégorie, exclut l'article courant |

Implémentation : lecture du dossier `content/blog/` via `fs`, parse frontmatter avec `gray-matter`, filtre `published: true`.

---

## Pages

### `app/(blog)/blog/page.tsx` — Index

- Rendu statique (pas de `generateStaticParams` nécessaire)
- Hero : titre "Le Blog SIDEKICK" + sous-titre
- Filtres catégorie en horizontal (liens vers `/blog/categorie/[slug]`)
- Grille : 3 col desktop → 2 tablette → 1 mobile
- `generateMetadata` : title fixe, description fixe, OG image

### `app/(blog)/blog/[slug]/page.tsx` — Article

- `generateStaticParams` : tous les slugs depuis `getArticles()`
- Layout : breadcrumb → hero → [contenu + sidebar] → CTA → articles liés
- `generateMetadata` : title/description depuis frontmatter, OG complet, canonical
- JSON-LD : `Article` + `BreadcrumbList` (+ `FAQPage` si l'article contient des questions)

### `app/(blog)/blog/categorie/[slug]/page.tsx` — Catégorie

- `generateStaticParams` : catégories uniques extraites des articles publiés
- Liste d'articles filtrés par catégorie
- `generateMetadata` : title/description générés depuis le nom de catégorie

---

## SEO

### Metadata par page

| Page | title | description | canonical |
|------|-------|-------------|-----------|
| Index | "Blog SIDEKICK — Ressources artistes indépendants" | fixe | `/blog` |
| Article | "[Titre] \| SIDEKICK Blog" | frontmatter | `/blog/[slug]` |
| Catégorie | "[Cat] — Articles \| SIDEKICK Blog" | générée | `/blog/categorie/[slug]` |

Toutes les pages : `robots: index, follow`, `openGraph`, `twitter: summary_large_image`.

### JSON-LD

- **Article** : `@type: Article`, `headline`, `datePublished`, `author` (SIDEKICK), `publisher`
- **BreadcrumbList** : sur articles et catégories
- **Organization** : sur l'index
- **FAQPage** : conditionnel (si frontmatter `faq: true` ou présence d'un composant `<FAQ>`)

### `app/sitemap.ts`

Génère dynamiquement : `/blog` + tous les `/blog/[slug]` publiés + toutes les `/blog/categorie/[slug]`.

### `app/robots.ts`

Autorise tout sauf `/api/`, routes app protégées (`/dashboard`, `/tasks`, etc.).

---

## Composants

### `app/(blog)/layout.tsx`
Header minimal : logo SIDEKICK + navigation (Blog, Catégories) + CTA conditionnel (client-side : "Retour à l'app" si connecté, "Créer un compte" sinon). Footer : liens catégories + lien landing page.

### `BlogCard`
Card glass (`rgba(44,44,46,0.72)`, `backdrop-blur-xl`). Badge catégorie `#F0FF00`. Titre Bebas Neue. Description + meta (temps lecture, niveau). CTA "Lire l'article" variant outline. Hover : glow border `#F0FF00`.

### `BlogBreadcrumb`
Fil d'Ariane : Accueil › Blog › [Catégorie] › [Titre tronqué à 40 chars]. Dernier élément non-cliquable. Données structurées BreadcrumbList injectées par la page parente.

### `BlogHeader`
H1 Bebas Neue large. Ligne meta : date · temps de lecture · badge niveau · badge catégorie `#F0FF00`.

### `BlogContent`
Rendu MDX avec composants custom injectés via `useMDXComponents`. Styles prose Tailwind custom : H2 Bebas Neue, body DM Sans, `code` inline fond sombre, blockquotes border-left `#F0FF00`. Supporte `<BlogCTA>` et `<BlogInternalLink>` dans le MDX.

### `BlogSidebar`
`sticky top-6`, visible desktop uniquement. Sections : sommaire (ancres H2 extraites du contenu) + 3 articles liés (mini BlogCard) + bloc CTA inscription.

### `BlogCTA`
Deux variantes : `mid` (compact, milieu d'article) et `end` (pleine largeur, fin d'article). Client component : bouton "Gérer ça dans SIDEKICK → /[module]" si connecté, "Créer mon compte gratuit → /register" sinon. Background légèrement plus clair que le fond, border `#F0FF00`.

### `BlogInternalLink`
Client component. Props : `module` (chemin), `label`. Bouton "Voir dans SIDEKICK" (connecté) ou "Créer mon compte" (non connecté). Style : variant outline avec accent jaune.

---

## Design system

- Fond : `#101010`
- Texte : `#f5f5f5`
- Accent : `#F0FF00` (badges, borders hover, blockquotes, CTA)
- Cards : `rgba(44,44,46,0.72)` + `backdrop-blur-xl`
- Boutons : `border-radius: 2px` (coins francs), glow `#F0FF00` au hover
- Display : Bebas Neue (H1, H2)
- Corps : DM Sans
- Aucun anglais dans les textes visibles
- Tutoiement partout

---

## Dépendances à installer

```bash
npm install @next/mdx @mdx-js/loader @mdx-js/react gray-matter
npm install -D @types/mdx
```

`next.config.mjs` : wrapper `withMDX({ extension: /\.mdx$/ })`.

---

## Livrables inclus dans l'implémentation

1. Types TypeScript (`types/blog.ts`)
2. Helpers blog (`src/lib/blog.ts`)
3. Configuration `@next/mdx` dans `next.config.mjs`
4. Premier article MDX complet (`content/blog/sacem-guide-complet.mdx`) — 1800-2200 mots
5. Page index blog
6. Page article individuel
7. Page catégorie
8. Tous les composants blog (`src/components/blog/`)
9. Layout `(blog)`
10. SEO : `generateMetadata` + JSON-LD + `sitemap.ts` + `robots.ts`
11. Plan éditorial complet (`docs/editorial/plan-editorial.md`) — 8 modules, ~50 articles

---

## Hors scope

- Page `/blog/tag/[slug]` (reportée)
- Barre de recherche dans le blog
- Commentaires
- Newsletter intégrée au blog
- Analytics spécifiques au blog
- Migration vers CMS externe
