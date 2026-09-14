# Refonte de la landing SIDEKICK

Date : 2026-09-01 · Branche : `claude-edits` · Référence de structure : odoo.com/fr_FR

## Objectif

Reconstruire `app/page.tsx` sur l'architecture d'une landing Odoo, adaptée au
produit et à la direction artistique SIDEKICK. Conversion visée : inscription à
la liste d'attente de la bêta privée (inchangée).

## Décisions

| Sujet | Décision |
|---|---|
| Périmètre | Refonte totale : structure, typographie, motifs, copy |
| Conversion | Waitlist, formulaire et endpoint `/api/waitlist` inchangés |
| Grille de modules | Vitrine enrichie : tuiles cliquables, détail en panneau in-page, aucune route nouvelle |
| Preuve | Par le produit — pas de faux chiffres ni de témoignages inventés |
| Tarifs | Prix existants conservés (0 / 12 / 25 €), plus un comparatif de coût |
| Typographie | Archivo, famille unique, appliquée à tout le site |
| Motifs | Suppression du canvas animé et des `WaveSeparator` |
| Ton | Hybride : hero et CTA frontaux, sections produit factuelles |

## Architecture

`app/page.tsx` devient un Server Component qui assemble dix composants sous
`src/components/landing/`. Seuls trois portent `"use client"` — ceux qui ont un
état : la nav, la grille de modules, le formulaire.

| Fichier | Rôle | Client |
|---|---|---|
| `modules-data.ts` | Les modules : groupe, icône, description, features. Source unique lue par la nav, la grille et le footer | — |
| `LandingNav.tsx` | Nav sticky, méga-menu desktop par groupe, menu mobile | oui |
| `Hero.tsx` | Titre, promesse, CTA, réassurance, capture du tableau de bord | — |
| `ProductShot.tsx` | Cadre de capture : ratio fixe, `object-cover object-top`, halo jaune | — |
| `ModulesGrid.tsx` | Grille d'icônes ; clic ouvre le détail sous la grille | oui |
| `CostComparison.tsx` | Une ligne par fonction, l'outil qu'elle demande aujourd'hui, son prix, le total face aux 12 € | — |
| `ModuleShowcase.tsx` | Trois sections alternées texte/capture : Live, Édition, Revenus | — |
| `PainPoints.tsx` | Trois constats, resserrés depuis six | — |
| `ProductProof.tsx` | Faits vérifiables du produit et intégrations réelles | — |
| `Pricing.tsx` | Trois plans, le plan Pro mis en avant | — |
| `WaitlistSection.tsx` | Formulaire, validation, états de soumission, ancres `#get-access` et `?early-access=1` | oui |
| `LandingFooter.tsx` | Trois colonnes, plus la liste complète des modules | — |

Ordre des sections : Hero → Modules → Comparatif → Détail des modules →
Pain points → Preuve → Tarifs → Waitlist → Footer.

## Typographie

Archivo, chargée dans `app/layout.tsx` via `next/font/google` avec l'axe
variable `wdth`, exposée en `--font-archivo` sur `<html>`.

- Corps : `body` hérite de la variable dans `app/globals.css`.
- Titres : classe `.font-display` — même famille, `font-stretch: 125%`,
  `font-weight: 700`, `letter-spacing: -0.015em`. Pas de casse forcée : chaque
  composant décide de ses majuscules.

Cela remplace Bebas Neue et DM Sans partout, y compris dans le blog et dans le
`typography` de `tailwind.config.ts`. Le `<link>` Google Fonts inline et son
`eslint-disable` disparaissent.

## Ce qui disparaît

- Le `<canvas>` animé du hero et le hook `usePrefersReducedMotion` associé.
- Les `WaveSeparator` : le rythme vient de l'alternance de fonds
  `#101010` / `#0a0a0a` et des bordures de section.
- L'`IntersectionObserver` qui pilotait les `data-reveal`.
- Les trois témoignages : ils étaient fictifs, le produit est en pré-bêta.
- Le badge « Bientôt disponible » d'Édition : le module est livré.

## Captures produit

Quatre fichiers attendus dans `public/images/landing/` — voir le README du
dossier. Les cadres sont en ratio 16/9, recadrés par le haut, donc tolérants aux
dimensions réelles des fichiers.

## Comparatif de coût

Onze lignes, une par fonction native de SIDEKICK, avec l'outil qu'elle
demanderait autrement : Notion, Google Agenda, Airtable, tableur, Freebe,
DocuSign, Dropbox, Mailchimp, Canva, Excel. Total calculé depuis le tableau, pas
écrit en dur. Une mention précise que ce sont des tarifs publics constatés pour
des formules individuelles et que les marques ne sont pas affiliées.

## Ce qui est préservé

Dark-only, `#F0FF00` en accent unique et parcimonieux, `rounded-sm`, icônes
Lucide, primitives `src/components/ui/`, `cn()`, français et tutoiement.

## Vérification

`npx tsc --noEmit` et `npm run build` passent. La landing, `/blog` et `/login`
répondent 200 en dev.

## Hors périmètre, constaté au passage

- `npm run lint` échoue : `next lint` a été retiré de Next 16. Migration vers
  la CLI ESLint à faire, sans rapport avec cette refonte.
- Pas d'image Open Graph, système de favicons incomplet, pas de logo vectoriel —
  points 5 et 6 du `BRANDING-BRIEF.md`, non traités ici.
- Pas de pages légales : le footer n'en propose donc aucune.
