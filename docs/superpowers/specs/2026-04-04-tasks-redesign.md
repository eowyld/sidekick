# Redesign module Tâches — Spec

**Date :** 2026-04-04  
**Statut :** Validé, prêt pour implémentation

---

## Résumé

Refonte complète du module Tâches. On remplace la vue tableau actuelle par un layout split en deux panneaux (focus du jour à gauche, backlog à droite), on passe de `done: boolean` à 3 statuts discrets, et on ajoute un système de suggestions IA quotidiennes basées sur l'analyse du compte.

---

## 1. Data model

### `Todo` dans `sidekick-store.ts`

Remplacement de `done: boolean` par `status` + ajout de `todayFocus`.

```ts
export interface Todo {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done"; // remplace done: boolean
  todayFocus: boolean;                      // true = dans le focus du jour
  description?: string;
  deadline?: string;
  sector?: TaskSector;
  createdAt?: string;
}
```

**Migration des données existantes :** à l'initialisation du store, si une tâche a `done: boolean` (ancien format), la convertir : `done: true` → `status: "done"`, `done: false` → `status: "todo"`, `todayFocus: false`.

### Préférences — Instructions IA par module

Ajout dans `data.preferences` :

```ts
aiTaskInstructions?: {
  live?: string;
  phono?: string;
  admin?: string;
  marketing?: string;
  edition?: string;
  revenus?: string;
  general?: string; // instructions globales
};
```

Stocké en localStorage via le store existant. Éditable depuis les paramètres du module ou la page Settings.

### Table Supabase — `task_suggestions`

```sql
create table task_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  suggestions jsonb not null,
  created_at timestamptz default now(),
  unique (user_id, date)
);
```

RLS : lecture/écriture uniquement pour l'utilisateur authentifié propriétaire.

---

## 2. Layout & composants

### Structure des fichiers

```
src/modules/tasks/
  components/
    TasksPage.tsx         — inchangé (wrapper)
    Tasks.tsx             — layout principal + state management (refactorisé)
    TodayPanel.tsx        — panneau gauche : focus du jour + terminées
    BacklogPanel.tsx      — panneau droit : backlog + suggestions IA
    TaskCard.tsx          — carte tâche réutilisable
    AiSuggestions.tsx     — section suggestions IA (sous le backlog)
    TaskModal.tsx         — modal création/édition (adapté au nouveau schema)
```

### Layout visuel

```
┌─────────────────────────────────────────────────────┐
│  Tâches                          [+ Nouvelle tâche] │
├──────────────────────┬──────────────────────────────┤
│  ⚡ Aujourd'hui      │  Backlog                      │
│  ─────────────────  │  ──────────────────────────  │
│  [TaskCard]         │  [TaskCard] [⚡] [✏] [🗑]    │
│  [TaskCard]         │  [TaskCard] [⚡] [✏] [🗑]    │
│                     │  [TaskCard] [⚡] [✏] [🗑]    │
│                     │                               │
│                     │  ✨ Suggestions IA             │
│  (espace)           │    [SuggestionCard] [+]        │
│                     │    [SuggestionCard] [+]        │
│  ▼ Terminées (3)    │                               │
│    [TaskCard faded] │                               │
│    [TaskCard faded] │                               │
└──────────────────────┴──────────────────────────────┘
```

### `TaskCard`

Composant unique, adapté selon son contexte via props :

```ts
interface TaskCardProps {
  task: Todo;
  context: "today" | "backlog";
  onStatusChange: (id: string, status: Todo["status"]) => void;
  onAddToToday?: (id: string) => void;     // backlog seulement
  onRemoveFromToday?: (id: string) => void; // today seulement
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  draggable?: boolean;
}
```

- **Panneau gauche :** badge statut cyclable, bouton pour retirer du focus, édition/suppression
- **Panneau droit :** bouton ⚡ "Faire aujourd'hui", édition, suppression

Le badge statut cycle au clic : `todo → in_progress → done → todo`.

Couleurs des statuts :
- `todo` → gris (`slate`)
- `in_progress` → bleu (`blue`)
- `done` → vert (`green`)

---

## 3. Interactions UX

### Statut

Clic sur le badge statut dans `TaskCard` → cycle discret : `todo → in_progress → done → todo`. Quand une tâche du panneau gauche passe à `done`, elle descend automatiquement dans la section repliable "Terminées".

### Focus du jour

Deux façons d'ajouter une tâche au focus du jour depuis le backlog :
1. **Bouton ⚡** sur la TaskCard → `todayFocus: true`
2. **Drag & drop** de la carte vers le panneau gauche → `todayFocus: true`

Deux façons de retirer une tâche du focus du jour :
1. **Bouton de retrait** sur la TaskCard du panneau gauche → `todayFocus: false`
2. **Drag & drop** de la carte vers le panneau droit → `todayFocus: false`

**Pas de reset automatique.** Une tâche reste dans "Aujourd'hui" jusqu'à ce que l'utilisateur la retire manuellement.

### Section "Terminées"

- Affichée dans le panneau gauche, sous un espace visuel après les tâches du jour
- Repliable via un accordéon (titre "Terminées (N)" cliquable)
- Cartes affichées en opacité réduite (`text-muted-foreground`, style `line-through` sur le titre)
- Inclut uniquement les tâches avec `status: "done"` ET `todayFocus: true`

**Tâches terminées depuis le backlog** (sans passer par le focus du jour) : elles disparaissent du backlog. Le backlog n'affiche que les tâches `todayFocus: false` avec `status: "todo"` ou `"in_progress"`. Les tâches `done` du backlog sont archivées silencieusement — pas de vue dédiée dans ce scope.

### Création de tâche

- Bouton "+ Nouvelle tâche" → ouvre `TaskModal`
- Les tâches créées arrivent dans le backlog (`todayFocus: false`, `status: "todo"`)

### Drag & drop

Bibliothèque : `@dnd-kit/core` (standard dans l'écosystème Next.js, accessible, pas de dépendance jQuery).

---

## 4. Intégration IA

### Architecture

```
Ouverture page Tasks
       ↓
GET /api/tasks/ai-suggestions
       ↓
Supabase : suggestions du jour existent pour cet user ?
  ├── OUI → retourne le cache (task_suggestions)
  └── NON → construit le contexte minimal
              ↓
        Appel Claude Haiku 4.5 via Vercel AI SDK
        (generateObject avec schema Zod)
              ↓
        Résultat stocké dans task_suggestions
              ↓
        Retourné au client
```

### Contexte envoyé au modèle (input minimal)

| Source | Données envoyées | Exclues |
|---|---|---|
| Tâches | Titre + secteur des tâches `todo`/`in_progress` | Descriptions, tâches `done`, ids |
| Calendrier | Titre + date des événements des 14 prochains jours | Passé, détails, localisation |
| Modules actifs | Liste des modules activés | Reste des préférences |
| Instructions IA | `aiTaskInstructions` par module (texte libre) | — |
| Date du jour | ISO string | — |

Estimation : ~500 tokens d'input → ~$0.0004/appel → ~$0.12/mois pour 1 utilisateur quotidien.

### Schema de sortie (Zod)

```ts
const TaskSuggestionSchema = z.object({
  title: z.string(),
  sector: z.enum(["Live", "Phono", "Admin", "Marketing", "Edition", "Revenus", "Autre"]),
  reason: z.string(), // ex: "Concert le 12 avril → penser au rider"
});

const SuggestionsSchema = z.object({
  suggestions: z.array(TaskSuggestionSchema).max(8),
});
```

Le champ `reason` est affiché en sous-titre dans chaque `SuggestionCard` pour rendre le raisonnement de l'IA transparent.

### Route API

`app/api/tasks/ai-suggestions/route.ts`

- Auth : `createServerSupabase` + vérification session
- Lit les données user depuis la requête (client envoie le contexte sérialisé)
- Vérifie le cache Supabase avant d'appeler Haiku
- Retourne `{ suggestions: TaskSuggestion[], cached: boolean }`

### Instructions IA par module

L'utilisateur configure des instructions en texte libre par module activé. Exemples :
- *Live : "Signaler les concerts dans les 2 prochaines semaines sans rider confirmé"*
- *Phono : "Vérifier si des titres récents n'ont pas encore été déclarés"*
- *General : "Privilégier les tâches urgentes avec deadline proche"*

Stockées dans `data.preferences.aiTaskInstructions` (localStorage). Injectées dans le prompt système au moment de la génération. Interface d'édition : section "IA" dans les paramètres du module Tâches.

### `AiSuggestions` component

- Affiché en bas du panneau droit, toujours visible
- Au chargement : appel `GET /api/tasks/ai-suggestions`
- États : `loading` (skeleton), `error` (message + bouton retry), `empty` (aucune suggestion), `ready`
- Bouton `+` sur chaque suggestion → crée la tâche dans le backlog via `setData`
- Bouton optionnel "↻ Regénérer" pour forcer un nouvel appel (ignore le cache du jour)

---

## 5. Ce qui n'est pas dans ce scope

- Migration localStorage → Supabase (planifiée plus tard, avant la beta)
- Agent IA avec outils (query Supabase directe) — à considérer après la beta
- Notifications/rappels sur les deadlines
- Filtres avancés sur le backlog (par secteur, deadline)

---

## Dépendances à installer

- `ai` (Vercel AI SDK)
- `@ai-sdk/anthropic`
- `@dnd-kit/core` + `@dnd-kit/sortable`
- `zod` (probablement déjà présent)
