# Onglet Création — Cockpit & parcours 3 phases · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre l'onglet Création des projets en un cockpit à 3 phases (Création · Production · Sortie), nourri par des signaux auto issus des modules Phono/Édition/Live liés.

**Architecture:** Un champ `phase` s'ajoute aux étapes de création. Les templates de seeding deviennent phase-aware. Une couche de logique pure (`creation-logic.ts`) calcule la phase active, la progression et les signaux auto. Le composant `CreationTab` est réécrit en cockpit + phases dépliables + éléments liés repliés ; le bloc Brainstorming disparaît.

**Tech Stack:** Next.js 16, React, TypeScript strict, Supabase (SWR), Tailwind, Lucide, Radix UI.

**Vérification :** Pas de test runner dans ce repo (CLAUDE.md). La porte de vérification de chaque tâche est `npx tsc --noEmit` (0 erreur) + `npm run lint`, et pour l'UI un contrôle manuel via `npm run dev`. Réf. spec : `docs/superpowers/specs/2026-07-07-projects-creation-cockpit-design.md`.

**Convention de commit :** terminer chaque message par
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Fichiers touchés

| Fichier | Nature | Responsabilité |
|---|---|---|
| `src/lib/sidekick-store.ts` | Modifié | Type `CreationPhase`, constantes de phase, champ `phase` sur `CreationStep`. |
| `src/modules/projects/data/creation-templates.ts` | Modifié | Templates de seeding ventilés par phase. |
| `src/modules/projects/data/creation-logic.ts` | **Créé** | Logique pure : phase active, progression par phase, signaux auto. |
| `src/hooks/useProjectCreationData.ts` | Modifié | Mappers `phase`, `seedSector` phase-aware. |
| `supabase/migrations/20260707000000_creation_steps_phase.sql` | **Créé** | Colonne `phase`. |
| `src/modules/projects/components/tabs/CreationTab.tsx` | Réécrit | Cockpit + phases + éléments liés ; brainstorm retiré. |

---

## Task 1 : Types & constantes de phase

**Files:**
- Modify: `src/lib/sidekick-store.ts` (bloc `// --- Project Creation ---`, ~lignes 295-319)

- [ ] **Step 1 : Ajouter le type `CreationPhase` et ses constantes**

Dans `src/lib/sidekick-store.ts`, juste après la ligne `export type CreationStepStatus = "todo" | "doing" | "done";` (~ligne 296), insérer :

```ts
export type CreationPhase = "creation" | "production" | "sortie";

export const CREATION_PHASE_ORDER: CreationPhase[] = ["creation", "production", "sortie"];

export const CREATION_PHASE_LABELS: Record<CreationPhase, string> = {
  creation: "Création",
  production: "Production",
  sortie: "Sortie",
};
```

- [ ] **Step 2 : Ajouter le champ `phase` à `CreationStep`**

Dans la même interface `CreationStep`, ajouter `phase` juste après `projectId` :

```ts
export interface CreationStep {
  id: string;
  projectId: string;
  phase: CreationPhase;
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

- [ ] **Step 3 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: des erreurs UNIQUEMENT dans les fichiers qui construisent un `CreationStep` sans `phase` (`useProjectCreationData.ts`, `CreationTab.tsx`). Elles seront corrigées aux tâches 4 et 6. Aucune autre erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/lib/sidekick-store.ts
git commit -m "feat(types): CreationPhase + champ phase sur CreationStep"
```

---

## Task 2 : Templates de seeding phase-aware

**Files:**
- Modify: `src/modules/projects/data/creation-templates.ts` (réécriture complète)

- [ ] **Step 1 : Réécrire le fichier**

Remplacer tout le contenu de `src/modules/projects/data/creation-templates.ts` par :

```ts
import type { CreationSector, CreationPhase } from "@/lib/sidekick-store";

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
    { phase: "creation", label: "Écriture / Composition" },
    { phase: "sortie",   label: "Répartition des droits" },
    { phase: "sortie",   label: "Dépôt SACEM" },
  ],
  live: [
    { phase: "creation",   label: "Conception du set" },
    { phase: "production", label: "Répétitions" },
    { phase: "production", label: "Résidence" },
    { phase: "sortie",     label: "Stratégie de tournée" },
  ],
};

export const SECTOR_LABELS: Record<CreationSector, string> = {
  phono: "Phono",
  edition: "Édition",
  live: "Live",
  general: "Général",
};
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: l'erreur sur `CREATION_TEMPLATES[sector].map((label, ...))` apparaît dans `useProjectCreationData.ts` (le template n'est plus `string[]`). Corrigée en tâche 4.

- [ ] **Step 3 : Commit**

```bash
git add src/modules/projects/data/creation-templates.ts
git commit -m "feat(projects): templates de création ventilés par phase"
```

---

## Task 3 : Logique pure — phase active, progression, signaux

**Files:**
- Create: `src/modules/projects/data/creation-logic.ts`

- [ ] **Step 1 : Créer le fichier de logique**

Créer `src/modules/projects/data/creation-logic.ts` avec :

```ts
import type {
  CreationStep, CreationPhase, Track, Session, Work, TourDate, Rehearsal,
} from "@/lib/sidekick-store";
import { CREATION_PHASE_ORDER } from "@/lib/sidekick-store";

// ─── Phase active & progression ────────────────────────────────────────────────

/** Une phase est terminée si elle a ≥1 étape et que toutes sont "done". */
export function isPhaseDone(steps: CreationStep[], phase: CreationPhase): boolean {
  const s = steps.filter((x) => x.phase === phase);
  return s.length > 0 && s.every((x) => x.status === "done");
}

/** Phase active = première phase non terminée dans l'ordre ; sinon "sortie". */
export function computeActivePhase(steps: CreationStep[]): CreationPhase {
  return CREATION_PHASE_ORDER.find((p) => !isPhaseDone(steps, p)) ?? "sortie";
}

/** Toutes les phases ayant au moins une étape sont-elles terminées ? */
export function allPhasesDone(steps: CreationStep[]): boolean {
  const phasesWithSteps = CREATION_PHASE_ORDER.filter(
    (p) => steps.some((s) => s.phase === p)
  );
  return phasesWithSteps.length > 0 && phasesWithSteps.every((p) => isPhaseDone(steps, p));
}

export function phaseProgress(
  steps: CreationStep[],
  phase: CreationPhase
): { done: number; total: number; pct: number } {
  const s = steps.filter((x) => x.phase === phase);
  const done = s.filter((x) => x.status === "done").length;
  return { done, total: s.length, pct: s.length === 0 ? 0 : Math.round((done / s.length) * 100) };
}

export function globalProgress(
  steps: CreationStep[]
): { done: number; total: number; pct: number } {
  const done = steps.filter((s) => s.status === "done").length;
  return { done, total: steps.length, pct: steps.length === 0 ? 0 : Math.round((done / steps.length) * 100) };
}

// ─── Signaux auto ───────────────────────────────────────────────────────────────

export interface CreationSignal {
  label: string;
  tone: "accent" | "muted";
}

/** Données de modules déjà filtrées sur les éléments liés au projet. */
export interface CreationSignalContext {
  tracks: Track[];
  sessions: Session[];
  works: Work[];
  tourDates: TourDate[];
  rehearsals: Rehearsal[];
}

const plural = (n: number) => (n > 1 ? "s" : "");

/** YYYY-MM-DD d'aujourd'hui, pour comparer les dates de concerts. */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse une date fr (JJ/MM/AAAA) ou ISO (AAAA-MM-JJ) → clé AAAA-MM-JJ, ou null. */
function toKey(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

export function deriveSignals(
  phase: CreationPhase,
  ctx: CreationSignalContext
): CreationSignal[] {
  const out: CreationSignal[] = [];

  if (phase === "creation") {
    const enProd = ctx.tracks.filter((t) => t.status === "en_production").length;
    if (enProd > 0) out.push({ label: `${enProd} titre${plural(enProd)} en production`, tone: "muted" });

    const deposed = ctx.works.filter(
      (w) => w.status === "registered-sacem" || w.status === "accepted-sacem"
    ).length;
    if (deposed > 0) out.push({ label: `${deposed} œuvre${plural(deposed)} déposée${plural(deposed)} SACEM`, tone: "accent" });

    const inProgress = ctx.works.filter((w) => w.status === "in-progress").length;
    if (inProgress > 0) out.push({ label: `${inProgress} œuvre${plural(inProgress)} en cours`, tone: "muted" });
  }

  if (phase === "production") {
    const mixed = ctx.tracks.filter((t) => t.status === "mixe").length;
    if (mixed > 0) out.push({ label: `${mixed} titre${plural(mixed)} mixé${plural(mixed)}`, tone: "muted" });

    const mastered = ctx.tracks.filter((t) => t.status === "masterise").length;
    if (mastered > 0) out.push({ label: `${mastered} titre${plural(mastered)} masterisé${plural(mastered)}`, tone: "accent" });

    if (ctx.sessions.length > 0) out.push({ label: `${ctx.sessions.length} session${plural(ctx.sessions.length)} studio`, tone: "muted" });
    if (ctx.rehearsals.length > 0) out.push({ label: `${ctx.rehearsals.length} répétition${plural(ctx.rehearsals.length)}`, tone: "muted" });
  }

  if (phase === "sortie") {
    const published = ctx.tracks.filter((t) => t.status === "publie").length;
    if (published > 0) out.push({ label: `${published} titre${plural(published)} publié${plural(published)}`, tone: "accent" });

    const tk = todayKey();
    const upcoming = ctx.tourDates.filter((d) => {
      const k = toKey(d.date);
      return k !== null && k >= tk;
    }).length;
    if (upcoming > 0) out.push({ label: `${upcoming} concert${plural(upcoming)} à venir`, tone: "accent" });

    const exploited = ctx.works.filter((w) => w.status === "accepted-sacem").length;
    if (exploited > 0) out.push({ label: `${exploited} œuvre${plural(exploited)} exploitée${plural(exploited)}`, tone: "muted" });
  }

  return out;
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur dans ce fichier (les types `Track`, `Session`, `Work`, `TourDate`, `Rehearsal` existent dans `sidekick-store.ts`). Les erreurs pré-existantes des tâches 1-2 subsistent.

- [ ] **Step 3 : Commit**

```bash
git add src/modules/projects/data/creation-logic.ts
git commit -m "feat(projects): logique pure phases + signaux auto création"
```

---

## Task 4 : Hook — mappers & seed phase-aware

**Files:**
- Modify: `src/hooks/useProjectCreationData.ts` (mappers ~11-43, `seedSector` ~137-166)

- [ ] **Step 1 : Mapper `phase` dans `rowToStep`**

Dans `rowToStep`, ajouter la ligne `phase` juste après `projectId` :

```ts
function rowToStep(row: Record<string, unknown>): CreationStep {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    phase: (row.phase as CreationStep["phase"]) ?? "creation",
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
```

- [ ] **Step 2 : Mapper `phase` dans `stepToRow`**

Dans `stepToRow`, ajouter `phase` juste après `project_id` :

```ts
function stepToRow(s: CreationStep): Record<string, unknown> {
  return {
    id: s.id,
    project_id: s.projectId,
    phase: s.phase,
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
```

- [ ] **Step 3 : Rendre `seedSector` phase-aware**

Remplacer le corps de `seedSector` (la construction de `newSteps`) par une version qui lit `phase` et `label` depuis le template :

```ts
  const seedSector = useCallback(
    (
      sector: Exclude<CreationSector, "general">,
      currentSeededSectors: CreationSector[],
      updateProject: (updates: { creationSeededSectors: CreationSector[] }) => void
    ) => {
      if (currentSeededSectors.includes(sector)) return;
      const templates = CREATION_TEMPLATES[sector];
      const existingCount = steps.filter((s) => s.sector === sector).length;
      const newSteps: CreationStep[] = templates.map((tpl, i) => ({
        id: crypto.randomUUID(),
        projectId,
        phase: tpl.phase,
        sector,
        label: tpl.label,
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
```

- [ ] **Step 4 : Retirer `progress` du hook (déplacé dans la logique pure)**

Supprimer le bloc `const progress = { ... }` (~lignes 206-215) et retirer `progress` de l'objet retourné (~ligne 221). Le composant utilisera `globalProgress(steps)` de `creation-logic.ts`. L'objet retourné devient :

```ts
  return {
    steps,
    setSteps,
    seedSector,
    generateTask,
    loading: isLoading,
    error,
  };
```

- [ ] **Step 5 : Ajouter l'import du type `CreationPhase` si nécessaire**

Vérifier que la ligne d'import des types couvre `CreationStep` et `CreationSector` (déjà le cas). `phase` n'exige pas d'import supplémentaire ici. Aucun changement d'import attendu.

- [ ] **Step 6 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: les erreurs de `useProjectCreationData.ts` disparaissent. Restent uniquement les erreurs dans `CreationTab.tsx` (utilise encore `progress` du hook et n'a pas de `phase`). Corrigées en tâche 6.

- [ ] **Step 7 : Commit**

```bash
git add src/hooks/useProjectCreationData.ts
git commit -m "feat(hooks): seed phase-aware + mappers phase"
```

---

## Task 5 : Migration Supabase

**Files:**
- Create: `supabase/migrations/20260707000000_creation_steps_phase.sql`

- [ ] **Step 1 : Créer la migration**

Créer `supabase/migrations/20260707000000_creation_steps_phase.sql` :

```sql
-- Onglet Création : ajout de la phase (creation | production | sortie) aux étapes.
-- À exécuter dans le SQL Editor Supabase (Dashboard → SQL Editor).

alter table public.user_project_creation_steps
  add column if not exists phase text not null default 'creation';

-- Reset one-shot (dev, pré-beta) : le modèle passe de « templates par secteur »
-- à « templates ventilés par phase ». On repart propre pour re-seeder correctement.
delete from public.user_project_creation_steps;
update public.user_projects set creation_seeded_sectors = '[]'::jsonb;
```

- [ ] **Step 2 : Commit**

```bash
git add supabase/migrations/20260707000000_creation_steps_phase.sql
git commit -m "feat(db): colonne phase sur creation steps + reset seeding"
```

- [ ] **Step 3 : Note d'exécution (manuelle)**

Signaler dans le rapport de tâche : cette migration doit être exécutée manuellement dans le SQL Editor Supabase par l'utilisateur (le `delete` + `reset` est volontaire et attendu, pré-beta mono-utilisateur).

---

## Task 6 : Réécriture de `CreationTab`

**Files:**
- Modify: `src/modules/projects/components/tabs/CreationTab.tsx` (réécriture complète)

- [ ] **Step 1 : Réécrire le composant**

Remplacer tout le contenu de `src/modules/projects/components/tabs/CreationTab.tsx` par le code ci-dessous. Il réutilise `StepStatusIcon`, `StepDialog`, `StepRow` (inchangés dans leur logique), et ajoute `PhaseSignals`, `PhaseCard`, le cockpit et le stepper. Le bloc Brainstorming est retiré. Les éléments liés restent repliés en bas.

```tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Circle, CircleDot, CheckCircle2, Plus, Trash2, MoreHorizontal,
  ChevronDown, ChevronRight, ExternalLink, Zap, Calendar, User,
} from "lucide-react";
import type {
  Project, CreationStep, CreationSector, CreationEntityType, CreationPhase,
} from "@/lib/sidekick-store";
import { CREATION_PHASE_ORDER, CREATION_PHASE_LABELS } from "@/lib/sidekick-store";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useProjectCreationData } from "@/hooks/useProjectCreationData";
import { useSidekickData } from "@/hooks/useSidekickData";
import { SECTOR_LABELS } from "@/modules/projects/data/creation-templates";
import {
  computeActivePhase, isPhaseDone, allPhasesDone, phaseProgress, globalProgress,
  deriveSignals, type CreationSignal,
} from "@/modules/projects/data/creation-logic";
import { PhonoSection } from "../sections/PhonoSection";
import { EditionSection } from "../sections/EditionSection";
import { LiveSection } from "../sections/LiveSection";
import { WorkTrackLinker } from "../sections/WorkTrackLinker";
import { Button } from "@/components/ui/button";
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

const SECTOR_ORDER: CreationSector[] = ["phono", "edition", "live", "general"];

// ─── StepStatusIcon ────────────────────────────────────────────────────────────

function StepStatusIcon({ status, onClick }: { status: CreationStep["status"]; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 transition-opacity hover:opacity-70"
      title={`Statut : ${status} — clic pour changer`}
    >
      {status === "todo" && <Circle size={16} className="text-[#F5F5F5]/30" />}
      {status === "doing" && <CircleDot size={16} className="text-[#F0FF00]/80" />}
      {status === "done" && <CheckCircle2 size={16} className="text-[#F0FF00]" />}
    </button>
  );
}

// ─── StepDialog ────────────────────────────────────────────────────────────────

function StepDialog({
  step, members, onSave, onClose,
}: {
  step: CreationStep;
  members: Project["members"];
  onSave: (patch: Partial<CreationStep>) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(step.label);
  const [targetDate, setTargetDate] = useState(step.targetDate ?? "");
  const [assignee, setAssignee] = useState(step.assignee);
  const [linkedEntityType, setLinkedEntityType] = useState<CreationEntityType>(step.linkedEntityType);
  const [links, setLinks] = useState(step.links);

  const addLink = () => setLinks((prev) => [...prev, { label: "", url: "" }]);
  const updateLink = (i: number, patch: { label?: string; url?: string }) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLink = (i: number) => setLinks((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    onSave({ label: label.trim() || step.label, targetDate: targetDate || null, assignee, linkedEntityType, links });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Modifier l&apos;étape</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#F5F5F5]/60">Intitulé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#F5F5F5]/60">Date cible</Label>
            <DatePicker value={targetDate} onChange={(iso) => setTargetDate(iso)} />
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
                    <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
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
            <Select value={linkedEntityType} onValueChange={(v) => setLinkedEntityType(v as CreationEntityType)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ENTITY_TYPE_LABELS) as [CreationEntityType, string][]).map(([value, lbl]) => (
                  <SelectItem key={value} value={value}>{lbl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-[#F5F5F5]/60">Liens</Label>
              <Button type="button" variant="ghost" size="xs" onClick={addLink} className="h-6 text-[11px]">
                <Plus size={10} className="mr-1" /> Ajouter
              </Button>
            </div>
            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input value={link.label} onChange={(e) => updateLink(i, { label: e.target.value })} placeholder="Label" className="h-7 text-[11px] flex-1" />
                  <Input value={link.url} onChange={(e) => updateLink(i, { url: e.target.value })} placeholder="https://…" className="h-7 text-[11px] flex-1" />
                  <button type="button" onClick={() => removeLink(i)} className="text-[#F5F5F5]/30 hover:text-red-400 shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
          <Button type="button" size="sm" onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── StepRow ───────────────────────────────────────────────────────────────────

function StepRow({
  step, onCycleStatus, onEdit, onDelete, onGenerateTask,
}: {
  step: CreationStep;
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
          step.status === "done" ? "line-through text-[#F5F5F5]/40" : "text-[#F5F5F5]/90"
        )}
      >
        {step.label}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        {step.targetDate && (
          <span className="flex items-center gap-1 text-[10px] text-[#F5F5F5]/40 bg-[rgba(245,245,245,0.06)] rounded px-1.5 py-0.5">
            <Calendar size={9} />{step.targetDate}
          </span>
        )}
        {step.assignee && (
          <span className="flex items-center gap-1 text-[10px] text-[#F5F5F5]/40 bg-[rgba(245,245,245,0.06)] rounded px-1.5 py-0.5">
            <User size={9} />{step.assignee}
          </span>
        )}
        {step.linkedEntityType && (step.linkedEntityType as string) !== "" && (
          <a
            href={ENTITY_ROUTES[step.linkedEntityType as Exclude<CreationEntityType, "">]}
            className="flex items-center gap-1 text-[10px] text-[#F0FF00]/50 bg-[#F0FF00]/8 hover:text-[#F0FF00] rounded px-1.5 py-0.5 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={9} />{ENTITY_TYPE_LABELS[step.linkedEntityType]}
          </a>
        )}
        {step.links.length > 0 && (
          <span className="text-[10px] text-[#F5F5F5]/30 bg-[rgba(245,245,245,0.06)] rounded px-1.5 py-0.5">
            {step.links.length} lien{step.links.length > 1 ? "s" : ""}
          </span>
        )}
        {step.taskId && (
          <a href="/tasks" className="flex items-center gap-1 text-[10px] text-[#F0FF00]/50 hover:text-[#F0FF00] transition-colors" onClick={(e) => e.stopPropagation()}>
            <Zap size={9} />tâche
          </a>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="opacity-0 group-hover:opacity-100 text-[#F5F5F5]/40 hover:text-[#F5F5F5] transition-all shrink-0">
            <MoreHorizontal size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-[13px]">
          <DropdownMenuItem onSelect={onEdit}>Modifier</DropdownMenuItem>
          {!step.taskId && <DropdownMenuItem onSelect={onGenerateTask}>Générer une tâche</DropdownMenuItem>}
          <DropdownMenuItem onSelect={onDelete} className="text-red-400 focus:text-red-400">Supprimer</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── PhaseSignals ──────────────────────────────────────────────────────────────

function PhaseSignals({ signals }: { signals: CreationSignal[] }) {
  if (signals.length === 0) return null;
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {signals.map((s, i) => (
        <span
          key={i}
          className={cn(
            "text-[11px] rounded-full px-2.5 py-1 border",
            s.tone === "accent"
              ? "text-[#F0FF00] bg-[#F0FF00]/8 border-[#F0FF00]/20"
              : "text-[#F5F5F5]/70 bg-[rgba(245,245,245,0.05)] border-[rgba(245,245,245,0.12)]"
          )}
        >
          {s.label}
        </span>
      ))}
    </div>
  );
}

// ─── PhaseCard ─────────────────────────────────────────────────────────────────

function PhaseCard({
  phase, steps, signals, isActive, open, onToggle,
  onCycleStatus, onEdit, onDelete, onGenerateTask, onAddStep,
}: {
  phase: CreationPhase;
  steps: CreationStep[];
  signals: CreationSignal[];
  isActive: boolean;
  open: boolean;
  onToggle: () => void;
  onCycleStatus: (step: CreationStep) => void;
  onEdit: (step: CreationStep) => void;
  onDelete: (step: CreationStep) => void;
  onGenerateTask: (step: CreationStep) => void;
  onAddStep: (phase: CreationPhase) => void;
}) {
  const { done, total } = phaseProgress(steps, phase);
  const phaseSteps = steps.filter((s) => s.phase === phase);
  const isDone = isPhaseDone(steps, phase);
  const stateLabel = isDone ? "terminée" : isActive ? "en cours" : "à venir";

  const sectorsPresent = SECTOR_ORDER.filter((sec) => phaseSteps.some((s) => s.sector === sec));

  return (
    <div
      className={cn(
        "rounded-xl border backdrop-blur-xl overflow-hidden transition-colors",
        isActive
          ? "border-[rgba(240,255,0,0.25)] bg-[rgba(240,255,0,0.03)]"
          : "border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)]",
        !open && !isActive && "opacity-70"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-[rgba(245,245,245,0.03)] transition-colors"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown size={14} className="text-[#F5F5F5]/40" /> : <ChevronRight size={14} className="text-[#F5F5F5]/40" />}
          <span className={cn("text-[13px] font-medium", isActive ? "text-[#F5F5F5]" : "text-[#F5F5F5]/70")}>
            {isDone && "✓ "}{CREATION_PHASE_LABELS[phase]}
          </span>
        </span>
        <span className="text-[11px] text-[#F5F5F5]/40">{done}/{total} · {stateLabel}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <PhaseSignals signals={signals} />

          {sectorsPresent.map((sec) => (
            <div key={sec} className="mb-2">
              <div className="text-[10px] uppercase tracking-[0.12em] text-[#F5F5F5]/35 mb-1 px-2">
                {SECTOR_LABELS[sec]}
              </div>
              {phaseSteps
                .filter((s) => s.sector === sec)
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    onCycleStatus={() => onCycleStatus(step)}
                    onEdit={() => onEdit(step)}
                    onDelete={() => onDelete(step)}
                    onGenerateTask={() => onGenerateTask(step)}
                  />
                ))}
            </div>
          ))}

          <button
            type="button"
            onClick={() => onAddStep(phase)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F5F5F5]/60 transition-colors w-full"
          >
            <Plus size={12} /> Ajouter une étape
          </button>
        </div>
      )}
    </div>
  );
}

// ─── CreationTab ───────────────────────────────────────────────────────────────

export function CreationTab({ project }: { project: Project }) {
  const { setProjects } = useProjectsData();
  const { data } = useSidekickData();
  const { steps, setSteps, seedSector, generateTask, loading } = useProjectCreationData(project.id);

  const [editingStep, setEditingStep] = useState<CreationStep | null>(null);
  const [linkedOpen, setLinkedOpen] = useState(false);
  const [openPhases, setOpenPhases] = useState<Set<CreationPhase>>(new Set());
  const userToggledRef = useRef(false);

  const updateProject = (updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );
  };

  // Seed des secteurs actifs non encore semés.
  useEffect(() => {
    if (loading) return;
    const seeded = project.creationSeededSectors ?? [];
    const activeSectors = project.sectors.filter(
      (s) => s !== "general" && !seeded.includes(s as CreationSector)
    ) as Exclude<CreationSector, "general">[];
    if (activeSectors.length === 0) return;
    for (const sector of activeSectors) {
      seedSector(sector, seeded, () => {});
    }
    updateProject({ creationSeededSectors: [...seeded, ...activeSectors] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, project.id]);

  const active = computeActivePhase(steps);
  const progress = globalProgress(steps);
  const bouclé = allPhasesDone(steps);

  // Ouvre la phase active par défaut tant que l'utilisateur n'a pas interagi.
  useEffect(() => {
    if (!userToggledRef.current) setOpenPhases(new Set([active]));
  }, [active]);

  const togglePhase = (phase: CreationPhase) => {
    userToggledRef.current = true;
    setOpenPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  };

  // Données de modules liées (source des signaux auto).
  const signalCtx = useMemo(
    () => ({
      tracks: (data.phono?.tracks ?? []).filter((t) => project.linkedTracks.includes(t.id)),
      sessions: (data.phono?.sessions ?? []).filter((s) => project.linkedSessions.includes(s.id)),
      works: (data.edition?.works ?? []).filter((w) => project.linkedWorks.includes(w.id)),
      tourDates: (data.live?.tourDates ?? []).filter((d) => project.linkedTourDates.includes(d.id)),
      rehearsals: (data.live?.rehearsals ?? []).filter((r) => project.linkedRehearsals.includes(r.id)),
    }),
    [data, project.linkedTracks, project.linkedSessions, project.linkedWorks, project.linkedTourDates, project.linkedRehearsals]
  );

  const handleCycleStatus = (step: CreationStep) =>
    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, status: STATUS_CYCLE[s.status] } : s)));

  const handleSaveStep = (step: CreationStep, patch: Partial<CreationStep>) =>
    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, ...patch } : s)));

  const handleDeleteStep = (step: CreationStep) =>
    setSteps((prev) => prev.filter((s) => s.id !== step.id));

  const handleAddStep = (phase: CreationPhase) => {
    const phaseSteps = steps.filter((s) => s.phase === phase);
    const newStep: CreationStep = {
      id: crypto.randomUUID(),
      projectId: project.id,
      phase,
      sector: "general",
      label: "Nouvelle étape",
      status: "todo",
      orderIndex: phaseSteps.length,
      targetDate: null,
      assignee: "",
      linkedEntityType: "",
      linkedEntityId: "",
      links: [],
      taskId: null,
    };
    setSteps((prev) => [...prev, newStep]);
    setEditingStep(newStep);
  };

  const handleGenerateTask = async (step: CreationStep) => { await generateTask(step); };

  const hasSectors = project.sectors.length > 0;

  return (
    <div className="space-y-4">
      {/* 1. Cockpit */}
      <div>
        <div className="flex items-center text-[10px] uppercase tracking-[0.22em] text-[#F5F5F5]/40">
          <span className="mr-2 inline-block h-[6px] w-[6px] rounded-full bg-[#F0FF00] shadow-[0_0_10px_#F0FF00]" />
          Parcours créatif · {project.title}
        </div>

        <h1 className="mt-4 text-[34px] font-extralight leading-[1.1] tracking-[-0.02em] text-[#F5F5F5]">
          {bouclé ? (
            "Projet bouclé."
          ) : (
            <>Tu es en <em className="not-italic font-light text-[#F0FF00]">{CREATION_PHASE_LABELS[active]}</em>.</>
          )}
        </h1>

        {/* Stepper 3 phases */}
        <div className="mt-6 flex gap-2">
          {CREATION_PHASE_ORDER.map((phase) => {
            const pp = phaseProgress(steps, phase);
            const done = isPhaseDone(steps, phase);
            const isActive = phase === active && !bouclé;
            return (
              <div key={phase} className="flex-1">
                <div className="h-1 rounded-full bg-[rgba(245,245,245,0.12)] overflow-hidden">
                  <div
                    className="h-1 rounded-full bg-[#F0FF00] transition-all"
                    style={{ width: done ? "100%" : `${pp.pct}%` }}
                  />
                </div>
                <div
                  className={cn(
                    "mt-2 text-[10px] uppercase tracking-[0.08em]",
                    done ? "text-[#F5F5F5]/50" : isActive ? "text-[#F0FF00]" : "text-[#F5F5F5]/40"
                  )}
                >
                  {CREATION_PHASE_LABELS[phase]}{done ? " ✓" : isActive ? " · en cours" : ""}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="mt-6 flex items-baseline gap-12 border-b border-[rgba(245,245,245,0.08)] pb-5">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[28px] font-extralight text-[#F5F5F5]">{progress.total - progress.done}</span>
            <span className="max-w-[90px] text-[11px] text-[#F5F5F5]/55">étapes restantes</span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[28px] font-extralight text-[#F0FF00]">{progress.pct}%</span>
            <span className="max-w-[90px] text-[11px] text-[#F5F5F5]/55">du parcours accompli</span>
          </div>
        </div>
      </div>

      {/* 2. Phases */}
      {hasSectors ? (
        <div className="space-y-2.5">
          {CREATION_PHASE_ORDER.map((phase) => (
            <PhaseCard
              key={phase}
              phase={phase}
              steps={steps}
              signals={deriveSignals(phase, signalCtx)}
              isActive={phase === active && !bouclé}
              open={openPhases.has(phase)}
              onToggle={() => togglePhase(phase)}
              onCycleStatus={handleCycleStatus}
              onEdit={setEditingStep}
              onDelete={handleDeleteStep}
              onGenerateTask={handleGenerateTask}
              onAddStep={handleAddStep}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-4">
          <p className="text-[13px] text-[#F5F5F5]/30 italic py-4 text-center">
            Aucun secteur activé. Modifie le projet pour ajouter Phono, Édition ou Live.
          </p>
        </div>
      )}

      {/* 3. Éléments liés — repliable */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setLinkedOpen((v) => !v)}
          className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-[rgba(245,245,245,0.04)] transition-colors"
        >
          <span className="text-[12px] uppercase tracking-wider text-[#F5F5F5]/40 font-medium">Éléments liés</span>
          {linkedOpen ? <ChevronDown size={14} className="text-[#F5F5F5]/30" /> : <ChevronRight size={14} className="text-[#F5F5F5]/30" />}
        </button>
        {linkedOpen && (
          <div className="px-4 pb-4 space-y-6">
            {project.sectors.includes("phono") && <PhonoSection project={project} />}
            {project.sectors.includes("edition") && <EditionSection project={project} />}
            {project.sectors.includes("live") && <LiveSection project={project} />}
            {project.sectors.includes("phono") && project.sectors.includes("edition") && (
              <WorkTrackLinker project={project} />
            )}
            {!hasSectors && <p className="text-[13px] text-[#F5F5F5]/30 italic">Aucun secteur activé.</p>}
          </div>
        )}
      </div>

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

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: **0 erreur** dans tout le projet.

- [ ] **Step 3 : Lint**

Run: `npm run lint`
Expected: 0 erreur (warnings pré-existants tolérés).

- [ ] **Step 4 : Contrôle manuel**

Run: `npm run dev`, ouvrir un projet → onglet Création. Vérifier :
- Le cockpit affiche « Tu es en {phase} », le stepper 3 phases et les 2 stats.
- La phase active est dépliée, les autres repliées ; clic sur un en-tête déplie/replie.
- Cocher toutes les étapes d'une phase la marque ✓ dans le stepper et fait avancer la phrase cockpit.
- Les signaux auto apparaissent si des éléments Phono/Édition/Live sont liés (via le bloc Éléments liés).
- « + Ajouter une étape » crée une étape dans la bonne phase et ouvre le dialog.
- Le bloc Brainstorming n'apparaît plus ; Éléments liés fonctionne.

- [ ] **Step 5 : Commit**

```bash
git add src/modules/projects/components/tabs/CreationTab.tsx
git commit -m "feat(projects): CreationTab cockpit 3 phases + signaux auto"
```

---

## Task 7 : Revue finale

- [ ] **Step 1 : Type-check global**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 2 : Vérifier qu'aucune référence au brainstorm de l'onglet ne subsiste**

Run: `grep -rn "brainstorm" src/modules/projects/components/tabs/CreationTab.tsx`
Expected: aucune correspondance (le bloc a été retiré ; la colonne DB `brainstorm` reste inutilisée, c'est voulu).

- [ ] **Step 3 : Rappel migration**

Confirmer dans le rapport final que la migration `20260707000000_creation_steps_phase.sql` (qui inclut le `delete` + reset volontaire) doit être exécutée à la main dans le SQL Editor Supabase avant d'utiliser l'onglet.

---

## Self-review (auteur du plan)

**Couverture spec :**
- §3 types/migration → Tasks 1, 5 ✓
- §4 templates → Task 2 ✓
- §5 signaux auto → Task 3 (`deriveSignals`) + Task 6 (`signalCtx`) ✓
- §6 phase active/progression → Task 3 (`computeActivePhase`, `phaseProgress`, `globalProgress`, `allPhasesDone`) ✓
- §7 UI cockpit/phases/éléments liés/brainstorm retiré → Task 6 ✓
- §9 critères d'acceptation → contrôle manuel Task 6 Step 4 + Task 7 ✓

**Cohérence des types :** `CreationPhase`, `phase` sur `CreationStep`, `CreationTemplateStep`, `CreationSignal`/`CreationSignalContext`, `computeActivePhase`/`isPhaseDone`/`allPhasesDone`/`phaseProgress`/`globalProgress`/`deriveSignals` — noms identiques entre définition (Tasks 1-3) et usage (Tasks 4, 6). ✓

**Placeholders :** aucun ; chaque étape de code montre le code complet. ✓
