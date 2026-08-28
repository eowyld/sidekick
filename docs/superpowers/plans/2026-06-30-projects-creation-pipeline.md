# Projects Hub — Création Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à l'onglet Création d'un projet une feuille de route d'étapes par secteur (avec progression globale), une zone brainstorming, et regrouper les sections de liaison existantes dans un bloc repliable.

**Architecture:** Nouvelle table Supabase `user_project_creation_steps` + 2 colonnes sur `user_projects`. Hook `useProjectCreationData` calqué sur `useProjectBudgetData` (SWR + optimistic updates). UI entièrement dans `CreationTab.tsx` (pattern BudgetTab).

**Tech Stack:** Next.js App Router, Supabase, SWR, Radix UI, Tailwind, Lucide React

---

## File Map

| Action | Fichier |
|--------|---------|
| Créer | `supabase/migrations/20260630000000_projects_hub_creation_steps.sql` |
| Modifier | `src/lib/sidekick-store.ts` — types `CreationStep*` + champs sur `Project` |
| Modifier | `src/hooks/useProjectsData.ts` — `rowToProject` + `projectToRow` |
| Créer | `src/modules/projects/data/creation-templates.ts` |
| Créer | `src/hooks/useProjectCreationData.ts` |
| Modifier | `src/modules/projects/components/tabs/CreationTab.tsx` — réécriture complète |

---

## Task 1 : Migration SQL

**Files:**
- Create: `supabase/migrations/20260630000000_projects_hub_creation_steps.sql`

- [ ] **Step 1 : Créer le fichier de migration**

```sql
-- Projets Hub — Création : étapes de pipeline + brainstorming
-- À exécuter dans le SQL Editor Supabase (Dashboard → SQL Editor).

-- 1. Table des étapes de création
create table if not exists public.user_project_creation_steps (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.user_projects(id) on delete cascade,
  sector             text not null default 'general',
  label              text not null,
  status             text not null default 'todo',
  order_index        int  not null default 0,
  target_date        date null,
  assignee           text not null default '',
  linked_entity_type text not null default '',
  linked_entity_id   text not null default '',
  links              jsonb not null default '[]'::jsonb,
  task_id            uuid null,
  created_at         timestamptz default now()
);

create index if not exists idx_creation_steps_project_id
  on public.user_project_creation_steps(project_id);

alter table public.user_project_creation_steps enable row level security;

drop policy if exists "Users can manage own creation steps"
  on public.user_project_creation_steps;
create policy "Users can manage own creation steps"
  on public.user_project_creation_steps for all
  using (
    project_id in (
      select id from public.user_projects where user_id = auth.uid()
    )
  )
  with check (
    project_id in (
      select id from public.user_projects where user_id = auth.uid()
    )
  );

-- 2. Colonnes sur user_projects
alter table public.user_projects
  add column if not exists brainstorm text not null default '',
  add column if not exists creation_seeded_sectors jsonb not null default '[]'::jsonb;
```

- [ ] **Step 2 : Exécuter la migration dans Supabase Dashboard**

Ouvrir Supabase Dashboard → SQL Editor → coller le contenu du fichier → Run.
Vérifier que la table `user_project_creation_steps` apparaît dans Table Editor.

---

## Task 2 : Types dans `sidekick-store.ts` + mise à jour de `Project`

**Files:**
- Modify: `src/lib/sidekick-store.ts`

Le type `Project` est à la ligne 271. Il faut lui ajouter deux champs, et ajouter les nouveaux types après lui.

- [ ] **Step 1 : Ajouter `brainstorm` et `creationSeededSectors` à l'interface `Project`**

Dans `src/lib/sidekick-store.ts`, l'interface `Project` (ligne 271) se termine par :

```ts
  notes: string;
}
```

Remplacer par :

```ts
  notes: string;
  brainstorm: string;
  creationSeededSectors: CreationSector[];
}
```

*Note : `CreationSector` sera déclaré juste après — TypeScript accepte les forward references dans les interfaces.*

- [ ] **Step 2 : Ajouter les types CreationStep après l'interface `Project`**

Insérer après la fermeture `}` de `Project` (avant `// --- Phono ---`) :

```ts
// --- Project Creation ---
export type CreationStepStatus = "todo" | "doing" | "done";
export type CreationSector = "phono" | "edition" | "live" | "general";
export type CreationEntityType =
  | "" | "track" | "album" | "session" | "work" | "tour_date" | "rehearsal";

export interface CreationStepLink {
  label: string;
  url: string;
}

export interface CreationStep {
  id: string;
  projectId: string;
  sector: CreationSector;
  label: string;
  status: CreationStepStatus;
  orderIndex: number;
  targetDate: string | null;
  assignee: string;
  linkedEntityType: CreationEntityType;
  linkedEntityId: string;
  links: CreationStepLink[];
  taskId: string | null;
}
```

- [ ] **Step 3 : Vérifier que TypeScript compile**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -30
```

Attendu : pas d'erreur sur les nouveaux types.

---

## Task 3 : Mettre à jour les mappers de `useProjectsData.ts`

**Files:**
- Modify: `src/hooks/useProjectsData.ts`

- [ ] **Step 1 : Ajouter l'import du type `CreationSector`**

En haut du fichier, la ligne d'import existante est :

```ts
import type { Project } from "@/lib/sidekick-store";
```

Remplacer par :

```ts
import type { Project, CreationSector } from "@/lib/sidekick-store";
```

- [ ] **Step 2 : Mettre à jour `rowToProject`**

La fonction `rowToProject` se termine actuellement par :

```ts
    notes: (row.notes as string) ?? "",
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}
```

Remplacer par :

```ts
    notes: (row.notes as string) ?? "",
    brainstorm: (row.brainstorm as string) ?? "",
    creationSeededSectors: (row.creation_seeded_sectors as CreationSector[]) ?? [],
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}
```

- [ ] **Step 3 : Mettre à jour `projectToRow`**

La fonction `projectToRow` se termine actuellement par :

```ts
    key_dates: p.keyDates,
    notes: p.notes,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}
```

Remplacer par :

```ts
    key_dates: p.keyDates,
    notes: p.notes,
    brainstorm: p.brainstorm,
    creation_seeded_sectors: p.creationSeededSectors,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}
```

- [ ] **Step 4 : Vérifier que TypeScript compile**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -30
```

Attendu : pas d'erreur.

---

## Task 4 : Templates d'étapes par secteur

**Files:**
- Create: `src/modules/projects/data/creation-templates.ts`

- [ ] **Step 1 : Créer le fichier**

```ts
import type { CreationSector } from "@/lib/sidekick-store";

export const CREATION_TEMPLATES: Record<Exclude<CreationSector, "general">, string[]> = {
  phono: [
    "Écriture",
    "Composition",
    "Première maquette",
    "Pré-prod",
    "Session studio",
    "Premières versions",
    "Mixage",
    "Mastering",
  ],
  edition: [
    "Dépôt des textes",
    "Composition / arrangement",
    "Finalisation",
    "Dépôt SACEM",
  ],
  live: [
    "Création du set",
    "Répétitions",
    "Résidence",
    "Entraînement scène",
    "Filage",
  ],
};

export const SECTOR_LABELS: Record<CreationSector, string> = {
  phono: "Phono",
  edition: "Édition",
  live: "Live",
  general: "Général",
};
```

---

## Task 5 : Hook `useProjectCreationData`

**Files:**
- Create: `src/hooks/useProjectCreationData.ts`

Ce hook est calqué sur `useProjectBudgetData.ts`. Il gère les étapes via SWR + optimistic updates, expose `seedSector` (injection des étapes-types) et `generateTask` (création d'une tâche depuis une étape).

- [ ] **Step 1 : Créer le fichier complet**

```ts
"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";
import type { CreationStep, CreationSector } from "@/lib/sidekick-store";
import { CREATION_TEMPLATES } from "@/modules/projects/data/creation-templates";

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToStep(row: Record<string, unknown>): CreationStep {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    sector: (row.sector as CreationStep["sector"]) ?? "general",
    label: (row.label as string) ?? "",
    status: (row.status as CreationStep["status"]) ?? "todo",
    orderIndex: (row.order_index as number) ?? 0,
    targetDate: (row.target_date as string) ?? null,
    assignee: (row.assignee as string) ?? "",
    linkedEntityType: (row.linked_entity_type as CreationStep["linkedEntityType"]) ?? "",
    linkedEntityId: (row.linked_entity_id as string) ?? "",
    links: (row.links as CreationStep["links"]) ?? [],
    taskId: (row.task_id as string) ?? null,
  };
}

function stepToRow(s: CreationStep): Record<string, unknown> {
  return {
    id: s.id,
    project_id: s.projectId,
    sector: s.sector,
    label: s.label,
    status: s.status,
    order_index: s.orderIndex,
    target_date: s.targetDate ?? null,
    assignee: s.assignee,
    linked_entity_type: s.linkedEntityType,
    linked_entity_id: s.linkedEntityId,
    links: s.links,
    task_id: s.taskId ?? null,
  };
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchSteps(projectId: string): Promise<CreationStep[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_project_creation_steps")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToStep(r as Record<string, unknown>));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const SECTOR_TO_TASK_SECTOR: Record<CreationSector, string> = {
  phono: "Phono",
  edition: "Edition",
  live: "Live",
  general: "Projets",
};

export function useProjectCreationData(projectId: string) {
  const key = projectId ? `creation:${projectId}` : null;

  const {
    data: steps = [],
    isLoading,
    error: swrError,
    mutate: mutateLocal,
  } = useSWR<CreationStep[]>(key, () => fetchSteps(projectId));

  const error = swrError ? (swrError as Error).message : null;

  // ─── Setter optimiste ────────────────────────────────────────────────────────

  const setSteps = useCallback(
    (fn: (prev: CreationStep[]) => CreationStep[]) => {
      const snapshot = steps;
      const next = fn(steps);
      mutateLocal(next, false);

      (async () => {
        const supabase = createClient();
        const prevMap = new Map(snapshot.map((s) => [s.id, s]));
        const nextMap = new Map(next.map((s) => [s.id, s]));

        const toUpsert = next.filter((s) => {
          const old = prevMap.get(s.id);
          return !old || JSON.stringify(old) !== JSON.stringify(s);
        });
        const toDelete = snapshot
          .filter((s) => !nextMap.has(s.id))
          .map((s) => s.id);

        const ops: Array<PromiseLike<{ error: { message: string } | null }>> = [];

        if (toUpsert.length > 0) {
          ops.push(
            supabase
              .from("user_project_creation_steps")
              .upsert(toUpsert.map(stepToRow))
              .then(({ error }) => ({
                error: error ? { message: error.message } : null,
              }))
          );
        }
        if (toDelete.length > 0) {
          ops.push(
            supabase
              .from("user_project_creation_steps")
              .delete()
              .in("id", toDelete)
              .then(({ error }) => ({
                error: error ? { message: error.message } : null,
              }))
          );
        }

        const results = await Promise.all(ops);
        if (results.find((r) => r.error)) {
          mutateLocal(snapshot, false);
        } else {
          mutate(key);
        }
      })();
    },
    [steps, mutateLocal, key]
  );

  // ─── Seed secteur ────────────────────────────────────────────────────────────

  const seedSector = useCallback(
    (
      sector: Exclude<CreationSector, "general">,
      currentSeededSectors: CreationSector[],
      updateProject: (updates: { creationSeededSectors: CreationSector[] }) => void
    ) => {
      if (currentSeededSectors.includes(sector)) return;
      const templates = CREATION_TEMPLATES[sector];
      const existingCount = steps.filter((s) => s.sector === sector).length;
      const newSteps: CreationStep[] = templates.map((label, i) => ({
        id: crypto.randomUUID(),
        projectId,
        sector,
        label,
        status: "todo",
        orderIndex: existingCount + i,
        targetDate: null,
        assignee: "",
        linkedEntityType: "",
        linkedEntityId: "",
        links: [],
        taskId: null,
      }));
      setSteps((prev) => [...prev, ...newSteps]);
      updateProject({
        creationSeededSectors: [...currentSeededSectors, sector],
      });
    },
    [steps, projectId, setSteps]
  );

  // ─── Générer une tâche ───────────────────────────────────────────────────────

  const generateTask = useCallback(
    async (step: CreationStep): Promise<void> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_tasks")
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          title: step.label,
          status: "todo",
          today_focus: false,
          deadline: step.targetDate ?? null,
          sector: SECTOR_TO_TASK_SECTOR[step.sector],
          subtasks: [],
        })
        .select("id")
        .single();

      if (error || !data) return;

      setSteps((prev) =>
        prev.map((s) =>
          s.id === step.id ? { ...s, taskId: (data as { id: string }).id } : s
        )
      );
    },
    [setSteps]
  );

  // ─── Progression globale ─────────────────────────────────────────────────────

  const progress = {
    done: steps.filter((s) => s.status === "done").length,
    total: steps.length,
    pct:
      steps.length === 0
        ? 0
        : Math.round(
            (steps.filter((s) => s.status === "done").length / steps.length) * 100
          ),
  };

  return {
    steps,
    setSteps,
    seedSector,
    generateTask,
    progress,
    loading: isLoading,
    error,
  };
}
```

- [ ] **Step 2 : Vérifier que TypeScript compile**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -30
```

Attendu : pas d'erreur.

---

## Task 6 : Réécriture de `CreationTab.tsx`

**Files:**
- Modify: `src/modules/projects/components/tabs/CreationTab.tsx`

C'est le cœur de la feature. Le fichier actuel (25 lignes) est entièrement remplacé. Structure :
1. `StepStatusIcon` — icône cyclable (todo/doing/done)
2. `StepDialog` — Dialog d'édition d'une étape (date, responsable, entité liée, liens)
3. `SectorGroup` — un groupe secteur avec ses étapes + "Ajouter une étape"
4. `CreationTab` — assemblage : roadmap card, groupes, brainstorming, éléments liés repliables

- [ ] **Step 1 : Réécrire `CreationTab.tsx` en entier**

```tsx
"use client";

import { useState, useEffect } from "react";
import {
  Circle, CircleDot, CheckCircle2, Plus, Trash2, MoreHorizontal,
  ChevronDown, ChevronRight, ExternalLink, Zap, Calendar, User,
} from "lucide-react";
import type { Project, CreationStep, CreationSector, CreationEntityType } from "@/lib/sidekick-store";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useProjectCreationData } from "@/hooks/useProjectCreationData";
import { SECTOR_LABELS } from "@/modules/projects/data/creation-templates";
import { PhonoSection } from "../sections/PhonoSection";
import { EditionSection } from "../sections/EditionSection";
import { LiveSection } from "../sections/LiveSection";
import { WorkTrackLinker } from "../sections/WorkTrackLinker";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Constantes ────────────────────────────────────────────────────────────────

const STATUS_CYCLE: Record<CreationStep["status"], CreationStep["status"]> = {
  todo: "doing",
  doing: "done",
  done: "todo",
};

const ENTITY_TYPE_LABELS: Record<CreationEntityType, string> = {
  "": "Aucun",
  track: "Titre",
  album: "Album",
  session: "Session studio",
  work: "Œuvre",
  tour_date: "Date de concert",
  rehearsal: "Répétition",
};

const ENTITY_ROUTES: Record<Exclude<CreationEntityType, "">, string> = {
  track: "/phono/catalogue",
  album: "/phono/catalogue",
  session: "/phono/sessions-studio",
  work: "/edition",
  tour_date: "/live/representations",
  rehearsal: "/live/repetitions",
};

// ─── StepStatusIcon ────────────────────────────────────────────────────────────

function StepStatusIcon({
  status,
  onClick,
}: {
  status: CreationStep["status"];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 transition-opacity hover:opacity-70"
      title={`Statut : ${status} — clic pour changer`}
    >
      {status === "todo" && (
        <Circle size={16} className="text-[#F5F5F5]/30" />
      )}
      {status === "doing" && (
        <CircleDot size={16} className="text-[#F0FF00]/80" />
      )}
      {status === "done" && (
        <CheckCircle2 size={16} className="text-[#F0FF00]" />
      )}
    </button>
  );
}

// ─── StepDialog ────────────────────────────────────────────────────────────────

function StepDialog({
  step,
  members,
  onSave,
  onClose,
}: {
  step: CreationStep;
  members: Project["members"];
  onSave: (patch: Partial<CreationStep>) => void;
  onClose: () => void;
}) {
  const [targetDate, setTargetDate] = useState(step.targetDate ?? "");
  const [assignee, setAssignee] = useState(step.assignee);
  const [linkedEntityType, setLinkedEntityType] = useState<CreationEntityType>(
    step.linkedEntityType
  );
  const [links, setLinks] = useState(step.links);

  const addLink = () =>
    setLinks((prev) => [...prev, { label: "", url: "" }]);
  const updateLink = (i: number, patch: { label?: string; url?: string }) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLink = (i: number) =>
    setLinks((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    onSave({
      targetDate: targetDate || null,
      assignee,
      linkedEntityType,
      links,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">{step.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#F5F5F5]/60">Date cible</Label>
            <DatePicker
              value={targetDate}
              onChange={(iso) => setTargetDate(iso)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#F5F5F5]/60">Responsable</Label>
            {members.length > 0 ? (
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choisir un membre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.name} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Nom du responsable"
                className="h-8 text-xs"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#F5F5F5]/60">Type de livrable</Label>
            <Select
              value={linkedEntityType}
              onValueChange={(v) => setLinkedEntityType(v as CreationEntityType)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ENTITY_TYPE_LABELS) as [CreationEntityType, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-[#F5F5F5]/60">Liens</Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={addLink}
                className="h-6 text-[11px]"
              >
                <Plus size={10} className="mr-1" /> Ajouter
              </Button>
            </div>
            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input
                    value={link.label}
                    onChange={(e) => updateLink(i, { label: e.target.value })}
                    placeholder="Label"
                    className="h-7 text-[11px] flex-1"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => updateLink(i, { url: e.target.value })}
                    placeholder="https://…"
                    className="h-7 text-[11px] flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(i)}
                    className="text-[#F5F5F5]/30 hover:text-red-400 shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── StepRow ───────────────────────────────────────────────────────────────────

function StepRow({
  step,
  members,
  onCycleStatus,
  onEdit,
  onDelete,
  onGenerateTask,
}: {
  step: CreationStep;
  members: Project["members"];
  onCycleStatus: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onGenerateTask: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[rgba(245,245,245,0.04)] group">
      <StepStatusIcon status={step.status} onClick={onCycleStatus} />

      <span
        className={cn(
          "flex-1 text-[13px] truncate",
          step.status === "done"
            ? "line-through text-[#F5F5F5]/40"
            : "text-[#F5F5F5]/90"
        )}
      >
        {step.label}
      </span>

      {/* Chips */}
      <div className="flex items-center gap-1.5 shrink-0">
        {step.targetDate && (
          <span className="flex items-center gap-1 text-[10px] text-[#F5F5F5]/40 bg-[rgba(245,245,245,0.06)] rounded px-1.5 py-0.5">
            <Calendar size={9} />
            {step.targetDate}
          </span>
        )}
        {step.assignee && (
          <span className="flex items-center gap-1 text-[10px] text-[#F5F5F5]/40 bg-[rgba(245,245,245,0.06)] rounded px-1.5 py-0.5">
            <User size={9} />
            {step.assignee}
          </span>
        )}
        {step.linkedEntityType && step.linkedEntityType !== "" && (
          <a
            href={ENTITY_ROUTES[step.linkedEntityType as Exclude<CreationEntityType, "">]}
            className="flex items-center gap-1 text-[10px] text-[#F0FF00]/50 bg-[#F0FF00]/8 hover:text-[#F0FF00] rounded px-1.5 py-0.5 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={9} />
            {ENTITY_TYPE_LABELS[step.linkedEntityType]}
          </a>
        )}
        {step.links.length > 0 && (
          <span className="text-[10px] text-[#F5F5F5]/30 bg-[rgba(245,245,245,0.06)] rounded px-1.5 py-0.5">
            {step.links.length} lien{step.links.length > 1 ? "s" : ""}
          </span>
        )}
        {step.taskId && (
          <a
            href="/tasks"
            className="flex items-center gap-1 text-[10px] text-[#F0FF00]/50 hover:text-[#F0FF00] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Zap size={9} />
            tâche
          </a>
        )}
      </div>

      {/* Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 text-[#F5F5F5]/40 hover:text-[#F5F5F5] transition-all shrink-0"
          >
            <MoreHorizontal size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-[13px]">
          <DropdownMenuItem onSelect={onEdit}>Modifier</DropdownMenuItem>
          {!step.taskId && (
            <DropdownMenuItem onSelect={onGenerateTask}>
              Générer une tâche
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={onDelete}
            className="text-red-400 focus:text-red-400"
          >
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── SectorGroup ───────────────────────────────────────────────────────────────

function SectorGroup({
  sector,
  steps,
  members,
  onCycleStatus,
  onEdit,
  onDelete,
  onGenerateTask,
  onAddStep,
}: {
  sector: CreationSector;
  steps: CreationStep[];
  members: Project["members"];
  onCycleStatus: (step: CreationStep) => void;
  onEdit: (step: CreationStep) => void;
  onDelete: (step: CreationStep) => void;
  onGenerateTask: (step: CreationStep) => void;
  onAddStep: (sector: CreationSector) => void;
}) {
  const done = steps.filter((s) => s.status === "done").length;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between mb-1.5 px-2">
        <span className="text-[11px] uppercase tracking-wider text-[#F5F5F5]/40 font-medium">
          {SECTOR_LABELS[sector]}
        </span>
        {steps.length > 0 && (
          <span className="text-[10px] text-[#F5F5F5]/30">
            {done}/{steps.length}
          </span>
        )}
      </div>

      {steps.map((step) => (
        <StepRow
          key={step.id}
          step={step}
          members={members}
          onCycleStatus={() => onCycleStatus(step)}
          onEdit={() => onEdit(step)}
          onDelete={() => onDelete(step)}
          onGenerateTask={() => onGenerateTask(step)}
        />
      ))}

      <button
        type="button"
        onClick={() => onAddStep(sector)}
        className="flex items-center gap-1.5 px-2 py-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F5F5F5]/60 transition-colors w-full"
      >
        <Plus size={12} />
        Ajouter une étape
      </button>
    </div>
  );
}

// ─── CreationTab ───────────────────────────────────────────────────────────────

export function CreationTab({ project }: { project: Project }) {
  const { setProjects } = useProjectsData();
  const { steps, setSteps, seedSector, generateTask, progress, loading } =
    useProjectCreationData(project.id);

  const [editingStep, setEditingStep] = useState<CreationStep | null>(null);
  const [linkedOpen, setLinkedOpen] = useState(false);
  const [editingBrainstorm, setEditingBrainstorm] = useState(false);
  const [brainstormValue, setBrainstormValue] = useState(project.brainstorm ?? "");

  const updateProject = (updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      )
    );
  };

  // Auto-seed : pour chaque secteur actif non encore seedé, injecter les étapes-types.
  useEffect(() => {
    if (loading) return;
    const seeded = project.creationSeededSectors ?? [];
    const activeSectors = project.sectors.filter(
      (s): s is Exclude<CreationSector, "general"> =>
        s !== "general" && !seeded.includes(s)
    );
    for (const sector of activeSectors) {
      seedSector(sector, seeded, (updates) => updateProject(updates));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, project.id]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCycleStatus = (step: CreationStep) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === step.id ? { ...s, status: STATUS_CYCLE[s.status] } : s
      )
    );
  };

  const handleSaveStep = (step: CreationStep, patch: Partial<CreationStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === step.id ? { ...s, ...patch } : s))
    );
  };

  const handleDeleteStep = (step: CreationStep) => {
    setSteps((prev) => prev.filter((s) => s.id !== step.id));
  };

  const handleAddStep = (sector: CreationSector) => {
    const sectorSteps = steps.filter((s) => s.sector === sector);
    const newStep: CreationStep = {
      id: crypto.randomUUID(),
      projectId: project.id,
      sector,
      label: "Nouvelle étape",
      status: "todo",
      orderIndex: sectorSteps.length,
      targetDate: null,
      assignee: "",
      linkedEntityType: "",
      linkedEntityId: "",
      links: [],
      taskId: null,
    };
    setSteps((prev) => [...prev, newStep]);
    // Ouvrir immédiatement le dialog pour renommer
    setEditingStep(newStep);
  };

  const handleGenerateTask = async (step: CreationStep) => {
    await generateTask(step);
  };

  const handleSaveBrainstorm = () => {
    updateProject({ brainstorm: brainstormValue });
    setEditingBrainstorm(false);
  };

  // ─── Secteurs affichés ─────────────────────────────────────────────────────

  const activeSectors: CreationSector[] = [
    ...project.sectors.filter((s): s is CreationSector => s !== "general"),
    "general",
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* 1. Feuille de route — progression globale */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] uppercase tracking-wider text-[#F5F5F5]/40 font-medium">
            Feuille de route
          </span>
          <span className="text-[13px] font-semibold text-[#F5F5F5]/70">
            {progress.done}/{progress.total} étapes
          </span>
        </div>
        <Progress value={progress.pct} className="h-2" />
        <p className="mt-2 text-[11px] text-[#F5F5F5]/30">
          {progress.pct}% complété
        </p>
      </div>

      {/* 2. Étapes groupées par secteur */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-4 space-y-5">
        {activeSectors.map((sector) => {
          const sectorSteps = steps
            .filter((s) => s.sector === sector)
            .sort((a, b) => a.orderIndex - b.orderIndex);

          if (sectorSteps.length === 0 && sector === "general" && project.sectors.length > 0) {
            return (
              <SectorGroup
                key={sector}
                sector={sector}
                steps={[]}
                members={project.members}
                onCycleStatus={handleCycleStatus}
                onEdit={setEditingStep}
                onDelete={handleDeleteStep}
                onGenerateTask={handleGenerateTask}
                onAddStep={handleAddStep}
              />
            );
          }

          return (
            <SectorGroup
              key={sector}
              sector={sector}
              steps={sectorSteps}
              members={project.members}
              onCycleStatus={handleCycleStatus}
              onEdit={setEditingStep}
              onDelete={handleDeleteStep}
              onGenerateTask={handleGenerateTask}
              onAddStep={handleAddStep}
            />
          );
        })}

        {project.sectors.length === 0 && (
          <p className="text-[13px] text-[#F5F5F5]/30 italic py-4 text-center">
            Aucun secteur activé. Modifie le projet pour ajouter Phono, Édition ou Live.
          </p>
        )}
      </div>

      {/* 3. Brainstorming */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] uppercase tracking-wider text-[#F5F5F5]/40 font-medium">
            Brainstorming
          </span>
          {!editingBrainstorm && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-6 text-[11px] text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
              onClick={() => {
                setBrainstormValue(project.brainstorm ?? "");
                setEditingBrainstorm(true);
              }}
            >
              Modifier
            </Button>
          )}
        </div>

        {editingBrainstorm ? (
          <div className="space-y-2">
            <Textarea
              value={brainstormValue}
              onChange={(e) => setBrainstormValue(e.target.value)}
              placeholder="Idées libres, pistes, références…"
              rows={5}
              className="resize-none text-[13px]"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingBrainstorm(false)}
              >
                Annuler
              </Button>
              <Button type="button" size="sm" onClick={handleSaveBrainstorm}>
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-[#F5F5F5]/60 whitespace-pre-wrap leading-relaxed min-h-[40px]">
            {project.brainstorm
              ? project.brainstorm
              : <span className="italic text-[#F5F5F5]/20">Aucune note. Clique sur Modifier pour ajouter des idées.</span>}
          </p>
        )}
      </div>

      {/* 4. Éléments liés — repliable */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setLinkedOpen((v) => !v)}
          className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-[rgba(245,245,245,0.04)] transition-colors"
        >
          <span className="text-[12px] uppercase tracking-wider text-[#F5F5F5]/40 font-medium">
            Éléments liés
          </span>
          {linkedOpen ? (
            <ChevronDown size={14} className="text-[#F5F5F5]/30" />
          ) : (
            <ChevronRight size={14} className="text-[#F5F5F5]/30" />
          )}
        </button>
        {linkedOpen && (
          <div className="px-4 pb-4 space-y-6">
            {project.sectors.includes("phono") && <PhonoSection project={project} />}
            {project.sectors.includes("edition") && <EditionSection project={project} />}
            {project.sectors.includes("live") && <LiveSection project={project} />}
            {project.sectors.includes("phono") && project.sectors.includes("edition") && (
              <WorkTrackLinker project={project} />
            )}
            {project.sectors.length === 0 && (
              <p className="text-[13px] text-[#F5F5F5]/30 italic">
                Aucun secteur activé.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Dialog d'édition d'étape */}
      {editingStep && (
        <StepDialog
          step={editingStep}
          members={project.members}
          onSave={(patch) => handleSaveStep(editingStep, patch)}
          onClose={() => setEditingStep(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier que TypeScript compile**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -40
```

Attendu : pas d'erreur sur `CreationTab.tsx` ni ses imports.

- [ ] **Step 3 : Démarrer le dev server et tester manuellement**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npm run dev
```

Ouvrir un projet avec au moins un secteur actif (ex. Phono).
Aller dans l'onglet Création et vérifier :
- La feuille de route apparaît avec la barre de progression
- Les étapes-types Phono sont auto-injectées à la première ouverture (8 étapes)
- Le clic sur l'icône de statut cycle : todo → doing → done
- Le menu `…` propose Modifier / Générer une tâche / Supprimer
- "Ajouter une étape" crée une nouvelle étape et ouvre le dialog
- Le bloc Brainstorming fonctionne (lecture → Modifier → saisie → Enregistrer)
- Le bloc "Éléments liés" se replie/déplie
- Naviguer vers un autre projet : les étapes-types ne sont PAS ré-injectées

---

## Self-Review — Couverture de la spec

| Exigence spec | Tâche |
|---|---|
| Table `user_project_creation_steps` | Task 1 |
| Colonnes `brainstorm` + `creation_seeded_sectors` sur `user_projects` | Task 1 |
| Types `CreationStep*` dans `sidekick-store.ts` | Task 2 |
| Mappers `rowToProject`/`projectToRow` mis à jour | Task 3 |
| Templates par secteur (Phono 8 / Édition 4 / Live 5) | Task 4 |
| Hook `useProjectCreationData` (setSteps, seedSector, generateTask, progress) | Task 5 |
| Feuille de route avec grande barre de progression | Task 6 |
| Étapes groupées par secteur, clic cycle statut | Task 6 |
| Dialog par étape (date, responsable, livrable, liens) | Task 6 |
| Auto-seed sans ré-injection | Task 6 |
| "Ajouter une étape" inline par groupe | Task 6 |
| Brainstorming (même UX que Notes) | Task 6 |
| Éléments liés conservés dans bloc repliable | Task 6 |
| Deep-link entité → page module | Task 6 (ENTITY_ROUTES) |
| Générer une tâche → `user_tasks` + `taskId` sur étape | Task 5 + 6 |
| Phase 2 (synchro statut) | Hors périmètre ✓ |
| Fichiers/upload | Hors périmètre ✓ |
| Notes/sous-checklists par étape | Hors périmètre ✓ |
