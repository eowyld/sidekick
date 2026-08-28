# Module Projets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer le module Projets musicaux — entité mère transversale qui relie Phono, Édition et Live — avec pages de listing, dashboard par projet, et intégrations cross-modules.

**Architecture:** Les projets vivent dans le store localStorage via `useSidekickData` (clé `projects.projects`). Le dashboard projet agrège des vues légères sur les éléments liés dans chaque module, sans dupliquer leur logique. Les intégrations cross-modules ajoutent un badge "Projet" dans Phono/Édition/Live et gèrent le paramètre `?projectId` pour lier automatiquement les éléments créés depuis un projet.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Radix UI, Lucide React, localStorage via `useSidekickData`.

---

## Fichiers — carte complète

**Créer :**
- `src/modules/projects/components/ProjectsPage.tsx` — listing projets actifs
- `src/modules/projects/components/ArchivesPage.tsx` — listing projets archivés
- `src/modules/projects/components/ProjectDashboard.tsx` — dashboard projet [id]
- `src/modules/projects/components/ProjectCard.tsx` — carte projet (grille)
- `src/modules/projects/components/ProjectArchiveRow.tsx` — ligne archive compacte
- `src/modules/projects/components/ProjectModal.tsx` — modal création/édition
- `src/modules/projects/components/sections/PhonoSection.tsx` — section Phono du dashboard
- `src/modules/projects/components/sections/EditionSection.tsx` — section Édition du dashboard
- `src/modules/projects/components/sections/LiveSection.tsx` — section Live du dashboard
- `src/modules/projects/components/sections/WorkTrackLinker.tsx` — association oeuvre ↔ titre
- `app/(app)/projects/page.tsx` — route projets actifs
- `app/(app)/projects/archives/page.tsx` — route archives
- `app/(app)/projects/[id]/page.tsx` — route dashboard projet

**Modifier :**
- `src/lib/sidekick-store.ts` — types `Project`, `ProjectMember` + store
- `src/components/layout/Sidebar.tsx` — section Projets en tête de Musique
- `src/modules/phono/components/CatalogPage.tsx` — badge Projet + `?projectId`
- `src/modules/edition/components/WorksPage.tsx` — badge Projet + `?projectId`
- `src/modules/live/components/TourDatesPage.tsx` — badge Projet + `?projectId`
- `src/modules/live/components/RehearsalsPage.tsx` — badge Projet + `?projectId`

---

## Groupe A : Foundation

### Task 1 : Types & Store

**Fichiers :**
- Modify: `src/lib/sidekick-store.ts`

- [ ] **Ajouter les types `Project` et `ProjectMember` après la section `// --- Phono ---`**

```typescript
// --- Projects ---
export interface ProjectMember {
  contactId: string | null;
  name: string;
  role: string;
}

export type ProjectStatus = "idea" | "in_progress" | "paused" | "done" | "archived";

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  cover: string;
  images: string[];
  sectors: ("phono" | "edition" | "live")[];
  members: ProjectMember[];
  linkedAlbums: string[];
  linkedTracks: string[];
  linkedSessions: string[];
  linkedWorks: string[];
  linkedTourDates: string[];
  linkedRehearsals: string[];
  createdAt: string;
  updatedAt: string;
  notes: string;
}
```

- [ ] **Enrichir `Track` avec `linkedWorkId`** (après `cover?: string;` ligne ~280)

```typescript
linkedWorkId?: string;
```

- [ ] **Enrichir `Work` avec `linkedTrackIds`** (après `notes: string;` dans l'interface Work)

```typescript
linkedTrackIds?: string[];
```

- [ ] **Ajouter `projects` dans `SidekickData`** (après `phono:`)

```typescript
projects: {
  projects: Project[];
};
```

- [ ] **Ajouter `projects` dans `enabledModules`**

```typescript
enabledModules: {
  live: boolean;
  phono: boolean;
  admin: boolean;
  marketing: boolean;
  edition: boolean;
  revenus: boolean;
  projects: boolean;
};
```

- [ ] **Initialiser dans `DEFAULT_SIDEKICK_DATA`**

```typescript
projects: {
  projects: [],
},
```

Et dans `enabledModules`:
```typescript
projects: true,
```

- [ ] **Ajouter le merge dans `mergeWithDefaults`** (après `phono: { ...DEFAULT_SIDEKICK_DATA.phono, ...partial.phono }`)

```typescript
projects: {
  ...DEFAULT_SIDEKICK_DATA.projects,
  ...partial.projects,
  projects: Array.isArray(partial.projects?.projects)
    ? partial.projects.projects
    : DEFAULT_SIDEKICK_DATA.projects.projects,
},
```

- [ ] **Vérifier les types :** `npx tsc --noEmit`

- [ ] **Commit**
```bash
git add src/lib/sidekick-store.ts
git commit -m "feat(projects): add Project types and store slice"
```

---

### Task 2 : Sidebar navigation

**Fichiers :**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Ajouter `FolderKanban` aux imports Lucide**

```typescript
import {
  // ... existants ...
  FolderKanban,
} from "lucide-react";
```

- [ ] **Ajouter le groupe Projets au début de `groupMusique`** (avant Phono)

```typescript
const groupMusique = [
  {
    label: "Projets",
    icon: FolderKanban,
    key: "projects",
    href: "/projects",
    sub: [
      { href: "/projects", label: "Projets actifs" },
      { href: "/projects/archives", label: "Anciens projets" },
    ],
  },
  // ... Phono, Édition, Live existants
];
```

- [ ] **Ajouter `projects` dans la liste des modules gérés par `enabled`** — le cast `item.key as keyof typeof enabled` s'adapte automatiquement grâce au type étendu.

- [ ] **Démarrer le dev server et vérifier** que "Projets" apparaît en tête de la section Musique avec les deux sous-items, et que le chevron fonctionne.
```bash
npm run dev
```

- [ ] **Commit**
```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(projects): add Projets section to Musique sidebar"
```

---

### Task 3 : Routes App Router

**Fichiers :**
- Create: `app/(app)/projects/page.tsx`
- Create: `app/(app)/projects/archives/page.tsx`
- Create: `app/(app)/projects/[id]/page.tsx`

- [ ] **Créer `app/(app)/projects/page.tsx`**

```typescript
import { ProjectsPage } from "@/modules/projects/components/ProjectsPage";

export default function ActiveProjectsPage() {
  return <ProjectsPage />;
}
```

- [ ] **Créer `app/(app)/projects/archives/page.tsx`**

```typescript
import { ArchivesPage } from "@/modules/projects/components/ArchivesPage";

export default function ProjectArchivesPage() {
  return <ArchivesPage />;
}
```

- [ ] **Créer `app/(app)/projects/[id]/page.tsx`**

```typescript
import { ProjectDashboard } from "@/modules/projects/components/ProjectDashboard";

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  return <ProjectDashboard projectId={params.id} />;
}
```

- [ ] **Vérifier types :** `npx tsc --noEmit`

- [ ] **Commit**
```bash
git add app/(app)/projects/
git commit -m "feat(projects): add app router pages for projects module"
```

---

## Groupe B : Core UI

### Task 4 : ProjectModal (création / édition)

**Fichiers :**
- Create: `src/modules/projects/components/ProjectModal.tsx`

- [ ] **Créer le composant**

```typescript
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Project, ProjectMember, ProjectStatus } from "@/lib/sidekick-store";
import { useSidekickData } from "@/hooks/useSidekickData";
import { ImagePlus, X, Plus } from "lucide-react";

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  project?: Project; // si défini → mode édition
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idée" },
  { value: "in_progress", label: "En cours" },
  { value: "paused", label: "En pause" },
  { value: "done", label: "Terminé" },
];

const SECTOR_OPTIONS: { value: "phono" | "edition" | "live"; label: string }[] = [
  { value: "phono", label: "Phono" },
  { value: "edition", label: "Édition" },
  { value: "live", label: "Live" },
];

export function ProjectModal({ open, onClose, project }: ProjectModalProps) {
  const { data, setData } = useSidekickData();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("idea");
  const [sectors, setSectors] = useState<("phono" | "edition" | "live")[]>([]);
  const [cover, setCover] = useState("");
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setDescription(project.description);
      setStatus(project.status);
      setSectors(project.sectors);
      setCover(project.cover);
      setMembers(project.members);
      setNotes(project.notes);
    } else {
      setTitle("");
      setDescription("");
      setStatus("idea");
      setSectors([]);
      setCover("");
      setMembers([]);
      setNotes("");
    }
  }, [project, open]);

  const toggleSector = (sector: "phono" | "edition" | "live") => {
    setSectors((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector]
    );
  };

  const addMember = () => {
    if (!newMemberName.trim()) return;
    setMembers((prev) => [
      ...prev,
      { contactId: null, name: newMemberName.trim(), role: newMemberRole.trim() },
    ]);
    setNewMemberName("");
    setNewMemberRole("");
  };

  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCover(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const now = new Date().toISOString();

    if (project) {
      // Mode édition
      setData((prev) => ({
        ...prev,
        projects: {
          projects: prev.projects.projects.map((p) =>
            p.id === project.id
              ? { ...p, title, description, status, sectors, cover, members, notes, updatedAt: now }
              : p
          ),
        },
      }));
    } else {
      // Mode création
      const newProject: Project = {
        id: crypto.randomUUID(),
        title,
        description,
        status,
        cover,
        images: [],
        sectors,
        members,
        linkedAlbums: [],
        linkedTracks: [],
        linkedSessions: [],
        linkedWorks: [],
        linkedTourDates: [],
        linkedRehearsals: [],
        createdAt: now,
        updatedAt: now,
        notes,
      };
      setData((prev) => ({
        ...prev,
        projects: {
          projects: [...prev.projects.projects, newProject],
        },
      }));
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
        <DialogHeader>
          <DialogTitle className="text-[#F5F5F5]">
            {project ? "Modifier le projet" : "Nouveau projet"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Titre */}
          <div className="space-y-1">
            <Label className="text-[#F5F5F5]/70 text-xs">Titre *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Collab avec X, EP été 2026..."
              className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-[#F5F5F5]/70 text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="De quoi parle ce projet ?"
              className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] resize-none"
              rows={3}
            />
          </div>

          {/* Statut */}
          <div className="space-y-1">
            <Label className="text-[#F5F5F5]/70 text-xs">Statut</Label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    status === opt.value
                      ? "border-[#F0FF00] bg-[#F0FF00]/10 text-[#F0FF00]"
                      : "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/50 hover:text-[#F5F5F5]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Secteurs */}
          <div className="space-y-1">
            <Label className="text-[#F5F5F5]/70 text-xs">Secteurs concernés</Label>
            <div className="flex gap-3">
              {SECTOR_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={sectors.includes(opt.value)}
                    onCheckedChange={() => toggleSector(opt.value)}
                  />
                  <span className="text-[13px] text-[#F5F5F5]/70">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Cover */}
          <div className="space-y-1">
            <Label className="text-[#F5F5F5]/70 text-xs">Image de couverture</Label>
            <div className="flex items-center gap-3">
              {cover ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[rgba(245,245,245,0.12)]">
                  <img src={cover} alt="cover" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCover("")}
                    className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[rgba(245,245,245,0.2)] text-[#F5F5F5]/50 text-xs cursor-pointer hover:border-[rgba(245,245,245,0.4)] transition-colors">
                  <ImagePlus size={14} />
                  Choisir une image
                  <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Membres */}
          <div className="space-y-2">
            <Label className="text-[#F5F5F5]/70 text-xs">Membres du projet</Label>
            {members.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px] text-[#F5F5F5]/70">
                <span className="flex-1">{m.name}</span>
                <span className="text-[#F5F5F5]/40 text-xs">{m.role}</span>
                <button type="button" onClick={() => removeMember(i)}>
                  <X size={12} className="text-[#F5F5F5]/40 hover:text-red-400" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Nom"
                className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] text-xs h-8"
              />
              <Input
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                placeholder="Rôle"
                className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] text-xs h-8 w-32"
              />
              <Button type="button" size="icon" variant="ghost" onClick={addMember} className="h-8 w-8">
                <Plus size={14} />
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-[#F5F5F5]/70 text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes libres..."
              className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {project ? "Enregistrer" : "Créer le projet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Vérifier types :** `npx tsc --noEmit`

- [ ] **Commit**
```bash
git add src/modules/projects/components/ProjectModal.tsx
git commit -m "feat(projects): add ProjectModal for create/edit"
```

---

### Task 5 : ProjectCard

**Fichiers :**
- Create: `src/modules/projects/components/ProjectCard.tsx`

- [ ] **Créer le composant**

```typescript
"use client";

import { useRouter } from "next/navigation";
import type { Project } from "@/lib/sidekick-store";
import { Music2, BookOpen, Mic2, Users, MoreHorizontal, Archive } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_CONFIG: Record<Project["status"], { label: string; color: string }> = {
  idea: { label: "Idée", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  in_progress: { label: "En cours", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  paused: { label: "En pause", color: "bg-[rgba(245,245,245,0.08)] text-[#F5F5F5]/50 border-[rgba(245,245,245,0.12)]" },
  done: { label: "Terminé", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  archived: { label: "Archivé", color: "bg-[rgba(245,245,245,0.06)] text-[#F5F5F5]/40 border-[rgba(245,245,245,0.08)]" },
};

const SECTOR_ICONS = {
  phono: Music2,
  edition: BookOpen,
  live: Mic2,
};

interface ProjectCardProps {
  project: Project;
  onEdit: (p: Project) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onEdit, onArchive, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const status = STATUS_CONFIG[project.status];

  const updatedAt = new Date(project.updatedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="group relative flex flex-col rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl overflow-hidden cursor-pointer hover:border-[rgba(245,245,245,0.18)] transition-all duration-200"
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      {/* Cover */}
      <div className="relative h-36 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex-shrink-0">
        {project.cover ? (
          <img src={project.cover} alt={project.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-bold text-[#F5F5F5]/10 uppercase tracking-widest">
              {project.title.charAt(0)}
            </span>
          </div>
        )}
        {/* Actions dropdown */}
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-[#F5F5F5]/70 hover:text-[#F5F5F5]">
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
              <DropdownMenuItem onClick={() => onEdit(project)} className="text-[#F5F5F5]/70 hover:text-[#F5F5F5]">
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchive(project.id)} className="text-[#F5F5F5]/70 hover:text-[#F5F5F5]">
                Archiver
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(project.id)} className="text-red-400 hover:text-red-300">
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        {/* Titre + statut */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-[#F5F5F5] leading-tight line-clamp-1">
            {project.title}
          </h3>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] border ${status.color}`}>
            {status.label}
          </span>
        </div>

        {/* Secteurs + membres */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {project.sectors.map((s) => {
              const Icon = SECTOR_ICONS[s];
              return <Icon key={s} size={12} className="text-[#F5F5F5]/40" />;
            })}
          </div>
          {project.members.length > 0 && (
            <div className="flex items-center gap-1 text-[#F5F5F5]/40">
              <Users size={11} />
              <span className="text-[11px]">{project.members.length}</span>
            </div>
          )}
        </div>

        {/* Date */}
        <p className="text-[11px] text-[#F5F5F5]/30">Modifié {updatedAt}</p>
      </div>
    </div>
  );
}
```

- [ ] **Vérifier types :** `npx tsc --noEmit`

- [ ] **Commit**
```bash
git add src/modules/projects/components/ProjectCard.tsx
git commit -m "feat(projects): add ProjectCard component"
```

---

### Task 6 : ProjectsPage (listing actifs)

**Fichiers :**
- Create: `src/modules/projects/components/ProjectsPage.tsx`

- [ ] **Créer le composant**

```typescript
"use client";

import { useState } from "react";
import { useSidekickData } from "@/hooks/useSidekickData";
import { ProjectCard } from "./ProjectCard";
import { ProjectModal } from "./ProjectModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Project } from "@/lib/sidekick-store";

const ACTIVE_STATUSES = ["idea", "in_progress", "paused", "done"] as const;

export function ProjectsPage() {
  const { data, setData } = useSidekickData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();

  const activeProjects = (data.projects?.projects ?? []).filter((p) =>
    (ACTIVE_STATUSES as readonly string[]).includes(p.status)
  );

  const handleEdit = (p: Project) => {
    setEditingProject(p);
    setModalOpen(true);
  };

  const handleArchive = (id: string) => {
    const now = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.map((p) =>
          p.id === id ? { ...p, status: "archived" as const, updatedAt: now } : p
        ),
      },
    }));
  };

  const handleDelete = (id: string) => {
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.filter((p) => p.id !== id),
      },
    }));
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingProject(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Projets actifs</h1>
          <p className="text-sm text-[#F5F5F5]/50 mt-0.5">
            {activeProjects.length} projet{activeProjects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus size={14} className="mr-1.5" />
          Nouveau projet
        </Button>
      </div>

      {/* Grille */}
      {activeProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#F5F5F5]/30">
          <p className="text-sm">Aucun projet actif</p>
          <p className="text-xs mt-1">Crée ton premier projet pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ProjectModal
        open={modalOpen}
        onClose={handleCloseModal}
        project={editingProject}
      />
    </div>
  );
}
```

- [ ] **Démarrer le dev server, aller sur `/projects`**, vérifier que la page s'affiche, que le bouton "Nouveau projet" ouvre le modal, que créer un projet l'affiche dans la grille.

- [ ] **Vérifier types :** `npx tsc --noEmit`

- [ ] **Commit**
```bash
git add src/modules/projects/components/ProjectsPage.tsx
git commit -m "feat(projects): add ProjectsPage with active projects grid"
```

---

### Task 7 : ProjectArchiveRow + ArchivesPage

**Fichiers :**
- Create: `src/modules/projects/components/ProjectArchiveRow.tsx`
- Create: `src/modules/projects/components/ArchivesPage.tsx`

- [ ] **Créer `ProjectArchiveRow.tsx`**

```typescript
"use client";

import { useRouter } from "next/navigation";
import type { Project } from "@/lib/sidekick-store";
import { Music2, BookOpen, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTOR_ICONS = {
  phono: Music2,
  edition: BookOpen,
  live: Mic2,
};

interface ProjectArchiveRowProps {
  project: Project;
  onUnarchive: (id: string) => void;
}

export function ProjectArchiveRow({ project, onUnarchive }: ProjectArchiveRowProps) {
  const router = useRouter();

  const createdAt = new Date(project.createdAt).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
  const archivedAt = new Date(project.updatedAt).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });

  const linkedCount = [
    project.linkedAlbums.length,
    project.linkedTracks.length,
    project.linkedWorks.length,
    project.linkedTourDates.length,
    project.linkedRehearsals.length,
    project.linkedSessions.length,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-[rgba(245,245,245,0.06)] bg-[rgba(44,44,46,0.4)] hover:bg-[rgba(44,44,46,0.6)] transition-colors">
      {/* Thumbnail */}
      <div
        className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 cursor-pointer"
        onClick={() => router.push(`/projects/${project.id}`)}
      >
        {project.cover ? (
          <img src={project.cover} alt={project.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
            <span className="text-[10px] font-bold text-[#F5F5F5]/20 uppercase">
              {project.title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Titre */}
      <span
        className="flex-1 text-[13px] text-[#F5F5F5]/70 hover:text-[#F5F5F5] cursor-pointer truncate"
        onClick={() => router.push(`/projects/${project.id}`)}
      >
        {project.title}
      </span>

      {/* Secteurs */}
      <div className="flex gap-1.5 flex-shrink-0">
        {project.sectors.map((s) => {
          const Icon = SECTOR_ICONS[s];
          return <Icon key={s} size={12} className="text-[#F5F5F5]/30" />;
        })}
      </div>

      {/* Période */}
      <span className="text-[11px] text-[#F5F5F5]/30 flex-shrink-0 hidden sm:block">
        {createdAt} → {archivedAt}
      </span>

      {/* Compteur éléments */}
      <span className="text-[11px] text-[#F5F5F5]/30 flex-shrink-0 hidden md:block">
        {linkedCount} élément{linkedCount !== 1 ? "s" : ""}
      </span>

      {/* Action */}
      <Button
        size="xs"
        variant="ghost"
        onClick={() => onUnarchive(project.id)}
        className="flex-shrink-0 text-[#F5F5F5]/40 hover:text-[#F5F5F5] text-xs"
      >
        Désarchiver
      </Button>
    </div>
  );
}
```

- [ ] **Créer `ArchivesPage.tsx`**

```typescript
"use client";

import { useSidekickData } from "@/hooks/useSidekickData";
import { ProjectArchiveRow } from "./ProjectArchiveRow";

export function ArchivesPage() {
  const { data, setData } = useSidekickData();

  const archivedProjects = (data.projects?.projects ?? [])
    .filter((p) => p.status === "archived")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const handleUnarchive = (id: string) => {
    const now = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.map((p) =>
          p.id === id ? { ...p, status: "done" as const, updatedAt: now } : p
        ),
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F5F5F5]">Anciens projets</h1>
        <p className="text-sm text-[#F5F5F5]/50 mt-0.5">
          {archivedProjects.length} projet{archivedProjects.length !== 1 ? "s" : ""} archivé{archivedProjects.length !== 1 ? "s" : ""}
        </p>
      </div>

      {archivedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#F5F5F5]/30">
          <p className="text-sm">Aucun projet archivé</p>
        </div>
      ) : (
        <div className="space-y-1">
          {archivedProjects.map((p) => (
            <ProjectArchiveRow key={p.id} project={p} onUnarchive={handleUnarchive} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Vérifier dans le dev server** : archiver un projet depuis la page actifs, vérifier qu'il apparaît dans `/projects/archives`. Désarchiver depuis les archives, vérifier le retour dans les actifs avec statut "done".

- [ ] **Vérifier types :** `npx tsc --noEmit`

- [ ] **Commit**
```bash
git add src/modules/projects/components/ProjectArchiveRow.tsx src/modules/projects/components/ArchivesPage.tsx
git commit -m "feat(projects): add ArchivesPage with compact row layout"
```

---

## Groupe C : Dashboard Projet

### Task 8 : ProjectDashboard — Header + Galerie + Notes

**Fichiers :**
- Create: `src/modules/projects/components/ProjectDashboard.tsx`

- [ ] **Créer le composant** (sections Phono/Edition/Live sont des placeholders ici, remplis dans les tâches 9–12)

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSidekickData } from "@/hooks/useSidekickData";
import { ProjectModal } from "./ProjectModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ImagePlus,
  MoreHorizontal,
  Pencil,
  X,
  ChevronDown,
  Music2,
  BookOpen,
  Mic2,
} from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/sidekick-store";
import { PhonoSection } from "./sections/PhonoSection";
import { EditionSection } from "./sections/EditionSection";
import { LiveSection } from "./sections/LiveSection";
import { WorkTrackLinker } from "./sections/WorkTrackLinker";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idée" },
  { value: "in_progress", label: "En cours" },
  { value: "paused", label: "En pause" },
  { value: "done", label: "Terminé" },
  { value: "archived", label: "Archivé" },
];

const STATUS_COLORS: Record<ProjectStatus, string> = {
  idea: "text-yellow-400",
  in_progress: "text-green-400",
  paused: "text-[#F5F5F5]/40",
  done: "text-blue-400",
  archived: "text-[#F5F5F5]/30",
};

interface ProjectDashboardProps {
  projectId: string;
}

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const router = useRouter();
  const { data, setData } = useSidekickData();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const project = (data.projects?.projects ?? []).find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#F5F5F5]/30">
        <p>Projet introuvable</p>
        <Button variant="ghost" size="sm" onClick={() => router.push("/projects")} className="mt-4">
          <ArrowLeft size={14} className="mr-1.5" />
          Retour aux projets
        </Button>
      </div>
    );
  }

  const updateProject = (updates: Partial<Project>) => {
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.map((p) =>
          p.id === projectId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      },
    }));
  };

  const handleStatusChange = (status: ProjectStatus) => {
    updateProject({ status });
  };

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateProject({ images: [...project.images, ev.target?.result as string] });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (index: number) => {b
    updateProject({ images: project.images.filter((_, i) => i !== index) });
  };

  const handleSaveNotes = () => {
    updateProject({ notes: notesValue });
    setEditingNotes(false);
  };

  const handleDelete = () => {
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.filter((p) => p.id !== projectId),
      },
    }));
    router.push("/projects");
  };

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === project.status);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/40 hover:text-[#F5F5F5] transition-colors"
      >
        <ArrowLeft size={13} />
        Projets
      </button>

      {/* Header */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl overflow-hidden">
        {/* Bannière cover */}
        <div className="relative h-40 bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
          {project.cover ? (
            <img src={project.cover} alt={project.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl font-bold text-[#F5F5F5]/05 uppercase tracking-widest">
                {project.title.charAt(0)}
              </span>
            </div>
          )}
          {/* Actions */}
          <div className="absolute top-3 right-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-[#F5F5F5]/70 hover:text-[#F5F5F5]">
                  <MoreHorizontal size={15} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
                <DropdownMenuItem onClick={() => setEditModalOpen(true)} className="text-[#F5F5F5]/70 hover:text-[#F5F5F5]">
                  <Pencil size={13} className="mr-2" /> Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("archived")} className="text-[#F5F5F5]/70 hover:text-[#F5F5F5]">
                  Archiver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:text-red-300">
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Infos */}
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold text-[#F5F5F5]">{project.title}</h1>
            {/* Statut dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-1.5 text-[12px] font-medium ${STATUS_COLORS[project.status]}`}>
                  {currentStatus?.label}
                  <ChevronDown size={12} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
                {STATUS_OPTIONS.filter((s) => s.value !== "archived").map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className={`text-[12px] ${STATUS_COLORS[opt.value]}`}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {project.description && (
            <p className="text-[13px] text-[#F5F5F5]/60 leading-relaxed">{project.description}</p>
          )}

          {/* Secteurs */}
          {project.sectors.length > 0 && (
            <div className="flex gap-2">
              {project.sectors.map((s) => {
                const Icon = s === "phono" ? Music2 : s === "edition" ? BookOpen : Mic2;
                const label = s === "phono" ? "Phono" : s === "edition" ? "Édition" : "Live";
                return (
                  <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border border-[rgba(245,245,245,0.1)] text-[#F5F5F5]/50">
                    <Icon size={10} /> {label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Membres */}
          {project.members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {project.members.map((m, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[11px] bg-[rgba(245,245,245,0.06)] text-[#F5F5F5]/50">
                  {m.name}{m.role ? ` · ${m.role}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Galerie */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setGalleryOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-[13px] font-medium text-[#F5F5F5]/70 hover:text-[#F5F5F5]"
        >
          <span>Images & mood board</span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#F5F5F5]/30">{project.images.length} image{project.images.length !== 1 ? "s" : ""}</span>
            <ChevronDown size={14} className={`transition-transform ${galleryOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {galleryOpen && (
          <div className="px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              {project.images.map((img, i) => (
                <div key={i} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-[rgba(245,245,245,0.08)]">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/60 rounded-full p-0.5"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
              <label className="flex w-24 h-24 flex-col items-center justify-center rounded-lg border border-dashed border-[rgba(245,245,245,0.15)] text-[#F5F5F5]/30 text-[11px] gap-1 cursor-pointer hover:border-[rgba(245,245,245,0.3)] transition-colors">
                <ImagePlus size={16} />
                Ajouter
                <input type="file" accept="image/*" onChange={handleAddImage} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Sections secteurs */}
      {project.sectors.includes("phono") && <PhonoSection project={project} />}
      {project.sectors.includes("edition") && <EditionSection project={project} />}
      {project.sectors.includes("live") && <LiveSection project={project} />}

      {/* Lien oeuvre ↔ titre (si phono + edition activés) */}
      {project.sectors.includes("phono") && project.sectors.includes("edition") && (
        <WorkTrackLinker project={project} />
      )}

      {/* Notes */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-[#F5F5F5]/70">Notes</h2>
          {!editingNotes && (
            <button
              onClick={() => { setNotesValue(project.notes); setEditingNotes(true); }}
              className="text-[11px] text-[#F5F5F5]/30 hover:text-[#F5F5F5] flex items-center gap-1"
            >
              <Pencil size={11} /> Modifier
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-2">
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] resize-none text-[13px]"
              rows={4}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditingNotes(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSaveNotes}>Enregistrer</Button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-[#F5F5F5]/50 whitespace-pre-wrap min-h-[2rem]">
            {project.notes || <span className="italic text-[#F5F5F5]/20">Pas de notes</span>}
          </p>
        )}
      </div>

      <ProjectModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        project={project}
      />
    </div>
  );
}
```

- [ ] **Vérifier types :** `npx tsc --noEmit` (va échouer car les sections n'existent pas encore — c'est attendu)

- [ ] **Commit partiel** (sans les imports de sections)
  > Note: créer les sections dans les tâches suivantes avant de committer le Dashboard complet.

---

### Task 9 : PhonoSection

**Fichiers :**
- Create: `src/modules/projects/components/sections/PhonoSection.tsx`

- [ ] **Créer le composant**

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useSidekickData } from "@/hooks/useSidekickData";
import type { Project, Album, Track, Session } from "@/lib/sidekick-store";
import { Music2, Plus, Link, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_LABELS: Record<string, string> = {
  en_production: "En production",
  mixe: "Mixé",
  masterise: "Masterisé",
  publie: "Publié",
};

interface PhonoSectionProps {
  project: Project;
}

export function PhonoSection({ project }: PhonoSectionProps) {
  const router = useRouter();
  const { data, setData } = useSidekickData();
  const [linkAlbumOpen, setLinkAlbumOpen] = useState(false);
  const [linkTrackOpen, setLinkTrackOpen] = useState(false);
  const [linkSessionOpen, setLinkSessionOpen] = useState(false);

  const linkedAlbums = (data.phono?.albums ?? []).filter((a) => project.linkedAlbums.includes(a.id));
  const linkedTracks = (data.phono?.tracks ?? []).filter((t) => project.linkedTracks.includes(t.id));
  const linkedSessions = (data.phono?.sessions ?? []).filter((s) => project.linkedSessions.includes(s.id));

  const availableAlbums = (data.phono?.albums ?? []).filter((a) => !project.linkedAlbums.includes(a.id));
  const availableTracks = (data.phono?.tracks ?? []).filter((t) => !project.linkedTracks.includes(t.id));
  const availableSessions = (data.phono?.sessions ?? []).filter((s) => !project.linkedSessions.includes(s.id));

  const totalTracks = linkedTracks.length;
  const publishedTracks = linkedTracks.filter((t) => t.status === "publie").length;

  const updateProjectLinks = (updates: Partial<Pick<Project, "linkedAlbums" | "linkedTracks" | "linkedSessions">>) => {
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.map((p) =>
          p.id === project.id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      },
    }));
  };

  const linkAlbum = (albumId: string) => {
    updateProjectLinks({ linkedAlbums: [...project.linkedAlbums, albumId] });
    setLinkAlbumOpen(false);
  };

  const linkTrack = (trackId: string) => {
    updateProjectLinks({ linkedTracks: [...project.linkedTracks, trackId] });
    setLinkTrackOpen(false);
  };

  const linkSession = (sessionId: string) => {
    updateProjectLinks({ linkedSessions: [...project.linkedSessions, sessionId] });
    setLinkSessionOpen(false);
  };

  return (
    <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music2 size={15} className="text-[#F5F5F5]/50" />
          <h2 className="text-[13px] font-medium text-[#F5F5F5]/70">Phono</h2>
          <span className="text-[11px] text-[#F5F5F5]/30">
            {linkedAlbums.length + linkedTracks.length + linkedSessions.length} élément{linkedAlbums.length + linkedTracks.length + linkedSessions.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Progression titres */}
      {totalTracks > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-[#F5F5F5]/40">
            <span>Titres publiés</span>
            <span>{publishedTracks}/{totalTracks}</span>
          </div>
          <div className="h-1 rounded-full bg-[rgba(245,245,245,0.06)]">
            <div
              className="h-1 rounded-full bg-[#F0FF00]/60"
              style={{ width: `${totalTracks > 0 ? (publishedTracks / totalTracks) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Albums */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#F5F5F5]/30 uppercase tracking-wider">Albums</p>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => setLinkAlbumOpen(true)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Link size={10} className="mr-1" /> Lier
            </Button>
            <Button size="xs" variant="ghost" onClick={() => router.push(`/phono/catalogue?projectId=${project.id}`)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Plus size={10} className="mr-1" /> Créer
            </Button>
          </div>
        </div>
        {linkedAlbums.length === 0 ? (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucun album lié</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linkedAlbums.map((album) => (
              <div
                key={album.id}
                onClick={() => router.push("/phono/catalogue")}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] cursor-pointer hover:bg-[rgba(245,245,245,0.06)] transition-colors"
              >
                {album.cover ? (
                  <img src={album.cover} alt={album.title} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded bg-[rgba(245,245,245,0.08)]" />
                )}
                <div>
                  <p className="text-[12px] text-[#F5F5F5]/80 leading-tight">{album.title}</p>
                  <p className="text-[10px] text-[#F5F5F5]/30">{STATUS_LABELS[album.status] ?? album.status}</p>
                </div>
                <ExternalLink size={10} className="text-[#F5F5F5]/20 ml-1" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Titres */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#F5F5F5]/30 uppercase tracking-wider">Titres</p>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => setLinkTrackOpen(true)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Link size={10} className="mr-1" /> Lier
            </Button>
            <Button size="xs" variant="ghost" onClick={() => router.push(`/phono/catalogue?projectId=${project.id}`)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Plus size={10} className="mr-1" /> Créer
            </Button>
          </div>
        </div>
        {linkedTracks.length === 0 ? (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucun titre lié</p>
        ) : (
          <div className="space-y-1">
            {linkedTracks.map((track) => {
              const linkedWork = track.linkedWorkId
                ? (data.edition?.works ?? []).find((w) => w.id === track.linkedWorkId)
                : null;
              return (
                <div
                  key={track.id}
                  onClick={() => router.push("/phono/catalogue")}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[rgba(245,245,245,0.06)] hover:bg-[rgba(245,245,245,0.04)] cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[#F5F5F5]/80 truncate">{track.title}</p>
                    {linkedWork && (
                      <p className="text-[10px] text-[#F0FF00]/50 truncate">↔ {linkedWork.title}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-[#F5F5F5]/30 flex-shrink-0">{STATUS_LABELS[track.status ?? ""] ?? ""}</span>
                  <ExternalLink size={10} className="text-[#F5F5F5]/20 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sessions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#F5F5F5]/30 uppercase tracking-wider">Sessions studio</p>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => setLinkSessionOpen(true)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Link size={10} className="mr-1" /> Lier
            </Button>
            <Button size="xs" variant="ghost" onClick={() => router.push(`/phono/sessions-studio?projectId=${project.id}`)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Plus size={10} className="mr-1" /> Créer
            </Button>
          </div>
        </div>
        {linkedSessions.length === 0 ? (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucune session liée</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linkedSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => router.push("/phono/sessions-studio")}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] cursor-pointer hover:bg-[rgba(245,245,245,0.06)] transition-colors"
              >
                <p className="text-[12px] text-[#F5F5F5]/80">{session.title}</p>
                {session.date && <p className="text-[10px] text-[#F5F5F5]/30">{session.date}</p>}
                <ExternalLink size={10} className="text-[#F5F5F5]/20" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog lier album */}
      <Dialog open={linkAlbumOpen} onOpenChange={setLinkAlbumOpen}>
        <DialogContent className="max-w-sm bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-[#F5F5F5] text-[14px]">Lier un album</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {availableAlbums.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/30 text-center py-4">Tous les albums sont déjà liés</p>
            ) : availableAlbums.map((a) => (
              <button
                key={a.id}
                onClick={() => linkAlbum(a.id)}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.06)] hover:text-[#F5F5F5] transition-colors"
              >
                {a.cover && <img src={a.cover} alt={a.title} className="w-6 h-6 rounded object-cover" />}
                {a.title}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog lier titre */}
      <Dialog open={linkTrackOpen} onOpenChange={setLinkTrackOpen}>
        <DialogContent className="max-w-sm bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-[#F5F5F5] text-[14px]">Lier un titre</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {availableTracks.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/30 text-center py-4">Tous les titres sont déjà liés</p>
            ) : availableTracks.map((t) => (
              <button
                key={t.id}
                onClick={() => linkTrack(t.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.06)] hover:text-[#F5F5F5] transition-colors"
              >
                {t.title}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog lier session */}
      <Dialog open={linkSessionOpen} onOpenChange={setLinkSessionOpen}>
        <DialogContent className="max-w-sm bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-[#F5F5F5] text-[14px]">Lier une session</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {availableSessions.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/30 text-center py-4">Toutes les sessions sont déjà liées</p>
            ) : availableSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => linkSession(s.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.06)] hover:text-[#F5F5F5] transition-colors"
              >
                {s.title}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Vérifier types :** `npx tsc --noEmit`

- [ ] **Commit**
```bash
git add src/modules/projects/components/sections/PhonoSection.tsx
git commit -m "feat(projects): add PhonoSection for project dashboard"
```

---

### Task 10 : EditionSection

**Fichiers :**
- Create: `src/modules/projects/components/sections/EditionSection.tsx`

- [ ] **Créer le composant**

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSidekickData } from "@/hooks/useSidekickData";
import type { Project } from "@/lib/sidekick-store";
import { BookOpen, Plus, Link, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const WORK_STATUS_LABELS: Record<string, string> = {
  "in-progress": "En cours",
  finalized: "Finalisé",
  "registered-sacem": "Déposé SACEM",
  "accepted-sacem": "Accepté SACEM",
};

interface EditionSectionProps {
  project: Project;
}

export function EditionSection({ project }: EditionSectionProps) {
  const router = useRouter();
  const { data, setData } = useSidekickData();
  const [linkOpen, setLinkOpen] = useState(false);

  const linkedWorks = (data.edition?.works ?? []).filter((w) => project.linkedWorks.includes(w.id));
  const availableWorks = (data.edition?.works ?? []).filter((w) => !project.linkedWorks.includes(w.id));

  const totalWorks = linkedWorks.length;
  const registeredWorks = linkedWorks.filter((w) => w.status === "registered-sacem" || w.status === "accepted-sacem").length;

  const linkWork = (workId: string) => {
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.map((p) =>
          p.id === project.id
            ? { ...p, linkedWorks: [...p.linkedWorks, workId], updatedAt: new Date().toISOString() }
            : p
        ),
      },
    }));
    setLinkOpen(false);
  };

  return (
    <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-[#F5F5F5]/50" />
          <h2 className="text-[13px] font-medium text-[#F5F5F5]/70">Édition</h2>
          <span className="text-[11px] text-[#F5F5F5]/30">{totalWorks} oeuvre{totalWorks !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Progression */}
      {totalWorks > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-[#F5F5F5]/40">
            <span>Oeuvres déposées SACEM</span>
            <span>{registeredWorks}/{totalWorks}</span>
          </div>
          <div className="h-1 rounded-full bg-[rgba(245,245,245,0.06)]">
            <div
              className="h-1 rounded-full bg-[#F0FF00]/60"
              style={{ width: `${totalWorks > 0 ? (registeredWorks / totalWorks) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Oeuvres */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#F5F5F5]/30 uppercase tracking-wider">Oeuvres</p>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => setLinkOpen(true)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Link size={10} className="mr-1" /> Lier
            </Button>
            <Button size="xs" variant="ghost" onClick={() => router.push(`/edition?projectId=${project.id}`)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Plus size={10} className="mr-1" /> Créer
            </Button>
          </div>
        </div>
        {linkedWorks.length === 0 ? (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucune oeuvre liée</p>
        ) : (
          <div className="space-y-1">
            {linkedWorks.map((work) => {
              const linkedTracks = (data.phono?.tracks ?? []).filter((t) => (work.linkedTrackIds ?? []).includes(t.id));
              return (
                <div
                  key={work.id}
                  onClick={() => router.push("/edition")}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[rgba(245,245,245,0.06)] hover:bg-[rgba(245,245,245,0.04)] cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[#F5F5F5]/80 truncate">{work.title}</p>
                    {linkedTracks.length > 0 && (
                      <p className="text-[10px] text-[#F0FF00]/50 truncate">
                        ↔ {linkedTracks.map((t) => t.title).join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-[#F5F5F5]/30 flex-shrink-0">
                    {WORK_STATUS_LABELS[work.status] ?? work.status}
                  </span>
                  <ExternalLink size={10} className="text-[#F5F5F5]/20 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-sm bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-[#F5F5F5] text-[14px]">Lier une oeuvre</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {availableWorks.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/30 text-center py-4">Toutes les oeuvres sont déjà liées</p>
            ) : availableWorks.map((w) => (
              <button
                key={w.id}
                onClick={() => linkWork(w.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.06)] hover:text-[#F5F5F5] transition-colors"
              >
                {w.title}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Vérifier types :** `npx tsc --noEmit`

- [ ] **Commit**
```bash
git add src/modules/projects/components/sections/EditionSection.tsx
git commit -m "feat(projects): add EditionSection for project dashboard"
```

---

### Task 11 : LiveSection

**Fichiers :**
- Create: `src/modules/projects/components/sections/LiveSection.tsx`

- [ ] **Créer le composant**

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSidekickData } from "@/hooks/useSidekickData";
import type { Project } from "@/lib/sidekick-store";
import { Mic2, Plus, Link, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LiveSectionProps {
  project: Project;
}

export function LiveSection({ project }: LiveSectionProps) {
  const router = useRouter();
  const { data, setData } = useSidekickData();
  const [linkDateOpen, setLinkDateOpen] = useState(false);
  const [linkRepetOpen, setLinkRepetOpen] = useState(false);

  const linkedTourDates = (data.live?.tourDates ?? []).filter((d) => project.linkedTourDates.includes(d.id));
  const linkedRehearsals = (data.live?.rehearsals ?? []).filter((r) => project.linkedRehearsals.includes(r.id));
  const availableTourDates = (data.live?.tourDates ?? []).filter((d) => !project.linkedTourDates.includes(d.id));
  const availableRehearsals = (data.live?.rehearsals ?? []).filter((r) => !project.linkedRehearsals.includes(r.id));

  const totalDates = linkedTourDates.length;
  const playedDates = linkedTourDates.filter((d) => d.status === "done" || d.status === "played").length;

  const updateLinks = (updates: Partial<Pick<Project, "linkedTourDates" | "linkedRehearsals">>) => {
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.map((p) =>
          p.id === project.id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      },
    }));
  };

  return (
    <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Mic2 size={15} className="text-[#F5F5F5]/50" />
        <h2 className="text-[13px] font-medium text-[#F5F5F5]/70">Live</h2>
        <span className="text-[11px] text-[#F5F5F5]/30">
          {totalDates + linkedRehearsals.length} élément{totalDates + linkedRehearsals.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Progression dates */}
      {totalDates > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-[#F5F5F5]/40">
            <span>Dates jouées</span>
            <span>{playedDates}/{totalDates}</span>
          </div>
          <div className="h-1 rounded-full bg-[rgba(245,245,245,0.06)]">
            <div
              className="h-1 rounded-full bg-[#F0FF00]/60"
              style={{ width: `${totalDates > 0 ? (playedDates / totalDates) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Représentations */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#F5F5F5]/30 uppercase tracking-wider">Représentations</p>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => setLinkDateOpen(true)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Link size={10} className="mr-1" /> Lier
            </Button>
            <Button size="xs" variant="ghost" onClick={() => router.push(`/live/representations?projectId=${project.id}`)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Plus size={10} className="mr-1" /> Créer
            </Button>
          </div>
        </div>
        {linkedTourDates.length === 0 ? (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucune date liée</p>
        ) : (
          <div className="space-y-1">
            {linkedTourDates.map((d) => (
              <div
                key={d.id}
                onClick={() => router.push("/live/representations")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[rgba(245,245,245,0.06)] hover:bg-[rgba(245,245,245,0.04)] cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#F5F5F5]/80 truncate">{d.venue || d.city}</p>
                  <p className="text-[10px] text-[#F5F5F5]/40">{d.city} · {d.date}</p>
                </div>
                <ExternalLink size={10} className="text-[#F5F5F5]/20 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Répétitions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#F5F5F5]/30 uppercase tracking-wider">Répétitions</p>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => setLinkRepetOpen(true)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Link size={10} className="mr-1" /> Lier
            </Button>
            <Button size="xs" variant="ghost" onClick={() => router.push(`/live/repetitions?projectId=${project.id}`)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Plus size={10} className="mr-1" /> Créer
            </Button>
          </div>
        </div>
        {linkedRehearsals.length === 0 ? (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucune répétition liée</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linkedRehearsals.map((r) => (
              <div
                key={r.id}
                onClick={() => router.push("/live/repetitions")}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] cursor-pointer hover:bg-[rgba(245,245,245,0.06)] transition-colors"
              >
                <p className="text-[12px] text-[#F5F5F5]/70">{r.label || r.date}</p>
                <ExternalLink size={10} className="text-[#F5F5F5]/20" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog représentations */}
      <Dialog open={linkDateOpen} onOpenChange={setLinkDateOpen}>
        <DialogContent className="max-w-sm bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
          <DialogHeader><DialogTitle className="text-[#F5F5F5] text-[14px]">Lier une représentation</DialogTitle></DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {availableTourDates.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/30 text-center py-4">Toutes les dates sont déjà liées</p>
            ) : availableTourDates.map((d) => (
              <button
                key={d.id}
                onClick={() => { updateLinks({ linkedTourDates: [...project.linkedTourDates, d.id] }); setLinkDateOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.06)] hover:text-[#F5F5F5] transition-colors"
              >
                {d.venue || d.city} — {d.date}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog répétitions */}
      <Dialog open={linkRepetOpen} onOpenChange={setLinkRepetOpen}>
        <DialogContent className="max-w-sm bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
          <DialogHeader><DialogTitle className="text-[#F5F5F5] text-[14px]">Lier une répétition</DialogTitle></DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {availableRehearsals.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/30 text-center py-4">Toutes les répétitions sont déjà liées</p>
            ) : availableRehearsals.map((r) => (
              <button
                key={r.id}
                onClick={() => { updateLinks({ linkedRehearsals: [...project.linkedRehearsals, r.id] }); setLinkRepetOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.06)] hover:text-[#F5F5F5] transition-colors"
              >
                {r.label || r.date}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Vérifier types :** `npx tsc --noEmit`

- [ ] **Commit**
```bash
git add src/modules/projects/components/sections/LiveSection.tsx
git commit -m "feat(projects): add LiveSection for project dashboard"
```

---

### Task 12 : WorkTrackLinker (association oeuvre ↔ titre)

**Fichiers :**
- Create: `src/modules/projects/components/sections/WorkTrackLinker.tsx`

- [ ] **Créer le composant**

```typescript
"use client";

import { useState } from "react";
import { useSidekickData } from "@/hooks/useSidekickData";
import type { Project } from "@/lib/sidekick-store";
import { Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WorkTrackLinkerProps {
  project: Project;
}

export function WorkTrackLinker({ project }: WorkTrackLinkerProps) {
  const { data, setData } = useSidekickData();
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [selectedWorkId, setSelectedWorkId] = useState("");

  const linkedTracks = (data.phono?.tracks ?? []).filter((t) => project.linkedTracks.includes(t.id));
  const linkedWorks = (data.edition?.works ?? []).filter((w) => project.linkedWorks.includes(w.id));

  // Paires existantes : titres qui ont déjà une oeuvre
  const existingPairs = linkedTracks
    .filter((t) => t.linkedWorkId && linkedWorks.some((w) => w.id === t.linkedWorkId))
    .map((t) => ({
      track: t,
      work: linkedWorks.find((w) => w.id === t.linkedWorkId)!,
    }));

  const handleLink = () => {
    if (!selectedTrackId || !selectedWorkId) return;

    setData((prev) => ({
      ...prev,
      phono: {
        ...prev.phono,
        tracks: prev.phono.tracks.map((t) =>
          t.id === selectedTrackId ? { ...t, linkedWorkId: selectedWorkId } : t
        ),
      },
      edition: {
        ...prev.edition,
        works: prev.edition.works.map((w) =>
          w.id === selectedWorkId
            ? { ...w, linkedTrackIds: [...new Set([...(w.linkedTrackIds ?? []), selectedTrackId])] }
            : w
        ),
      },
    }));

    setSelectedTrackId("");
    setSelectedWorkId("");
  };

  const handleUnlink = (trackId: string, workId: string) => {
    setData((prev) => ({
      ...prev,
      phono: {
        ...prev.phono,
        tracks: prev.phono.tracks.map((t) =>
          t.id === trackId ? { ...t, linkedWorkId: undefined } : t
        ),
      },
      edition: {
        ...prev.edition,
        works: prev.edition.works.map((w) =>
          w.id === workId
            ? { ...w, linkedTrackIds: (w.linkedTrackIds ?? []).filter((id) => id !== trackId) }
            : w
        ),
      },
    }));
  };

  // Titres sans oeuvre liée parmi les liés au projet
  const unlinkdTracks = linkedTracks.filter((t) => !t.linkedWorkId || !linkedWorks.some((w) => w.id === t.linkedWorkId));
  // Oeuvres disponibles pour le sélecteur
  const availableWorks = linkedWorks;

  if (linkedTracks.length === 0 || linkedWorks.length === 0) return null;

  return (
    <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 size={15} className="text-[#F0FF00]/60" />
        <h2 className="text-[13px] font-medium text-[#F5F5F5]/70">Associations Titre ↔ Oeuvre</h2>
      </div>

      {/* Associations existantes */}
      {existingPairs.length > 0 && (
        <div className="space-y-1">
          {existingPairs.map(({ track, work }) => (
            <div key={track.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(240,255,0,0.04)] border border-[rgba(240,255,0,0.12)]">
              <span className="text-[12px] text-[#F5F5F5]/80 flex-1">{track.title}</span>
              <span className="text-[10px] text-[#F0FF00]/50">↔</span>
              <span className="text-[12px] text-[#F5F5F5]/80 flex-1 text-right">{work.title}</span>
              <button
                onClick={() => handleUnlink(track.id, work.id)}
                className="ml-2 text-[#F5F5F5]/20 hover:text-red-400 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Créer une nouvelle association */}
      {unlinkdTracks.length > 0 && availableWorks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-[#F5F5F5]/30">Associer un titre à une oeuvre</p>
          <div className="flex items-center gap-2">
            <Select value={selectedTrackId} onValueChange={setSelectedTrackId}>
              <SelectTrigger className="flex-1 h-8 text-[12px] bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5]">
                <SelectValue placeholder="Titre..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
                {unlinkdTracks.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-[12px] text-[#F5F5F5]/70">
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[#F5F5F5]/30 text-[11px]">↔</span>
            <Select value={selectedWorkId} onValueChange={setSelectedWorkId}>
              <SelectTrigger className="flex-1 h-8 text-[12px] bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5]">
                <SelectValue placeholder="Oeuvre..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
                {availableWorks.map((w) => (
                  <SelectItem key={w.id} value={w.id} className="text-[12px] text-[#F5F5F5]/70">
                    {w.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="xs"
              onClick={handleLink}
              disabled={!selectedTrackId || !selectedWorkId}
              className="h-8 flex-shrink-0"
            >
              <Link2 size={12} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Committer maintenant le dashboard complet** (les imports sont maintenant résolus)

```bash
git add src/modules/projects/components/ProjectDashboard.tsx src/modules/projects/components/sections/WorkTrackLinker.tsx
git commit -m "feat(projects): add ProjectDashboard with WorkTrackLinker"
```

- [ ] **Vérifier dans le dev server** : naviguer vers un projet, vérifier que le dashboard s'affiche avec les sections correspondant aux secteurs activés. Lier quelques éléments Phono + Édition, puis associer un titre à une oeuvre depuis WorkTrackLinker.

- [ ] **Vérifier types :** `npx tsc --noEmit`

---

## Groupe D : Intégrations Cross-modules

### Task 13 : Badge Projet dans Phono (CatalogPage)

**Fichiers :**
- Modify: `src/modules/phono/components/CatalogPage.tsx`

**Objectif :** Sur chaque titre du catalogue, afficher un badge cliquable vers le(s) projet(s) auxquels il est rattaché. Et sur la fiche oeuvre, afficher le lien oeuvre associée si `linkedWorkId` existe.

- [ ] **Ajouter un helper `useProjectsForItem`** au début de `CatalogPage.tsx`, après les imports existants

```typescript
import { useSidekickData } from "@/hooks/useSidekickData";
// (déjà importé normalement)

function getProjectsForTrack(projects: import("@/lib/sidekick-store").Project[], trackId: string) {
  return projects.filter((p) => p.linkedTracks.includes(trackId));
}
```

- [ ] **Dans le rendu de chaque carte/ligne de titre**, ajouter un badge projet. Localiser où les titres sont affichés dans `CatalogPage.tsx` (chercher la liste des tracks rendus), et ajouter après le titre :

```typescript
// À insérer dans la section qui affiche un Track, après son titre
{(() => {
  const trackProjects = getProjectsForTrack(data.projects?.projects ?? [], track.id);
  if (trackProjects.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {trackProjects.map((p) => (
        <a
          key={p.id}
          href={`/projects/${p.id}`}
          className="px-1.5 py-0.5 rounded text-[10px] bg-[#F0FF00]/10 text-[#F0FF00]/60 hover:text-[#F0FF00] border border-[#F0FF00]/20 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {p.title}
        </a>
      ))}
    </div>
  );
})()}
```

> Note: Adapter l'insertion au contexte exact du composant (la variable peut s'appeler `track`, `item`, ou autre selon le code). Chercher la propriété `track.title` dans le JSX pour trouver le bon emplacement.

- [ ] **Vérifier types :** `npx tsc --noEmit`

- [ ] **Vérifier dans le dev server** : créer un projet, lier un titre, aller dans Phono → Catalogue, vérifier que le badge apparaît sur le titre lié.

- [ ] **Commit**
```bash
git add src/modules/phono/components/CatalogPage.tsx
git commit -m "feat(projects): add project badge on tracks in CatalogPage"
```

---

### Task 14 : Badge Projet dans Édition (WorksPage)

**Fichiers :**
- Modify: `src/modules/edition/components/WorksPage.tsx`

- [ ] **Ajouter un helper en haut du fichier** (après les imports)

```typescript
function getProjectsForWork(projects: import("@/lib/sidekick-store").Project[], workId: string) {
  return projects.filter((p) => p.linkedWorks.includes(workId));
}
```

- [ ] **Dans le rendu de chaque oeuvre**, localiser où `work.title` est affiché dans le JSX, et ajouter après le titre :

```typescript
{(() => {
  const workProjects = getProjectsForWork(data.projects?.projects ?? [], work.id);
  if (workProjects.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {workProjects.map((p) => (
        <a
          key={p.id}
          href={`/projects/${p.id}`}
          className="px-1.5 py-0.5 rounded text-[10px] bg-[#F0FF00]/10 text-[#F0FF00]/60 hover:text-[#F0FF00] border border-[#F0FF00]/20 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {p.title}
        </a>
      ))}
    </div>
  );
})()}
```

- [ ] **Aussi** : si une oeuvre a des `linkedTrackIds`, afficher les titres associés. Localiser la section où le statut de l'oeuvre est affiché et ajouter :

```typescript
{work.linkedTrackIds && work.linkedTrackIds.length > 0 && (() => {
  const tracks = (data.phono?.tracks ?? []).filter((t) => work.linkedTrackIds!.includes(t.id));
  if (tracks.length === 0) return null;
  return (
    <p className="text-[10px] text-[#F0FF00]/50 mt-0.5">
      ↔ {tracks.map((t) => t.title).join(", ")}
    </p>
  );
})()}
```

- [ ] **Vérifier types :** `npx tsc --noEmit`

- [ ] **Commit**
```bash
git add src/modules/edition/components/WorksPage.tsx
git commit -m "feat(projects): add project badge and linked tracks on works in WorksPage"
```

---

### Task 15 : `?projectId` handling — auto-lien à la création

**Contexte :** Quand un utilisateur clique "Créer" depuis le dashboard projet, il est redirigé vers un module avec `?projectId=xxx`. À la sauvegarde de l'élément créé, il doit être automatiquement lié au projet.

**Fichiers :**
- Modify: `src/modules/phono/components/CatalogPage.tsx`
- Modify: `src/modules/edition/components/WorksPage.tsx`

> Note: `TourDatesPage` et `RehearsalsPage` utilisent `useLocalStorage` avec leurs propres types (non reliés à `useSidekickData`). Pour ces modules, le lien depuis le projet est manuel via "Lier un existant" dans `LiveSection`. Ne pas toucher ces fichiers.

- [ ] **Dans `CatalogPage.tsx`**, lire le paramètre `projectId` à la création d'un titre/album :

Ajouter en haut du composant :
```typescript
import { useSearchParams } from "next/navigation";

// dans le composant :
const searchParams = useSearchParams();
const projectIdParam = searchParams.get("projectId");
```

Puis, dans la fonction de sauvegarde d'un nouveau titre (chercher où `data.phono.tracks` est mis à jour avec un nouvel élément), ajouter après la sauvegarde du titre :

```typescript
// Auto-lier au projet si ?projectId présent
if (projectIdParam) {
  const newTrackId = newTrack.id; // adapter au nom de la variable du nouveau titre
  setData((prev) => ({
    ...prev,
    projects: {
      projects: prev.projects.projects.map((p) =>
        p.id === projectIdParam
          ? { ...p, linkedTracks: [...new Set([...p.linkedTracks, newTrackId])], updatedAt: new Date().toISOString() }
          : p
      ),
    },
  }));
}
```

> Adapter `newTrack.id` au nom exact de la variable dans le code existant. Chercher `crypto.randomUUID()` ou `id:` dans la fonction de création de titre pour trouver la variable.

- [ ] **Dans `WorksPage.tsx`**, même logique pour les oeuvres :

```typescript
import { useSearchParams } from "next/navigation";

const searchParams = useSearchParams();
const projectIdParam = searchParams.get("projectId");
```

Dans la fonction de sauvegarde d'une nouvelle oeuvre :

```typescript
if (projectIdParam) {
  const newWorkId = newWork.id; // adapter
  setData((prev) => ({
    ...prev,
    projects: {
      projects: prev.projects.projects.map((p) =>
        p.id === projectIdParam
          ? { ...p, linkedWorks: [...new Set([...p.linkedWorks, newWorkId])], updatedAt: new Date().toISOString() }
          : p
      ),
    },
  }));
}
```

- [ ] **Vérifier types :** `npx tsc --noEmit`

- [ ] **Vérifier dans le dev server** : depuis un projet avec Phono activé, cliquer "Créer" sur la section Titres. Créer un titre. Revenir au projet (bouton back), vérifier que le titre est automatiquement listé dans la section Phono.

- [ ] **Commit**
```bash
git add src/modules/phono/components/CatalogPage.tsx src/modules/edition/components/WorksPage.tsx
git commit -m "feat(projects): auto-link created items via ?projectId param"
```

---

## Self-Review

**Spec coverage :**
- ✅ Modèle de données `Project`, `ProjectMember` (Task 1)
- ✅ `linkedWorkId` sur `Track`, `linkedTrackIds` sur `Work` (Task 1)
- ✅ Sidebar — section Projets en premier dans Musique (Task 2)
- ✅ Routes `/projects`, `/projects/archives`, `/projects/[id]` (Task 3)
- ✅ Modal création/édition avec titre, description, statut, secteurs, images, membres (Task 4)
- ✅ ProjectCard avec cover, statut, secteurs, membres, date (Task 5)
- ✅ Page projets actifs — grille avec filtres futurs (Task 6)
- ✅ Archives — liste compacte avec infos essentielles (Task 7)
- ✅ Dashboard — bannière, statut inline, membres, galerie mood board, notes (Task 8)
- ✅ Section Phono — albums, titres, sessions + barres progression (Task 9)
- ✅ Section Édition — oeuvres + barres progression (Task 10)
- ✅ Section Live — représentations + répétitions + barres progression (Task 11)
- ✅ Association oeuvre ↔ titre bidirectionnelle (Task 12)
- ✅ Badge Projet dans Phono (Task 13)
- ✅ Badge Projet + titres liés dans Édition (Task 14)
- ✅ `?projectId` auto-lien sur Phono + Édition (Task 15)

**Hors scope confirmé :** Timeline/Gantt, budget, chat, badges dans Live (TourDatesPage/RehearsalsPage utilisent useLocalStorage avec leurs propres types incompatibles avec useSidekickData — lien via "Lier un existant" dans LiveSection suffit pour le MVP).
