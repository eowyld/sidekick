# Refonte Représentations — regroupement par tournée — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la page Représentations avec l'esthétique de la vue d'ensemble Live, une bascule Chronologique ⇄ Par tournée, des lignes dépliables, un timetable redessiné, et le rattachement des dates à des tournées (= projets live) avec création rapide.

**Architecture:** Découper le monolithe [TourDatesPage.tsx](../../../src/modules/live/components/TourDatesPage.tsx) (~2543 lignes) en unités focalisées sous `src/modules/live/components/representations/`. La source de vérité du lien date↔tournée reste `Project.linkedTourDates` (via `useProjectsData`) ; aucune modification du schéma `TourDate`. Un hook `useRepresentationsView` calcule filtres, regroupement et stats.

**Tech Stack:** Next.js 16 (App Router), React, TypeScript, Tailwind, Radix UI, Lucide, SWR (via hooks Supabase existants), localStorage (logistique existante).

**Conventions de ce repo (importantes) :**
- **Pas de suite de tests** configurée. Chaque tâche se vérifie par `npx tsc --noEmit` + `npm run lint`, puis vérification manuelle en dev (`npm run dev`).
- **Pas de commit automatique.** Les étapes « Commit » sont des points de contrôle **optionnels** : ne committer que si l'utilisateur le demande explicitement. Sinon, passer à la tâche suivante.
- Design **dark-only**. Réutiliser les primitives `src/components/ui/`. Icônes Lucide uniquement.

**Référence de design :** [docs/superpowers/specs/2026-07-08-representations-refonte-tournees-design.md](../specs/2026-07-08-representations-refonte-tournees-design.md)

---

## File Structure

```
src/modules/live/
  data/
    statusMeta.ts                 (NOUVEAU) STATUS_META, PIPELINE_ORDER, couleurs statut — partagé
  components/
    LiveOverviewPage.tsx          (MODIFIÉ) importe statusMeta au lieu du local
    TourDatesPage.tsx             (SUPPRIMÉ en fin de refonte, remplacé par representations/)
    representations/
      types.ts                    (NOUVEAU) TransportEntry, LodgingEntry, DocumentEntry, ViewMode, DateFilter, TourGroupVM
      dateHelpers.ts              (NOUVEAU) parseFrDate, isRepresentationPast, formatDateShort, relativeLabel, toIsoFromFr
      useRepresentationsView.ts   (NOUVEAU) hook : filtre + regroupement tournée + stats + index date→tournée
      tourLinks.ts                (NOUVEAU) helpers d'écriture du lien via setProjects (link/unlink/quickCreate)
      RepresentationTimetable.tsx (NOUVEAU) timetable « lignes horaires épurées »
      TourSelect.tsx              (NOUVEAU) sélecteur tournée + création rapide
      RepresentationRow.tsx       (NOUVEAU) ligne dépliable (accordéon)
      TourGroup.tsx               (NOUVEAU) bloc tournée (en-tête + lignes)
      RepresentationsHeader.tsx   (NOUVEAU) titre + stats + filtre + toggle
      RepresentationDialogs.tsx   (NOUVEAU) tous les dialogs déplacés depuis TourDatesPage
      RepresentationsPage.tsx     (NOUVEAU) orchestrateur (remplace TourDatesPage)
app/(app)/live/representations/page.tsx  (MODIFIÉ) importe RepresentationsPage
```

---

## Task 1: Module partagé `statusMeta.ts`

Extrait la table statut→couleur/badge aujourd'hui locale à `LiveOverviewPage` pour que les deux pages la partagent.

**Files:**
- Create: `src/modules/live/data/statusMeta.ts`
- Modify: `src/modules/live/components/LiveOverviewPage.tsx:79-93`

- [ ] **Step 1: Créer le module partagé**

Create `src/modules/live/data/statusMeta.ts` :

```ts
import type { BadgeVariant } from "@/components/ui/badge";
import type { TourStatus } from "@/modules/live/data/defaultRepresentations";

/** Ordre du tunnel de conversion : option → confirmée → signée → finalisée. */
export const PIPELINE_ORDER: TourStatus[] = ["En option", "Confirmée", "Signée", "Finalisée"];

export const STATUS_META: Record<TourStatus, { color: string; badge: BadgeVariant }> = {
  "En option": { color: "#FB923C", badge: "pending" },
  Confirmée: { color: "#38BDF8", badge: "mixed" },
  Signée: { color: "#34D399", badge: "published" },
  Finalisée: { color: "#A78BFA", badge: "mastered" },
  Passée: { color: "rgba(245,245,245,0.3)", badge: "secondary" },
};

export const CONCERT_COLOR = "#F0FF00";
export const REHEARSAL_COLOR = "#38BDF8";
```

- [ ] **Step 2: Faire consommer le module à LiveOverviewPage**

Dans `src/modules/live/components/LiveOverviewPage.tsx`, supprimer les définitions locales `PIPELINE_ORDER`, `STATUS_META`, `CONCERT_COLOR`, `REHEARSAL_COLOR` (lignes ~79-93) et ajouter en haut :

```ts
import { STATUS_META, PIPELINE_ORDER, CONCERT_COLOR, REHEARSAL_COLOR } from "@/modules/live/data/statusMeta";
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur. La vue d'ensemble Live inchangée visuellement (`npm run dev` → `/live`).

- [ ] **Step 4: Commit (optionnel, sur demande)**

```bash
git add src/modules/live/data/statusMeta.ts src/modules/live/components/LiveOverviewPage.tsx
git commit -m "refactor(live): extract shared statusMeta"
```

---

## Task 2: Types et helpers de date

**Files:**
- Create: `src/modules/live/components/representations/types.ts`
- Create: `src/modules/live/components/representations/dateHelpers.ts`

- [ ] **Step 1: Créer `types.ts`**

Create `src/modules/live/components/representations/types.ts` :

```ts
import type { Project } from "@/lib/sidekick-store";
import type { TourDate, TourStatus } from "@/modules/live/data/defaultRepresentations";

export type TransportType = "train" | "plane" | "car" | "other";
export type TransportEntry = {
  id: number;
  type: TransportType;
  amount: string;
  paymentMode: "self" | "reimburse" | "covered";
  details: string;
};

export type LodgingType = "hotel" | "airbnb" | "friend" | "other";
export type LodgingEntry = {
  id: number;
  type: LodgingType;
  nights: string;
  amount: string;
  details: string;
  paymentMode: "self" | "reimburse" | "covered";
};

export type DocumentType = "contract" | "tech" | "other";
export type DocumentEntry = { id: number; type: DocumentType; note: string };

export type ViewMode = "chrono" | "tour";
export type DateFilter = "upcoming" | "past" | "all";

/** Une tournée = un projet live, avec ses dates rattachées (déjà filtrées). */
export type TourGroupVM = {
  project: Project | null; // null = bloc « Hors tournée »
  dates: TourDate[];
  status: TourStatus[]; // statuts présents (pour la mini-barre)
};
```

- [ ] **Step 2: Créer `dateHelpers.ts`**

Regroupe les helpers dupliqués. `isoToFr`/`frToIso` existent déjà dans `src/lib/date-format.ts` → les réutiliser ; on ajoute seulement ce qui manque.

Create `src/modules/live/components/representations/dateHelpers.ts` :

```ts
export function parseFrDate(frDate: string): Date | null {
  if (!frDate) return null;
  const parts = frDate.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  return isNaN(date.getTime()) ? null : date;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isRepresentationPast(dateStr: string): boolean {
  const d = parseFrDate(dateStr);
  if (!d) return false;
  d.setHours(0, 0, 0, 0);
  return d.getTime() < startOfToday().getTime();
}

export function dateSortValue(dateStr: string): number {
  return parseFrDate(dateStr)?.getTime() ?? 0;
}

export function formatDateShort(dateStr: string): string {
  const d = parseFrDate(dateStr);
  if (!d) return dateStr;
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function relativeLabel(dateStr: string): string {
  const d = parseFrDate(dateStr);
  if (!d) return dateStr;
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - startOfToday().getTime()) / 86_400_000);
  if (diff === 0) return "aujourd’hui";
  if (diff === 1) return "demain";
  if (diff === -1) return "hier";
  if (diff < 0) return `il y a ${-diff} j`;
  if (diff < 7) return `dans ${diff} j`;
  if (diff < 14) return "dans 1 sem.";
  if (diff < 60) return `dans ${Math.round(diff / 7)} sem.`;
  return `dans ${Math.round(diff / 30)} mois`;
}

/** "15/02/2025" → "2025-02-15" pour DatePicker/factures. */
export function toIsoFromFr(frDate: string): string {
  const parts = (frDate || "").split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur (modules non encore importés — juste compilables).

---

## Task 3: Helpers d'écriture du lien tournée (`tourLinks.ts`)

Centralise les écritures sur `Project.linkedTourDates`. Rappel : `TourDate.id` est un `number`, `linkedTourDates` des `string` → comparer via `String(id)`. Invariant : une date = une seule tournée.

**Files:**
- Create: `src/modules/live/components/representations/tourLinks.ts`

- [ ] **Step 1: Créer le module**

Create `src/modules/live/components/representations/tourLinks.ts` :

```ts
import type { Project } from "@/lib/sidekick-store";

type SetProjects = (fn: (prev: Project[]) => Project[]) => void;

/** Rattache la date `dateId` au projet `projectId`, en la retirant de tout autre projet. */
export function linkDateToTour(setProjects: SetProjects, dateId: number, projectId: string) {
  const key = String(dateId);
  setProjects((prev) =>
    prev.map((p) => {
      const has = p.linkedTourDates.includes(key);
      if (p.id === projectId) {
        return has ? p : { ...p, linkedTourDates: [...p.linkedTourDates, key], updatedAt: new Date().toISOString() };
      }
      return has
        ? { ...p, linkedTourDates: p.linkedTourDates.filter((k) => k !== key), updatedAt: new Date().toISOString() }
        : p;
    })
  );
}

/** Retire la date de toutes les tournées (→ « Hors tournée »). */
export function unlinkDateFromTours(setProjects: SetProjects, dateId: number) {
  const key = String(dateId);
  setProjects((prev) =>
    prev.map((p) =>
      p.linkedTourDates.includes(key)
        ? { ...p, linkedTourDates: p.linkedTourDates.filter((k) => k !== key), updatedAt: new Date().toISOString() }
        : p
    )
  );
}

/** Crée un projet live minimal contenant la date, et renvoie son id. */
export function quickCreateTour(setProjects: SetProjects, dateId: number, title: string): string {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const key = String(dateId);
  const project: Project = {
    id,
    title: title.trim() || "Nouvelle tournée",
    description: "",
    status: "in_progress",
    cover: "",
    images: [],
    sectors: ["live"],
    members: [],
    linkedAlbums: [],
    linkedTracks: [],
    linkedSessions: [],
    linkedWorks: [],
    linkedTourDates: [key],
    linkedRehearsals: [],
    linkedStatutIds: [],
    keyDates: [],
    createdAt: now,
    updatedAt: now,
    notes: "",
    brainstorm: "",
    creationSeededSectors: [],
  };
  // Retire d'abord la date d'éventuelles autres tournées, puis ajoute le nouveau projet.
  setProjects((prev) => [
    ...prev.map((p) =>
      p.linkedTourDates.includes(key)
        ? { ...p, linkedTourDates: p.linkedTourDates.filter((k) => k !== key) }
        : p
    ),
    project,
  ]);
  return id;
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur. (Vérifie que `Project` a bien tous ces champs ; sinon aligner sur `src/lib/sidekick-store.ts:271`.)

---

## Task 4: Hook `useRepresentationsView`

Calcule, à partir des dates + projets + filtre + mode, tout ce dont l'UI a besoin.

**Files:**
- Create: `src/modules/live/components/representations/useRepresentationsView.ts`

- [ ] **Step 1: Créer le hook**

Create `src/modules/live/components/representations/useRepresentationsView.ts` :

```ts
import { useMemo } from "react";
import type { Project } from "@/lib/sidekick-store";
import type { TourDate, TourStatus } from "@/modules/live/data/defaultRepresentations";
import { PIPELINE_ORDER } from "@/modules/live/data/statusMeta";
import { dateSortValue, isRepresentationPast } from "./dateHelpers";
import type { DateFilter, TourGroupVM } from "./types";

function normalizeText(v: string | undefined | null): string {
  return (v || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function useRepresentationsView(
  dates: TourDate[],
  projects: Project[],
  filter: DateFilter
) {
  // Index date.id (string) → projet
  const dateToProject = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projects) {
      for (const key of p.linkedTourDates) {
        if (!map.has(key)) map.set(key, p);
      }
    }
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    const arr = dates.filter((d) => {
      const past = isRepresentationPast(d.date);
      if (filter === "upcoming") return !past;
      if (filter === "past") return past;
      return true;
    });
    // À venir : ordre chronologique croissant ; passées : décroissant.
    return arr.sort((a, b) =>
      filter === "past"
        ? dateSortValue(b.date) - dateSortValue(a.date)
        : dateSortValue(a.date) - dateSortValue(b.date)
    );
  }, [dates, filter]);

  const stats = useMemo(() => {
    const segments = PIPELINE_ORDER.map((status) => ({
      status,
      count: filtered.filter((d) => d.status === status).length,
    })).filter((s) => s.count > 0);
    const cities = new Set(filtered.map((d) => normalizeText(d.city)).filter(Boolean)).size;
    return { total: filtered.length, segments, cities };
  }, [filtered]);

  const groups = useMemo<TourGroupVM[]>(() => {
    const byProject = new Map<string, TourDate[]>();
    const orphans: TourDate[] = [];
    for (const d of filtered) {
      const proj = dateToProject.get(String(d.id));
      if (proj) {
        const list = byProject.get(proj.id) ?? [];
        list.push(d);
        byProject.set(proj.id, list);
      } else {
        orphans.push(d);
      }
    }
    const projectGroups: TourGroupVM[] = [];
    for (const [projectId, groupDates] of byProject) {
      const project = projects.find((p) => p.id === projectId) ?? null;
      const status = Array.from(new Set(groupDates.map((d) => d.status))) as TourStatus[];
      projectGroups.push({ project, dates: groupDates, status });
    }
    // Trie les tournées par date la plus proche.
    projectGroups.sort(
      (a, b) => dateSortValue(a.dates[0]?.date ?? "") - dateSortValue(b.dates[0]?.date ?? "")
    );
    if (orphans.length > 0) {
      projectGroups.push({ project: null, dates: orphans, status: [] });
    }
    return projectGroups;
  }, [filtered, dateToProject, projects]);

  return { filtered, groups, stats, dateToProject };
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

---

## Task 5: Composant `RepresentationTimetable`

Nouveau design « lignes horaires épurées » (option B validée). Remplace l'affichage puces mono.

**Files:**
- Create: `src/modules/live/components/representations/RepresentationTimetable.tsx`

- [ ] **Step 1: Créer le composant**

Create `src/modules/live/components/representations/RepresentationTimetable.tsx` :

```tsx
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  normalizeTimetableStructure,
  type TimetableItem,
} from "@/modules/live/data/defaultRepresentations";

export function RepresentationTimetable({
  items,
  onManage,
}: {
  items: TimetableItem[];
  onManage: () => void;
}) {
  const slots = normalizeTimetableStructure(items);
  const lastIndex = slots.length - 1;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#F5F5F5]/45">
          Timetable
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px]"
          onClick={onManage}
        >
          <Clock className="mr-1 h-3 w-3" />
          Gérer
        </Button>
      </div>
      <div className="rounded-lg border border-[rgba(245,245,245,0.06)] bg-[rgba(16,16,16,0.4)] px-3">
        {slots.map((slot, i) => {
          const isEdge = i === 0 || i === lastIndex;
          return (
            <div
              key={`slot-${i}`}
              className="flex items-center gap-3 border-b border-[rgba(245,245,245,0.06)] py-2 last:border-none"
            >
              <span
                className={`min-w-[48px] text-sm font-semibold tabular-nums ${
                  isEdge ? "text-[#F0FF00]" : "text-[#F5F5F5]/85"
                }`}
              >
                {slot.time || "—"}
              </span>
              <span className="flex-1 text-xs text-[#F5F5F5]/70">{slot.activity}</span>
              {isEdge && (
                <span className="rounded-md bg-[rgba(240,255,0,0.12)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[#F0FF00]">
                  {i === 0 ? "Début" : "Fin"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

---

## Task 6: Composant `TourSelect` (sélecteur + création rapide)

**Files:**
- Create: `src/modules/live/components/representations/TourSelect.tsx`

- [ ] **Step 1: Créer le composant**

Rattache une date à une tournée. Liste les projets live existants, « Hors tournée », et un champ de création rapide. S'appuie sur les helpers de `tourLinks.ts`.

Create `src/modules/live/components/representations/TourSelect.tsx` :

```tsx
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project } from "@/lib/sidekick-store";
import { linkDateToTour, unlinkDateFromTours, quickCreateTour } from "./tourLinks";

export function TourSelect({
  dateId,
  currentProjectId,
  projects,
  setProjects,
}: {
  dateId: number;
  currentProjectId: string | null;
  projects: Project[];
  setProjects: (fn: (prev: Project[]) => Project[]) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const liveProjects = projects.filter((p) => p.sectors.includes("live"));

  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#F5F5F5]/45">
        Tournée
      </p>
      {creating ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de la tournée"
            className="h-9 text-xs"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (!name.trim()) return;
              quickCreateTour(setProjects, dateId, name);
              setName("");
              setCreating(false);
            }}
          >
            Créer
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
            Annuler
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={currentProjectId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) unlinkDateFromTours(setProjects, dateId);
              else linkDateToTour(setProjects, dateId, val);
            }}
          >
            <option value="">Hors tournée</option>
            {liveProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || "Projet sans titre"}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="outline" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Nouvelle
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

---

## Task 7: Composant `RepresentationRow` (ligne dépliable)

Ligne compacte + accordéon. Réutilise `RepresentationTimetable`, `TourSelect`, et le composant `Tag` (déplacé ici depuis TourDatesPage). Les callbacks logistique (transport/logement/rémunération/matériel/documents/édition/suppression) sont passés en props et branchés par l'orchestrateur (Task 10).

**Files:**
- Create: `src/modules/live/components/representations/RepresentationRow.tsx`

- [ ] **Step 1: Déplacer `Tag` dans un fichier partagé**

Create `src/modules/live/components/representations/Tag.tsx` en copiant **verbatim** la fonction `Tag` et le type `TagProps` depuis `TourDatesPage.tsx:2440-2463` (les deux branches active/inactive incluses), et exporter `Tag` :

```tsx
// En-tête du fichier
type TagProps = { label: string; active?: boolean; count?: number };

export function Tag({ label, active, count }: TagProps) {
  // ... corps identique à TourDatesPage.tsx:2446-2463
}
```

- [ ] **Step 2: Créer `RepresentationRow.tsx`**

Create `src/modules/live/components/representations/RepresentationRow.tsx` :

```tsx
import { useState } from "react";
import { ChevronRight, MapPin, Trash2, FilePlus2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/sidekick-store";
import type { TourDate, TimetableItem } from "@/modules/live/data/defaultRepresentations";
import { STATUS_META } from "@/modules/live/data/statusMeta";
import { formatDateShort, relativeLabel } from "./dateHelpers";
import { RepresentationTimetable } from "./RepresentationTimetable";
import { TourSelect } from "./TourSelect";
import { Tag } from "./Tag";

export type RepresentationRowCallbacks = {
  onOpenTransport: (id: number) => void;
  onOpenLodging: (id: number) => void;
  onOpenRemuneration: (id: number) => void;
  onOpenEquipment: (id: number) => void;
  onOpenDocuments: (id: number) => void;
  onManageTimetable: (id: number) => void;
  onEdit: (date: TourDate) => void;
  onDelete: (id: number) => void;
};

export function RepresentationRow({
  date,
  project,
  showTourBadge,
  timetable,
  transportCount,
  lodgingCount,
  remunerationCount,
  hasEquipment,
  projects,
  setProjects,
  callbacks,
}: {
  date: TourDate;
  project: Project | null;
  showTourBadge: boolean;
  timetable: TimetableItem[];
  transportCount: number;
  lodgingCount: number;
  remunerationCount: number;
  hasEquipment: boolean;
  projects: Project[];
  setProjects: (fn: (prev: Project[]) => Project[]) => void;
  callbacks: RepresentationRowCallbacks;
}) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[date.status];
  const title = [date.venue, date.organisateur].filter(Boolean).join(" – ") || date.city || "Représentation";

  return (
    <div className="overflow-hidden rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgba(44,44,46,0.8)]"
      >
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}66` }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#F5F5F5]">{title}</p>
          {date.city && <p className="truncate text-xs text-[#F5F5F5]/50">{date.city}</p>}
        </div>
        {showTourBadge && (
          <span
            className="shrink-0 rounded-full border px-2 py-0.5 text-[10px]"
            style={
              project
                ? { borderColor: "#A78BFA", color: "#A78BFA" }
                : { borderColor: "rgba(245,245,245,0.2)", color: "rgba(245,245,245,0.5)" }
            }
          >
            {project ? project.title || "Tournée" : "Hors tournée"}
          </span>
        )}
        <div className="shrink-0 text-right">
          <p className="text-sm tabular-nums text-[#F5F5F5]/80">{formatDateShort(date.date)}</p>
          <p className="text-[11px] text-[#F5F5F5]/40">{relativeLabel(date.date)}</p>
        </div>
        <ChevronRight
          size={16}
          className={`shrink-0 text-[#F5F5F5]/40 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-[rgba(245,245,245,0.08)] px-4 py-4">
          <RepresentationTimetable items={timetable} onManage={() => callbacks.onManageTimetable(date.id)} />

          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[#F5F5F5]/45">
              Logistique
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => callbacks.onOpenTransport(date.id)}>
                <Tag label="Transport" active={transportCount > 0} count={transportCount} />
              </button>
              <button type="button" onClick={() => callbacks.onOpenLodging(date.id)}>
                <Tag label="Logement" active={lodgingCount > 0} count={lodgingCount} />
              </button>
              <button type="button" onClick={() => callbacks.onOpenRemuneration(date.id)}>
                <Tag
                  label="Rémunération"
                  active={remunerationCount > 0}
                  count={remunerationCount > 0 ? remunerationCount : undefined}
                />
              </button>
              <button type="button" onClick={() => callbacks.onOpenEquipment(date.id)}>
                <Tag label="Matériel" active={hasEquipment} />
              </button>
            </div>
          </div>

          <TourSelect
            dateId={date.id}
            currentProjectId={project?.id ?? null}
            projects={projects}
            setProjects={setProjects}
          />

          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#F5F5F5]/45">
              Adresse
            </p>
            {date.address ? (
              <p className="flex items-center gap-1 text-xs text-[#F5F5F5]/70">
                <span className="truncate">{date.address}</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(date.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F5F5F5]/50 hover:text-[#F5F5F5]"
                  title="Voir sur Google Maps"
                >
                  <MapPin className="h-3.5 w-3.5" />
                </a>
              </p>
            ) : (
              <p className="text-xs text-[#F5F5F5]/40">—</p>
            )}
          </div>

          {date.note && (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#F5F5F5]/45">
                Note
              </p>
              <p className="text-xs text-[#F5F5F5]/70">{date.note}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-[#F5F5F5]/60"
              onClick={() => callbacks.onOpenDocuments(date.id)}
            >
              <FilePlus2 className="mr-1 h-4 w-4" />
              Documents
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => callbacks.onEdit(date)}>
                Modifier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => callbacks.onDelete(date.id)}
              >
                <Trash2 className="h-3 w-3" />
                <span className="sr-only">Supprimer</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

---

## Task 8: Composant `TourGroup`

Bloc d'une tournée (ou « Hors tournée ») : en-tête + lignes. Reçoit une fonction `renderRow` pour ne pas dupliquer le câblage des props de `RepresentationRow`.

**Files:**
- Create: `src/modules/live/components/representations/TourGroup.tsx`

- [ ] **Step 1: Créer le composant**

Create `src/modules/live/components/representations/TourGroup.tsx` :

```tsx
import type { ReactNode } from "react";
import type { TourGroupVM } from "./types";
import { STATUS_META } from "@/modules/live/data/statusMeta";
import { formatDateShort } from "./dateHelpers";

export function TourGroup({
  group,
  renderRow,
}: {
  group: TourGroupVM;
  renderRow: (dateId: number) => ReactNode;
}) {
  const { project, dates, status } = group;
  const first = dates[0]?.date;
  const last = dates[dates.length - 1]?.date;
  const period = first && last && first !== last ? `${formatDateShort(first)} → ${formatDateShort(last)}` : first ? formatDateShort(first) : "";

  return (
    <div className="overflow-hidden rounded-xl border border-[rgba(245,245,245,0.08)]">
      <div className="flex items-center justify-between bg-[rgba(44,44,46,0.7)] px-4 py-3">
        <div className="min-w-0">
          <h3
            className="truncate text-sm font-semibold"
            style={{ color: project ? "#A78BFA" : "rgba(245,245,245,0.6)" }}
          >
            {project ? project.title || "Tournée" : "Hors tournée"}
          </h3>
          <p className="text-xs text-[#F5F5F5]/45">
            {period && `${period} · `}
            {dates.length} date{dates.length > 1 ? "s" : ""}
          </p>
        </div>
        {status.length > 0 && (
          <div className="flex h-1.5 w-24 gap-0.5 overflow-hidden rounded-full">
            {status.map((s) => (
              <span key={s} className="h-full flex-1" style={{ background: STATUS_META[s].color }} />
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2 p-2">{dates.map((d) => renderRow(d.id))}</div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

---

## Task 9: Composant `RepresentationsHeader`

**Files:**
- Create: `src/modules/live/components/representations/RepresentationsHeader.tsx`

- [ ] **Step 1: Créer le composant**

Create `src/modules/live/components/representations/RepresentationsHeader.tsx` :

```tsx
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUS_META } from "@/modules/live/data/statusMeta";
import type { TourStatus } from "@/modules/live/data/defaultRepresentations";
import type { DateFilter, ViewMode } from "./types";

const FILTERS: { key: DateFilter; label: string }[] = [
  { key: "upcoming", label: "À venir" },
  { key: "past", label: "Passées" },
  { key: "all", label: "Toutes" },
];

export function RepresentationsHeader({
  stats,
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  onAdd,
}: {
  stats: { total: number; segments: { status: TourStatus; count: number }[]; cities: number };
  filter: DateFilter;
  onFilterChange: (f: DateFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-[#F5F5F5]">Représentations</h1>
          <p className="text-sm text-[#F5F5F5]/60">Tes dates, regroupées par tournée ou par ordre chronologique.</p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une représentation
        </Button>
      </div>

      <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-medium text-[#F5F5F5]">Vue d’ensemble</h2>
            <p className="text-xs text-[#F5F5F5]/45">Répartition par statut</p>
          </div>
          <div className="text-right leading-tight">
            <span className="block text-[28px] font-extralight leading-none tabular-nums text-[#F5F5F5]">
              {stats.total}
            </span>
            <span className="text-[11px] text-[#F5F5F5]/45">
              {stats.total > 1 ? "dates" : "date"} · {stats.cities} {stats.cities > 1 ? "villes" : "ville"}
            </span>
          </div>
        </div>
        {stats.segments.length > 0 ? (
          <>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {stats.segments.map((s) => (
                <div
                  key={s.status}
                  className="h-full rounded-full"
                  style={{ flexGrow: s.count, minWidth: 14, background: STATUS_META[s.status].color }}
                  title={`${s.status} : ${s.count}`}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {stats.segments.map((s) => (
                <span key={s.status} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_META[s.status].color }} />
                  <span className="text-sm tabular-nums text-[#F5F5F5]">{s.count}</span>
                  <span className="text-sm text-[#F5F5F5]/55">{s.status}</span>
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-[#F5F5F5]/45">Aucune date pour ce filtre.</p>
        )}
      </section>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                filter === f.key
                  ? "border-[#F0FF00] bg-[#F0FF00] font-semibold text-[#101010]"
                  : "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/60 hover:text-[#F5F5F5]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(["chrono", "tour"] as ViewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onViewModeChange(m)}
              className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                viewMode === m
                  ? "border-[#F0FF00] bg-[#F0FF00] font-semibold text-[#101010]"
                  : "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/60 hover:text-[#F5F5F5]"
              }`}
            >
              {m === "chrono" ? "Chronologique" : "Par tournée"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

---

## Task 10: `RepresentationDialogs` — déplacer les dialogs existants

Déplace **verbatim** tous les dialogs et leur état/handlers depuis `TourDatesPage.tsx` vers un composant dédié, pour alléger l'orchestrateur. Ce composant possède l'état des dialogs et la logistique localStorage ; il expose des ouvreurs via `ref` ou via props d'état remontées. **Approche retenue : état des dialogs porté par l'orchestrateur** (Task 11), et `RepresentationDialogs` reçoit cet état + les données (dates, invoices, missions, equipment) en props. Cela évite un `ref` impératif.

**Files:**
- Create: `src/modules/live/components/representations/RepresentationDialogs.tsx`
- Source (à déplacer): `TourDatesPage.tsx` — dialog édition (1181-1340), dialog ajout (1343-1465), dialog options transport/lodging/remuneration/equipment (1468-2144), dialog timetable (2147-2294), Invoice/Mission dialogs (2296-2313), dialog documents (2316-2435), helpers `TransportTypeIcon`/`labelFor*` (2485-2542).

- [ ] **Step 1: Définir l'interface de props**

En tête de `RepresentationDialogs.tsx` :

```tsx
import type { TourDate, TourStatus, TimetableItem } from "@/modules/live/data/defaultRepresentations";
import type { Invoice, IntermittenceMission } from "@/hooks/useIncomesData";
import type { TransportEntry, LodgingEntry, DocumentEntry } from "./types";

export type OptionsDialogState = {
  dateId: number | null;
  type: "transport" | "lodging" | "remuneration" | "equipment" | null;
};

export type RepresentationDialogsProps = {
  dates: TourDate[];
  setDates: (fn: (prev: TourDate[]) => TourDate[]) => void;
  // Édition
  editingId: number | null;
  setEditingId: (id: number | null) => void;
  // Ajout
  isAddOpen: boolean;
  setIsAddOpen: (v: boolean) => void;
  // Options logistique
  optionsDialog: OptionsDialogState;
  setOptionsDialog: (s: OptionsDialogState) => void;
  transportsByDate: Record<number, TransportEntry[]>;
  setTransportsByDate: (fn: (prev: Record<number, TransportEntry[]>) => Record<number, TransportEntry[]>) => void;
  lodgingsByDate: Record<number, LodgingEntry[]>;
  setLodgingsByDate: (fn: (prev: Record<number, LodgingEntry[]>) => Record<number, LodgingEntry[]>) => void;
  documentsByDate: Record<number, DocumentEntry[]>;
  setDocumentsByDate: (fn: (prev: Record<number, DocumentEntry[]>) => Record<number, DocumentEntry[]>) => void;
  timetablesByDate: Record<number, TimetableItem[]>;
  setTimetablesByDate: (fn: (prev: Record<number, TimetableItem[]>) => Record<number, TimetableItem[]>) => void;
  selectedListIdByDate: Record<number, string>;
  setSelectedListIdByDate: (fn: (prev: Record<number, string>) => Record<number, string>) => void;
  // Timetable dialog
  timetableDialogDateId: number | null;
  setTimetableDialogDateId: (id: number | null) => void;
  // Documents dialog
  documentDialogDateId: number | null;
  setDocumentDialogDateId: (id: number | null) => void;
  // Rémunération
  invoices: Invoice[];
  setInvoices: (fn: (prev: Invoice[]) => Invoice[]) => void;
  missions: IntermittenceMission[];
  setMissions: (fn: (prev: IntermittenceMission[]) => IntermittenceMission[]) => void;
  equipmentInventory: ReturnType<typeof useEquipmentInventory>; // voir note
  equipmentLists: { id: string | number; name: string; itemIds: (string | number)[] }[];
};
```

> **Note de déplacement :** copier les types `equipmentInventory`/`equipmentLists` tels qu'ils sont typés dans `useLiveData` (les remplacer par les vrais types exportés ; ne pas inventer `useEquipmentInventory`). Reprendre les définitions exactes depuis le retour de `useLiveData` dans `TourDatesPage.tsx:203`.

- [ ] **Step 2: Déplacer le corps des dialogs**

Copier dans `RepresentationDialogs.tsx` :
1. Les 4 sous-états de formulaire locaux aux dialogs (`transportForm`, `lodgingForm`, `documentForm`, `timetableDraft`, `editing*` champs) — **ces états peuvent rester internes** au composant `RepresentationDialogs` (ils ne concernent que l'édition en cours).
2. Tous les handlers : `handleAddTransport`, `handleDeleteTransport`, `handleAddLodging`, `handleDeleteLodging`, `handleAddDocument`, `handleDeleteDocument`, `handleExportExpensesPdf`, `getNextInvoiceNumber`, `handleSaveInvoice`, `handleSaveMission`, `handleUnlinkInvoice`, `handleUnlinkMission`, `saveNewRepresentation`, `openAddDialog`-logic — **verbatim** depuis `TourDatesPage.tsx:288-646`.
3. Le JSX des 6 dialogs (édition, ajout, options, timetable, invoice/mission, documents) — **verbatim** depuis les lignes citées ci-dessus, en remplaçant les références directes à l'état par les props.
4. Les helpers `TransportTypeIcon`, `labelForTransportType`, `labelForPaymentMode`, `labelForLodgingType` — **verbatim** depuis `TourDatesPage.tsx:2485-2542`.
5. `getRepresentationTitle` (défini à `TourDatesPage.tsx:244`) — copier.

Le composant rend un fragment `<>…</>` contenant tous les `<Dialog>`.

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur. (Beaucoup d'ajustements de références état→props ; corriger jusqu'au vert.)

---

## Task 11: Orchestrateur `RepresentationsPage`

Assemble tout : hooks de données, état des dialogs, hook de vue, header, listes (chrono/tournée), et `RepresentationDialogs`.

**Files:**
- Create: `src/modules/live/components/representations/RepresentationsPage.tsx`

- [ ] **Step 1: Créer l'orchestrateur**

Create `src/modules/live/components/representations/RepresentationsPage.tsx` :

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { mutate } from "swr";
import { usePostHog } from "posthog-js/react";
import { MapPin } from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLiveData } from "@/hooks/useLiveData";
import { useIncomesData } from "@/hooks/useIncomesData";
import { useProjectsData } from "@/hooks/useProjectsData";
import { normalizeTimetableStructure, type TourDate } from "@/modules/live/data/defaultRepresentations";
import { useRepresentationsView } from "./useRepresentationsView";
import { RepresentationsHeader } from "./RepresentationsHeader";
import { RepresentationRow, type RepresentationRowCallbacks } from "./RepresentationRow";
import { TourGroup } from "./TourGroup";
import { RepresentationDialogs, type OptionsDialogState } from "./RepresentationDialogs";
import type { DateFilter, ViewMode, TransportEntry, LodgingEntry, DocumentEntry } from "./types";

export function RepresentationsPage() {
  const posthog = usePostHog();
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);

  const { tourDates: dates, setTourDates: setDates, equipmentInventory, equipmentLists, loading: liveLoading, error: liveError } = useLiveData();
  const { projects, setProjects, loading: projLoading } = useProjectsData();
  const { invoices, setInvoices, missions, setMissions } = useIncomesData();

  const [filter, setFilter] = useState<DateFilter>("upcoming");
  const [viewMode, setViewMode] = useState<ViewMode>("chrono");

  // État des dialogs (porté ici, consommé par RepresentationDialogs)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [optionsDialog, setOptionsDialog] = useState<OptionsDialogState>({ dateId: null, type: null });
  const [timetableDialogDateId, setTimetableDialogDateId] = useState<number | null>(null);
  const [documentDialogDateId, setDocumentDialogDateId] = useState<number | null>(null);

  // Logistique persistée (localStorage) — clés identiques à l'ancienne page
  const [transportsByDate, setTransportsByDate] = useLocalStorage<Record<number, TransportEntry[]>>("live:tour-dates:transports", {});
  const [lodgingsByDate, setLodgingsByDate] = useLocalStorage<Record<number, LodgingEntry[]>>("live:tour-dates:lodgings", {});
  const [timetablesByDate, setTimetablesByDate] = useLocalStorage<Record<number, ReturnType<typeof normalizeTimetableStructure>>>("live:tour-dates:timetables", {});
  const [documentsByDate, setDocumentsByDate] = useLocalStorage<Record<number, DocumentEntry[]>>("live:tour-dates:documents", {});
  const [selectedListIdByDate, setSelectedListIdByDate] = useLocalStorage<Record<number, string>>("live:representations-material-by-date", {});

  const { filtered, groups, stats, dateToProject } = useRepresentationsView(dates, projects, filter);

  const handleDelete = (id: number) => {
    posthog?.capture("tour_date_deleted", { module: "live" });
    setDates((prev) => prev.filter((d) => d.id !== id));
    setTransportsByDate((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setTimetablesByDate((prev) => { const n = { ...prev }; delete n[id]; return n; });
    if (editingId === id) setEditingId(null);
  };

  const callbacks: RepresentationRowCallbacks = useMemo(
    () => ({
      onOpenTransport: (id) => setOptionsDialog({ dateId: id, type: "transport" }),
      onOpenLodging: (id) => setOptionsDialog({ dateId: id, type: "lodging" }),
      onOpenRemuneration: (id) => setOptionsDialog({ dateId: id, type: "remuneration" }),
      onOpenEquipment: (id) => setOptionsDialog({ dateId: id, type: "equipment" }),
      onOpenDocuments: (id) => setDocumentDialogDateId(id),
      onManageTimetable: (id) => setTimetableDialogDateId(id),
      onEdit: (date: TourDate) => setEditingId(date.id),
      onDelete: handleDelete,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingId]
  );

  const renderRow = (dateId: number, showTourBadge: boolean) => {
    const date = dates.find((d) => d.id === dateId);
    if (!date) return null;
    const project = dateToProject.get(String(date.id)) ?? null;
    return (
      <RepresentationRow
        key={date.id}
        date={date}
        project={project}
        showTourBadge={showTourBadge}
        timetable={isHydrated ? (timetablesByDate[date.id] ?? date.timetable) : date.timetable}
        transportCount={isHydrated ? transportsByDate[date.id]?.length ?? 0 : 0}
        lodgingCount={isHydrated ? lodgingsByDate[date.id]?.length ?? 0 : 0}
        remunerationCount={(date.invoiceIds?.length ?? 0) + (date.missionIds?.length ?? 0)}
        hasEquipment={!!selectedListIdByDate[date.id]}
        projects={projects}
        setProjects={setProjects}
        callbacks={callbacks}
      />
    );
  };

  if (!isHydrated || liveLoading || projLoading) return <PageLoader />;
  if (liveError)
    return (
      <PageError
        title="Impossible de charger tes représentations"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
        onRetry={() => mutate("user_live")}
      />
    );

  return (
    <div className="space-y-6">
      <RepresentationsHeader
        stats={stats}
        filter={filter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={() => setIsAddOpen(true)}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Aucune date pour ce filtre"
          description="Ajoute une représentation ou change de filtre."
          action={{ label: "Ajouter une date", onClick: () => setIsAddOpen(true) }}
        />
      ) : viewMode === "chrono" ? (
        <div className="space-y-2">{filtered.map((d) => renderRow(d.id, true))}</div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <TourGroup
              key={g.project?.id ?? "orphans"}
              group={g}
              renderRow={(dateId) => renderRow(dateId, false)}
            />
          ))}
        </div>
      )}

      <RepresentationDialogs
        dates={dates}
        setDates={setDates}
        editingId={editingId}
        setEditingId={setEditingId}
        isAddOpen={isAddOpen}
        setIsAddOpen={setIsAddOpen}
        optionsDialog={optionsDialog}
        setOptionsDialog={setOptionsDialog}
        transportsByDate={transportsByDate}
        setTransportsByDate={setTransportsByDate}
        lodgingsByDate={lodgingsByDate}
        setLodgingsByDate={setLodgingsByDate}
        documentsByDate={documentsByDate}
        setDocumentsByDate={setDocumentsByDate}
        timetablesByDate={timetablesByDate}
        setTimetablesByDate={setTimetablesByDate}
        selectedListIdByDate={selectedListIdByDate}
        setSelectedListIdByDate={setSelectedListIdByDate}
        timetableDialogDateId={timetableDialogDateId}
        setTimetableDialogDateId={setTimetableDialogDateId}
        documentDialogDateId={documentDialogDateId}
        setDocumentDialogDateId={setDocumentDialogDateId}
        invoices={invoices}
        setInvoices={setInvoices}
        missions={missions}
        setMissions={setMissions}
        equipmentInventory={equipmentInventory}
        equipmentLists={equipmentLists}
      />
    </div>
  );
}
```

> **Note :** aligner les signatures exactes de `useLiveData` / `useIncomesData` (noms des setters, types `equipmentInventory`/`equipmentLists`) sur ce que ces hooks exportent réellement — voir `TourDatesPage.tsx:203-204`. Le type de `timetablesByDate` doit correspondre à celui attendu par `RepresentationDialogs` (Task 10) ; utiliser `TimetableItem[]` des deux côtés.

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

---

## Task 12: Brancher la route et retirer l'ancien fichier

**Files:**
- Modify: `app/(app)/live/representations/page.tsx`
- Modify: `src/app/(app)/live/representations/page.tsx` (si un miroir existe — vérifier)
- Delete: `src/modules/live/components/TourDatesPage.tsx`

- [ ] **Step 1: Pointer la route sur le nouveau composant**

Modifier `app/(app)/live/representations/page.tsx` :

```tsx
import { RepresentationsPage } from "@/modules/live/components/representations/RepresentationsPage";

export default function LiveRepresentationsPage() {
  return <RepresentationsPage />;
}
```

- [ ] **Step 2: Vérifier qu'aucun autre fichier n'importe `TourDatesPage`**

Run: `grep -rn "TourDatesPage" src/ app/ --include="*.tsx" --include="*.ts"`
Expected: plus aucune référence (hors le fichier lui-même). S'il en reste, les rediriger vers `RepresentationsPage`.

- [ ] **Step 3: Supprimer l'ancien fichier**

```bash
rm src/modules/live/components/TourDatesPage.tsx
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

---

## Task 13: Vérification manuelle end-to-end (dev)

**Files:** aucun (vérification runtime).

- [ ] **Step 1: Lancer le dev et parcourir**

Run: `npm run dev` → ouvrir `/live/representations`.

Vérifier :
1. **Filtre** À venir / Passées / Toutes → le contenu et les stats suivent.
2. **Toggle** Chronologique ⇄ Par tournée → même dataset, deux regroupements. Le bloc « Hors tournée » apparaît pour les dates non liées.
3. **Ligne dépliable** → timetable épuré (Début/Fin en jaune), chips logistique ouvrant les dialogs existants, adresse (lien Maps), note, Documents, Modifier, Supprimer.
4. **Sélecteur Tournée** dans la ligne dépliée → change l'appartenance ; « Nouvelle » crée un projet live et la date bascule dedans. Recharger la page : le lien persiste (Supabase).
5. **Vérifier côté Projets** (`/projects`) que le projet créé rapidement apparaît avec la date liée.
6. **Ajout / Édition** d'une date → dialogs fonctionnels, timetable persiste (localStorage), factures/cachets/matériel inchangés.
7. **Note de frais PDF** exportable depuis le dialog transport/logement.

- [ ] **Step 2: Commit final (optionnel, sur demande)**

```bash
git add src/modules/live app/(app)/live/representations/page.tsx docs/superpowers
git commit -m "feat(live): refonte Représentations + regroupement par tournée"
```

---

## Self-Review (fait par l'auteur du plan)

**Couverture spec :**
- Refonte visuelle (esthétique overview) → Tasks 5-9 (surfaces, statusMeta partagé, header stats).
- Bascule chrono ⇄ tournée → Task 9 (header) + Task 11 (rendu conditionnel).
- Ligne dépliable → Task 7.
- Timetable redessiné → Task 5.
- Lien date→tournée + création rapide → Tasks 3, 6 (TourSelect), 11.
- Dates hors tournée → Task 4 (orphans) + Task 8 (bloc dédié).
- Filtre À venir/Passées/Toutes → Task 4 + Task 9.
- Refactor du monolithe / préservation logistique → Tasks 10-12.
- Source de vérité = projets, pas de champ sur TourDate → Task 3.

**Points d'attention laissés à l'exécutant (non-placeholders, mais à confirmer contre le code) :**
- Signatures exactes de `useLiveData` / `useIncomesData` (`setTourDates`, `setInvoices`, `setMissions`, types `equipmentInventory`/`equipmentLists`) — référencées à `TourDatesPage.tsx:203-204`.
- Le déplacement verbatim des dialogs (Task 10) référence des plages de lignes précises plutôt que de recopier ~1000 lignes de JSX : c'est un déplacement mécanique, pas une réécriture.
- `useLocalStorage` : confirmer la signature du setter (`(fn) => ...` vs valeur directe) sur `src/hooks/useLocalStorage.ts` et aligner les appels.
```
