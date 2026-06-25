# Projets Hub — Création : pipeline & suivi créatif

Date: 2026-06-25
Statut: design validé (brainstorming)
Dépend de: Phase 1 (socle données & navigation), onglets projet existants

## Contexte

Aujourd'hui l'onglet **Création** d'un projet est un simple **hub de liaison** : selon les
secteurs activés (Phono / Édition / Live), il affiche des sections qui permettent de **lier** ou
**créer** des entités existantes (albums, titres, sessions studio, œuvres, dates live, répétitions),
avec une barre de progression dérivée par section. Il n'y a aucune notion de **process créatif**.

Or un artiste fait avancer un projet par étapes : écriture, composition, première maquette,
premières versions, session studio, mixage, mastering, répétition, entraînement scène, résidence
de création live… Cette évolution ajoute à l'onglet Création une **feuille de route d'étapes**
(suivi + planning), une **zone de brainstorming** au niveau projet, et des **connexions** vers les
autres modules (deep-link, génération de tâche, et — en phase 2 — synchro de statut).

L'existant (sections de liaison) est **conservé**, réorganisé en bloc secondaire repliable.

## Décisions de cadrage (brainstorming)

- **Unité de suivi** : étapes **globales au projet**, avec possibilité d'en rattacher une à un
  livrable précis (titre / œuvre / date live / session).
- **Origine des étapes** : **pipeline-type pré-rempli par secteur**, éditable (ajout / suppression /
  réordonnancement libres).
- **Champs d'une étape** : statut · date cible · responsable · livrable rattaché (lien cliquable) ·
  fichiers/liens. *(Pas de notes ni sous-checklist par étape — choix utilisateur.)*
- **Brainstorming** : une **zone au niveau projet** (texte libre), distincte des Notes de la Vue
  d'ensemble. Format retenu : **bloc-texte unique** (YAGNI ; pas de cartes d'idées séparées).
- **Connexions** : deep-link entité · génération d'une tâche · synchro de statut (**phase 2**).
- **Affichage** : **feuille de route** (checklist) avec une **grande barre de progression globale**.

## Modèle de données

### Nouvelle table `user_project_creation_steps`

Calquée sur `user_project_budget_lines` (même pattern RLS via propriété du projet).

```
user_project_creation_steps
  id                  uuid pk
  project_id          uuid -> user_projects.id  (on delete cascade)
  sector              text   -- 'phono' | 'edition' | 'live' | 'general'
  label               text
  status              text   -- 'todo' | 'doing' | 'done'   (défaut 'todo')
  order_index         int    -- ordre d'affichage dans le secteur (défaut 0)
  target_date         date   null   -- échéance / date cible
  assignee            text   -- nom d'un membre du projet (défaut '')
  linked_entity_type  text   -- '' | 'track' | 'album' | 'session' | 'work' | 'tour_date' | 'rehearsal'
  linked_entity_id    text   -- id de l'entité rattachée (défaut '')
  links               jsonb  -- [{ label, url }]  (défaut [])
  task_id             uuid   null   -- renseigné quand une tâche a été générée
  created_at          timestamptz
```

- Index sur `project_id`.
- RLS : `for all using/with check` sur `project_id in (select id from user_projects where user_id = auth.uid())`.

### Colonnes ajoutées à `user_projects`

```
brainstorm               text   default ''          -- zone d'idées libres (Création)
creation_seeded_sectors  jsonb  default '[]'::jsonb  -- secteurs déjà pré-remplis (anti ré-injection)
```

### Types (`src/lib/sidekick-store.ts`)

```ts
export type CreationStepStatus = "todo" | "doing" | "done";
export type CreationSector = "phono" | "edition" | "live" | "general";
export type CreationEntityType =
  | "" | "track" | "album" | "session" | "work" | "tour_date" | "rehearsal";

export interface CreationStepLink { label: string; url: string; }

export interface CreationStep {
  id: string;
  projectId: string;
  sector: CreationSector;
  label: string;
  status: CreationStepStatus;
  orderIndex: number;
  targetDate: string | null;       // ISO YYYY-MM-DD
  assignee: string;
  linkedEntityType: CreationEntityType;
  linkedEntityId: string;
  links: CreationStepLink[];
  taskId: string | null;
}
```

Le type `Project` gagne `brainstorm: string` et `creationSeededSectors: CreationSector[]`,
avec mise à jour des mappers `rowToProject` / `projectToRow` dans `useProjectsData`.

## Étapes-types par secteur + auto-seed

Constantes dans `src/modules/projects/data/creation-templates.ts` :

- **Phono** : Écriture · Composition · Première maquette · Pré-prod · Session studio ·
  Premières versions · Mixage · Mastering
- **Édition** : Dépôt des textes · Composition / arrangement · Finalisation · Dépôt SACEM
- **Live** : Création du set · Répétitions · Résidence · Entraînement scène · Filage
- **Général** : (vide — étapes 100 % manuelles)

> Les listes exactes sont à affiner avec l'utilisateur au moment de l'implémentation.

**Auto-seed sans ré-injection** : à l'ouverture de l'onglet Création, pour chaque secteur **actif**
absent de `project.creationSeededSectors`, on insère les étapes-types correspondantes (statut
`todo`, `order_index` croissant) **et** on ajoute le secteur à `creationSeededSectors`. Conséquence :
les étapes sont ajoutées automatiquement à l'activation d'un secteur, mais **jamais ré-injectées**
si l'utilisateur en supprime ensuite.

## Hook `useProjectCreationData(projectId)`

Copie du pattern `useProjectBudgetData` :

- `steps: CreationStep[]`, `loading`, `error`.
- `setSteps((prev) => next)` — mise à jour optimiste (diff upsert / delete vers
  `user_project_creation_steps`), rollback sur erreur.
- `seedSector(sector)` — insère les étapes-types d'un secteur et marque le secteur seedé
  (met à jour `user_projects.creation_seeded_sectors` via `useProjectsData`).
- `generateTask(step)` — crée une ligne `user_tasks` (titre = `label`, échéance = `targetDate`,
  secteur mappé) puis stocke l'`id` retourné dans `step.taskId`.
- Dérivé `progress` = `{ done, total, pct }` calculé sur l'ensemble des étapes.

## UI — Onglet Création (réorganisé)

De haut en bas :

1. **Feuille de route** — carte avec **grande barre de progression globale**
   (étapes `done` / total) + compteur.

2. **Étapes groupées par secteur** (secteurs actifs + « Général ») — chaque groupe :
   - mini-titre du secteur + mini-progression ;
   - liste d'étapes. Une ligne = case de statut (clic cycle `todo → doing → done`), label,
     puce date cible, puce responsable, puce livrable rattaché (cliquable → page du module),
     icône liens, menu « … » (éditer, générer une tâche, supprimer) ;
   - édition des champs via un **Dialog par étape** (date, responsable parmi `project.members`,
     livrable rattaché, liens) ;
   - **« + Ajouter une étape »** inline en bas du groupe.

3. **Brainstorming** — carte repliable, `Textarea` éditable avec le **même UX que la section
   Notes** de la Vue d'ensemble (affichage lecture + bouton « Modifier » → édition → boutons
   « Annuler » / « Enregistrer »). Persisté dans `user_projects.brainstorm`.

4. **Éléments liés** — les sections de liaison actuelles (`PhonoSection`, `EditionSection`,
   `LiveSection`, `WorkTrackLinker`) **conservées telles quelles**, regroupées sous un bloc
   **repliable** pour alléger l'onglet.

## Connexions & phasage

- **Deep-link livrable** : la puce d'entité rattachée route vers la page du module concerné
  (`/phono/catalogue`, `/edition`, `/live/representations`, `/live/repetitions`,
  `/phono/sessions-studio`), comme les sections existantes.
- **Générer une tâche** : crée une ligne `user_tasks` (titre, échéance, secteur), stocke `task_id`
  sur l'étape → indicateur « tâche créée » cliquable vers `/tasks`. *(La table `user_tasks` n'a pas
  de colonne `project_id` : pas de back-link projet pour l'instant, seulement étape → tâche.)*

### Phase 2 (séparée, livrée juste après)

- **Synchro auto statut ↔ entité** : pour une étape rattachée à une entité, refléter le statut de
  l'entité dans l'étape (ex. titre `masterise` → étape « Mastering » cochée). Nécessite une **clé
  stable d'étape** : ajout d'une colonne `template_key` aux étapes issues d'un template, et d'une
  table de correspondance « statut d'entité → clé d'étape » par secteur. **Hors périmètre** de la
  1ʳᵉ livraison.

## Hors scope (cette livraison)

- Upload de fichiers via Supabase Storage sur une étape (uniquement des **liens** `{label, url}`).
- Remontée des dates d'étapes dans le Calendrier / les temps forts (non retenu au cadrage).
- Brainstorming en cartes d'idées multiples (bloc-texte unique pour l'instant).
- Notes / sous-checklists par étape.
- Synchro automatique de statut (= phase 2).

## Dépendances

Phase 1 (table `user_projects`, coquille à onglets). Réutilise `useProjectsData`,
`useTasksData`, et les sections de liaison existantes. Indépendante des onglets Budget /
Marketing / Admin.
