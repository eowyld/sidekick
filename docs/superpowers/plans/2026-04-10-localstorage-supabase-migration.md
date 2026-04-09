# Migration localStorage → Supabase (module tasks) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer le module `tasks` de localStorage vers une table Supabase `user_tasks` avec RLS, en créant un hook `useTasksData()` dédié et une page de migration one-shot.

**Architecture:** Table SQL `user_tasks` avec RLS, hook `useTasksData` qui fait du CRUD Supabase avec optimistic updates, composant `Tasks.tsx` mis à jour pour utiliser le nouveau hook, page `/migrate` pour migrer les données existantes depuis localStorage.

**Tech Stack:** Next.js 16 App Router, Supabase JS client, React hooks, TypeScript. Vérification via `npx tsc --noEmit`.

---

## Fichiers

| Fichier | Action | Responsabilité |
|---|---|---|
| `supabase/migrations/20260410000000_user_tasks.sql` | Créer | Table `user_tasks` + RLS |
| `src/hooks/useTasksData.ts` | Créer | Hook CRUD Supabase pour les tasks, optimistic updates |
| `src/modules/tasks/components/Tasks.tsx` | Modifier | Remplacer `useSidekickData` par `useTasksData` |
| `app/(app)/migrate/page.tsx` | Créer | Page de migration one-shot localStorage → Supabase |
| `src/components/layout/Sidebar.tsx` | Modifier | Ajouter lien vers `/migrate` dans la section Admin |

---

## Task 1 : Migration SQL — table `user_tasks`

**Files:**
- Create: `supabase/migrations/20260410000000_user_tasks.sql`

- [ ] **Créer le fichier de migration**

```sql
create table user_tasks (
  id           text primary key,
  user_id      uuid references auth.users not null,
  title        text not null,
  status       text not null default 'todo',
  today_focus  boolean not null default false,
  description  text,
  deadline     text,
  sector       text,
  created_at   text,
  subtasks     jsonb not null default '[]'
);

alter table user_tasks enable row level security;

create policy "Users manage own tasks"
  on user_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Commit**

```bash
git add supabase/migrations/20260410000000_user_tasks.sql
git commit -m "feat(db): add user_tasks table with RLS"
```

---

## Task 2 : Hook `useTasksData`

**Files:**
- Create: `src/hooks/useTasksData.ts`

Ce hook expose `{ tasks, setTasks, loading, error }`. `setTasks` accepte une fonction `(prev: Todo[]) => Todo[]`, calcule le diff, et applique upsert/delete à Supabase avec optimistic update et rollback en cas d'erreur.

- [ ] **Créer `src/hooks/useTasksData.ts`**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Todo } from "@/lib/sidekick-store";

// Mapping Supabase row → Todo
function rowToTodo(row: Record<string, unknown>): Todo {
  return {
    id: row.id as string,
    title: row.title as string,
    status: (row.status as Todo["status"]) ?? "todo",
    todayFocus: (row.today_focus as boolean) ?? false,
    description: (row.description as string) ?? undefined,
    deadline: (row.deadline as string) ?? undefined,
    sector: (row.sector as Todo["sector"]) ?? undefined,
    createdAt: (row.created_at as string) ?? undefined,
    subtasks: (row.subtasks as Todo["subtasks"]) ?? [],
  };
}

// Mapping Todo → Supabase row (sans user_id — ajouté à l'insert)
function todoToRow(todo: Todo): Record<string, unknown> {
  return {
    id: todo.id,
    title: todo.title,
    status: todo.status,
    today_focus: todo.todayFocus,
    description: todo.description ?? null,
    deadline: todo.deadline ?? null,
    sector: todo.sector ?? null,
    created_at: todo.createdAt ?? null,
    subtasks: todo.subtasks ?? [],
  };
}

export function useTasksData() {
  const [tasks, setTasksState] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chargement initial
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("user_tasks")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else {
          setTasksState((data ?? []).map(rowToTodo));
        }
        setLoading(false);
      });
  }, []);

  // Écriture optimiste avec diff et rollback
  const setTasks = useCallback((fn: (prev: Todo[]) => Todo[]) => {
    setTasksState((prev) => {
      const next = fn(prev);

      const prevMap = new Map(prev.map((t) => [t.id, t]));
      const nextMap = new Map(next.map((t) => [t.id, t]));

      const toUpsert = next.filter((t) => {
        const old = prevMap.get(t.id);
        return !old || JSON.stringify(old) !== JSON.stringify(t);
      });
      const toDelete = prev.filter((t) => !nextMap.has(t.id)).map((t) => t.id);

      (async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const ops: Promise<{ error: { message: string } | null }>[] = [];

        if (toUpsert.length > 0) {
          ops.push(
            supabase
              .from("user_tasks")
              .upsert(toUpsert.map((t) => ({ ...todoToRow(t), user_id: user.id })))
              .then(({ error }) => ({ error }))
          );
        }

        if (toDelete.length > 0) {
          ops.push(
            supabase
              .from("user_tasks")
              .delete()
              .in("id", toDelete)
              .then(({ error }) => ({ error }))
          );
        }

        const results = await Promise.all(ops);
        const firstError = results.find((r) => r.error);
        if (firstError?.error) {
          setError(firstError.error.message);
          setTasksState(prev); // rollback
        }
      })();

      return next;
    });
  }, []);

  return { tasks, setTasks, loading, error };
}
```

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Commit**

```bash
git add src/hooks/useTasksData.ts
git commit -m "feat(tasks): add useTasksData hook with Supabase CRUD and optimistic updates"
```

---

## Task 3 : Mettre à jour `Tasks.tsx`

**Files:**
- Modify: `src/modules/tasks/components/Tasks.tsx`

Remplacer `useSidekickData` par `useTasksData`. Les handlers qui accèdent à `data.tasks` / `setData(prev => ({ ...prev, tasks: ... }))` utilisent maintenant `tasks` / `setTasks(fn)`. Les accès aux autres slices (`data.preferences`, `data.calendar`) restent via `useSidekickData`.

- [ ] **Remplacer l'import et le hook dans `Tasks.tsx`**

Remplacer :
```tsx
import { useSidekickData } from "@/hooks/useSidekickData";
// ...
const { data, setData } = useSidekickData();
```

Par :
```tsx
import { useSidekickData } from "@/hooks/useSidekickData";
import { useTasksData } from "@/hooks/useTasksData";
// ...
const { data, setData } = useSidekickData();
const { tasks, setTasks, loading } = useTasksData();
```

- [ ] **Remplacer la dérivation `todos`**

Remplacer :
```tsx
const todos = useMemo(
  () =>
    (data.tasks ?? []).map((t) => ({
      ...t,
      status: (t.status ?? "todo") as Todo["status"],
      todayFocus: t.todayFocus ?? false,
    })),
  [data.tasks]
);
```

Par :
```tsx
const todos = useMemo(
  () =>
    tasks.map((t) => ({
      ...t,
      status: (t.status ?? "todo") as Todo["status"],
      todayFocus: t.todayFocus ?? false,
    })),
  [tasks]
);
```

- [ ] **Remplacer l'auto-promote overdue**

Remplacer :
```tsx
const promotedRef = useRef(false);
useEffect(() => {
  if (promotedRef.current || data.tasks.length === 0) return;
  promotedRef.current = true;
  const today = new Date().toISOString().slice(0, 10);
  setData((prev) => ({
    ...prev,
    tasks: prev.tasks.map((t) =>
      t.deadline && t.deadline <= today && !t.todayFocus && t.status !== "done"
        ? { ...t, todayFocus: true }
        : t
    ),
  }));
}, [data.tasks, setData]);
```

Par :
```tsx
const promotedRef = useRef(false);
useEffect(() => {
  if (promotedRef.current || tasks.length === 0 || loading) return;
  promotedRef.current = true;
  const today = new Date().toISOString().slice(0, 10);
  setTasks((prev) =>
    prev.map((t) =>
      t.deadline && t.deadline <= today && !t.todayFocus && t.status !== "done"
        ? { ...t, todayFocus: true }
        : t
    )
  );
}, [tasks, loading, setTasks]);
```

- [ ] **Remplacer `handleStatusChange`**

Remplacer :
```tsx
const handleStatusChange = (id: string, status: Todo["status"]) => {
  setData((prev) => ({
    ...prev,
    tasks: prev.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
  }));
};
```

Par :
```tsx
const handleStatusChange = (id: string, status: Todo["status"]) => {
  setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
};
```

- [ ] **Remplacer `handleAddToToday` et `handleRemoveFromToday`**

Remplacer :
```tsx
const handleAddToToday = (id: string) => {
  setData((prev) => ({
    ...prev,
    tasks: prev.tasks.map((t) =>
      t.id === id ? { ...t, todayFocus: true } : t
    ),
  }));
};

const handleRemoveFromToday = (id: string) => {
  setData((prev) => ({
    ...prev,
    tasks: prev.tasks.map((t) =>
      t.id === id ? { ...t, todayFocus: false } : t
    ),
  }));
};
```

Par :
```tsx
const handleAddToToday = (id: string) => {
  setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, todayFocus: true } : t)));
};

const handleRemoveFromToday = (id: string) => {
  setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, todayFocus: false } : t)));
};
```

- [ ] **Remplacer `handleDelete`**

Remplacer :
```tsx
const handleDelete = (id: string) => {
  setData((prev) => ({
    ...prev,
    tasks: prev.tasks.filter((t) => t.id !== id),
  }));
};
```

Par :
```tsx
const handleDelete = (id: string) => {
  setTasks((prev) => prev.filter((t) => t.id !== id));
};
```

- [ ] **Remplacer `handleSave`**

Remplacer :
```tsx
const handleSave = (taskData: TaskFormData) => {
  if (!taskData.title.trim()) return;
  if (editingId) {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === editingId
          ? {
              ...t,
              title: taskData.title.trim(),
              description: taskData.description.trim(),
              deadline: taskData.deadline,
              sector: taskData.sector,
              subtasks: taskData.subtasks,
            }
          : t
      ),
    }));
  } else {
    const newTask: Todo = {
      id: crypto.randomUUID(),
      title: taskData.title.trim(),
      status: "todo",
      todayFocus: false,
      description: taskData.description.trim(),
      deadline: taskData.deadline,
      sector: taskData.sector,
      subtasks: taskData.subtasks,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
  }
  setEditingId(null);
  setModalOpen(false);
};
```

Par :
```tsx
const handleSave = (taskData: TaskFormData) => {
  if (!taskData.title.trim()) return;
  if (editingId) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingId
          ? {
              ...t,
              title: taskData.title.trim(),
              description: taskData.description.trim(),
              deadline: taskData.deadline,
              sector: taskData.sector,
              subtasks: taskData.subtasks,
            }
          : t
      )
    );
  } else {
    const newTask: Todo = {
      id: crypto.randomUUID(),
      title: taskData.title.trim(),
      status: "todo",
      todayFocus: false,
      description: taskData.description.trim(),
      deadline: taskData.deadline,
      sector: taskData.sector,
      subtasks: taskData.subtasks,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, newTask]);
  }
  setEditingId(null);
  setModalOpen(false);
};
```

- [ ] **Remplacer les handlers subtasks**

Remplacer :
```tsx
const handleSubtaskToggle = (taskId: string, subtaskId: string, done: boolean) => {
  setData((prev) => ({
    ...prev,
    tasks: prev.tasks.map((t) =>
      t.id === taskId
        ? { ...t, subtasks: (t.subtasks ?? []).map((s) => s.id === subtaskId ? { ...s, done } : s) }
        : t
    ),
  }));
};

const handleSubtaskAdd = (taskId: string, title: string) => {
  setData((prev) => ({
    ...prev,
    tasks: prev.tasks.map((t) =>
      t.id === taskId
        ? { ...t, subtasks: [...(t.subtasks ?? []), { id: crypto.randomUUID(), title, done: false }] }
        : t
    ),
  }));
};

const handleSubtaskRename = (taskId: string, subtaskId: string, title: string) => {
  setData((prev) => ({
    ...prev,
    tasks: prev.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            subtasks: title.trim()
              ? (t.subtasks ?? []).map((s) => s.id === subtaskId ? { ...s, title: title.trim() } : s)
              : (t.subtasks ?? []).filter((s) => s.id !== subtaskId),
          }
        : t
    ),
  }));
};
```

Par :
```tsx
const handleSubtaskToggle = (taskId: string, subtaskId: string, done: boolean) => {
  setTasks((prev) =>
    prev.map((t) =>
      t.id === taskId
        ? { ...t, subtasks: (t.subtasks ?? []).map((s) => s.id === subtaskId ? { ...s, done } : s) }
        : t
    )
  );
};

const handleSubtaskAdd = (taskId: string, title: string) => {
  setTasks((prev) =>
    prev.map((t) =>
      t.id === taskId
        ? { ...t, subtasks: [...(t.subtasks ?? []), { id: crypto.randomUUID(), title, done: false }] }
        : t
    )
  );
};

const handleSubtaskRename = (taskId: string, subtaskId: string, title: string) => {
  setTasks((prev) =>
    prev.map((t) =>
      t.id === taskId
        ? {
            ...t,
            subtasks: title.trim()
              ? (t.subtasks ?? []).map((s) => s.id === subtaskId ? { ...s, title: title.trim() } : s)
              : (t.subtasks ?? []).filter((s) => s.id !== subtaskId),
          }
        : t
    )
  );
};
```

- [ ] **Remplacer `handleAddSuggestion`**

Remplacer :
```tsx
const handleAddSuggestion = (title: string, sector: string) => {
  const newTask: Todo = {
    id: crypto.randomUUID(),
    title,
    status: "todo",
    todayFocus: false,
    sector: sector as TaskSector,
    createdAt: new Date().toISOString(),
  };
  setData((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
};
```

Par :
```tsx
const handleAddSuggestion = (title: string, sector: string) => {
  const newTask: Todo = {
    id: crypto.randomUUID(),
    title,
    status: "todo",
    todayFocus: false,
    sector: sector as TaskSector,
    createdAt: new Date().toISOString(),
  };
  setTasks((prev) => [...prev, newTask]);
};
```

- [ ] **Supprimer le `useEffect` qui récupère `userId` depuis `createClient`** (il n'est plus nécessaire dans Tasks.tsx — `useTasksData` gère l'auth en interne)

Supprimer ces lignes :
```tsx
const [userId, setUserId] = useState<string | null>(null);

useEffect(() => {
  const supabase = createClient();
  supabase.auth.getUser().then(({ data: { user } }) => {
    setUserId(user?.id ?? null);
  });
}, []);
```

Et supprimer l'import `createClient` s'il n'est plus utilisé ailleurs dans le fichier.

Passer `userId` à `BacklogPanel` en le retirant — `BacklogPanel` reçoit déjà le `userId` depuis Tasks. Vérifier si `userId` est encore utilisé dans le JSX pour `BacklogPanel`. Si oui, obtenir `userId` depuis `useTasksData` ou le hook auth séparément. Note : `BacklogPanel` passe `userId` à `AiSuggestions` pour les suggestions IA — ajouter un `userId` state récupéré depuis Supabase auth directement dans Tasks si encore nécessaire.

```tsx
// Garder uniquement pour AiSuggestions via BacklogPanel :
const [userId, setUserId] = useState<string | null>(null);
useEffect(() => {
  const supabase = createClient();
  supabase.auth.getUser().then(({ data: { user } }) => {
    setUserId(user?.id ?? null);
  });
}, []);
```

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Commit**

```bash
git add src/modules/tasks/components/Tasks.tsx
git commit -m "feat(tasks): migrate Tasks component to useTasksData hook"
```

---

## Task 4 : Page de migration one-shot

**Files:**
- Create: `app/(app)/migrate/page.tsx`

Page protégée par `AuthGuard` (hérité du layout `app/(app)/`). Lecture localStorage + batch-insert Supabase.

- [ ] **Créer `app/(app)/migrate/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  getStorageKey,
  mergeWithDefaults,
  type SidekickData,
  type Todo,
} from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function todoToRow(todo: Todo, userId: string): Record<string, unknown> {
  return {
    id: todo.id,
    user_id: userId,
    title: todo.title,
    status: todo.status ?? "todo",
    today_focus: todo.todayFocus ?? false,
    description: todo.description ?? null,
    deadline: todo.deadline ?? null,
    sector: todo.sector ?? null,
    created_at: todo.createdAt ?? null,
    subtasks: todo.subtasks ?? [],
  };
}

type MigrationStatus = "idle" | "checking" | "ready" | "already_migrated" | "migrating" | "done" | "error";

export default function MigratePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<Todo[]>([]);
  const [existingCount, setExistingCount] = useState(0);
  const [status, setStatus] = useState<MigrationStatus>("checking");
  const [migratedCount, setMigratedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);

      // Lire localStorage
      const key = getStorageKey(user.id);
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      const parsed = raw ? (JSON.parse(raw) as Partial<SidekickData>) : null;
      const merged = mergeWithDefaults(parsed);
      setLocalTasks(merged.tasks ?? []);

      // Vérifier Supabase
      const { count } = await supabase
        .from("user_tasks")
        .select("id", { count: "exact", head: true });
      setExistingCount(count ?? 0);

      if ((count ?? 0) > 0) {
        setStatus("already_migrated");
      } else {
        setStatus("ready");
      }
    });
  }, []);

  const handleMigrate = async () => {
    if (!userId || localTasks.length === 0) return;
    setStatus("migrating");
    const supabase = createClient();
    const rows = localTasks.map((t) => todoToRow(t, userId));
    const { error } = await supabase.from("user_tasks").insert(rows);
    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
    } else {
      setMigratedCount(localTasks.length);
      setStatus("done");
    }
  };

  const handleCleanLocalStorage = () => {
    if (!userId) return;
    const key = getStorageKey(userId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as SidekickData;
    parsed.tasks = [];
    window.localStorage.setItem(key, JSON.stringify(parsed));
    alert("localStorage nettoyé — tasks vidées.");
  };

  return (
    <div className="space-y-6 p-6 max-w-xl">
      <div>
        <h1 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40 mb-1">
          Admin
        </h1>
        <p className="text-xl font-bold tracking-tight text-[#F5F5F5]">Migration des données</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Tasks → Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "checking" && (
            <p className="text-sm text-[#F5F5F5]/60">Vérification en cours…</p>
          )}

          {status === "already_migrated" && (
            <div className="space-y-2">
              <p className="text-sm text-amber-400">
                Déjà migré — {existingCount} task{existingCount > 1 ? "s" : ""} trouvée{existingCount > 1 ? "s" : ""} en base.
              </p>
              <p className="text-xs text-[#F5F5F5]/40">
                La migration a déjà été effectuée. Relancer écraserait les données existantes.
              </p>
            </div>
          )}

          {status === "ready" && (
            <div className="space-y-4">
              <p className="text-sm text-[#F5F5F5]/70">
                {localTasks.length} task{localTasks.length > 1 ? "s" : ""} trouvée{localTasks.length > 1 ? "s" : ""} en localStorage, prête{localTasks.length > 1 ? "s" : ""} à migrer.
              </p>
              {localTasks.length === 0 ? (
                <p className="text-xs text-[#F5F5F5]/40">Aucune donnée à migrer.</p>
              ) : (
                <Button onClick={handleMigrate}>Lancer la migration</Button>
              )}
            </div>
          )}

          {status === "migrating" && (
            <p className="text-sm text-[#F5F5F5]/60">Migration en cours…</p>
          )}

          {status === "done" && (
            <div className="space-y-4">
              <p className="text-sm text-green-400">
                ✓ {migratedCount} task{migratedCount > 1 ? "s" : ""} migrée{migratedCount > 1 ? "s" : ""} avec succès.
              </p>
              <Button variant="outline" onClick={handleCleanLocalStorage}>
                Nettoyer le localStorage
              </Button>
            </div>
          )}

          {status === "error" && (
            <p className="text-sm text-red-400">
              Erreur : {errorMessage}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Commit**

```bash
git add app/(app)/migrate/page.tsx
git commit -m "feat(migrate): add one-shot migration page for tasks localStorage → Supabase"
```

---

## Task 5 : Lien sidebar vers `/migrate`

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

Ajouter un lien vers `/migrate` dans le groupe Admin (`groupBusiness`), à la fin du tableau `sub` de l'item Admin.

- [ ] **Ajouter `/migrate` dans la sub-navigation Admin**

Dans `src/components/layout/Sidebar.tsx`, localiser l'objet Admin dans `groupBusiness` :

```tsx
{
  label: "Admin",
  icon: Briefcase,
  key: "admin",
  href: "/admin",
  sub: [
    { href: "/admin", label: "Vue d'ensemble" },
    { href: "/admin/statuts", label: "Mes statuts" },
    { href: "/admin/demarches", label: "Mes démarches" },
    { href: "/admin/contrats", label: "Mes contrats" },
  ],
},
```

Remplacer par :

```tsx
{
  label: "Admin",
  icon: Briefcase,
  key: "admin",
  href: "/admin",
  sub: [
    { href: "/admin", label: "Vue d'ensemble" },
    { href: "/admin/statuts", label: "Mes statuts" },
    { href: "/admin/demarches", label: "Mes démarches" },
    { href: "/admin/contrats", label: "Mes contrats" },
    { href: "/migrate", label: "Migration données" },
  ],
},
```

- [ ] **Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(sidebar): add migration page link under Admin"
```

---

## Task 6 : Appliquer la migration Supabase

- [ ] **Appliquer la migration sur le projet Supabase**

```bash
npx supabase db push
```

Expected: migration `20260410000000_user_tasks` applied.

- [ ] **Vérifier dans le dashboard Supabase** que la table `user_tasks` existe avec les bonnes colonnes et que la policy RLS est active.

---

## Task 7 : Vérification finale

- [ ] **Lancer le serveur de dev**

```bash
npm run dev
```

- [ ] **Tester le flux complet :**
  1. Ouvrir `/tasks` — les tasks se chargent depuis Supabase (vide au départ)
  2. Créer une tâche → vérifier qu'elle apparaît dans la table `user_tasks` via le dashboard Supabase
  3. Modifier le statut d'une tâche → vérifier la mise à jour dans Supabase
  4. Supprimer une tâche → vérifier la suppression dans Supabase
  5. Ouvrir `/migrate` — vérifier que le statut "Déjà migré" s'affiche si des tasks existent en base

- [ ] **Vérification TypeScript finale**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Commit final si nécessaire**

```bash
git add -p
git commit -m "feat(tasks): complete localStorage → Supabase migration for tasks module"
```
