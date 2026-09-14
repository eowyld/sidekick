# BRIEF BRANDING — SIDEKICK

> Document d'export destiné à un agent / designer travaillant sur le **branding du site**.
> Il décrit l'état réel du projet à date, l'identité déjà en place, et ce qui reste à produire.
> Date d'export : 2026-08-28 · Branche : `claude-edits` · Repo : `/Users/eliott/Desktop/SIDEKICK`

---

## 1. Le produit

**SIDEKICK** — application web (Next.js 16, App Router) qui centralise toute la gestion de carrière d'un **artiste de musique indépendant** : phonographie, édition, live/tournée, marketing, administration, revenus.

Positionnement en une phrase (déjà utilisé en prod) :
> « SIDEKICK : un manager tout-en-un. »

Baseline metadata actuelle (`app/layout.tsx`) :
> « SIDEKICK — Ta carrière musicale, un seul outil »

**Statut** : solo dev, pré-bêta privée. Déploiement Vercel (front) + Supabase (back). Le site publie déjà une landing, un blog, des pages presskit publiques et un formulaire de waitlist.

### Audience
- Artistes indépendants francophones (auteurs-compositeurs, producteurs, artistes autoproduits).
- Font tout eux-mêmes : catalogue, dates, factures, statut d'intermittent/auto-entrepreneur, presskit.
- Pain point central assumé dans la copy : **« Ton back-office te coupe de ta musique. »**

### Modules (structure du produit, utile pour toute nav ou iconographie)
Calendrier · Tâches · Contacts · Phono (catalogue & ISRC) · Édition (œuvres & sync) · Live (scène & tournée) · Marketing (mailing & presskit) · Revenus (facturation & royalties) · Admin (statuts & démarches) · Drive/Documents · Projets.

---

## 2. Identité visuelle actuelle (l'existant, à respecter sauf décision contraire)

### 2.1 Palette — dark-only, non négociable
Le design system est **exclusivement sombre**. Aucun variant light, aucun fond clair. `app/globals.css` contient même des overrides `!important` qui écrasent les classes claires légataires (`bg-white`, `text-gray-900`, etc.).

| Token | Valeur | Usage |
|---|---|---|
| Background | `#101010` | Fond de page & sidebar (hero landing : `#000000` pur) |
| Foreground | `#f5f5f5` | Texte principal |
| Texte atténué | `rgba(245,245,245,0.7)` | Secondaire ; la landing descend jusqu'à `/60`, `/50`, `/40`, `/30` |
| Card | `rgba(44,44,46,0.72)` + `backdrop-blur-xl` | Surfaces |
| Border | `rgba(245,245,245,0.12)` | Séparateurs, contours |
| **Accent / CTA** | **`#F0FF00`** | Boutons primaires, liens, focus, eyebrows, accents typo — jaune-vert néon |
| Sélection texte | fond `rgba(240,255,0,0.35)` / texte `#101010` | `::selection` |

L'accent `#F0FF00` est l'élément identitaire le plus fort. Il est utilisé de façon très parcimonieuse : un mot surligné par titre, les CTA, les puces, les eyebrows en majuscules.

### 2.2 Typographie
Deux systèmes coexistent — **c'est une incohérence à trancher** (voir §5).

- **Landing (`app/page.tsx`)** : chargée en dur depuis Google Fonts via un `<link>` inline.
  - `Bebas Neue` → classe `.font-display` : titres, noms de modules, prix, logo texte. Toujours en capitales, `tracking-wide`, `leading-[0.95]` sur le H1.
  - `DM Sans` → classe `.font-body` : corps de texte.
- **App interne + reste du site** : aucune police custom chargée. Stack système :
  `system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif`.
- **`public/fonts/`** contient des `.ttf` auto-hébergés **non utilisés** : Inter (400/600/700 + italic), Lora, Montserrat. Probablement destinés au presskit ou à un export PDF.

### 2.3 Logo & assets
- `src/components/branding/SidekickLogo.tsx` → affiche `/images/sidekick-logo-horizontal.png` (1024×349, **PNG raster, pas de SVG**).
- Autres fichiers : `public/images/sidekick-logo.jpeg`, `sidekick-manager.png`, `whatsapp-icon.png`.
- Sur la landing, le logo n'est **pas** l'image : c'est le mot « SIDEKICK » en Bebas Neue (`app/page.tsx:503`). Deux expressions de marque différentes cohabitent donc.
- Icône d'app : `app/icon.png` existe. **Pas de `favicon.ico`, pas de `apple-icon`, pas de déclinaison de tailles.**

### 2.4 Motifs & traitements visuels
- **Hero animé** : `<canvas>` en fond du hero, opacité 70%, respecte `prefers-reduced-motion`.
- **`<WaveSeparator />`** : séparateur en vague entre chaque section de la landing — signature graphique récurrente.
- **`.btn-glow`** : `border-radius: 2px` + halo au hover `box-shadow: 0 0 24px rgba(240,255,0,0.5)`.
- **`.card-hover`** : bordure supérieure de 2px qui passe à `#F0FF00` au hover + ombre jaune diffuse.
- **Angles** : quasi-carrés partout (`rounded-sm`, `border-radius: 2px`). Esthétique nette, technique, pas « soft SaaS ».
- **Icônes** : **Lucide React uniquement**. Ne pas introduire d'autre set.
- **Composants** : Radix UI + Tailwind, maison (`src/components/ui/`), pas de shadcn/ui.

---

## 3. Ton de voix (extrait de la copy réellement en ligne)

Tutoiement systématique. Phrases courtes. Ponctuation qui coupe. Registre direct, un peu frontal, jamais corporate. Vocabulaire métier assumé (ISRC, droits voisins, intermittence, presskit) — on parle à quelqu'un qui connaît son métier.

**Titres :**
- H1 : « ARRÊTE DE GÉRER TA CARRIÈRE DANS **12 APPLIS.** »
- « TON BACK-OFFICE TE **COUPE** DE TA MUSIQUE »
- « PAS UN LOGICIEL **DE PLUS.** »
- « TOUT DANS UN SEUL **SIDEKICK** »
- « BLOQUE 30 MINUTES. **REPRENDS LA MAIN.** »
- Tarifs : « Simple. Pas un **accord** avec un label. »

**Promesses (hero) :**
- Ta musique : cataloguée, distribuée, sous contrôle
- Ton agenda : structuré, sans rien oublier
- Ton argent : tracé, compris, sans surprise
- Ta carrière : pilotée, pas subie

**Pain points (section « Tu reconnais ça ? ») :**
- « Tes relevés de royalties sont noyés dans 5 boîtes mail différentes »
- « Tu as envoyé la mauvaise version du morceau au label. Encore. »
- « Ta facture, c'est un Word doc que tu modifies à la main depuis 2 ans »

**Règle implicite** : chaque titre a **un seul** mot ou segment en `#F0FF00`. C'est le rythme de la marque.

---

## 4. Cartographie des surfaces de marque

| Surface | Fichier | État branding |
|---|---|---|
| Landing | `app/page.tsx` (1052 l.) | Le plus abouti — Bebas/DM Sans, canvas, waves |
| Layout racine & SEO | `app/layout.tsx` | Metadata FR complète, OG/Twitter **sans image** |
| Blog | `app/(blog)/` + `src/components/blog/` | Existe ; cohérence à vérifier |
| Auth (login/inscription) | `app/(auth)/` | À auditer — probablement sans typo landing |
| App interne | `app/(app)/` + `src/components/layout/` | Police système, sidebar `w-64`/`w-16` |
| Presskit public | `app/presskit/` | Page publique exposée aux pros — enjeu image fort |
| Waitlist | formulaire `#email-section` | Point de conversion principal |
| `robots.ts` / `sitemap.ts` | `app/` | En place |

---

## 5. Écarts identifiés — le travail à faire

**Bloquants / incohérences réelles, vérifiées dans le code :**

1. **Deux identités typographiques.** Bebas Neue + DM Sans sur la landing, police système partout ailleurs. Un visiteur qui passe de la landing au login change de marque.
2. **Polices chargées en `<link>` inline** dans un composant client (`app/page.tsx:475-480`), avec un `eslint-disable` pour `@next/next/no-page-custom-font`. À migrer vers `next/font` (perf + FOUT + cohérence).
3. **Pas de logo vectoriel.** Uniquement du PNG/JPEG. Aucune version monochrome, aucune version carrée, pas de règle de zone de respiration.
4. **Deux expressions du logo** : image horizontale vs. mot-symbole Bebas Neue. Aucune règle documentée sur laquelle utiliser où.
5. **Pas d'image Open Graph.** `openGraph` et `twitter.card: summary_large_image` sont déclarés mais aucune image n'est fournie → tout partage social sort nu. C'est le gain le plus rapide.
6. **Système de favicon incomplet** : seul `app/icon.png`.
7. **`globals.css` compense par la force** : une couche d'overrides `!important` sur les classes claires légataires, au lieu de tokens propres. Le design system n'est pas exprimé en variables CSS cohérentes (`:root` définit des HSL qui sont ensuite contredits par des hex en dur).
8. **Polices auto-hébergées orphelines** dans `public/fonts/` (Inter, Lora, Montserrat) — à utiliser ou à supprimer.
9. **Aucun document de marque.** Pas de brand guidelines, pas de règles d'usage de l'accent, pas de guide de ton — tout est implicite dans le code.

---

## 6. Livrables attendus

**Priorité 1 — impact immédiat**
- Image Open Graph / Twitter (1200×630) + intégration dans `app/layout.tsx`.
- Set de favicons complet (`icon`, `apple-icon`, versions 32/180/512).
- Décision typographique unique, appliquée à toutes les surfaces, via `next/font`.

**Priorité 2 — cohérence**
- Logo vectorisé (SVG) : version horizontale, version carrée/monogramme, version monochrome sur clair et sur sombre. Règles de taille min et de zone de respiration.
- Audit + harmonisation des pages `(auth)`, `(blog)` et `presskit` sur l'identité de la landing.
- Nettoyage de `globals.css` : tokens CSS unifiés, réduction des overrides `!important`.

**Priorité 3 — documentation**
- `BRAND.md` : palette, typographie, usage du logo, règles de l'accent `#F0FF00`, ton de voix avec exemples do/don't.
- Modèles de partage social et d'emails transactionnels aux couleurs de la marque.

---

## 7. Contraintes fermes

- **Dark-only.** Jamais de fond clair, jamais de variant light.
- **`#F0FF00`** reste l'accent unique. Parcimonie : un accent par bloc.
- **Lucide React** est le seul set d'icônes.
- **Radix UI + Tailwind maison** (`src/components/ui/`) — utiliser ces primitives, pas de HTML brut, pas de nouvelle lib de composants.
- **Français**, tutoiement, sur toutes les surfaces publiques.
- `cn()` depuis `@/lib/utils` pour toute composition de classes conditionnelles.
- **Git** : pas de `git add`/`push` intermédiaire ; vérifier en dev local, ne committer que sur demande explicite.
- Toute nouvelle page doit être ajoutée à la nav dans `src/components/layout/Sidebar.tsx`.

---

## 8. Pour démarrer

```bash
npm run dev          # Next.js + Turbopack
npm run build        # build prod (webpack)
npm run lint
npx tsc --noEmit     # pas de suite de tests configurée
```

Fichiers à lire en premier : `app/page.tsx` (l'identité y est la plus dense), `app/globals.css`, `app/layout.tsx`, `src/components/branding/SidekickLogo.tsx`, `CLAUDE.md` (design system + conventions).
