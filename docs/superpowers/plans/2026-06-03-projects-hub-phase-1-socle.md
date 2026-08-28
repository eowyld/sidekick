# Projets Hub — Phase 1 (Socle données & navigation) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer le module Projets vers Supabase, poser le schéma de rattachement (`project_id`) sur les autres modules, refondre la navigation (gros bouton PROJETS), et transformer le dashboard projet en coquille à onglets.

**Architecture:** Nouvelle table `user_projects` + hook `useProjectsData` (pattern SWR optimiste identique à `useContactsData`). Colonnes `project_id` ajoutées en une migration sur les tables des modules Revenus/Marketing/Admin (exploitées en phases 2-4). Dashboard `/projects/[id]` réorganisé en 5 onglets pilotés par `?tab=`.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + RLS), SWR, TypeScript, Tailwind, Radix UI, Lucide.

**Spec:** `docs/superpowers/specs/2026-06-03-projects-hub-1-socle-donnees-design.md`

---

## Conventions de ce plan (IMPORTANT — lire avant de commencer)

- **Pas de suite de tests** dans ce repo (cf. `CLAUDE.md`). La vérification de chaque tâche se fait par : `npx tsc --noEmit` (typage), `npm run lint`, et **vérification manuelle en dev** (`npm run dev`). Aucun test unitaire à écrire.
- **Commits** : le workflow du repo (`CLAUDE.md`) impose de **ne committer que sur demande explicite de l'utilisateur**. Ce plan ne contient donc **aucune étape de commit**. À la fin de chaque tâche, s'arrêter au checkpoint de vérification ; l'utilisateur déclenchera les commits.
- **Migrations Supabase** : les fichiers `supabase/migrations/*.sql` sont exécutés manuellement par l'utilisateur dans le SQL Editor Supabase (cf. en-tête des migrations existantes). Le plan crée le fichier ; l'utilisateur l'applique.
- **Dark-only design system** : couleurs et primitives `src/components/ui/*` uniquement (cf. `CLAUDE.md`). Accent `#F0FF00`, fond `#101010`, carte `rgba(44,44,46,0.72)`, bordure `rgba(245,245,245,0.12)`.

---

## File Structure

**Créés :**
- `supabase/migrations/20260603100000_projects_hub_phase1.sql` — table `user_projects` + colonnes `project_id` + `linked_statut_ids`/`key_dates`.
- `src/hooks/useProjectsData.ts` — hook Supabase (CRUD optimiste) + types `Project`/`KeyDate` (réexportés).
- `src/modules/projects/lib/migrate-projects-to-supabase.ts` — migration one-shot localStorage → Supabase.
- `src/modules/projects/components/ProjectTabs.tsx` — barre d'onglets + routage `?tab=`.
- `src/modules/projects/components/tabs/OverviewTab.tsx` — cockpit (Vue d'ensemble).
- `src/modules/projects/components/tabs/CreationTab.tsx` — regroupe les sections Phono/Édition/Live existantes.

**Modifiés :**
- `src/lib/sidekick-store.ts` — ajout `keyDates`, `linkedStatutIds` à `Project` + `KeyDate`.
- `src/components/layout/Sidebar.tsx` — gros bouton PROJETS, retrait de Projets de `groupMusique`.
- `src/modules/projects/components/ProjectsPage.tsx` — passe à `useProjectsData` + bouton « Anciens projets ».
- `src/modules/projects/components/ArchivesPage.tsx` — passe à `useProjectsData`.
- `src/modules/projects/components/ProjectModal.tsx` — passe à `useProjectsData`.
- `src/modules/projects/components/ProjectDashboard.tsx` — header + `<ProjectTabs>`.

---

## Task 1: Migration SQL — table `user_projects` + colonnes de rattachement

**Files:**
- Create: `supabase/migrations/20260603100000_projects_hub_phase1.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Projets Hub — Phase 1 : table user_projects + colonnes de rattachement.
-- À exécuter dans le SQL Editor Supabase (Dashboard → SQL Editor).

-- 1. Table des projets
create table if not exists public.user_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  status text not null default 'idea',         -- idea|in_progress|paused|done|archived
  cover text default '',
  images jsonb not null default '[]'::jsonb,    -- string[]
  sectors jsonb not null default '[]'::jsonb,   -- ('phono'|'edition'|'live')[]
  members jsonb not null default '[]'::jsonb,   -- ProjectMember[]
  linked_albums jsonb not null default '[]'::jsonb,
  linked_tracks jsonb not null default '[]'::jsonb,
  linked_sessions jsonb not null default '[]'::jsonb,
  linked_works jsonb not null default '[]'::jsonb,
  linked_tour_dates jsonb not null default '[]'::jsonb,
  linked_rehearsals jsonb not null default '[]'::jsonb,
  linked_statut_ids jsonb not null default '[]'::jsonb,  -- string[] -> user_admin_statuses.id (phase 4)
  key_dates jsonb not null default '[]'::jsonb,          -- KeyDate[] (temps forts, phase 3)
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_projects_user_id on public.user_projects(user_id);

alter table public.user_projects enable row level security;

drop policy if exists "Users can manage own projects" on public.user_projects;
create policy "Users can manage own projects"
  on public.user_projects for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2. Colonnes project_id sur les entités rattachables (exploitées en phases 2-4)
alter table public.user_invoices
  add column if not exists project_id uuid references public.user_projects(id) on delete set null;
alter table public.user_royalties_manual
  add column if not exists project_id uuid references public.user_projects(id) on delete set null;
alter table public.user_mailing_campaigns
  add column if not exists project_id uuid references public.user_projects(id) on delete set null;
alter table public.user_marketing_events
  add column if not exists project_id uuid references public.user_projects(id) on delete set null;
alter table public.contracts
  add column if not exists project_id uuid references public.user_projects(id) on delete set null;

create index if not exists idx_user_invoices_project_id on public.user_invoices(project_id);
create index if not exists idx_user_royalties_manual_project_id on public.user_royalties_manual(project_id);
create index if not exists idx_user_mailing_campaigns_project_id on public.user_mailing_campaigns(project_id);
create index if not exists idx_user_marketing_events_project_id on public.user_marketing_events(project_id);
create index if not exists idx_contracts_project_id on public.contracts(project_id);
```

- [ ] **Step 2: Vérifier les noms de tables cibles**

Run: `grep -rn "from(\"user_invoices\"\|from(\"user_royalties_manual\"\|from(\"user_mailing_campaigns\"\|from(\"user_marketing_events\"\|from(\"contracts\"" src/`
Expected: chaque table référencée existe bien dans le code (sinon corriger le nom dans la migration). Si une table diffère (ex. nom réel), ajuster le `alter table` correspondant.

- [ ] **Step 3: Checkpoint — application manuelle**

Demander à l'utilisateur d'exécuter le fichier dans le SQL Editor Supabase. Vérifier dans le dashboard que `user_projects` existe avec RLS activée et que les 5 colonnes `project_id` sont présentes. **Ne pas continuer la Task 3 (hook) tant que la table n'est pas appliquée.**

---

## Task 2: Types `Project` & `KeyDate`

**Files:**
- Modify: `src/lib/sidekick-store.ts:255-281` (interface `ProjectMember`, `Project`, `ProjectStatus`)

- [ ] **Step 1: Ajouter `KeyDate` et étendre `Project`**

Dans `src/lib/sidekick-store.ts`, juste avant `export interface Project {`, ajouter :

```typescript
export interface KeyDate {
  id: string;
  label: string;   // "Concert release", "Sortie clip"...
  type: string;    // "concert" | "sortie" | "clip" | "annonce" | ... (libre)
  date: string;    // ISO YYYY-MM-DD
}
```

Puis, dans l'interface `Project`, ajouter ces deux champs après `linkedRehearsals: string[];` :

```typescript
  linkedStatutIds: string[];   // → user_admin_statuses.id (phase 4)
  keyDates: KeyDate[];          // temps forts (phase 3)
```

- [ ] **Step 2: Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: des erreurs là où `Project` est construit sans `linkedStatutIds`/`keyDates` (ex. `ProjectModal`, `DEFAULT_SIDEKICK_DATA` si applicable). Elles seront résolues aux Tasks 3 et 5. Noter les fichiers signalés.

---

## Task 3: Hook `useProjectsData`

**Files:**
- Create: `src/hooks/useProjectsData.ts`

- [ ] **Step 1: Écrire le hook (calqué sur `useContactsData`)**

```typescript
"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";
import type { Project } from "@/lib/sidekick-store";

export type { Project, ProjectStatus, ProjectMember, KeyDate } from "@/lib/sidekick-store";

const KEY = "user_projects";

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    status: (row.status as Project["status"]) ?? "idea",
    cover: (row.cover as string) ?? "",
    images: (row.images as string[]) ?? [],
    sectors: (row.sectors as Project["sectors"]) ?? [],
    members: (row.members as Project["members"]) ?? [],
    linkedAlbums: (row.linked_albums as string[]) ?? [],
    linkedTracks: (row.linked_tracks as string[]) ?? [],
    linkedSessions: (row.linked_sessions as string[]) ?? [],
    linkedWorks: (row.linked_works as string[]) ?? [],
    linkedTourDates: (row.linked_tour_dates as string[]) ?? [],
    linkedRehearsals: (row.linked_rehearsals as string[]) ?? [],
    linkedStatutIds: (row.linked_statut_ids as string[]) ?? [],
    keyDates: (row.key_dates as Project["keyDates"]) ?? [],
    notes: (row.notes as string) ?? "",
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

function projectToRow(p: Project): Record<string, unknown> {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status,
    cover: p.cover,
    images: p.images,
    sectors: p.sectors,
    members: p.members,
    linked_albums: p.linkedAlbums,
    linked_tracks: p.linkedTracks,
    linked_sessions: p.linkedSessions,
    linked_works: p.linkedWorks,
    linked_tour_dates: p.linkedTourDates,
    linked_rehearsals: p.linkedRehearsals,
    linked_statut_ids: p.linkedStatutIds,
    key_dates: p.keyDates,
    notes: p.notes,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

async function fetchProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToProject);
}

export function useProjectsData() {
  const { data: projects = [], isLoading, error: swrError, mutate: mutateLocal } =
    useSWR<Project[]>(KEY, fetchProjects);

  const error = swrError ? (swrError as Error).message : null;

  const setProjects = useCallback((fn: (prev: Project[]) => Project[]) => {
    const snapshot = projects;
    const next = fn(projects);

    mutateLocal(next, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { mutateLocal(snapshot, false); return; }

      const prevMap = new Map(snapshot.map((p) => [p.id, p]));
      const nextMap = new Map(next.map((p) => [p.id, p]));

      const toUpsert = next.filter((p) => {
        const old = prevMap.get(p.id);
        return !old || JSON.stringify(old) !== JSON.stringify(p);
      });
      const toDelete = snapshot.filter((p) => !nextMap.has(p.id)).map((p) => p.id);

      const ops: Array<PromiseLike<{ error: { message: string } | null }>> = [];

      if (toUpsert.length > 0) {
        ops.push(
          supabase.from("user_projects")
            .upsert(toUpsert.map((p) => ({ ...projectToRow(p), user_id: user.id })))
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }
      if (toDelete.length > 0) {
        ops.push(
          supabase.from("user_projects")
            .delete().in("id", toDelete)
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      const results = await Promise.all(ops);
      if (results.find((r) => r.error)) {
        mutateLocal(snapshot, false);
      } else {
        mutate(KEY);
      }
    })();
  }, [projects, mutateLocal]);

  return { projects, setProjects, loading: isLoading, error };
}
```

> Note : `user_projects.id` est généré par Postgres (`gen_random_uuid()`), mais le code crée des projets côté client avec un `id` (ex. `crypto.randomUUID()`) — l'upsert avec `id` fourni fonctionne (insert si absent). Conserver la génération d'`id` côté client dans `ProjectModal` (Task 5).

- [ ] **Step 2: Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: `useProjectsData.ts` compile sans erreur (les erreurs restantes concernent les composants pas encore migrés).

---

## Task 4: Migration one-shot localStorage → Supabase

**Files:**
- Create: `src/modules/projects/lib/migrate-projects-to-supabase.ts`

- [ ] **Step 1: Écrire la fonction de migration**

```typescript
import { createClient } from "@/lib/supabase";
import type { Project } from "@/lib/sidekick-store";

const FLAG = "projects_migrated_to_supabase";

/**
 * Migration one-shot des projets stockés en localStorage (ancien blob
 * `sidekick-data-{userId}`) vers la table Supabase `user_projects`.
 * Idempotente : ne fait rien si déjà migré ou si aucun projet local.
 */
export async function migrateProjectsToSupabase(localProjects: Project[]): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(FLAG) === "done") return;
  if (!localProjects || localProjects.length === 0) {
    localStorage.setItem(FLAG, "done");
    return;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // réessaiera au prochain chargement authentifié

  // Ne pas écraser si des projets existent déjà côté Supabase
  const { count } = await supabase
    .from("user_projects")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    localStorage.setItem(FLAG, "done");
    return;
  }

  const rows = localProjects.map((p) => ({
    id: p.id,
    user_id: user.id,
    title: p.title,
    description: p.description ?? "",
    status: p.status,
    cover: p.cover ?? "",
    images: p.images ?? [],
    sectors: p.sectors ?? [],
    members: p.members ?? [],
    linked_albums: p.linkedAlbums ?? [],
    linked_tracks: p.linkedTracks ?? [],
    linked_sessions: p.linkedSessions ?? [],
    linked_works: p.linkedWorks ?? [],
    linked_tour_dates: p.linkedTourDates ?? [],
    linked_rehearsals: p.linkedRehearsals ?? [],
    linked_statut_ids: (p as Partial<Project>).linkedStatutIds ?? [],
    key_dates: (p as Partial<Project>).keyDates ?? [],
    notes: p.notes ?? "",
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }));

  const { error } = await supabase.from("user_projects").insert(rows);
  if (!error) localStorage.setItem(FLAG, "done");
  // En cas d'erreur : pas de flag → nouvelle tentative au prochain chargement.
}
```

- [ ] **Step 2: Déclencher la migration au chargement de `/projects`**

Dans `ProjectsPage.tsx` (Task 5), ajouter un `useEffect` qui lit l'ancien blob localStorage et appelle `migrateProjectsToSupabase`. Implémenté en Task 5, Step 4.

- [ ] **Step 3: Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: `migrate-projects-to-supabase.ts` compile.

---

## Task 5: Refactor `ProjectsPage`, `ArchivesPage`, `ProjectModal` → `useProjectsData`

**Files:**
- Modify: `src/modules/projects/components/ProjectsPage.tsx`
- Modify: `src/modules/projects/components/ArchivesPage.tsx`
- Modify: `src/modules/projects/components/ProjectModal.tsx`

- [ ] **Step 1: `ProjectModal` — créer/éditer via `useProjectsData`**

Dans `ProjectModal.tsx`, remplacer l'usage de `useSidekickData` par `useProjectsData`. Le création/édition doit utiliser le setter `setProjects`. Pattern :

```typescript
import { useProjectsData } from "@/hooks/useProjectsData";
// ...
const { setProjects } = useProjectsData();

// création :
const newProject: Project = {
  id: crypto.randomUUID(),
  title, description, status: "idea",
  cover, images: [], sectors, members,
  linkedAlbums: [], linkedTracks: [], linkedSessions: [],
  linkedWorks: [], linkedTourDates: [], linkedRehearsals: [],
  linkedStatutIds: [], keyDates: [],
  notes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
setProjects((prev) => [newProject, ...prev]);

// édition :
setProjects((prev) => prev.map((p) =>
  p.id === project.id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
));
```

S'assurer que **tous** les champs obligatoires de `Project` (dont `linkedStatutIds`, `keyDates`) sont initialisés à la création.

- [ ] **Step 2: `ProjectsPage` — lecture, archive, delete via `useProjectsData`**

Remplacer dans `ProjectsPage.tsx` :
- `const { data, setData, preferencesReady } = useSidekickData();` → `const { projects, setProjects, loading } = useProjectsData();`
- `data.projects?.projects ?? []` → `projects`
- `preferencesReady` → `!loading`
- `handleArchive` :
```typescript
const handleArchive = (id: string) => {
  const now = new Date().toISOString();
  setProjects((prev) => prev.map((p) =>
    p.id === id ? { ...p, status: "archived" as const, updatedAt: now } : p
  ));
};
```
- `handleDelete` :
```typescript
const handleDelete = (id: string) => {
  setProjects((prev) => prev.filter((p) => p.id !== id));
};
```
- Le sous-composant `ProjectInline` utilise aussi `useSidekickData` pour `updateProject` (images/notes/statut) → le passer à `useProjectsData` avec le même pattern `setProjects((prev) => prev.map(...))`.

- [ ] **Step 3: `ArchivesPage` — lecture via `useProjectsData`**

Remplacer `useSidekickData` par `useProjectsData`, filtrer `projects.filter((p) => p.status === "archived")`. Adapter le « Désarchiver » avec `setProjects((prev) => prev.map(...))` repassant le statut à `in_progress`.

- [ ] **Step 4: `ProjectsPage` — bouton « Anciens projets » + déclenchement migration**

Dans le header de `ProjectsPage` (à côté de « Nouveau projet »), ajouter un lien discret :

```tsx
import Link from "next/link";
import { Archive } from "lucide-react";
// ... dans le header, avant le bouton "Nouveau projet" :
<Link
  href="/projects/archives"
  className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/40 hover:text-[#F5F5F5] transition-colors"
>
  <Archive size={13} /> Anciens projets
</Link>
```

Et déclencher la migration one-shot au montage :

```tsx
import { useEffect } from "react";
import { migrateProjectsToSupabase } from "@/modules/projects/lib/migrate-projects-to-supabase";
import { useSidekickData } from "@/hooks/useSidekickData";
// ...
const { data } = useSidekickData();
useEffect(() => {
  const local = data.projects?.projects ?? [];
  void migrateProjectsToSupabase(local as Project[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 5: Vérifier typage + lint + dev**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur sur `ProjectsPage`, `ArchivesPage`, `ProjectModal`.
Run: `npm run dev` → ouvrir `/projects` : créer un projet, l'archiver, le retrouver dans `/projects/archives`, le désarchiver, le supprimer. Recharger : les données persistent (Supabase). Vérifier dans le dashboard Supabase que la ligne `user_projects` est bien créée/supprimée.

---

## Task 6: Sidebar — gros bouton PROJETS

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Retirer Projets de `groupMusique`**

Dans `src/components/layout/Sidebar.tsx`, supprimer du tableau `groupMusique` l'entrée `label: "Projets"` et ses `sub` (`/projects`, `/projects/archives`). `groupMusique` ne contient plus que Phono / Édition / Live.

- [ ] **Step 2: Ajouter le composant bouton PROJETS**

Entre la section `Organisation` (fin du `<div className="space-y-0.5">` ligne ~318) et `<SectionLabel>Business</SectionLabel>` (ligne ~321), insérer :

```tsx
{/* PROJETS — pivot central */}
<Link
  href="/projects"
  className={`my-3 flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
    pathname.startsWith("/projects")
      ? "border-[#F0FF00]/40 bg-[#F0FF00]/10 text-[#F0FF00]"
      : "border-[#F0FF00]/20 bg-[#F0FF00]/5 text-[#F5F5F5] hover:bg-[#F0FF00]/10 hover:text-[#F0FF00]"
  }`}
>
  <FolderKanban size={18} />
  Projets
</Link>
```

`FolderKanban` et `Link` sont déjà importés (vérifier en haut du fichier ; `FolderKanban` l'est ligne 22). Sinon les ajouter.

- [ ] **Step 3: Gérer la sidebar repliée (`collapsed`)**

La nav détaillée est dans `{!collapsed && (...)}`. Repérer le rendu en mode `collapsed` (icônes seules) plus bas dans le fichier et y ajouter une icône `FolderKanban` cliquable vers `/projects`, dans le même style accentué réduit (h-9 w-9, fond `#F0FF00`/10, etc.), positionnée juste après le groupe Organisation. Reproduire la logique d'`active` avec `pathname.startsWith("/projects")`.

- [ ] **Step 4: Vérifier typage + lint + dev**

Run: `npx tsc --noEmit && npm run lint`
Run: `npm run dev` → vérifier : le bouton PROJETS apparaît entre Organisation et Business, accentué ; il n'apparaît plus dans Musique ; le clic mène à `/projects` ; l'état actif s'allume sur toutes les routes `/projects*`. Tester en mode replié.

---

## Task 7: Dashboard `/projects/[id]` — coquille à onglets

**Files:**
- Create: `src/modules/projects/components/ProjectTabs.tsx`
- Create: `src/modules/projects/components/tabs/CreationTab.tsx`
- Create: `src/modules/projects/components/tabs/OverviewTab.tsx`
- Modify: `src/modules/projects/components/ProjectDashboard.tsx`

- [ ] **Step 1: `CreationTab` — regrouper les sections existantes**

```tsx
"use client";

import type { Project } from "@/lib/sidekick-store";
import { PhonoSection } from "../sections/PhonoSection";
import { EditionSection } from "../sections/EditionSection";
import { LiveSection } from "../sections/LiveSection";
import { WorkTrackLinker } from "../sections/WorkTrackLinker";

export function CreationTab({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      {project.sectors.includes("phono") && <PhonoSection project={project} />}
      {project.sectors.includes("edition") && <EditionSection project={project} />}
      {project.sectors.includes("live") && <LiveSection project={project} />}
      {project.sectors.includes("phono") && project.sectors.includes("edition") && (
        <WorkTrackLinker project={project} />
      )}
      {project.sectors.length === 0 && (
        <p className="text-[13px] text-[#F5F5F5]/30 italic">
          Aucun secteur activé. Modifie le projet pour ajouter Phono, Édition ou Live.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `OverviewTab` — cockpit (4 cartes + galerie/notes)**

Cockpit avec 4 cartes en grille 2×2. En phase 1, seule la carte **Création** affiche des compteurs réels (longueur des `linked*`) ; Budget / Campagne / Admin affichent un état « À configurer » (rempli en phases 2-4). La galerie et les notes (extraites de l'ancien `ProjectDashboard`) vivent ici.

```tsx
"use client";

import type { Project } from "@/lib/sidekick-store";

function Card({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-4 hover:border-[rgba(245,245,245,0.18)] transition-colors"
    >
      <div className="text-[11px] uppercase tracking-wider text-[#F5F5F5]/40 mb-2">{label}</div>
      {children}
    </button>
  );
}

export function OverviewTab({
  project,
  onGoTab,
}: {
  project: Project;
  onGoTab: (tab: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Card label="💶 Budget & finances" onClick={() => onGoTab("budget")}>
          <p className="text-[13px] text-[#F5F5F5]/30 italic">À configurer</p>
        </Card>
        <Card label="📣 Campagne marketing" onClick={() => onGoTab("marketing")}>
          <p className="text-[13px] text-[#F5F5F5]/30 italic">À configurer</p>
        </Card>
        <Card label="🎛️ Création" onClick={() => onGoTab("creation")}>
          <p className="text-[12px] text-[#F5F5F5]/70 leading-relaxed">
            🎵 {project.linkedTracks.length} titres<br />
            ✍️ {project.linkedWorks.length} œuvres<br />
            🎤 {project.linkedTourDates.length} dates
          </p>
        </Card>
        <Card label="📄 Admin" onClick={() => onGoTab("admin")}>
          <p className="text-[13px] text-[#F5F5F5]/30 italic">À configurer</p>
        </Card>
      </div>
      {/* Galerie & Notes : déplacer ici le JSX existant de ProjectDashboard (section galerie + notes). */}
    </div>
  );
}
```

> Déplacer ici les blocs **Galerie** et **Notes** présents dans l'actuel `ProjectDashboard.tsx` (lignes ~236-316), avec leur logique (`handleAddImage`, `handleRemoveImage`, `handleSaveNotes`) — ces handlers passent désormais par `useProjectsData` (cf. Task 5 pattern). Garder le composant focalisé : si la galerie/notes alourdit trop, les extraire en sous-composants `ProjectGallery`/`ProjectNotes`.

- [ ] **Step 3: `ProjectTabs` — barre d'onglets + routage `?tab=`**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Project } from "@/lib/sidekick-store";
import { OverviewTab } from "./tabs/OverviewTab";
import { CreationTab } from "./tabs/CreationTab";

const TABS = [
  { key: "overview", label: "Vue d'ensemble" },
  { key: "budget", label: "Budget" },
  { key: "marketing", label: "Campagne marketing" },
  { key: "creation", label: "Création" },
  { key: "admin", label: "Admin" },
];

export function ProjectTabs({ project }: { project: Project }) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("tab") ?? "overview";

  const visibleTabs = TABS.filter((t) => t.key !== "creation" || project.sectors.length > 0);

  const goTab = (tab: string) =>
    router.replace(`/projects/${project.id}?tab=${tab}`, { scroll: false });

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-[rgba(245,245,245,0.1)]">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => goTab(t.key)}
            className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              active === t.key
                ? "border-[#F0FF00] text-[#F5F5F5]"
                : "border-transparent text-[#F5F5F5]/40 hover:text-[#F5F5F5]/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === "overview" && <OverviewTab project={project} onGoTab={goTab} />}
      {active === "creation" && <CreationTab project={project} />}
      {active === "budget" && <PlaceholderTab name="Budget" />}
      {active === "marketing" && <PlaceholderTab name="Campagne marketing" />}
      {active === "admin" && <PlaceholderTab name="Admin" />}
    </div>
  );
}

function PlaceholderTab({ name }: { name: string }) {
  return (
    <p className="text-[13px] text-[#F5F5F5]/30 italic py-8">
      {name} — à venir (phase suivante).
    </p>
  );
}
```

> Note App Router : `useSearchParams` impose que la page parente soit dans un `<Suspense>` ou que le composant soit client. `ProjectTabs` est `"use client"` ; vérifier que `app/(app)/projects/[id]/page.tsx` ne casse pas le build (`npm run build`). Si erreur de prerender, envelopper `<ProjectTabs>` dans `<Suspense fallback={null}>`.

- [ ] **Step 4: `ProjectDashboard` — header + `<ProjectTabs>`**

Refondre `ProjectDashboard.tsx` :
- Passer de `useSidekickData` à `useProjectsData` (récupérer le projet via `projects.find((p) => p.id === projectId)`, `loading` au lieu de `preferencesReady`).
- Conserver le **header** (bannière cover, titre, dropdown statut, description, secteurs, membres, menu actions Modifier/Archiver/Supprimer) — `updateProject`/`handleStatusChange`/`handleDelete` repassent par `setProjects`.
- **Retirer** du dashboard les blocs Galerie, Notes et les sections secteurs (déplacés dans `OverviewTab`/`CreationTab`).
- Sous le header, rendre `<ProjectTabs project={project} />`.

- [ ] **Step 5: Vérifier typage + lint + build + dev**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: build OK (corriger un éventuel souci `useSearchParams`/Suspense).
Run: `npm run dev` → ouvrir un projet : header présent, onglets fonctionnels, `?tab=` change l'URL et le contenu, l'onglet Création regroupe Phono/Édition/Live (et disparaît si aucun secteur), le cockpit affiche les compteurs Création réels et renvoie vers les onglets au clic, galerie/notes éditables et persistées.

---

## Self-Review (effectuée)

- **Couverture spec** : table `user_projects` (T1) ✓ ; colonnes `project_id` + `linked_statut_ids`/`key_dates` (T1) ✓ ; `KeyDate` (T2) ✓ ; hook `useProjectsData` pattern optimiste (T3) ✓ ; migration localStorage one-shot (T4) ✓ ; refactor pages vers le hook (T5) ✓ ; gros bouton sidebar + retrait Musique (T6) ✓ ; bouton « Anciens projets » hors nav (T5/T6) ✓ ; coquille à onglets + `?tab=` + cockpit + Création (T7) ✓.
- **Placeholders** : les `PlaceholderTab` Budget/Marketing/Admin sont **intentionnels** (contenu en phases 2-4), pas des placeholders de plan.
- **Cohérence des types** : `Project` étendu en T2 (`linkedStatutIds`, `keyDates`) est initialisé partout où un `Project` est créé (T4 migration, T5 ProjectModal) ; mappers `rowToProject`/`projectToRow` (T3) couvrent tous les champs.
