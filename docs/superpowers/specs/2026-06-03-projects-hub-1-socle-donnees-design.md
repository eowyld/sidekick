# Projets Hub — Phase 1 : Socle données & navigation

Date: 2026-06-03
Statut: design validé (brainstorming)

## Vision d'ensemble (commune aux 4 phases)

Le module Projets cesse d'être un simple liant Phono/Édition/Live pour devenir **l'élément central de l'application**. Un projet agrège et pilote, de façon transversale :

- **Budget prévisionnel** (dépenses + revenus attendus) comparé au réel, avec rattachement des sources de revenus (phase 2).
- **Campagne marketing** : un ou plusieurs *temps forts* (concert, sortie, clip, annonce…) autour desquels s'organisent publications et mailings (phase 3).
- **Statuts juridiques & contrats** rattachés (phase 4).
- **Création** : les sections Phono / Édition / Live existantes (conservées).

Modèle de hub **hybride** : lecture/agrégation pour ce qui vit ailleurs (revenus, contrats), création active pour ce qui n'existe qu'au niveau projet (budget prévisionnel, dépenses, temps forts).

Le dashboard projet `/projects/[id]` adopte une **structure à 5 onglets** : Vue d'ensemble (cockpit), Budget, Campagne marketing, Création, Admin.

Découpage : **Phase 1** (ce doc) = socle données + navigation + coquille à onglets. **Phase 2** = Budget. **Phase 3** = Campagne marketing. **Phase 4** = Admin & finitions. Les phases 2-4 sont indépendantes entre elles une fois la phase 1 posée.

---

## Scope de la phase 1

1. Migrer le module Projets de localStorage vers Supabase.
2. Préparer le schéma de rattachement (`project_id`) sur les entités des autres modules.
3. Ajouter le concept de *temps forts* sur le projet.
4. Refondre la navigation sidebar (gros bouton PROJETS) et retirer « Anciens projets » de la nav.
5. Transformer le dashboard projet en coquille à onglets (onglets Budget/Campagne/Admin présents mais pouvant être vides, remplis en phases 2-4 ; Création et Vue d'ensemble fonctionnels dès la phase 1).

## Migration localStorage → Supabase

### Table `user_projects`

Reprend les champs de l'interface `Project` actuelle (`src/lib/sidekick-store.ts`).

```
user_projects
  id              uuid pk
  user_id         uuid  (RLS)
  title           text
  description     text
  status          text   -- 'idea' | 'in_progress' | 'paused' | 'done' | 'archived'
  cover           text
  images          jsonb  -- string[]
  sectors         jsonb  -- ('phono'|'edition'|'live')[]
  members         jsonb  -- ProjectMember[]
  linked_albums   jsonb  -- string[]   (conservés tels quels)
  linked_tracks   jsonb  -- string[]
  linked_sessions jsonb  -- string[]
  linked_works    jsonb  -- string[]
  linked_tour_dates jsonb -- string[]
  linked_rehearsals jsonb -- string[]
  key_dates       jsonb  -- KeyDate[]  (nouveau, voir plus bas)
  notes           text
  created_at      timestamptz
  updated_at      timestamptz
```

RLS : politiques `user_id = auth.uid()` (calquées sur les tables existantes). Migration idempotente.

### `KeyDate` (temps forts)

Stocké en JSONB sur le projet (pas de table dédiée — toujours lu avec le projet, jamais requêté seul).

```typescript
interface KeyDate {
  id: string;
  label: string;      // "Concert release", "Sortie clip"...
  type: string;       // libre : "concert" | "sortie" | "clip" | "annonce" | ...
  date: string;       // ISO YYYY-MM-DD
}
```

### Hook `useProjectsData`

Nouveau hook `src/hooks/useProjectsData.ts` suivant le **pattern optimiste standard** des autres modules (snapshot synchrone dans le setter, op async Supabase en IIFE, rollback sur erreur). Signature `setProjects((prev: Project[]) => Project[])`. Remplace l'usage de `useSidekickData` pour les projets dans `ProjectsPage`, `ProjectDashboard`, `ArchivesPage`, `ProjectModal`, et les sections.

### Migration des données existantes

Au premier chargement, si `data.projects.projects` (localStorage) est non vide et qu'aucune ligne `user_projects` n'existe pour l'utilisateur : insérer les projets locaux dans Supabase, puis marquer la migration comme faite (flag local `projects_migrated_to_supabase`). Peu de données (solo dev, pre-beta) → migration one-shot simple, pas de mapping complexe. Retirer ensuite `projects` de `SidekickData` une fois la migration confirmée (ou le laisser inerte ; décision à l'implémentation).

## Schéma de rattachement aux autres modules

Ajout d'une colonne `project_id uuid null` (FK logique vers `user_projects.id`, `on delete set null`) sur :

| Table | Module | Utilisé en phase |
|---|---|---|
| `user_invoices` | Revenus | 2 |
| `user_royalties_manual` | Revenus | 2 |
| `user_mailing_campaigns` | Marketing | 3 |
| `user_marketing_events` | Marketing | 3 |
| `contracts` | Admin/Contrats | 4 |

> Les colonnes sont **toutes créées en phase 1** (une seule passe de migration SQL), même si elles ne sont exploitées qu'en phases 2-4. Cela évite de multiplier les migrations.

**Statuts juridiques** (phase 4) : rattachement *plusieurs-à-plusieurs* (un projet peut référencer plusieurs statuts). Stocké comme `linked_statut_ids jsonb` sur `user_projects` (tableau d'IDs), ajouté dès la phase 1 dans le schéma de table.

**Royalties d'import** (`user_royalties_imports`) : **pas** de `project_id`. Elles remontent via le lien `linked_tracks` du projet (agrégation calculée en phase 2).

## Navigation — Sidebar

Refonte de `src/components/layout/Sidebar.tsx` :

- **Retirer** l'entrée « Projets » (et ses sous-items « Projets actifs » / « Anciens projets ») de `groupMusique`.
- **Ajouter** un **gros bouton PROJETS autonome**, visuellement accentué (style distinct des liens de nav classiques — fond/bordure accent `#F0FF00` discret, icône `FolderKanban`), placé **entre la section Organisation et la section Business**. Lien direct → `/projects`. Pas de sous-items.
- Ordre final des blocs : `Organisation` → **bouton PROJETS** → `Business` → `Musique`.
- En mode sidebar repliée (`w-16`), le bouton se réduit à l'icône accentuée.

Justification : Projets est le pivot, mais reste après Organisation (Tableau de bord, Calendrier, Tâches, Contacts) car ce sont les premiers réflexes à l'ouverture de l'app.

## Pages

### `/projects` (liste) — ajustement

- Conserver la grille de cartes existante.
- **Retirer** le lien « Anciens projets » de la sidebar → le rendre accessible via un **petit bouton discret en haut de la page**, à côté de « Nouveau projet » (ex. lien texte « Anciens projets » avec icône `Archive`).
- La route `/projects/archives` reste en place, juste plus dans la nav.

### `/projects/[id]` — coquille à onglets

Refonte de `ProjectDashboard.tsx` :

- **Header conservé** au-dessus des onglets : bannière cover, titre, dropdown statut, description, secteurs, membres, menu actions.
- **Barre d'onglets** : `Vue d'ensemble` · `Budget` · `Campagne marketing` · `Création` · `Admin`.
  - Onglet actif piloté par l'URL : `?tab=overview|budget|marketing|creation|admin` (défaut `overview`). Permet l'accès direct depuis le cockpit ou une suggestion.
  - **Création** ne s'affiche que si `sectors.length > 0`.
  - Budget / Campagne marketing / Admin sont toujours présents (transversaux).
- **Vue d'ensemble (cockpit)** — opérationnelle dès la phase 1, avec les cartes qui se remplissent au fil des phases. Layout validé : grille 2×2 de cartes cliquables (Budget / Campagne marketing / Création / Admin) + bandeau suggestions en bas. En phase 1, les cartes Budget/Campagne/Admin peuvent afficher un état vide « À configurer » ; la carte Création affiche les compteurs réels (titres/œuvres/dates).
- **Création** : déplacer les sections existantes `PhonoSection` / `EditionSection` / `LiveSection` + `WorkTrackLinker` dans cet onglet, sans modification fonctionnelle.
- **Galerie & Notes** : repliées en bas de l'onglet Vue d'ensemble.

## Hors scope (phase 1)

- Tout le contenu fonctionnel des onglets Budget, Campagne marketing, Admin (phases 2-4).
- Les badges « Projet » dans les autres modules (phase 4).
- Les suggestions de tâches propres au projet (phase 4).
- Sortir Projets de la section Musique au sens conceptuel (déjà fait via le bouton autonome) — pas de refonte plus large de l'IA.

## Dépendances

Aucune. C'est le socle. Les phases 2, 3, 4 en dépendent toutes.
