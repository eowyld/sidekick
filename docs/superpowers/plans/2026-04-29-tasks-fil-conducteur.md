# Tasks — Fil conducteur, secteur visuel, rituel "Démarrer ma journée" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre l'UX du module Tâches autour d'un fil conducteur d'étapes ordonnées, d'un code couleur secteur visible dans "Aujourd'hui", et d'un rituel volontaire de démarrage de journée — sans changer le data model.

**Architecture:** Modifications localisées dans `src/modules/tasks/components/`. Un nouveau composant `DayStartDialog.tsx`. Refonte du rendu `context === "today"` dans `TaskCard.tsx` via un sous-composant `TaskStepsBlock`. Suppression d'un `useEffect` d'auto-promotion dans `Tasks.tsx`. Aucune migration Supabase, aucun changement de types côté `Todo`.

**Tech Stack:** Next.js 16 (App Router), React, TypeScript, Tailwind, Radix UI, `@dnd-kit/core` (déjà installé) + `@dnd-kit/sortable` (à installer pour le réordonnancement des étapes), `lucide-react`.

**Notes :**
- Le projet n'a pas de suite de tests. Chaque tâche se valide par `npx tsc --noEmit` + vérification visuelle dans `npm run dev`.
- Selon CLAUDE.md : pas de `git add` intermédiaire, ni de `git push`. Les commits ne se font qu'à la demande explicite de l'utilisateur — chaque tâche se termine donc par une **vérification manuelle**, pas par un commit. Le commit de l'ensemble se fera quand l'utilisateur le demandera.

---

## Task 1: Renommage UI "Sous-tâches" → "Étapes" dans la modale d'édition

**Files:**
- Modify: `src/modules/tasks/components/TaskModal.tsx`

- [ ] **Step 1: Mettre à jour le label et le placeholder dans la modale**

Dans `TaskModal.tsx`, changer :

```tsx
<Label>Sous-tâches</Label>
```

en :

```tsx
<Label>Étapes</Label>
```

Et changer :

```tsx
<Input
  value={subtaskInput}
  onChange={(e) => setSubtaskInput(e.target.value)}
  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); } }}
  placeholder="Nouvelle sous-tâche..."
  className="flex-1"
/>
```

en :

```tsx
<Input
  value={subtaskInput}
  onChange={(e) => setSubtaskInput(e.target.value)}
  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); } }}
  placeholder="Ajouter une étape..."
  className="flex-1"
/>
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Vérification visuelle**

Run: `npm run dev`
Ouvrir la modale d'édition d'une tâche. Vérifier que le label affiche "Étapes" et le placeholder "Ajouter une étape...". Aucune autre régression dans la modale.

---

## Task 2: Ajout du code couleur secteur dans la card "Aujourd'hui"

**Files:**
- Modify: `src/modules/tasks/components/TaskCard.tsx`

- [ ] **Step 1: Ajouter la map `SECTOR_BAR`**

Dans `TaskCard.tsx`, juste après la déclaration de `SECTOR_BADGE`, ajouter :

```tsx
const SECTOR_BAR: Record<string, string> = {
  Live: "bg-blue-500/60",
  Phono: "bg-red-500/60",
  Admin: "bg-violet-500/60",
  Marketing: "bg-emerald-500/60",
  Edition: "bg-cyan-500/60",
  Revenus: "bg-orange-500/60",
  Autre: "bg-[rgba(245,245,245,0.25)]",
};

const SECTOR_LABEL: Record<string, string> = {
  Live: "text-blue-300",
  Phono: "text-red-300",
  Admin: "text-violet-300",
  Marketing: "text-emerald-300",
  Edition: "text-cyan-300",
  Revenus: "text-orange-300",
  Autre: "text-[#F5F5F5]/40",
};
```

- [ ] **Step 2: Refondre le rendu pour le contexte `today`**

Dans la fonction `TaskCard`, remplacer le wrapper `<div>` extérieur :

```tsx
<div
  className={cn(
    "group flex items-start gap-2.5 border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] px-3 py-2.5 transition-all duration-200 ease-out origin-left",
    "hover:border-[rgba(245,245,245,0.15)] hover:bg-[rgba(44,44,46,0.65)] hover:scale-[1.02]",
    task.status === "done" && context !== "done" && "opacity-40",
    isDragging && "opacity-30 scale-[0.98]"
  )}
  {...dragHandleProps}
>
```

par :

```tsx
<div
  className={cn(
    "group relative flex items-start gap-2.5 border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] px-3 py-2.5 transition-all duration-200 ease-out origin-left",
    "hover:border-[rgba(245,245,245,0.15)] hover:bg-[rgba(44,44,46,0.65)] hover:scale-[1.02]",
    context === "today" && "pl-4",
    task.status === "done" && context !== "done" && "opacity-40",
    isDragging && "opacity-30 scale-[0.98]"
  )}
  {...dragHandleProps}
>
  {context === "today" && sector ? (
    <span
      aria-hidden
      className={cn(
        "absolute left-0 top-0 bottom-0 w-[4px]",
        SECTOR_BAR[sector] ?? SECTOR_BAR["Autre"]
      )}
    />
  ) : null}
```

- [ ] **Step 3: Ajouter le label secteur small-caps au-dessus du titre en contexte today**

Dans le bloc `<div className="min-w-0 flex-1">` de `TaskCard`, juste avant le `<p>` du titre, ajouter :

```tsx
{context === "today" && sector ? (
  <p
    className={cn(
      "text-[10px] font-semibold uppercase tracking-[0.15em] mb-0.5",
      SECTOR_LABEL[sector] ?? SECTOR_LABEL["Autre"]
    )}
  >
    {sector}
  </p>
) : null}
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 5: Vérification visuelle**

Run: `npm run dev`
Créer ou identifier une tâche par secteur (Live, Phono, Admin, Marketing, Edition, Revenus, Autre). La placer dans "Aujourd'hui". Vérifier :
- Bande verticale 4px à gauche dans la couleur du secteur, full height de la card.
- Label secteur small-caps au-dessus du titre, dans la couleur du secteur.
- Backlog inchangé (badge plein avec texte).
- Tâches `done` dans la section "Terminées" : pas de bande, pas de label.

---

## Task 3: Extraire `TaskStepsBlock` et afficher l'étape courante en hero

**Files:**
- Modify: `src/modules/tasks/components/TaskCard.tsx`

- [ ] **Step 1: Créer le composant `TaskStepsBlock` dans `TaskCard.tsx`**

Au-dessus de la fonction `TaskCard`, ajouter un nouveau sous-composant. Ce composant remplace le bloc `{context === "today" && onSubtaskToggle ? (...)}` du rendu actuel.

```tsx
function TaskStepsBlock({
  taskId,
  steps,
  onToggle,
  onRename,
  onAdd,
}: {
  taskId: string;
  steps: { id: string; title: string; done: boolean }[];
  onToggle: (taskId: string, subtaskId: string, done: boolean) => void;
  onRename: (taskId: string, subtaskId: string, title: string) => void;
  onAdd: (taskId: string, title: string) => void;
}) {
  const currentIndex = steps.findIndex((s) => !s.done);
  const current = currentIndex >= 0 ? steps[currentIndex] : null;
  const upcoming = currentIndex >= 0 ? steps.slice(currentIndex + 1).filter((s) => !s.done) : [];
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = total > 0 && doneCount === total;

  if (steps.length === 0) {
    return (
      <div className="mt-2 w-full">
        <SubtaskInlineInput taskId={taskId} onAdd={onAdd} />
      </div>
    );
  }

  return (
    <div className="mt-2 w-full space-y-2">
      {allDone ? (
        <p className="text-[11px] text-emerald-300/80">
          Toutes les étapes sont faites — clique sur ✓ pour clôturer.
        </p>
      ) : current ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F0FF00]/70 mb-0.5">
            ▸ Étape en cours
          </p>
          <CurrentStepRow
            taskId={taskId}
            subtask={current}
            onToggle={onToggle}
            onRename={onRename}
          />
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#F5F5F5]/40 mb-1">
            ↓ Suite ({doneCount}/{total})
          </p>
          <ul className="space-y-1">
            {upcoming.map((s) => (
              <li key={s.id}>
                <SubtaskEditableRow
                  taskId={taskId}
                  subtask={s}
                  onToggle={onToggle}
                  onRename={onRename}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <SubtaskInlineInput taskId={taskId} onAdd={onAdd} />
    </div>
  );
}

function CurrentStepRow({
  taskId,
  subtask,
  onToggle,
  onRename,
}: {
  taskId: string;
  subtask: { id: string; title: string; done: boolean };
  onToggle: (taskId: string, subtaskId: string, done: boolean) => void;
  onRename: (taskId: string, subtaskId: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(subtask.title);

  const commit = () => {
    setEditing(false);
    onRename(taskId, subtask.id, value);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <input
        type="checkbox"
        checked={subtask.done}
        onChange={(e) => onToggle(taskId, subtask.id, e.target.checked)}
        className="h-4 w-4 shrink-0 accent-[#F0FF00] cursor-pointer"
      />
      {editing ? (
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { setValue(subtask.title); setEditing(false); }
          }}
          className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none border-b border-[rgba(245,245,245,0.20)] pb-0.5 text-[#F5F5F5]"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className="flex-1 min-w-0 text-sm font-medium cursor-text text-[#F5F5F5]"
        >
          {subtask.title}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Remplacer l'ancien bloc d'étapes dans `TaskCard`**

Dans `TaskCard`, remplacer le bloc :

```tsx
{context === "today" && onSubtaskToggle ? (
  <div className="mt-2 space-y-1 w-full">
    {(task.subtasks ?? []).map((s) =>
      onSubtaskRename ? (
        <SubtaskEditableRow
          key={s.id}
          taskId={task.id}
          subtask={s}
          onToggle={onSubtaskToggle}
          onRename={onSubtaskRename}
        />
      ) : (
        <label key={s.id} className="flex items-center gap-2 cursor-pointer w-full">
          <input
            type="checkbox"
            checked={s.done}
            onChange={(e) => onSubtaskToggle(task.id, s.id, e.target.checked)}
            className="h-3 w-3 accent-[#F0FF00]"
          />
          <span className={cn("text-xs", s.done ? "line-through text-[#F5F5F5]/30" : "text-[#F5F5F5]/60")}>
            {s.title}
          </span>
        </label>
      )
    )}
    {onSubtaskAdd ? <SubtaskInlineInput taskId={task.id} onAdd={onSubtaskAdd} /> : null}
  </div>
) : null}
```

par :

```tsx
{context === "today" && onSubtaskToggle && onSubtaskRename && onSubtaskAdd ? (
  <TaskStepsBlock
    taskId={task.id}
    steps={task.subtasks ?? []}
    onToggle={onSubtaskToggle}
    onRename={onSubtaskRename}
    onAdd={onSubtaskAdd}
  />
) : null}
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4: Vérification visuelle**

Run: `npm run dev`
Créer une tâche dans "Aujourd'hui" avec 4 étapes. Vérifier :
- Le label `▸ ÉTAPE EN COURS` (jaune accent) s'affiche au-dessus de la première étape non-cochée, qui est rendue en gros (`text-sm font-medium`, foreground 100%).
- Le label `↓ Suite (0/4)` s'affiche sous l'étape courante, suivi des 3 étapes restantes en `text-xs` opacity réduite.
- Cocher l'étape courante : l'étape suivante remonte automatiquement en position "ÉTAPE EN COURS", le compteur passe à `(1/4)`.
- Cocher toutes les étapes : la card affiche "Toutes les étapes sont faites — clique sur ✓ pour clôturer." (la tâche n'est PAS auto-marquée comme done).
- Tâche sans étape : seul l'input `Ajouter une sous-tâche...` est affiché (placeholder existant non modifié dans cette task).
- Cliquer sur le titre d'une étape : passage en édition inline, Enter valide, Escape annule.

---

## Task 4: Renommer le placeholder de l'input inline d'ajout d'étape

**Files:**
- Modify: `src/modules/tasks/components/TaskCard.tsx`

- [ ] **Step 1: Mettre à jour le placeholder dans `SubtaskInlineInput`**

Dans `TaskCard.tsx`, dans la fonction `SubtaskInlineInput`, changer :

```tsx
placeholder="Ajouter une sous-tâche..."
```

en :

```tsx
placeholder="Ajouter une étape..."
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Vérification visuelle**

Run: `npm run dev`
Sur une card du panneau "Aujourd'hui", vérifier que l'input d'ajout en bas affiche bien `Ajouter une étape...`.

---

## Task 5: Installer `@dnd-kit/sortable` et ajouter le drag-and-drop des étapes à venir

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm install)
- Modify: `src/modules/tasks/components/TaskCard.tsx`
- Modify: `src/modules/tasks/components/Tasks.tsx`
- Modify: `src/modules/tasks/components/TodayPanel.tsx`

- [ ] **Step 1: Installer la lib**

Run: `npm install @dnd-kit/sortable @dnd-kit/utilities`
Expected: deux packages ajoutés à `package.json`.

- [ ] **Step 2: Ajouter le handler `onSubtaskReorder` dans `Tasks.tsx`**

Dans `Tasks.tsx`, après `handleSubtaskRename`, ajouter :

```tsx
const handleSubtaskReorder = (taskId: string, fromIndex: number, toIndex: number) => {
  setTasks((prev) =>
    prev.map((t) => {
      if (t.id !== taskId) return t;
      const subtasks = [...(t.subtasks ?? [])];
      const [moved] = subtasks.splice(fromIndex, 1);
      if (!moved) return t;
      subtasks.splice(toIndex, 0, moved);
      return { ...t, subtasks };
    })
  );
};
```

- [ ] **Step 3: Passer `onSubtaskReorder` au `TodayPanel`**

Dans `Tasks.tsx`, dans le JSX du `TodayPanel`, ajouter la prop :

```tsx
<TodayPanel
  tasks={todayTasks}
  onStatusChange={handleStatusChange}
  onRemoveFromToday={handleRemoveFromToday}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onSubtaskToggle={handleSubtaskToggle}
  onSubtaskAdd={handleSubtaskAdd}
  onSubtaskRename={handleSubtaskRename}
  onSubtaskReorder={handleSubtaskReorder}
/>
```

- [ ] **Step 4: Faire suivre la prop dans `TodayPanel`**

Dans `TodayPanel.tsx`, ajouter `onSubtaskReorder` à l'interface :

```tsx
interface TodayPanelProps {
  tasks: Todo[];
  onStatusChange: (id: string, status: Todo["status"]) => void;
  onRemoveFromToday: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSubtaskToggle?: (taskId: string, subtaskId: string, done: boolean) => void;
  onSubtaskAdd?: (taskId: string, title: string) => void;
  onSubtaskRename?: (taskId: string, subtaskId: string, title: string) => void;
  onSubtaskReorder?: (taskId: string, fromIndex: number, toIndex: number) => void;
}
```

L'ajouter dans le destructuring puis le faire suivre dans le JSX :

```tsx
export function TodayPanel({
  tasks,
  onStatusChange,
  onRemoveFromToday,
  onEdit,
  onDelete,
  onSubtaskToggle,
  onSubtaskAdd,
  onSubtaskRename,
  onSubtaskReorder,
}: TodayPanelProps) {
```

Et dans la map des `TaskCard` :

```tsx
<TaskCard
  key={task.id}
  task={task}
  context="today"
  onStatusChange={onStatusChange}
  onRemoveFromToday={onRemoveFromToday}
  onEdit={onEdit}
  onDelete={onDelete}
  onSubtaskToggle={onSubtaskToggle}
  onSubtaskAdd={onSubtaskAdd}
  onSubtaskRename={onSubtaskRename}
  onSubtaskReorder={onSubtaskReorder}
/>
```

- [ ] **Step 5: Ajouter `onSubtaskReorder` à l'interface `TaskCardProps` et la transmettre à `TaskStepsBlock`**

Dans `TaskCard.tsx`, ajouter dans `TaskCardProps` :

```tsx
onSubtaskReorder?: (taskId: string, fromIndex: number, toIndex: number) => void;
```

Dans le destructuring et dans l'appel à `TaskStepsBlock` :

```tsx
{context === "today" && onSubtaskToggle && onSubtaskRename && onSubtaskAdd ? (
  <TaskStepsBlock
    taskId={task.id}
    steps={task.subtasks ?? []}
    onToggle={onSubtaskToggle}
    onRename={onSubtaskRename}
    onAdd={onSubtaskAdd}
    onReorder={onSubtaskReorder}
  />
) : null}
```

- [ ] **Step 6: Implémenter le drag-and-drop dans `TaskStepsBlock`**

Dans `TaskCard.tsx`, en haut du fichier, ajouter les imports :

```tsx
import { DndContext, closestCenter, type DragEndEvent as StepsDragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
```

Modifier `TaskStepsBlock` pour accepter `onReorder` et envelopper la liste `upcoming` dans un `DndContext` + `SortableContext` :

```tsx
function TaskStepsBlock({
  taskId,
  steps,
  onToggle,
  onRename,
  onAdd,
  onReorder,
}: {
  taskId: string;
  steps: { id: string; title: string; done: boolean }[];
  onToggle: (taskId: string, subtaskId: string, done: boolean) => void;
  onRename: (taskId: string, subtaskId: string, title: string) => void;
  onAdd: (taskId: string, title: string) => void;
  onReorder?: (taskId: string, fromIndex: number, toIndex: number) => void;
}) {
  const currentIndex = steps.findIndex((s) => !s.done);
  const current = currentIndex >= 0 ? steps[currentIndex] : null;
  const upcoming = currentIndex >= 0 ? steps.slice(currentIndex + 1).filter((s) => !s.done) : [];
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = total > 0 && doneCount === total;

  const handleDragEnd = (event: StepsDragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const fromUpcomingIndex = upcoming.findIndex((s) => s.id === active.id);
    const toUpcomingIndex = upcoming.findIndex((s) => s.id === over.id);
    if (fromUpcomingIndex < 0 || toUpcomingIndex < 0) return;
    const baseOffset = currentIndex + 1;
    onReorder(taskId, baseOffset + fromUpcomingIndex, baseOffset + toUpcomingIndex);
  };

  if (steps.length === 0) {
    return (
      <div className="mt-2 w-full">
        <SubtaskInlineInput taskId={taskId} onAdd={onAdd} />
      </div>
    );
  }

  return (
    <div className="mt-2 w-full space-y-2">
      {allDone ? (
        <p className="text-[11px] text-emerald-300/80">
          Toutes les étapes sont faites — clique sur ✓ pour clôturer.
        </p>
      ) : current ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F0FF00]/70 mb-0.5">
            ▸ Étape en cours
          </p>
          <CurrentStepRow
            taskId={taskId}
            subtask={current}
            onToggle={onToggle}
            onRename={onRename}
          />
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#F5F5F5]/40 mb-1">
            ↓ Suite ({doneCount}/{total})
          </p>
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={upcoming.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1">
                {upcoming.map((s) => (
                  <SortableUpcomingStep
                    key={s.id}
                    taskId={taskId}
                    subtask={s}
                    onToggle={onToggle}
                    onRename={onRename}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      ) : null}

      <SubtaskInlineInput taskId={taskId} onAdd={onAdd} />
    </div>
  );
}

function SortableUpcomingStep({
  taskId,
  subtask,
  onToggle,
  onRename,
}: {
  taskId: string;
  subtask: { id: string; title: string; done: boolean };
  onToggle: (taskId: string, subtaskId: string, done: boolean) => void;
  onRename: (taskId: string, subtaskId: string, title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subtask.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-1.5">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab text-[#F5F5F5]/30 hover:text-[#F5F5F5]/70 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Réordonner"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1">
        <SubtaskEditableRow
          taskId={taskId}
          subtask={subtask}
          onToggle={onToggle}
          onRename={onRename}
        />
      </div>
    </li>
  );
}
```

- [ ] **Step 7: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 8: Vérification visuelle et test du drag**

Run: `npm run dev`
Sur une tâche du panneau "Aujourd'hui" avec au moins 3 étapes (et l'étape courante non-cochée) :
- Le grip-handle `⋮⋮` (icône `GripVertical`) apparaît au hover sur la card, à gauche des étapes "à venir" uniquement.
- Drag d'une étape future vers une autre position : l'ordre se met à jour immédiatement.
- L'étape courante n'a pas de grip et n'est pas drag-able.
- Les étapes terminées ne sont pas affichées dans la suite (filtrage par `!s.done`).
- Le drag n'interfère pas avec le drag-and-drop today ↔ backlog (essayer de drag la card complète : ça doit toujours fonctionner).

Si conflit observé entre les deux DndContext, réduire le `activationConstraint` du PointerSensor interne à `{ distance: 4 }` ou utiliser un `useSensor` dédié qui ne se déclenche qu'au grip-handle.

---

## Task 6: Suppression de l'auto-promotion silencieuse

**Files:**
- Modify: `src/modules/tasks/components/Tasks.tsx`

- [ ] **Step 1: Supprimer le `useEffect` `promotedRef`**

Dans `Tasks.tsx`, supprimer le bloc :

```tsx
// Auto-promote overdue/due-today tasks — runs once after tasks are loaded
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

- [ ] **Step 2: Nettoyer l'import `useRef` si plus utilisé**

Vérifier si `useRef` est encore importé et utilisé ailleurs dans le fichier. Au moment où ce plan est rédigé, `useRef` n'est plus utilisé dans `Tasks.tsx` après cette suppression — l'enlever de l'import :

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
```

devient :

```tsx
import { useEffect, useMemo, useState } from "react";
```

(Si `useRef` est utilisé ailleurs, le laisser.)

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4: Vérification visuelle**

Run: `npm run dev`
Avoir une tâche dans le backlog avec une deadline antérieure à aujourd'hui. Recharger la page Tâches. Vérifier que cette tâche **ne saute plus toute seule** dans le panneau "Aujourd'hui" — elle reste dans le backlog jusqu'à action volontaire (clic ⚡, drag, ou rituel).

---

## Task 7: Créer le composant `DayStartDialog`

**Files:**
- Create: `src/modules/tasks/components/DayStartDialog.tsx`

- [ ] **Step 1: Créer le fichier**

Créer `src/modules/tasks/components/DayStartDialog.tsx` avec le contenu suivant :

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/sidekick-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SECTOR_BAR: Record<string, string> = {
  Live: "bg-blue-500/60",
  Phono: "bg-red-500/60",
  Admin: "bg-violet-500/60",
  Marketing: "bg-emerald-500/60",
  Edition: "bg-cyan-500/60",
  Revenus: "bg-orange-500/60",
  Autre: "bg-[rgba(245,245,245,0.25)]",
};

const SECTOR_LABEL: Record<string, string> = {
  Live: "text-blue-300",
  Phono: "text-red-300",
  Admin: "text-violet-300",
  Marketing: "text-emerald-300",
  Edition: "text-cyan-300",
  Revenus: "text-orange-300",
  Autre: "text-[#F5F5F5]/40",
};

interface DayStartDialogProps {
  open: boolean;
  onClose: () => void;
  backlogTasks: Todo[]; // tâches non-terminées et non-todayFocus
  onConfirm: (selectedIds: string[]) => void;
}

type Bucket = "overdue" | "today" | "thisWeek" | "later";

function bucketize(task: Todo, todayISO: string, weekHorizonISO: string): Bucket {
  if (!task.deadline) return "later";
  if (task.deadline < todayISO) return "overdue";
  if (task.deadline === todayISO) return "today";
  if (task.deadline <= weekHorizonISO) return "thisWeek";
  return "later";
}

const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: "EN RETARD",
  today: "AUJOURD'HUI",
  thisWeek: "CETTE SEMAINE",
  later: "BACKLOG",
};

export function DayStartDialog({
  open,
  onClose,
  backlogTasks,
  onConfirm,
}: DayStartDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { buckets, todayISO } = useMemo(() => {
    const todayDate = new Date();
    const todayISO = todayDate.toISOString().slice(0, 10);
    const weekHorizonDate = new Date(todayDate);
    weekHorizonDate.setDate(weekHorizonDate.getDate() + 7);
    const weekHorizonISO = weekHorizonDate.toISOString().slice(0, 10);

    const grouped: Record<Bucket, Todo[]> = {
      overdue: [],
      today: [],
      thisWeek: [],
      later: [],
    };
    for (const t of backlogTasks) {
      grouped[bucketize(t, todayISO, weekHorizonISO)].push(t);
    }

    // Trier chaque bucket par deadline asc puis createdAt desc
    const byDeadline = (a: Todo, b: Todo) => {
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    };
    grouped.overdue.sort(byDeadline);
    grouped.today.sort(byDeadline);
    grouped.thisWeek.sort(byDeadline);
    grouped.later.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

    return { buckets: grouped, todayISO };
  }, [backlogTasks]);

  // Pré-cocher overdue + today à l'ouverture
  useEffect(() => {
    if (!open) return;
    const initial = new Set<string>();
    for (const t of buckets.overdue) initial.add(t.id);
    for (const t of buckets.today) initial.add(t.id);
    setSelected(initial);
  }, [open, buckets]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
    onClose();
  };

  const order: Bucket[] = ["overdue", "today", "thisWeek", "later"];
  const totalSelected = selected.size;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choisis tes tâches du jour</DialogTitle>
          <DialogDescription>
            Coche celles que tu veux faire aujourd&apos;hui. Les retards et les échéances du jour sont pré-cochés.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-2">
          {order.map((bucket) => {
            const items = buckets[bucket];
            if (items.length === 0) return null;
            return (
              <section key={bucket}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/50">
                    {BUCKET_LABEL[bucket]}
                  </span>
                  <span className="text-[10px] text-[#F5F5F5]/30">({items.length})</span>
                  <div className="flex-1 h-px bg-[rgba(245,245,245,0.08)]" />
                </div>
                <ul className="space-y-1">
                  {items.map((t) => {
                    const sector = t.sector ?? "Autre";
                    const isSelected = selected.has(t.id);
                    const overdue = t.deadline && t.deadline < todayISO;
                    return (
                      <li
                        key={t.id}
                        onClick={() => toggle(t.id)}
                        className={cn(
                          "relative flex items-start gap-2 border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.4)] pl-4 pr-3 py-2 cursor-pointer transition-colors",
                          "hover:border-[rgba(245,245,245,0.15)] hover:bg-[rgba(44,44,46,0.6)]",
                          isSelected && "border-[#F0FF00]/30 bg-[rgba(240,255,0,0.04)]"
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-0 top-0 bottom-0 w-[4px]",
                            SECTOR_BAR[sector]
                          )}
                        />
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(t.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[#F0FF00] cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.15em] mb-0.5", SECTOR_LABEL[sector])}>
                            {sector}
                          </p>
                          <p className="text-sm font-medium text-[#F5F5F5] leading-snug">
                            {t.title}
                          </p>
                          {t.deadline ? (
                            <p
                              className={cn(
                                "mt-0.5 text-xs",
                                overdue
                                  ? "inline-flex items-center gap-1 border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-300 font-medium"
                                  : "text-[#F5F5F5]/40"
                              )}
                            >
                              {overdue ? "⚠ " : ""}
                              {new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(t.deadline))}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t border-[rgba(245,245,245,0.08)] pt-3">
          <span className="text-xs text-[#F5F5F5]/50">
            {totalSelected} {totalSelected > 1 ? "tâches sélectionnées" : "tâche sélectionnée"}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={totalSelected === 0}>
              <Zap className="mr-1 h-3.5 w-3.5" />
              C&apos;est parti
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

---

## Task 8: Wiring du rituel — empty state + orchestration depuis Tasks.tsx

**Files:**
- Modify: `src/modules/tasks/components/TodayPanel.tsx`
- Modify: `src/modules/tasks/components/Tasks.tsx`

- [ ] **Step 1: Ajouter une prop `onStartDay` et le CTA dans l'empty state du `TodayPanel`**

Dans `TodayPanel.tsx`, mettre à jour l'interface :

```tsx
interface TodayPanelProps {
  tasks: Todo[];
  hasBacklog: boolean;
  onStartDay: () => void;
  onStatusChange: (id: string, status: Todo["status"]) => void;
  onRemoveFromToday: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSubtaskToggle?: (taskId: string, subtaskId: string, done: boolean) => void;
  onSubtaskAdd?: (taskId: string, title: string) => void;
  onSubtaskRename?: (taskId: string, subtaskId: string, title: string) => void;
  onSubtaskReorder?: (taskId: string, fromIndex: number, toIndex: number) => void;
}
```

Ajouter `hasBacklog` et `onStartDay` au destructuring. Ajouter `Button` à l'import :

```tsx
import { Button } from "@/components/ui/button";
```

Remplacer le bloc empty state :

```tsx
{active.length === 0 ? (
  <p className="flex-1 flex items-center justify-center text-xs text-[#F5F5F5]/30">
    Glisse des tâches ici ou clique sur ⚡ depuis le backlog
  </p>
) : (
```

par :

```tsx
{active.length === 0 ? (
  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center">
    <p className="text-sm text-[#F5F5F5]/60">
      Ta journée n&apos;a pas commencé.
    </p>
    {hasBacklog ? (
      <>
        <Button onClick={onStartDay}>
          <Zap className="mr-1 h-4 w-4" />
          Démarrer ma journée
        </Button>
        <p className="text-[11px] text-[#F5F5F5]/30">
          ou glisse une tâche depuis le backlog
        </p>
      </>
    ) : (
      <p className="text-[11px] text-[#F5F5F5]/30">
        Ajoute une tâche pour démarrer.
      </p>
    )}
  </div>
) : (
```

- [ ] **Step 2: Importer et brancher `DayStartDialog` dans `Tasks.tsx`**

Dans `Tasks.tsx`, ajouter à côté des autres imports de composants tasks :

```tsx
import { DayStartDialog } from "./DayStartDialog";
```

Ajouter un nouvel état :

```tsx
const [dayStartOpen, setDayStartOpen] = useState(false);
```

(à placer avec les autres `useState` en haut du composant).

Ajouter un handler de confirmation :

```tsx
const handleStartDayConfirm = (selectedIds: string[]) => {
  if (selectedIds.length === 0) return;
  const idsSet = new Set(selectedIds);
  setTasks((prev) =>
    prev.map((t) => (idsSet.has(t.id) ? { ...t, todayFocus: true } : t))
  );
};
```

(à placer à côté des autres handlers, par ex. après `handleAddSuggestion`).

- [ ] **Step 3: Passer `hasBacklog` + `onStartDay` au `TodayPanel` et brancher le `DayStartDialog`**

Dans le JSX de `Tasks.tsx`, modifier le `TodayPanel` :

```tsx
<TodayPanel
  tasks={todayTasks}
  hasBacklog={backlogTasks.length > 0}
  onStartDay={() => setDayStartOpen(true)}
  onStatusChange={handleStatusChange}
  onRemoveFromToday={handleRemoveFromToday}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onSubtaskToggle={handleSubtaskToggle}
  onSubtaskAdd={handleSubtaskAdd}
  onSubtaskRename={handleSubtaskRename}
  onSubtaskReorder={handleSubtaskReorder}
/>
```

Et avant la fin du composant (par ex. juste après le `<TaskModal ... />` de la fin du JSX), ajouter :

```tsx
<DayStartDialog
  open={dayStartOpen}
  onClose={() => setDayStartOpen(false)}
  backlogTasks={backlogTasks}
  onConfirm={handleStartDayConfirm}
/>
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 5: Vérification visuelle complète**

Run: `npm run dev`
Scénarios :

1. **Backlog vide + Today vide** : sur la page Tâches, le panneau "Aujourd'hui" affiche "Ta journée n'a pas commencé." + "Ajoute une tâche pour démarrer." (pas de bouton "Démarrer ma journée").
2. **Backlog non vide + Today vide** : le panneau "Aujourd'hui" affiche le CTA `⚡ Démarrer ma journée`. Au clic, la modale s'ouvre.
3. **Modale ouverte** :
   - Les sections EN RETARD, AUJOURD'HUI, CETTE SEMAINE, BACKLOG s'affichent uniquement si elles contiennent des tâches.
   - Compteur entre parenthèses correct.
   - Tâches en retard et tâches dues aujourd'hui sont pré-cochées.
   - Cliquer sur une row coche/décoche.
   - Bande couleur secteur 4px à gauche, label secteur small-caps au-dessus du titre, tag deadline (avec ⚠ si overdue).
   - Footer : compteur "N tâche(s) sélectionnée(s)", bouton "C'est parti" désactivé si 0 sélectionné.
4. **Validation** : cliquer "C'est parti" → toutes les tâches cochées passent dans "Aujourd'hui", la modale ferme.
5. **Today non vide** : pas de bouton "Démarrer ma journée" affiché. Le bouton ⚡ du backlog continue de fonctionner.
6. **Pas d'auto-promotion** : recharger la page : aucune tâche en retard ne saute toute seule.

---

## Task 9: Validation finale et lint

**Files:** aucun changement

- [ ] **Step 1: TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: aucune erreur ou warning bloquant. Si warnings, les inspecter — les corriger s'ils proviennent du nouveau code.

- [ ] **Step 3: Build production**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Récapitulatif des fichiers modifiés**

Lister les fichiers touchés :
- `src/modules/tasks/components/TaskModal.tsx`
- `src/modules/tasks/components/TaskCard.tsx`
- `src/modules/tasks/components/TodayPanel.tsx`
- `src/modules/tasks/components/Tasks.tsx`
- `src/modules/tasks/components/DayStartDialog.tsx` (nouveau)
- `package.json`, `package-lock.json`

Demander à l'utilisateur s'il souhaite committer.
