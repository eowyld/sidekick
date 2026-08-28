# Tasks Module Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refonte complète du module Tâches — layout split (focus du jour / backlog), 3 statuts discrets, drag & drop bidirectionnel, et suggestions IA quotidiennes via Claude Haiku 4.5.

**Architecture:** `Tasks.tsx` orchestre l'état et le layout en deux panneaux (`TodayPanel` à gauche, `BacklogPanel` à droite) via un composant `TaskCard` réutilisable. Le drag & drop entre panneaux est géré par `@dnd-kit/core`. Les suggestions IA sont générées une fois par jour via une route API Next.js qui cache le résultat dans Supabase.

**Tech Stack:** Next.js App Router, TypeScript, `@dnd-kit/core`, Vercel AI SDK (`ai` + `@ai-sdk/anthropic`), Supabase, Zod, Tailwind, Lucide React

---

## Fichiers concernés

**Créés :**
- `src/modules/tasks/components/TaskCard.tsx` — carte tâche réutilisable (today + backlog)
- `src/modules/tasks/components/TodayPanel.tsx` — panneau gauche : focus du jour + terminées
- `src/modules/tasks/components/BacklogPanel.tsx` — panneau droit : backlog
- `src/modules/tasks/components/AiSuggestions.tsx` — section suggestions IA (dans BacklogPanel)
- `app/api/tasks/ai-suggestions/route.ts` — route API générant les suggestions Haiku
- `supabase/migrations/20260404000000_task_suggestions.sql` — table cache IA

**Modifiés :**
- `src/lib/sidekick-store.ts` — interface `Todo` + préférences `aiTaskInstructions`
- `src/modules/tasks/components/Tasks.tsx` — refactorisé en layout split + DndContext
- `src/modules/tasks/components/TaskModal.tsx` — adapté au nouveau schéma (`status` au lieu de `done`)

---

## Task 1 : Installer les dépendances

**Files:**
- Modify: `package.json`

- [ ] **Step 1 : Installer les packages**

```bash
npm install @dnd-kit/core ai @ai-sdk/anthropic zod
```

- [ ] **Step 2 : Vérifier l'installation**

```bash
node -e "require('@dnd-kit/core'); require('ai'); require('@ai-sdk/anthropic'); require('zod'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3 : Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(tasks): install dnd-kit, ai sdk, zod"
```

---

## Task 2 : Mettre à jour le data model

**Files:**
- Modify: `src/lib/sidekick-store.ts`

- [ ] **Step 1 : Remplacer l'interface `Todo`**

Dans `src/lib/sidekick-store.ts`, remplacer le bloc `// --- Tasks ---` existant :

```ts
// --- Tasks ---
export interface Todo {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done"; // remplace done: boolean
  todayFocus: boolean;
  description?: string;
  deadline?: string;
  sector?:
    | "Live"
    | "Phono"
    | "Admin"
    | "Marketing"
    | "Edition"
    | "Revenus"
    | "Autre";
  createdAt?: string;
}
```

- [ ] **Step 2 : Ajouter `aiTaskInstructions` dans les préférences**

Dans `SidekickData`, remplacer le bloc `preferences` :

```ts
  preferences: {
    enabledModules: {
      live: boolean;
      phono: boolean;
      admin: boolean;
      marketing: boolean;
      edition: boolean;
      revenus: boolean;
    };
    aiTaskInstructions?: {
      general?: string;
      live?: string;
      phono?: string;
      admin?: string;
      marketing?: string;
      edition?: string;
      revenus?: string;
    };
  };
```

- [ ] **Step 3 : Ajouter `aiTaskInstructions` dans `DEFAULT_SIDEKICK_DATA`**

Dans le bloc `preferences` de `DEFAULT_SIDEKICK_DATA` :

```ts
  preferences: {
    enabledModules: {
      live: true,
      phono: true,
      admin: true,
      marketing: true,
      edition: true,
      revenus: true
    },
    aiTaskInstructions: {}
  }
```

- [ ] **Step 4 : Migrer les données existantes dans `mergeWithDefaults`**

Remplacer la ligne `tasks: Array.isArray(partial.tasks) ? partial.tasks : DEFAULT_SIDEKICK_DATA.tasks,` par :

```ts
    tasks: Array.isArray(partial.tasks)
      ? partial.tasks.map((t: Record<string, unknown>) => ({
          ...t,
          // Migration: ancien format done: boolean → status
          status: t.status ?? (t.done ? "done" : "todo"),
          todayFocus: t.todayFocus ?? false,
        }))
      : DEFAULT_SIDEKICK_DATA.tasks,
```

- [ ] **Step 5 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 6 : Commit**

```bash
git add src/lib/sidekick-store.ts
git commit -m "feat(tasks): update Todo schema — status + todayFocus, aiTaskInstructions prefs"
```

---

## Task 3 : Créer `TaskCard`

**Files:**
- Create: `src/modules/tasks/components/TaskCard.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
"use client";

import { Pencil, Trash2, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";
import type { TaskSector } from "./TaskModal";

const STATUS_NEXT: Record<Todo["status"], Todo["status"]> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const STATUS_LABEL: Record<Todo["status"], string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
};

const STATUS_CLASS: Record<Todo["status"], string> = {
  todo: "bg-slate-500/15 text-slate-300 border-slate-500/40",
  in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  done: "bg-green-500/15 text-green-300 border-green-500/40",
};

interface TaskCardProps {
  task: Todo;
  context: "today" | "backlog";
  onStatusChange: (id: string, status: Todo["status"]) => void;
  onAddToToday?: (id: string) => void;
  onRemoveFromToday?: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

export function TaskCard({
  task,
  context,
  onStatusChange,
  onAddToToday,
  onRemoveFromToday,
  onEdit,
  onDelete,
  dragHandleProps,
  isDragging,
}: TaskCardProps) {
  const sector = task.sector as TaskSector | undefined;

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-md border border-border bg-card/60 px-3 py-2 backdrop-blur-sm transition-opacity",
        task.status === "done" && "opacity-50",
        isDragging && "opacity-40"
      )}
      {...dragHandleProps}
    >
      {/* Badge statut cliquable */}
      <button
        type="button"
        onClick={() => onStatusChange(task.id, STATUS_NEXT[task.status])}
        className={cn(
          "mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors hover:brightness-110",
          STATUS_CLASS[task.status]
        )}
      >
        {STATUS_LABEL[task.status]}
      </button>

      {/* Contenu */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            task.status === "done" && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>
        {task.description ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {task.description}
          </p>
        ) : null}
        {task.deadline ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Intl.DateTimeFormat("fr-FR", {
              day: "2-digit",
              month: "short",
            }).format(new Date(task.deadline))}
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {context === "backlog" && onAddToToday ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-yellow-400 hover:text-yellow-300"
            title="Faire aujourd'hui"
            onClick={() => onAddToToday(task.id)}
          >
            <Zap className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        {context === "today" && onRemoveFromToday ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Retirer du focus"
            onClick={() => onRemoveFromToday(task.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => onEdit(task.id)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 3 : Commit**

```bash
git add src/modules/tasks/components/TaskCard.tsx
git commit -m "feat(tasks): add TaskCard component with cyclic status badge"
```

---

## Task 4 : Créer `TodayPanel`

**Files:**
- Create: `src/modules/tasks/components/TodayPanel.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/sidekick-store";
import { TaskCard } from "./TaskCard";

interface TodayPanelProps {
  tasks: Todo[]; // todayFocus: true seulement
  onStatusChange: (id: string, status: Todo["status"]) => void;
  onRemoveFromToday: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TodayPanel({
  tasks,
  onStatusChange,
  onRemoveFromToday,
  onEdit,
  onDelete,
}: TodayPanelProps) {
  const [doneOpen, setDoneOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id: "today-panel" });

  const active = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[300px] flex-col gap-2 rounded-lg border border-border bg-card/40 p-4 transition-colors",
        isOver && "border-yellow-400/60 bg-yellow-400/5"
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-base font-semibold">⚡ Aujourd'hui</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {active.length}
        </span>
      </div>

      {active.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Glisse des tâches ici ou clique sur ⚡ depuis le backlog
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {active.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              context="today"
              onStatusChange={onStatusChange}
              onRemoveFromToday={onRemoveFromToday}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {done.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setDoneOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {doneOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Terminées ({done.length})
          </button>
          {doneOpen ? (
            <div className="mt-2 flex flex-col gap-2">
              {done.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  context="today"
                  onStatusChange={onStatusChange}
                  onRemoveFromToday={onRemoveFromToday}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 3 : Commit**

```bash
git add src/modules/tasks/components/TodayPanel.tsx
git commit -m "feat(tasks): add TodayPanel with droppable zone and collapsible done section"
```

---

## Task 5 : Créer `BacklogPanel`

**Files:**
- Create: `src/modules/tasks/components/BacklogPanel.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/sidekick-store";
import { TaskCard } from "./TaskCard";
import { AiSuggestions } from "./AiSuggestions";

interface BacklogPanelProps {
  tasks: Todo[]; // todayFocus: false ET status !== "done"
  userId: string | null;
  enabledModules: Record<string, boolean>;
  aiInstructions: Record<string, string>;
  calendarEvents: Array<{ title: string; start: string }>;
  onStatusChange: (id: string, status: Todo["status"]) => void;
  onAddToToday: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSuggestion: (title: string, sector: string) => void;
}

export function BacklogPanel({
  tasks,
  userId,
  enabledModules,
  aiInstructions,
  calendarEvents,
  onStatusChange,
  onAddToToday,
  onEdit,
  onDelete,
  onAddSuggestion,
}: BacklogPanelProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "backlog-panel" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[300px] flex-col gap-2 rounded-lg border border-border bg-card/40 p-4 transition-colors",
        isOver && "border-border/80 bg-muted/10"
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-base font-semibold">Backlog</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Aucune tâche en attente
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              context="backlog"
              onStatusChange={onStatusChange}
              onAddToToday={onAddToToday}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <div className="mt-4">
        <AiSuggestions
          userId={userId}
          tasks={tasks}
          calendarEvents={calendarEvents}
          enabledModules={enabledModules}
          aiInstructions={aiInstructions}
          onAdd={onAddSuggestion}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Expected: aucune erreur (AiSuggestions n'est pas encore créé — attendre Task 8 avant de lancer tsc)

- [ ] **Step 3 : Commit**

```bash
git add src/modules/tasks/components/BacklogPanel.tsx
git commit -m "feat(tasks): add BacklogPanel with droppable zone"
```

---

## Task 6 : Refactoriser `Tasks.tsx`

**Files:**
- Modify: `src/modules/tasks/components/Tasks.tsx`

- [ ] **Step 1 : Réécrire `Tasks.tsx` complet**

```tsx
"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Todo } from "@/lib/sidekick-store";
import { useSidekickData } from "@/hooks/useSidekickData";
import { Button } from "@/components/ui/button";
import { TaskModal, type TaskFormData, type TaskSector } from "./TaskModal";
import { TodayPanel } from "./TodayPanel";
import { BacklogPanel } from "./BacklogPanel";
import { TaskCard } from "./TaskCard";

export function Tasks() {
  const { data, setData } = useSidekickData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const todos = useMemo(
    () =>
      (data.tasks ?? []).map((t) => ({
        ...t,
        status: (t.status ?? "todo") as Todo["status"],
        todayFocus: t.todayFocus ?? false,
      })),
    [data.tasks]
  );

  const todayTasks = useMemo(
    () => todos.filter((t) => t.todayFocus),
    [todos]
  );

  const backlogTasks = useMemo(
    () => todos.filter((t) => !t.todayFocus && t.status !== "done"),
    [todos]
  );

  const activeTask = useMemo(
    () => (activeId ? todos.find((t) => t.id === activeId) ?? null : null),
    [activeId, todos]
  );

  const enabledModules = data.preferences?.enabledModules ?? {};
  const aiInstructions = (data.preferences?.aiTaskInstructions ?? {}) as Record<string, string>;
  const calendarEvents = data.calendar?.events ?? [];

  // --- Handlers ---

  const handleStatusChange = (id: string, status: Todo["status"]) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  };

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

  const handleEdit = (id: string) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  };

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
        createdAt: new Date().toISOString(),
      };
      setData((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    }
    setEditingId(null);
    setModalOpen(false);
  };

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

  // --- Drag & Drop ---

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const taskId = active.id as string;
    if (over.id === "today-panel") {
      handleAddToToday(taskId);
    } else if (over.id === "backlog-panel") {
      handleRemoveFromToday(taskId);
    }
  };

  const editingTask = useMemo(() => {
    if (!editingId) return null;
    const t = todos.find((task) => task.id === editingId);
    if (!t) return null;
    return {
      title: t.title,
      description: t.description ?? "",
      deadline: t.deadline ?? "",
      sector: (t.sector ?? "Admin") as TaskSector,
    } satisfies TaskFormData;
  }, [editingId, todos]);

  const allowedSectors: TaskSector[] = useMemo(() => {
    const all: TaskSector[] = [
      "Live",
      "Phono",
      "Admin",
      "Marketing",
      "Edition",
      "Revenus",
      "Autre",
    ];
    return all.filter((s) => {
      if (s === "Live") return enabledModules.live !== false;
      if (s === "Phono") return enabledModules.phono !== false;
      if (s === "Admin") return enabledModules.admin !== false;
      if (s === "Marketing") return enabledModules.marketing !== false;
      if (s === "Edition") return enabledModules.edition !== false;
      if (s === "Revenus") return enabledModules.revenus !== false;
      return true;
    });
  }, [enabledModules]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">Tâches</h1>
          <p className="text-sm text-muted-foreground">
            Organise ton travail par focus quotidien et backlog.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle tâche
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TodayPanel
            tasks={todayTasks}
            onStatusChange={handleStatusChange}
            onRemoveFromToday={handleRemoveFromToday}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          <BacklogPanel
            tasks={backlogTasks}
            userId={null}
            enabledModules={enabledModules as Record<string, boolean>}
            aiInstructions={aiInstructions}
            calendarEvents={calendarEvents}
            onStatusChange={handleStatusChange}
            onAddToToday={handleAddToToday}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddSuggestion={handleAddSuggestion}
          />
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              context={activeTask.todayFocus ? "today" : "backlog"}
              onStatusChange={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        onSave={handleSave}
        task={editingTask}
        allowedSectors={allowedSectors}
      />
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier le typage (après avoir créé AiSuggestions en Task 8)**

```bash
npx tsc --noEmit
```

- [ ] **Step 3 : Vérifier dans le navigateur**

```bash
npm run dev
```

Naviguer vers `/tasks`. Le layout split doit s'afficher (deux panneaux, les tâches existantes dans le backlog).

- [ ] **Step 4 : Commit**

```bash
git add src/modules/tasks/components/Tasks.tsx
git commit -m "feat(tasks): refactor Tasks to split layout with DndContext"
```

---

## Task 7 : Adapter `TaskModal`

**Files:**
- Modify: `src/modules/tasks/components/TaskModal.tsx`

- [ ] **Step 1 : Adapter le formulaire au nouveau schéma**

`TaskModal` utilise `done` nulle part — il gère uniquement `title`, `description`, `deadline`, `sector`. Aucun changement fonctionnel n'est requis. Vérifier simplement que le composant compile avec les nouveaux types.

```bash
npx tsc --noEmit
```

Expected: aucune erreur liée à TaskModal

- [ ] **Step 2 : Commit (si un changement de type s'avère nécessaire)**

```bash
git add src/modules/tasks/components/TaskModal.tsx
git commit -m "fix(tasks): adapt TaskModal to new Todo schema"
```

---

## Task 8 : Créer `AiSuggestions`

**Files:**
- Create: `src/modules/tasks/components/AiSuggestions.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Todo } from "@/lib/sidekick-store";

interface Suggestion {
  title: string;
  sector: string;
  reason: string;
}

interface AiSuggestionsProps {
  userId: string | null;
  tasks: Todo[];
  calendarEvents: Array<{ title: string; start: string }>;
  enabledModules: Record<string, boolean>;
  aiInstructions: Record<string, string>;
  onAdd: (title: string, sector: string) => void;
}

export function AiSuggestions({
  userId,
  tasks,
  calendarEvents,
  enabledModules,
  aiInstructions,
  onAdd,
}: AiSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const fetchSuggestions = async (force = false) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      const upcomingEvents = calendarEvents
        .filter((e) => {
          const d = new Date(e.start);
          return d >= today && d <= in14Days;
        })
        .map((e) => ({ title: e.title, date: e.start.slice(0, 10) }));

      const activeTasks = tasks.map((t) => ({
        title: t.title,
        sector: t.sector ?? "Autre",
        status: t.status,
      }));

      const activeModuleNames = Object.entries(enabledModules)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const res = await fetch("/api/tasks/ai-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: activeTasks,
          calendarEvents: upcomingEvents,
          enabledModules: activeModuleNames,
          aiInstructions,
          force,
        }),
      });

      if (!res.ok) throw new Error("Erreur serveur");
      const json = await res.json() as { suggestions: Suggestion[] };
      setSuggestions(json.suggestions ?? []);
    } catch (e) {
      setError("Impossible de charger les suggestions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleAdd = (s: Suggestion) => {
    onAdd(s.title, s.sector);
    setAdded((prev) => new Set(prev).add(s.title));
  };

  return (
    <div className="rounded-md border border-border/60 bg-muted/10 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          Suggestions IA
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          title="Regénérer"
          onClick={() => fetchSuggestions(true)}
          disabled={loading}
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-md bg-muted/30"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : suggestions.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune suggestion pour l'instant.</p>
      ) : (
        <div className="space-y-1.5">
          {suggestions.map((s, i) => {
            const isAdded = added.has(s.title);
            return (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 rounded-md border border-border/40 bg-card/40 px-2.5 py-2",
                  isAdded && "opacity-40"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">{s.reason}</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  disabled={isAdded}
                  onClick={() => handleAdd(s)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 3 : Commit**

```bash
git add src/modules/tasks/components/AiSuggestions.tsx
git commit -m "feat(tasks): add AiSuggestions component with loading/error/refresh states"
```

---

## Task 9 : Migration Supabase + Route API IA

**Files:**
- Create: `supabase/migrations/20260404000000_task_suggestions.sql`
- Create: `app/api/tasks/ai-suggestions/route.ts`

- [ ] **Step 1 : Créer la migration SQL**

```sql
-- supabase/migrations/20260404000000_task_suggestions.sql
create table task_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  suggestions jsonb not null default '[]',
  created_at timestamptz default now(),
  unique (user_id, date)
);

alter table task_suggestions enable row level security;

create policy "Users manage own suggestions"
  on task_suggestions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Step 2 : Appliquer la migration en local (si Supabase CLI est configuré)**

```bash
supabase db push
```

Si le CLI n'est pas configuré, appliquer manuellement via le Dashboard Supabase → SQL Editor.

- [ ] **Step 3 : Créer le répertoire de la route**

```bash
mkdir -p app/api/tasks/ai-suggestions
```

- [ ] **Step 4 : Créer la route API**

```ts
// app/api/tasks/ai-suggestions/route.ts
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";

const SuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z.string(),
        sector: z.enum([
          "Live",
          "Phono",
          "Admin",
          "Marketing",
          "Edition",
          "Revenus",
          "Autre",
        ]),
        reason: z.string(),
      })
    )
    .max(8),
});

function buildPrompt(body: {
  tasks: Array<{ title: string; sector: string; status: string }>;
  calendarEvents: Array<{ title: string; date: string }>;
  enabledModules: string[];
  aiInstructions: Record<string, string>;
  today: string;
}): string {
  const taskLines =
    body.tasks.length > 0
      ? body.tasks.map((t) => `- "${t.title}" (${t.sector}, ${t.status})`).join("\n")
      : "Aucune tâche active.";

  const eventLines =
    body.calendarEvents.length > 0
      ? body.calendarEvents.map((e) => `- ${e.date}: ${e.title}`).join("\n")
      : "Aucun événement à venir.";

  const instructionLines = Object.entries(body.aiInstructions)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  return `Tu es un assistant de productivité pour un artiste musical indépendant.
Analyse ses données et propose jusqu'à 8 tâches concrètes et actionnables.
Chaque suggestion doit être courte (< 60 caractères), précise, et pertinente par rapport aux données fournies.

Date du jour : ${body.today}
Modules actifs : ${body.enabledModules.join(", ")}

Tâches en cours ou à faire :
${taskLines}

Événements à venir (14 prochains jours) :
${eventLines}
${
  instructionLines
    ? `
Instructions spécifiques :
${instructionLines}`
    : ""
}

Propose des tâches que l'artiste n'a pas encore et qui ont une vraie valeur ajoutée. Justifie chacune en une phrase courte.`;
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    tasks: Array<{ title: string; sector: string; status: string }>;
    calendarEvents: Array<{ title: string; date: string }>;
    enabledModules: string[];
    aiInstructions: Record<string, string>;
    force?: boolean;
  };

  const today = new Date().toISOString().split("T")[0];

  // Vérifier le cache Supabase (sauf si force=true)
  if (!body.force) {
    const { data: cached } = await supabase
      .from("task_suggestions")
      .select("suggestions")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (cached) {
      return Response.json({
        suggestions: cached.suggestions,
        cached: true,
      });
    }
  }

  // Générer avec Claude Haiku
  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: SuggestionSchema,
    prompt: buildPrompt({ ...body, today }),
  });

  // Sauvegarder en cache
  await supabase.from("task_suggestions").upsert({
    user_id: user.id,
    date: today,
    suggestions: object.suggestions,
  });

  return Response.json({ suggestions: object.suggestions, cached: false });
}
```

- [ ] **Step 5 : Vérifier que `ANTHROPIC_API_KEY` est dans `.env.local`**

```bash
grep ANTHROPIC_API_KEY .env.local || echo "MANQUANT — ajouter ANTHROPIC_API_KEY=sk-ant-..."
```

Si manquant, ajouter `ANTHROPIC_API_KEY=sk-ant-...` dans `.env.local`.

- [ ] **Step 6 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 7 : Tester la route manuellement**

```bash
npm run dev
```

Ouvrir `/tasks` en étant connecté. Les suggestions IA doivent apparaître dans le BacklogPanel (ou un message d'erreur si la clé API manque).

- [ ] **Step 8 : Commit**

```bash
git add supabase/migrations/20260404000000_task_suggestions.sql app/api/tasks/ai-suggestions/
git commit -m "feat(tasks): add AI suggestions API route with Supabase cache (Haiku 4.5)"
```

---

## Task 10 : Instructions IA dans les paramètres

**Files:**
- Modify: `src/modules/tasks/components/Tasks.tsx` (passer `userId` réel) ou section Settings

- [ ] **Step 1 : Passer le `userId` réel à `BacklogPanel`**

Dans `Tasks.tsx`, `userId` n'est pas exposé par `useSidekickData`. Utiliser le client Supabase.

Modifier l'import React existant (ligne 1) pour ajouter `useEffect` :

```tsx
import { useEffect, useMemo, useState } from "react";
```

Ajouter l'import Supabase après les autres imports :

```tsx
import { createClient } from "@/lib/supabase";
```

Ajouter dans le corps de `Tasks()` (avant le return) :

```tsx
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);
```

Remplacer `userId={null}` dans `<BacklogPanel>` par `userId={userId}`.

- [ ] **Step 2 : Ajouter un éditeur d'instructions IA dans `Tasks.tsx`**

Ajouter l'import `Input` au bloc d'imports UI :

```tsx
import { Input } from "@/components/ui/input";
```

Ajouter dans le JSX de `Tasks.tsx`, après `</DndContext>` :

```tsx
      <details className="rounded-lg border border-border bg-card/40 p-4">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          ⚙️ Instructions IA (personnaliser les suggestions)
        </summary>
        <div className="mt-4 space-y-3">
          {(
            [
              { key: "general", label: "Général" },
              ...(enabledModules.live ? [{ key: "live", label: "Live" }] : []),
              ...(enabledModules.phono ? [{ key: "phono", label: "Phono" }] : []),
              ...(enabledModules.admin ? [{ key: "admin", label: "Admin" }] : []),
              ...(enabledModules.marketing ? [{ key: "marketing", label: "Marketing" }] : []),
              ...(enabledModules.edition ? [{ key: "edition", label: "Édition" }] : []),
              ...(enabledModules.revenus ? [{ key: "revenus", label: "Revenus" }] : []),
            ] as { key: string; label: string }[]
          ).map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {label}
              </label>
              <Input
                placeholder={`Instructions pour ${label}...`}
                value={aiInstructions[key] ?? ""}
                onChange={(e) => {
                  setData((prev) => ({
                    ...prev,
                    preferences: {
                      ...prev.preferences,
                      aiTaskInstructions: {
                        ...prev.preferences.aiTaskInstructions,
                        [key]: e.target.value,
                      },
                    },
                  }));
                }}
              />
            </div>
          ))}
        </div>
      </details>
```

- [ ] **Step 3 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 4 : Tester dans le navigateur**

```bash
npm run dev
```

- Ouvrir `/tasks`
- Dérouler la section "Instructions IA"
- Saisir une instruction, fermer l'accordéon, rouvrir → la valeur doit persister (localStorage)
- Cliquer ↻ dans AiSuggestions → les nouvelles suggestions doivent refléter les instructions

- [ ] **Step 5 : Commit**

```bash
git add src/modules/tasks/components/Tasks.tsx
git commit -m "feat(tasks): add AI instructions editor per module in Tasks page"
```

---

## Vérification finale

- [ ] `npx tsc --noEmit` — aucune erreur TypeScript
- [ ] `npm run lint` — aucune erreur ESLint bloquante
- [ ] Test manuel complet :
  - Créer une tâche → apparaît dans le backlog
  - Cliquer ⚡ → passe dans "Aujourd'hui"
  - Drag & drop backlog → aujourd'hui et inversement
  - Cycler le statut : À faire → En cours → Terminé → section "Terminées"
  - Suggestions IA chargées au premier rendu
  - Cliquer "+" sur une suggestion → crée la tâche dans le backlog
  - ↻ regénère de nouvelles suggestions
  - Données existantes migrées (tâches avec `done: true` → `status: "done"`)
