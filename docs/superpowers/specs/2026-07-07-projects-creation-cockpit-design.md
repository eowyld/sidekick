# Onglet Création — Cockpit & parcours en 3 phases

**Date :** 2026-07-07
**Module :** `projects` — onglet Création (`src/modules/projects/components/tabs/CreationTab.tsx`)
**Statut :** Design validé, prêt pour plan d'implémentation

---

## 1. Intention

Transformer l'onglet Création d'une simple checklist par secteur en un **véritable suivi/accompagnement de l'artiste**, à la fois :

- **Parcours guidé** — une colonne vertébrale en 3 phases (Création → Production → Sortie) qui raconte où en est le projet ;
- **Cockpit** — nourri par les vraies données de Phono, Édition et Live liées au projet (signaux auto).

Le langage visuel s'aligne sur les pages de référence de l'app (Dashboard notamment) : grande typographie extralight, point accent néon, espaces généreux, hiérarchie claire.

**Hors scope :** dimension « carnet de création » narrative. Le bloc *Brainstorming* actuel est retiré de l'UI.

---

## 2. Décisions de conception (issues du brainstorming)

| Sujet | Décision |
|---|---|
| Nature | Parcours guidé **+** cockpit, nourris par données réelles. Pas de carnet. |
| Colonne vertébrale | **Hybride** : phases en colonne vertébrale, secteurs à l'intérieur de chaque phase. |
| Nombre de phases | **3** : Création · Production · Sortie. |
| Contenu des phases | Étapes manuelles (à cocher) **+** signaux auto tirés des modules liés. |
| Phase active | **Auto** : première phase non terminée. Zéro entretien. |
| Bloc Brainstorming | **Retiré** de l'UI. |
| Bloc Éléments liés | **Conservé**, replié en bas ; sert de source aux signaux auto. |

---

## 3. Modèle de données

### 3.1 Les 3 phases

Type ajouté dans `src/lib/sidekick-store.ts` :

```ts
export type CreationPhase = "creation" | "production" | "sortie";

export const CREATION_PHASE_ORDER: CreationPhase[] = ["creation", "production", "sortie"];

export const CREATION_PHASE_LABELS: Record<CreationPhase, string> = {
  creation: "Création",
  production: "Production",
  sortie: "Sortie",
};
```

### 3.2 Étape de création (`CreationStep`)

L'interface `CreationStep` existante gagne un champ `phase`. Elle conserve `sector` (le tag métier affiché dans la phase) et tous ses autres champs (status, targetDate, assignee, linkedEntityType/Id, links, taskId).

```ts
export interface CreationStep {
  id: string;
  projectId: string;
  phase: CreationPhase;      // ← NOUVEAU
  sector: CreationSector;    // phono | edition | live | general (tag affiché)
  label: string;
  status: CreationStepStatus; // todo | doing | done
  orderIndex: number;
  targetDate: string | null;
  assignee: string;
  linkedEntityType: CreationEntityType;
  linkedEntityId: string;
  links: CreationStepLink[];
  taskId: string | null;
}
```

### 3.3 Migration Supabase

Nouveau fichier `supabase/migrations/20260707000000_creation_steps_phase.sql` :

```sql
-- Onglet Création : ajout de la phase aux étapes de pipeline.
alter table public.user_project_creation_steps
  add column if not exists phase text not null default 'creation';
```

**Mappers** (`useProjectCreationData.ts`) : `rowToStep` lit `phase` (fallback `"creation"`), `stepToRow` écrit `phase`.

### 3.4 Reset des étapes existantes (dev, one-shot)

Le modèle passe de « templates par secteur » à « templates par secteur ventilés en phases ». Les étapes déjà semées n'ont pas de phase cohérente et le projet « EP Été 2026 » a des doublons. Après la migration, exécuter **une fois** dans le SQL Editor pour repartir propre :

```sql
delete from public.user_project_creation_steps;
update public.user_projects set creation_seeded_sectors = '[]'::jsonb;
```

Au prochain chargement, le seeding réinjecte les templates phase-aware. Acceptable car pré-beta, un seul utilisateur.

---

## 4. Templates de seeding (par secteur, ventilés en phases)

Fichier `src/modules/projects/data/creation-templates.ts` — remplace le format actuel `Record<sector, string[]>` par un format qui porte la phase :

```ts
export interface CreationTemplateStep {
  phase: CreationPhase;
  label: string;
}

export const CREATION_TEMPLATES: Record<Exclude<CreationSector, "general">, CreationTemplateStep[]> = {
  phono: [
    { phase: "creation",   label: "Écriture" },
    { phase: "creation",   label: "Composition" },
    { phase: "creation",   label: "Première maquette" },
    { phase: "production", label: "Session studio" },
    { phase: "production", label: "Mixage" },
    { phase: "production", label: "Mastering" },
    { phase: "sortie",     label: "Distribution" },
  ],
  edition: [
    { phase: "creation",   label: "Écriture / Composition" },
    { phase: "sortie",     label: "Répartition des droits" },
    { phase: "sortie",     label: "Dépôt SACEM" },
  ],
  live: [
    { phase: "creation",   label: "Conception du set" },
    { phase: "production", label: "Répétitions" },
    { phase: "production", label: "Résidence" },
    { phase: "sortie",     label: "Stratégie de tournée" },
  ],
};

export const SECTOR_LABELS: Record<CreationSector, string> = {
  phono: "Phono", edition: "Édition", live: "Live", general: "Général",
};
```

`seedSector` (dans `useProjectCreationData.ts`) crée une `CreationStep` par entrée du template du secteur, en reportant `phase` et `sector`, avec `orderIndex` incrémental au sein de (phase, secteur). Le garde-fou `creationSeededSectors` est inchangé.

---

## 5. Signaux auto (cockpit)

Calculés **côté client** (`useMemo`), à partir des données de modules déjà liées au projet (`project.linkedTracks`, `linkedAlbums`, `linkedSessions`, `linkedWorks`, `linkedTourDates`, `linkedRehearsals`). Aucun appel réseau supplémentaire. Un signal ne s'affiche que si son compte > 0.

Un signal = `{ label: string; tone: "accent" | "muted" }`. `tone: "accent"` (jaune) pour les accomplissements, `"muted"` pour les éléments en cours/à venir.

| Phase | Signaux dérivés |
|---|---|
| **Création** | Phono : `N titre(s) en production` (status `en_production`, muted). Édition : `N œuvre(s) déposée(s) SACEM` (status `registered-sacem`/`accepted-sacem`, accent) ; `N œuvre(s) en cours` (status `in-progress`, muted). |
| **Production** | Phono : `N titre(s) mixé(s)` (status `mixe`, muted) ; `N masterisé(s)` (status `masterise`, accent) ; `N session(s) studio` (sessions liées, muted). Live : `N répétition(s)` (répétitions liées, muted). |
| **Sortie** | Phono : `N titre(s) publié(s)` (status `publie`, accent). Live : `N concert(s) à venir` (tour dates avec date ≥ aujourd'hui, accent). Édition : `N œuvre(s) exploitée(s)` (status `accepted-sacem`, muted). |

Statuts de référence : `ReleaseStatus = en_production | mixe | masterise | publie` (Phono) ; `Work.status = in-progress | finalized | registered-sacem | accepted-sacem` (Édition).

**Source des données de modules :** l'onglet lit toujours via `useSidekickData` (comme les sections `PhonoSection`/`EditionSection`/`LiveSection` actuelles) pour rester cohérent avec le linking existant. Pas de changement de source dans ce lot.

---

## 6. Logique de phase active & progression

```ts
// Une phase est "terminée" si elle a ≥1 étape et que toutes sont "done".
function isPhaseDone(steps: CreationStep[], phase: CreationPhase): boolean {
  const s = steps.filter(x => x.phase === phase);
  return s.length > 0 && s.every(x => x.status === "done");
}

// Phase active = première phase non terminée dans l'ordre. Si toutes terminées → "sortie".
function activePhase(steps: CreationStep[]): CreationPhase {
  return CREATION_PHASE_ORDER.find(p => !isPhaseDone(steps, p)) ?? "sortie";
}

// Progression globale = étapes done / total, toutes phases confondues.
// pct arrondi à l'entier.
```

---

## 7. Structure UI

Un seul composant réorganisé : `CreationTab.tsx`. Sous-composants extraits pour rester lisibles (`PhaseCockpit`, `PhaseCard`, `PhaseSignals`, plus les `StepRow`/`StepDialog`/`StepStatusIcon` existants réutilisés). De haut en bas :

### 7.1 Cockpit (hero)
- Ligne label : point accent néon + `Parcours créatif · {project.title}` (uppercase, tracking large) — style `DashboardHero`.
- Titre extralight ~38px : **« Tu es en _{phase active}_. »**, nom de phase en accent `#F0FF00`. Si toutes les phases sont terminées : **« Projet bouclé. »**.
- **Stepper 3 phases** : 3 segments horizontaux. Terminée = barre pleine accent + `{Label} ✓`. Active = barre partielle (remplie au ratio done/total de la phase) + `{Label} · en cours`. À venir = barre grise + `{Label}`.
- Deux stats extralight (style Dashboard, séparateur bas) : `{n} étapes restantes` · `{pct}% du parcours accompli`.

### 7.2 Phases
Les 3 phases rendues dans l'ordre. La **phase active est dépliée par défaut**, bord accent `rgba(240,255,0,.25)` ; les autres sont repliées (clic pour déplier/replier).

Contenu d'une phase dépliée :
1. En-tête : `{Label}` + compteur `{done}/{total}`.
2. **Signaux auto** (§5) en pastilles arrondies — accent ou muted.
3. **Étapes** groupées par secteur (label secteur en petit uppercase), chacune = `StepRow` existant : icône statut cyclable (todo `○` → doing `◉` → done `●`), label (barré si done), chips (date cible, assignee, entité liée, liens, tâche générée), menu `…` (Modifier / Générer une tâche / Supprimer).
4. Bouton `+ Ajouter une étape` (l'étape créée hérite de la phase et prend le secteur `general` par défaut ; modifiable via le dialog).

Phase repliée : ligne compacte `{Label}` + `{done}/{total} · {état}` (`terminée` / `à venir` / `en cours`), opacité réduite.

### 7.3 Éléments liés (replié, en bas)
Bloc repliable inchangé, réutilisant `PhonoSection` / `EditionSection` / `LiveSection` / `WorkTrackLinker` selon `project.sectors`. C'est ici qu'on lie/délie les titres, albums, sessions, œuvres, dates — ce qui alimente les signaux auto.

### 7.4 Retiré
Le bloc **Brainstorming** disparaît de l'UI (la colonne `brainstorm` reste en base, inutilisée — pas de migration de suppression).

---

## 8. Fichiers touchés

| Fichier | Nature |
|---|---|
| `supabase/migrations/20260707000000_creation_steps_phase.sql` | **Créé** — colonne `phase`. |
| `src/lib/sidekick-store.ts` | **Modifié** — types `CreationPhase`, constantes, champ `phase` sur `CreationStep`. |
| `src/modules/projects/data/creation-templates.ts` | **Modifié** — templates phase-aware. |
| `src/hooks/useProjectCreationData.ts` | **Modifié** — mappers `phase`, `seedSector` phase-aware, helpers `activePhase`/`isPhaseDone`/progression, dérivation des signaux auto. |
| `src/modules/projects/components/tabs/CreationTab.tsx` | **Réécrit** — cockpit + phases + éléments liés ; brainstorm retiré. |

Aucun changement de source de données pour le linking (reste `useSidekickData`), aucune nouvelle route.

---

## 9. Critères d'acceptation

1. L'onglet affiche un cockpit avec la phrase « Tu es en _{phase}_ », un stepper 3 phases et deux stats.
2. La phase active est déterminée automatiquement (première non terminée) et est dépliée par défaut.
3. Chaque phase montre ses signaux auto (comptes réels des modules liés) et ses étapes groupées par secteur.
4. Cocher toutes les étapes d'une phase la marque terminée (✓ dans le stepper) et fait avancer la phase active.
5. Le seeding d'un secteur crée les étapes réparties sur les bonnes phases.
6. Le bloc Éléments liés est présent, replié, fonctionnel.
7. Le bloc Brainstorming n'apparaît plus.
8. `npx tsc --noEmit` : 0 erreur.
