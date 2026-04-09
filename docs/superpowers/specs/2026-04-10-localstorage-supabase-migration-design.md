# Migration localStorage → Supabase — Design Spec

**Date:** 2026-04-10  
**Objectif:** Migrer les données métier de localStorage vers Supabase pour préparer la beta multi-utilisateur, module par module, en commençant par `tasks`.

---

## Contexte

Toutes les données métier de SIDEKICK vivent actuellement dans un blob JSON unique en localStorage (`sidekick-data-{userId}`), géré par `useSidekickData()` et défini dans `src/lib/sidekick-store.ts`. Supabase est déjà utilisé pour l'auth, Drive, contrats, calendar iCal et task_suggestions — mais pas pour les données métier.

**Motivation:** Préparer la beta multi-utilisateur (isolation des données côté serveur, RLS Supabase).

**Approche:** Migration module par module. Le module pilote est `tasks`. Chaque module migré obtient un hook dédié et une table SQL propre. `useSidekickData` continue de gérer les modules non encore migrés.

---

## Section 1 : Schéma SQL — module `tasks`

Nouvelle table `user_tasks`, miroir du type `Todo` existant dans `sidekick-store.ts` :

```sql
create table user_tasks (
  id           text primary key,
  user_id      uuid references auth.users not null,
  title        text not null,
  status       text not null default 'todo',  -- 'todo' | 'in_progress' | 'done'
  today_focus  boolean not null default false,
  description  text,
  deadline     text,
  sector       text,
  created_at   text,
  subtasks     jsonb default '[]'             -- [{id, title, done}]
);

alter table user_tasks enable row level security;

create policy "Users manage own tasks"
  on user_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

**Décisions de schéma :**
- `id` est `text` (pas `uuid`) pour conserver les IDs existants du localStorage sans conversion
- `subtasks` reste en JSONB — pas de queries directes sur les sous-tâches, pas besoin d'une table séparée
- Tous les autres champs sont des colonnes plates pour permettre filtrage/tri côté Supabase à l'avenir

**Fichier de migration :** `supabase/migrations/20260410000000_user_tasks.sql`

---

## Section 2 : Hook `useTasksData()`

**Fichier :** `src/hooks/useTasksData.ts`

### Interface publique

```ts
const { tasks, setTasks, loading, error } = useTasksData()
```

- `tasks: Todo[]` — tableau des tâches de l'utilisateur connecté
- `setTasks: (fn: (prev: Todo[]) => Todo[]) => void` — même signature que l'ancien `setData` pour les tasks
- `loading: boolean` — true pendant le chargement initial
- `error: string | null` — message d'erreur si la requête Supabase échoue

### Comportement interne

1. **Chargement** — au mount, `select * from user_tasks order by created_at` (RLS filtre automatiquement par user)
2. **Écriture optimiste** — `setTasks(fn)` :
   - Calcule `next = fn(prev)`
   - Met à jour l'état React immédiatement
   - Diff `prev` vs `next` pour identifier ajouts, modifications, suppressions
   - Exécute en parallèle : `upsert` pour les ajoutés/modifiés, `delete` pour les supprimés
   - En cas d'erreur Supabase, rollback à `prev` et set `error`
3. **Mapping colonnes** — snake_case SQL ↔ camelCase TS : `today_focus` ↔ `todayFocus`

### Composants à mettre à jour

Remplacer `data.tasks` / `setData(prev => ({ ...prev, tasks: fn(prev.tasks) }))` par `tasks` / `setTasks(fn)` dans :

- `src/modules/tasks/components/Tasks.tsx`
- `src/modules/tasks/components/TaskCard.tsx`
- `src/modules/tasks/components/TaskModal.tsx`
- `src/modules/tasks/components/TodayPanel.tsx`
- `src/modules/tasks/components/BacklogPanel.tsx`
- `src/modules/tasks/components/AiSuggestions.tsx`

---

## Section 3 : Migration one-shot des données existantes

**Page :** `app/(app)/migrate/page.tsx`

Page React accessible à l'utilisateur connecté. Pas de script Node — on utilise le client Supabase authentifié du browser.

### Flux

1. Au chargement, lit `localStorage["sidekick-data-{userId}"]` et extrait `data.tasks`
2. Vérifie si `user_tasks` contient déjà des lignes pour cet utilisateur
   - Si oui : affiche un warning "Déjà migré — X tasks trouvées en base" et bloque le bouton
   - Si non : affiche "N tasks trouvées en localStorage, prêtes à migrer"
3. Bouton "Lancer la migration" → batch-insert via `supabase.from('user_tasks').insert(tasks.map(t => toRow(t, userId)))`
4. Affiche le résultat : "N tasks migrées avec succès"
5. Propose un bouton "Nettoyer le localStorage" qui supprime la clé `tasks` du blob (ou la vide)

### Lien sidebar

Ajouter un lien vers `/migrate` dans la sidebar (section Admin ou Settings) pour que la page soit accessible.

---

## Section 4 : Pattern de réplication — modules suivants

Une fois tasks validé en production, chaque module suivant suit le même pattern :

| Étape | Fichier |
|---|---|
| 1. Migration SQL | `supabase/migrations/YYYYMMDD_<module>_table.sql` |
| 2. Hook dédié | `src/hooks/use<Module>Data.ts` |
| 3. Mise à jour composants | Remplacer `data.<module>` / `setData` par le hook |
| 4. Page migrate | Étendre `/migrate` pour inclure le module |

**Ordre suggéré** (du plus simple au plus complexe) :

1. `contacts` — deux tableaux indépendants (`contacts`, `prospection`), pas de relations
2. `live` — trois tableaux (`tourDates`, `rehearsals`, `equipment`), pas de relations
3. `projects` — relations vers tracks/works via IDs (stocker en colonnes text[] ou jsonb)
4. `phono` — relations album↔tracks (foreign key ou IDs stockés dans `track_ids`)
5. `edition` — le plus complexe : `works` + `sync` dict, nombreux champs imbriqués
6. `calendar`, `marketing`, `admin`, `incomes` — au fil du besoin

**Fin de migration :** quand tous les modules sont migrés, supprimer `useSidekickData`, `sidekick-store.ts`, et la page `/migrate`.

---

## Hors scope

- Supabase Realtime / sync cross-device (YAGNI pour solo pré-beta)
- Migration automatique au login (on fait une migration manuelle one-shot explicite)
- Tests automatisés (pas de suite de tests configurée — vérification via `npx tsc --noEmit`)
