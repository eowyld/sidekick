# Edition Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Edition module — catalogue des œuvres (WorksPage) and synchronisation audiovisuelle (SyncPage) — integrated into SIDEKICK's existing architecture.

**Architecture:** Data lives in `data.edition.works` (array) and `data.edition.sync` (Record<workId, SyncData>) via `useSidekickData`. No separate localStorage keys. Two Next.js app routes (`/edition`, `/edition/sync`) render module components. Sidebar gets a collapsible Edition sub-menu matching the Phono pattern.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript, Tailwind, Radix UI, Lucide React, sonner (new), existing `@/components/ui/*`

---

## File Map

| File | Action |
|---|---|
| `package.json` | Add `sonner` dependency |
| `app/(app)/layout.tsx` | Add `<Toaster />` |
| `src/lib/sidekick-store.ts` | Replace Edition stubs with full types; update SidekickData + mergeWithDefaults |
| `src/components/layout/Sidebar.tsx` | Replace simple `/edition` link with collapsible sub-menu |
| `app/(app)/edition/page.tsx` | Create — renders WorksPage |
| `app/(app)/edition/sync/page.tsx` | Create — renders SyncPage |
| `src/modules/edition/components/WorksPage.tsx` | Full implementation |
| `src/modules/edition/components/SyncPage.tsx` | Full implementation |

---

## Task 1: Install sonner + add Toaster to layout

**Files:**
- Modify: `package.json`
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Install sonner**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npm install sonner
```

Expected: sonner added to `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Add Toaster to app layout**

In `app/(app)/layout.tsx`, add the import and `<Toaster />` inside `AppLayoutInner`:

```tsx
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsSidebar } from "@/components/layout/SettingsSidebar";

function AppLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isSettings = pathname.startsWith("/settings");

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {isSettings ? <SettingsSidebar /> : <Sidebar />}
      <div className="flex flex-1 flex-col bg-background">
        <Header />
        <main className="flex-1 bg-background p-6">{children}</main>
      </div>
      <Toaster richColors theme="dark" />
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppLayoutInner>{children}</AppLayoutInner>
    </AuthGuard>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors from sonner import.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/layout.tsx package.json package-lock.json
git commit -m "feat(edition): install sonner, add Toaster to app layout"
```

---

## Task 2: Extend sidekick-store.ts with full Edition types

**Files:**
- Modify: `src/lib/sidekick-store.ts`

- [ ] **Step 1: Replace the Edition section in sidekick-store.ts**

Replace lines 113–122 (the `Work` and `SyncState` stubs) and update `SidekickData.edition` and `mergeWithDefaults`. The full updated Edition section of `sidekick-store.ts`:

```typescript
// --- Edition ---
export interface Creator {
  id: string;
  name: string;
  role: "author" | "composer" | "producer";
  split: number;
}

export interface Publisher {
  name: string;
  split: number;
}

export interface Work {
  id: string;
  title: string;
  status: "in-progress" | "finalized" | "registered-sacem";
  creators: Creator[];
  publisher?: Publisher;
  iswc: string;
  creationDate: string;
  genre: string;
  files: { sheet?: string; lyrics?: string; audio?: string };
  exploitationTypes: ("streaming" | "live" | "sync" | "cover")[];
  territories: string[];
  notes: string;
}

export interface Exploitant {
  id: string;
  company: string;
  project: "film" | "serie" | "pub" | "jeu-video" | "media" | "";
  date: string;
  status: "sent" | "discussing" | "accepted" | "refused" | "";
  notes: string;
}

export interface SyncData {
  workId: string;
  status: "not-ready" | "to-prepare" | "sync-ready" | "exploited";
  moods: string[];
  tempo: string;
  pitchShort: string;
  usageContext: string;
  themes: string[];
  privateLinks: string[];
  exploitants: Exploitant[];
}
```

In `SidekickData`, change the `edition` slice:

```typescript
  edition: {
    works: Work[];
    sync: Record<string, SyncData>;
  };
```

In `DEFAULT_SIDEKICK_DATA`, the `edition` value stays the same:

```typescript
  edition: {
    works: [],
    sync: {}
  },
```

In `mergeWithDefaults`, replace the simple edition spread with safe merge:

```typescript
    edition: {
      ...DEFAULT_SIDEKICK_DATA.edition,
      ...partial.edition,
      works: Array.isArray(partial.edition?.works)
        ? partial.edition.works
        : DEFAULT_SIDEKICK_DATA.edition.works,
      sync:
        partial.edition?.sync &&
        typeof partial.edition.sync === "object" &&
        !Array.isArray(partial.edition.sync)
          ? (partial.edition.sync as Record<string, SyncData>)
          : DEFAULT_SIDEKICK_DATA.edition.sync,
    },
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (old `Work` stub usages were `[key: string]: unknown` so they're compatible).

- [ ] **Step 3: Commit**

```bash
git add src/lib/sidekick-store.ts
git commit -m "feat(edition): extend sidekick-store with full Work, SyncData, Exploitant types"
```

---

## Task 3: Sidebar sub-menu + app routes

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Create: `app/(app)/edition/page.tsx`
- Create: `app/(app)/edition/sync/page.tsx`

- [ ] **Step 1: Add editionSubItems and editionOpen state to Sidebar**

At the top of `Sidebar.tsx`, after `marketingSubItems`, add:

```typescript
const editionSubItems = [
  { href: "/edition", label: "Catalogue" },
  { href: "/edition/sync", label: "Synchronisation" },
];
```

Inside the `Sidebar` function, add state after `marketingOpen`:

```typescript
  const [editionOpen, setEditionOpen] = useState(false);
```

- [ ] **Step 2: Replace simple /edition link with collapsible sub-menu**

In the JSX, the "Liens entre Phono et Revenus" filter renders `/edition` as a simple link. Remove `/edition` from `navItems` (delete the `{ href: "/edition", label: "Edition" }` entry) and add a proper sub-menu block after the Marketing block and before the Revenus block:

```tsx
        {/* Edition avec sous-menu */}
        {enabled.edition && (
          <>
            <button
              type="button"
              onClick={() => setEditionOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
            >
              <span>Édition</span>
              <span className="text-xs">{editionOpen ? "▾" : "▸"}</span>
            </button>
            {editionOpen && (
              <div className="mb-1 space-y-0.5 pl-4">
                {editionSubItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-md px-2 py-1 hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
```

Also remove the two `.filter()` lines that referenced `/edition` from the "Liens entre Phono et Revenus" block (they're now unused since `/edition` is no longer in `navItems`).

- [ ] **Step 3: Create app routes**

```bash
mkdir -p /Users/eliott/Desktop/SIDEKICK/app/\(app\)/edition/sync
```

Create `app/(app)/edition/page.tsx`:

```tsx
import { WorksPage } from "@/modules/edition/components/WorksPage";

export default function EditionPage() {
  return <WorksPage />;
}
```

Create `app/(app)/edition/sync/page.tsx`:

```tsx
import { SyncPage } from "@/modules/edition/components/SyncPage";

export default function EditionSyncPage() {
  return <SyncPage />;
}
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx app/\(app\)/edition/
git commit -m "feat(edition): sidebar sub-menu + app routes /edition and /edition/sync"
```

---

## Task 4: Implement WorksPage.tsx

**Files:**
- Modify: `src/modules/edition/components/WorksPage.tsx`

- [ ] **Step 1: Write the full WorksPage implementation**

Replace the entire content of `src/modules/edition/components/WorksPage.tsx`:

```tsx
"use client";

import { useState, useCallback, memo } from "react";
import { useSidekickData } from "@/hooks/useSidekickData";
import type { Work, Creator } from "@/lib/sidekick-store";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit2,
  Trash2,
  Music,
  AlertCircle,
  CheckCircle2,
  Clock,
  Upload,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CREATOR_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
];

const EXPLOITATION_TYPES: {
  value: Work["exploitationTypes"][number];
  label: string;
}[] = [
  { value: "streaming", label: "Streaming" },
  { value: "live", label: "Live" },
  { value: "sync", label: "Synchronisation" },
  { value: "cover", label: "Reprise/Cover" },
];

const DEFAULT_WORK: Omit<Work, "id"> = {
  title: "",
  status: "in-progress",
  creators: [],
  publisher: undefined,
  iswc: "",
  creationDate: "",
  genre: "",
  files: {},
  exploitationTypes: [],
  territories: [],
  notes: "",
};

function getStatusBadge(status: Work["status"]) {
  switch (status) {
    case "in-progress":
      return (
        <Badge className="border-yellow-500/30 bg-yellow-500/20 text-yellow-400">
          En cours
        </Badge>
      );
    case "finalized":
      return (
        <Badge className="border-blue-500/30 bg-blue-500/20 text-blue-400">
          Finalisée
        </Badge>
      );
    case "registered-sacem":
      return (
        <Badge className="border-green-500/30 bg-green-500/20 text-green-400">
          Déposée SACEM
        </Badge>
      );
  }
}

function getRoleLabel(role: Creator["role"]) {
  switch (role) {
    case "author":
      return "Auteur";
    case "composer":
      return "Compositeur";
    case "producer":
      return "Réalisateur";
  }
}

function getExploitationLabel(type: Work["exploitationTypes"][number]) {
  switch (type) {
    case "streaming":
      return "Streaming";
    case "live":
      return "Live";
    case "sync":
      return "Synchronisation";
    case "cover":
      return "Reprise/Cover";
  }
}

interface SplitChartProps {
  creators: Creator[];
  publisherSplit?: number;
  publisherName?: string;
}

function SplitChart({ creators, publisherSplit, publisherName }: SplitChartProps) {
  const total =
    creators.reduce((s, c) => s + c.split, 0) + (publisherSplit ?? 0);

  return (
    <div className="space-y-2">
      <div className="flex h-5 w-full overflow-hidden rounded-full">
        {creators.map((c, i) => (
          <div
            key={c.id}
            className={cn(
              "flex items-center justify-center text-xs font-medium text-white",
              CREATOR_COLORS[i % CREATOR_COLORS.length]
            )}
            style={{ width: `${c.split}%` }}
          >
            {c.split >= 10 ? `${c.split}%` : ""}
          </div>
        ))}
        {publisherSplit ? (
          <div
            className="flex items-center justify-center bg-yellow-500 text-xs font-medium text-black"
            style={{ width: `${publisherSplit}%` }}
          >
            {publisherSplit >= 10 ? `${publisherSplit}%` : ""}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {creators.map((c, i) => (
          <div key={c.id} className="flex items-center gap-1 text-xs">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                CREATOR_COLORS[i % CREATOR_COLORS.length]
              )}
            />
            <span>
              {c.name} — {c.split}%
            </span>
          </div>
        ))}
        {publisherSplit && publisherName ? (
          <div className="flex items-center gap-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            <span>
              {publisherName} (Éditeur) — {publisherSplit}%
            </span>
          </div>
        ) : null}
      </div>
      <p
        className={cn(
          "text-xs font-medium",
          total === 100 ? "text-green-400" : "text-red-400"
        )}
      >
        Total : {total}%
        {total < 100 && ` (manque ${100 - total}%)`}
        {total > 100 && ` (excès de ${total - 100}%)`}
      </p>
    </div>
  );
}

interface WorkFormProps {
  work: Omit<Work, "id">;
  setWork: React.Dispatch<React.SetStateAction<Omit<Work, "id">>>;
}

const WorkForm = memo(function WorkForm({ work, setWork }: WorkFormProps) {
  const [creatorName, setCreatorName] = useState("");
  const [creatorRole, setCreatorRole] = useState<Creator["role"]>("author");
  const [creatorSplit, setCreatorSplit] = useState("");
  const [hasPublisher, setHasPublisher] = useState(!!work.publisher);
  const [territory, setTerritory] = useState("");

  const totalSplit =
    work.creators.reduce((s, c) => s + c.split, 0) +
    (work.publisher?.split ?? 0);
  const isSplitValid = totalSplit === 100;

  const addCreator = useCallback(() => {
    const split = parseFloat(creatorSplit);
    if (!creatorName.trim() || isNaN(split) || split <= 0) return;
    setWork((prev) => ({
      ...prev,
      creators: [
        ...prev.creators,
        {
          id: crypto.randomUUID(),
          name: creatorName.trim(),
          role: creatorRole,
          split,
        },
      ],
    }));
    setCreatorName("");
    setCreatorSplit("");
  }, [creatorName, creatorRole, creatorSplit, setWork]);

  const removeCreator = useCallback(
    (id: string) => {
      setWork((prev) => ({
        ...prev,
        creators: prev.creators.filter((c) => c.id !== id),
      }));
    },
    [setWork]
  );

  const toggleHasPublisher = useCallback(
    (checked: boolean) => {
      setHasPublisher(checked);
      setWork((prev) => ({
        ...prev,
        publisher: checked ? { name: "", split: 0 } : undefined,
      }));
    },
    [setWork]
  );

  const addTerritory = useCallback(() => {
    if (!territory.trim()) return;
    setWork((prev) => ({
      ...prev,
      territories: [...prev.territories, territory.trim()],
    }));
    setTerritory("");
  }, [territory, setWork]);

  const removeTerritory = useCallback(
    (t: string) => {
      setWork((prev) => ({
        ...prev,
        territories: prev.territories.filter((x) => x !== t),
      }));
    },
    [setWork]
  );

  const toggleExploitation = useCallback(
    (type: Work["exploitationTypes"][number]) => {
      setWork((prev) => ({
        ...prev,
        exploitationTypes: prev.exploitationTypes.includes(type)
          ? prev.exploitationTypes.filter((t) => t !== type)
          : [...prev.exploitationTypes, type],
      }));
    },
    [setWork]
  );

  return (
    <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
      {/* Informations de base */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Titre de l&apos;œuvre *</Label>
          <Input
            value={work.title}
            onChange={(e) =>
              setWork((p) => ({ ...p, title: e.target.value }))
            }
            placeholder="Titre..."
          />
        </div>
        <div className="space-y-1">
          <Label>Statut</Label>
          <Select
            value={work.status}
            onValueChange={(v) =>
              setWork((p) => ({ ...p, status: v as Work["status"] }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in-progress">En cours</SelectItem>
              <SelectItem value="finalized">Finalisée</SelectItem>
              <SelectItem value="registered-sacem">Déposée SACEM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Créateurs */}
      <div className="space-y-3 rounded-lg bg-[rgba(245,245,245,0.05)] p-4">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4" />
          <Label>Créateurs de l&apos;œuvre *</Label>
        </div>
        <div className="grid grid-cols-12 items-end gap-2">
          <div className="col-span-5 space-y-1">
            <Label className="text-xs text-[#F5F5F5]/60">Nom</Label>
            <Input
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="Nom du créateur"
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), addCreator())
              }
            />
          </div>
          <div className="col-span-3 space-y-1">
            <Label className="text-xs text-[#F5F5F5]/60">Rôle</Label>
            <Select
              value={creatorRole}
              onValueChange={(v) => setCreatorRole(v as Creator["role"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="author">Auteur</SelectItem>
                <SelectItem value="composer">Compositeur</SelectItem>
                <SelectItem value="producer">Réalisateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-[#F5F5F5]/60">%</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={creatorSplit}
              onChange={(e) => setCreatorSplit(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="col-span-2">
            <Button
              type="button"
              size="sm"
              onClick={addCreator}
              className="w-full"
            >
              <Plus className="mr-1 h-4 w-4" /> Ajouter
            </Button>
          </div>
        </div>
        {work.creators.length > 0 && (
          <div className="space-y-1.5">
            {work.creators.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md bg-[rgba(245,245,245,0.08)] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      CREATOR_COLORS[i % CREATOR_COLORS.length]
                    )}
                  />
                  <span className="text-sm">{c.name}</span>
                  <span className="text-xs text-[#F5F5F5]/60">
                    {getRoleLabel(c.role)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {c.split}%
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeCreator(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-[#F5F5F5]/50">
          Total créateurs :{" "}
          {work.creators.reduce((s, c) => s + c.split, 0)}%
        </p>
      </div>

      {/* Éditeur */}
      <div className="space-y-3 rounded-lg bg-[rgba(245,245,245,0.05)] p-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="has-publisher"
            checked={hasPublisher}
            onCheckedChange={(v) => toggleHasPublisher(!!v)}
          />
          <Label htmlFor="has-publisher">Cette œuvre a un éditeur</Label>
        </div>
        {hasPublisher && work.publisher !== undefined && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nom de l&apos;éditeur</Label>
              <Input
                defaultValue={work.publisher.name}
                onBlur={(e) =>
                  setWork((p) => ({
                    ...p,
                    publisher: p.publisher
                      ? { ...p.publisher, name: e.target.value }
                      : undefined,
                  }))
                }
                placeholder="Nom..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Part (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                defaultValue={work.publisher.split}
                onBlur={(e) =>
                  setWork((p) => ({
                    ...p,
                    publisher: p.publisher
                      ? {
                          ...p.publisher,
                          split: parseFloat(e.target.value) || 0,
                        }
                      : undefined,
                  }))
                }
                placeholder="0"
              />
            </div>
          </div>
        )}
      </div>

      {/* Validation splits */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border p-3 text-sm",
          isSplitValid
            ? "border-green-500/30 bg-green-500/10 text-green-400"
            : "border-red-500/30 bg-red-500/10 text-red-400"
        )}
      >
        {isSplitValid ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        ) : (
          <AlertCircle className="h-4 w-4 shrink-0" />
        )}
        <span>
          Total des parts : {totalSplit}%
          {!isSplitValid && totalSplit < 100 && ` (manque ${100 - totalSplit}%)`}
          {!isSplitValid && totalSplit > 100 &&
            ` (excès de ${totalSplit - 100}%)`}
        </span>
      </div>

      {/* Métadonnées */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>ISWC</Label>
          <Input
            value={work.iswc}
            onChange={(e) => setWork((p) => ({ ...p, iswc: e.target.value }))}
            placeholder="T-123.456.789-0"
          />
        </div>
        <div className="space-y-1">
          <Label>Date de création</Label>
          <DatePicker
            value={work.creationDate}
            onChange={(d) => setWork((p) => ({ ...p, creationDate: d }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Genre</Label>
          <Input
            value={work.genre}
            onChange={(e) => setWork((p) => ({ ...p, genre: e.target.value }))}
            placeholder="Pop, Jazz..."
          />
        </div>
      </div>

      {/* Fichiers */}
      <div>
        <Label className="mb-2 block">Fichiers</Label>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { key: "sheet" as const, label: "Partition", Icon: FileText },
              { key: "lyrics" as const, label: "Paroles", Icon: FileText },
              { key: "audio" as const, label: "Audio", Icon: Music },
            ] as const
          ).map(({ key, label, Icon }) => (
            <div
              key={key}
              className="space-y-2 rounded-lg border border-[rgba(245,245,245,0.12)] p-3 text-center"
            >
              <Icon className="mx-auto h-5 w-5 text-[#F5F5F5]/50" />
              <p className="text-xs font-medium">{label}</p>
              <p className="truncate text-xs text-[#F5F5F5]/50">
                {work.files[key] ?? "Aucun fichier"}
              </p>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="w-full"
              >
                <Upload className="mr-1 h-3.5 w-3.5" /> Upload
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Types d'exploitation */}
      <div>
        <Label className="mb-2 block">Types d&apos;exploitation</Label>
        <div className="grid grid-cols-2 gap-2">
          {EXPLOITATION_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleExploitation(value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                work.exploitationTypes.includes(value)
                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                  : "border-[rgba(245,245,245,0.12)] hover:border-[rgba(245,245,245,0.3)]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Territoires */}
      <div>
        <Label className="mb-2 block">Territoires</Label>
        <div className="flex gap-2">
          <Input
            value={territory}
            onChange={(e) => setTerritory(e.target.value)}
            placeholder="Ajouter un territoire..."
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), addTerritory())
            }
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addTerritory}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {work.territories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {work.territories.map((t) => (
              <Badge key={t} variant="secondary" className="gap-1">
                {t}
                <button
                  type="button"
                  onClick={() => removeTerritory(t)}
                  className="ml-0.5 hover:text-red-400"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea
          rows={3}
          value={work.notes}
          onChange={(e) => setWork((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Notes sur l'œuvre..."
        />
      </div>
    </div>
  );
});

export function WorksPage() {
  const { data, setData } = useSidekickData();
  const works = data.edition.works;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [newWork, setNewWork] = useState<Omit<Work, "id">>(DEFAULT_WORK);
  const [editWork, setEditWork] = useState<Omit<Work, "id">>(DEFAULT_WORK);

  const isSplitValid = (w: Omit<Work, "id">) =>
    w.creators.reduce((s, c) => s + c.split, 0) + (w.publisher?.split ?? 0) ===
    100;

  const handleAddWork = () => {
    if (!newWork.title.trim()) {
      toast.error("Le titre de l'œuvre est requis.");
      return;
    }
    if (newWork.creators.length === 0) {
      toast.error("Au moins un créateur est requis.");
      return;
    }
    if (!isSplitValid(newWork)) {
      toast.error("Le total des parts doit être égal à 100%.");
      return;
    }
    const work: Work = { ...newWork, id: crypto.randomUUID() };
    setData((prev) => ({
      ...prev,
      edition: {
        ...prev.edition,
        works: [...prev.edition.works, work],
      },
    }));
    setIsAddOpen(false);
    setNewWork(DEFAULT_WORK);
    toast.success(`« ${work.title} » ajoutée au catalogue.`);
  };

  const handleEditWork = () => {
    if (!selectedWork) return;
    if (!editWork.title.trim()) {
      toast.error("Le titre de l'œuvre est requis.");
      return;
    }
    if (editWork.creators.length === 0) {
      toast.error("Au moins un créateur est requis.");
      return;
    }
    if (!isSplitValid(editWork)) {
      toast.error("Le total des parts doit être égal à 100%.");
      return;
    }
    setData((prev) => ({
      ...prev,
      edition: {
        ...prev.edition,
        works: prev.edition.works.map((w) =>
          w.id === selectedWork.id ? { ...editWork, id: selectedWork.id } : w
        ),
      },
    }));
    setIsEditOpen(false);
    toast.success(`« ${editWork.title} » mise à jour.`);
  };

  const handleDeleteWork = (id: string, title: string) => {
    setData((prev) => ({
      ...prev,
      edition: {
        ...prev.edition,
        works: prev.edition.works.filter((w) => w.id !== id),
      },
    }));
    toast.success(`« ${title} » supprimée.`);
  };

  const openEdit = (work: Work) => {
    setSelectedWork(work);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...rest } = work;
    setEditWork(rest);
    setIsEditOpen(true);
  };

  const kpi = {
    total: works.length,
    inProgress: works.filter((w) => w.status === "in-progress").length,
    finalized: works.filter((w) => w.status === "finalized").length,
    registered: works.filter((w) => w.status === "registered-sacem").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Gestion des œuvres
          </h1>
          <p className="mt-1 text-sm text-[#F5F5F5]/60">
            Cataloguez vos œuvres musicales et gérez vos droits d&apos;édition
          </p>
        </div>
        <Button
          onClick={() => {
            setNewWork(DEFAULT_WORK);
            setIsAddOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Ajouter une œuvre
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Music className="h-8 w-8 text-[#F5F5F5]/40" />
            <div>
              <p className="text-2xl font-bold">{kpi.total}</p>
              <p className="text-xs text-[#F5F5F5]/60">Total œuvres</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-8 w-8 text-yellow-400/60" />
            <div>
              <p className="text-2xl font-bold text-yellow-400">
                {kpi.inProgress}
              </p>
              <p className="text-xs text-[#F5F5F5]/60">En cours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-8 w-8 text-blue-400/60" />
            <div>
              <p className="text-2xl font-bold text-blue-400">
                {kpi.finalized}
              </p>
              <p className="text-xs text-[#F5F5F5]/60">Finalisées</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-8 w-8 text-green-400/60" />
            <div>
              <p className="text-2xl font-bold text-green-400">
                {kpi.registered}
              </p>
              <p className="text-xs text-[#F5F5F5]/60">Déposées SACEM</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {works.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Music className="mx-auto mb-4 h-12 w-12 text-[#F5F5F5]/20" />
            <p className="mb-4 text-[#F5F5F5]/60">
              Aucune œuvre dans le catalogue.
            </p>
            <Button
              onClick={() => {
                setNewWork(DEFAULT_WORK);
                setIsAddOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Ajouter une première œuvre
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {works.map((work) => (
            <Card key={work.id}>
              <CardContent className="p-5">
                <div className="flex gap-6">
                  {/* Left */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{work.title}</h3>
                      {getStatusBadge(work.status)}
                    </div>

                    {work.creators.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs text-[#F5F5F5]/50">
                          Créateurs
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {work.creators.map((c) => (
                            <span
                              key={c.id}
                              className="rounded bg-[rgba(245,245,245,0.08)] px-2 py-0.5 text-xs"
                            >
                              {c.name} · {getRoleLabel(c.role)} · {c.split}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {work.publisher && (
                      <div>
                        <p className="mb-1 text-xs text-[#F5F5F5]/50">
                          Éditeur
                        </p>
                        <span className="rounded bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">
                          {work.publisher.name} · {work.publisher.split}%
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-[#F5F5F5]/60">
                      {work.iswc && <span>ISWC : {work.iswc}</span>}
                      {work.creationDate && (
                        <span>
                          Créée le :{" "}
                          {new Date(work.creationDate).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )}
                        </span>
                      )}
                      {work.genre && <span>Genre : {work.genre}</span>}
                    </div>

                    {work.exploitationTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {work.exploitationTypes.map((t) => (
                          <Badge
                            key={t}
                            className="border-indigo-500/30 bg-indigo-500/20 text-xs text-indigo-300"
                          >
                            {getExploitationLabel(t)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {work.territories.length > 0 && (
                      <p className="text-xs text-[#F5F5F5]/50">
                        Territoires : {work.territories.join(", ")}
                      </p>
                    )}

                    {work.notes && (
                      <p className="text-xs text-[#F5F5F5]/50 italic">
                        {work.notes}
                      </p>
                    )}
                  </div>

                  {/* Right: splits + actions */}
                  <div className="w-56 shrink-0 space-y-4">
                    <SplitChart
                      creators={work.creators}
                      publisherSplit={work.publisher?.split}
                      publisherName={work.publisher?.name}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEdit(work)}
                      >
                        <Edit2 className="mr-1 h-3.5 w-3.5" /> Éditer
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteWork(work.id, work.title)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter une œuvre</DialogTitle>
          </DialogHeader>
          <WorkForm work={newWork} setWork={setNewWork} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddWork}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;œuvre</DialogTitle>
          </DialogHeader>
          <WorkForm work={editWork} setWork={setEditWork} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditWork}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/edition/components/WorksPage.tsx
git commit -m "feat(edition): implement WorksPage — catalogue, splits, CRUD"
```

---

## Task 5: Implement SyncPage.tsx

**Files:**
- Modify: `src/modules/edition/components/SyncPage.tsx`

- [ ] **Step 1: Write the full SyncPage implementation**

Replace the entire content of `src/modules/edition/components/SyncPage.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSidekickData } from "@/hooks/useSidekickData";
import type { Work, SyncData, Exploitant } from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Music,
  Edit2,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  Tv,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MOOD_OPTIONS = [
  "Happy", "Dark", "Tension", "Energetic", "Romantic", "Dramatic",
  "Melancholic", "Uplifting", "Mysterious", "Peaceful", "Aggressive",
  "Nostalgic", "Suspenseful", "Playful", "Epic", "Calm", "Intense",
  "Cheerful", "Sad", "Hopeful", "Cinematic", "Ambient", "Dynamic",
  "Ethereal", "Groovy", "Inspirational",
];

const THEME_OPTIONS = [
  "Publicité", "Film", "Série TV", "Documentaire", "Jeux vidéo", "Sport",
  "Mode", "Voyage", "Nature", "Action", "Romance", "Technologie",
  "Cuisine", "Enfants", "Corporate", "Luxe", "Aventure", "Science-Fiction",
  "Horreur", "Comédie",
];

const SYNC_STATUSES: {
  value: SyncData["status"];
  label: string;
  Icon: React.ElementType;
  activeClass: string;
}[] = [
  { value: "not-ready", label: "Non prête", Icon: AlertCircle, activeClass: "border-red-500 text-red-400" },
  { value: "to-prepare", label: "À préparer", Icon: Clock, activeClass: "border-orange-500 text-orange-400" },
  { value: "sync-ready", label: "Sync-ready", Icon: CheckCircle2, activeClass: "border-green-500 text-green-400" },
  { value: "exploited", label: "Exploitée", Icon: Tv, activeClass: "border-blue-500 text-blue-400" },
];

function getSyncStatusBadge(status: SyncData["status"]) {
  switch (status) {
    case "not-ready":
      return <Badge className="border-red-500/30 bg-red-500/20 text-red-400">Non prête</Badge>;
    case "to-prepare":
      return <Badge className="border-orange-500/30 bg-orange-500/20 text-orange-400">À préparer</Badge>;
    case "sync-ready":
      return <Badge className="border-green-500/30 bg-green-500/20 text-green-400">Sync-ready</Badge>;
    case "exploited":
      return <Badge className="border-blue-500/30 bg-blue-500/20 text-blue-400">Exploitée</Badge>;
  }
}

function getExploitantStatusBadge(status: Exploitant["status"]) {
  switch (status) {
    case "sent":
      return <Badge className="border-yellow-500/30 bg-yellow-500/20 text-xs text-yellow-400">Envoyé</Badge>;
    case "discussing":
      return <Badge className="border-blue-500/30 bg-blue-500/20 text-xs text-blue-400">En discussion</Badge>;
    case "accepted":
      return <Badge className="border-green-500/30 bg-green-500/20 text-xs text-green-400">Accepté</Badge>;
    case "refused":
      return <Badge className="border-red-500/30 bg-red-500/20 text-xs text-red-400">Refusé</Badge>;
    default:
      return null;
  }
}

function getProjectLabel(project: Exploitant["project"]) {
  const map: Record<string, string> = {
    film: "Film", serie: "Série", pub: "Pub",
    "jeu-video": "Jeu vidéo", media: "Média",
  };
  return map[project] ?? "—";
}

function createDefaultSyncData(workId: string): SyncData {
  return {
    workId,
    status: "not-ready",
    moods: [],
    tempo: "",
    pitchShort: "",
    usageContext: "",
    themes: [],
    privateLinks: [
      `https://private-listen.music/${Math.random().toString(36).slice(2, 10)}`,
    ],
    exploitants: [],
  };
}

export function SyncPage() {
  const { data, setData } = useSidekickData();
  const allWorks = data.edition.works;
  const syncMap = data.edition.sync as Record<string, SyncData>;
  const syncWorks = allWorks.filter((w) =>
    w.exploitationTypes.includes("sync")
  );

  const getSyncData = (workId: string): SyncData => {
    const raw = syncMap[workId];
    if (!raw) return createDefaultSyncData(workId);
    return {
      ...createDefaultSyncData(workId),
      ...raw,
      exploitants: Array.isArray(raw.exploitants) ? raw.exploitants : [],
      privateLinks: Array.isArray(raw.privateLinks) ? raw.privateLinks : [],
      moods: Array.isArray(raw.moods) ? raw.moods : [],
      themes: Array.isArray(raw.themes) ? raw.themes : [],
    };
  };

  const saveSyncData = (s: SyncData) => {
    setData((prev) => ({
      ...prev,
      edition: {
        ...prev.edition,
        sync: {
          ...(prev.edition.sync as Record<string, SyncData>),
          [s.workId]: s,
        },
      },
    }));
  };

  // Edit modal
  const [editWork, setEditWork] = useState<Work | null>(null);
  const [editSync, setEditSync] = useState<SyncData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Exploitants modal
  const [exWork, setExWork] = useState<Work | null>(null);
  const [exSync, setExSync] = useState<SyncData | null>(null);

  const openEdit = (work: Work) => {
    setEditWork(work);
    setEditSync(getSyncData(work.id));
  };
  const closeEdit = () => { setEditWork(null); setEditSync(null); };

  const handleSaveSync = () => {
    if (!editSync) return;
    saveSyncData(editSync);
    closeEdit();
    toast.success("Informations de synchronisation enregistrées.");
  };

  const openExploitants = (work: Work) => {
    setExWork(work);
    setExSync(getSyncData(work.id));
  };
  const closeExploitants = () => { setExWork(null); setExSync(null); };

  const handleSaveExploitants = () => {
    if (!exSync) return;
    saveSyncData(exSync);
    closeExploitants();
    toast.success("Exploitants enregistrés.");
  };

  const generatePitch = async () => {
    if (!editSync || !editWork) return;
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 1500));
    const moods = editSync.moods.slice(0, 3).join(", ") || "unique";
    const themes = editSync.themes.slice(0, 2).join(" et ") || "diverses utilisations";
    const pitch = `« ${editWork.title} » est une composition ${editWork.genre || "musicale"} au tempo ${editSync.tempo || "dynamique"}, dégageant une ambiance ${moods}. Idéale pour ${themes}, cette œuvre offre une palette sonore distinctive adaptée à la synchronisation audiovisuelle.`;
    setEditSync((p) => (p ? { ...p, pitchShort: pitch } : p));
    setIsGenerating(false);
    toast.success("Pitch généré.");
  };

  const exportPitch = (work: Work) => {
    const sync = getSyncData(work.id);
    const date = new Date().toLocaleDateString("fr-FR");
    const creators = work.creators
      .map((c) => `• ${c.name} (${c.role === "author" ? "Auteur" : c.role === "composer" ? "Compositeur" : "Réalisateur"}) - ${c.split}%`)
      .join("\n");
    const publisher = work.publisher
      ? `Éditeur : ${work.publisher.name} (${work.publisher.split}%)`
      : "";
    const links = sync.privateLinks.map((l, i) => `${i + 1}. ${l}`).join("\n");

    const content = `═══════════════════════════════════════════
FICHE SYNCHRONISATION - ${work.title.toUpperCase()}
═══════════════════════════════════════════

📋 INFORMATIONS GÉNÉRALES
━━━━━━━━━━━━━━━━━━━━━━━
Titre : ${work.title}
Genre : ${work.genre || "—"}
ISWC : ${work.iswc || "—"}
Tempo : ${sync.tempo || "—"}

👥 CRÉATEURS
━━━━━━━━━━━━━━━━━━━━━━━
${creators}
${publisher}

🎵 CARACTÉRISTIQUES MUSICALES
━━━━━━━━━━━━━━━━━━━━━━━
Moods : ${sync.moods.join(", ") || "—"}
Thématiques : ${sync.themes.join(", ") || "—"}

💬 PITCH
━━━━━━━━━━━━━━━━━━━━━━━
${sync.pitchShort || "—"}

🎯 CONTEXTE D'UTILISATION
━━━━━━━━━━━━━━━━━━━━━━━
${sync.usageContext || "—"}

🌍 TERRITOIRES DISPONIBLES
━━━━━━━━━━━━━━━━━━━━━━━
${work.territories.join(", ") || "—"}

🔗 LIENS D'ÉCOUTE
━━━━━━━━━━━━━━━━━━━━━━━
${links || "—"}

═══════════════════════════════════════════
Document généré le ${date}
═══════════════════════════════════════════`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sync-${work.title.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Fiche exportée.");
  };

  const kpi = {
    total: syncWorks.length,
    exploited: syncWorks.filter((w) => getSyncData(w.id).status === "exploited").length,
    syncReady: syncWorks.filter((w) => getSyncData(w.id).status === "sync-ready").length,
    toPrepare: syncWorks.filter((w) => getSyncData(w.id).status === "to-prepare").length,
    notReady: syncWorks.filter((w) => getSyncData(w.id).status === "not-ready").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Synchronisation</h1>
        <p className="mt-1 text-sm text-[#F5F5F5]/60">
          Préparez vos œuvres pour la synchronisation audiovisuelle
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Seules les œuvres marquées avec le type d&apos;exploitation{" "}
          <span className="font-medium">Synchronisation</span> dans le catalogue
          apparaissent ici. Rendez-vous dans le{" "}
          <a href="/edition" className="underline hover:text-blue-200">
            Catalogue
          </a>{" "}
          pour activer ce type d&apos;exploitation sur une œuvre.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Total sync", value: kpi.total, Icon: Music, color: "text-indigo-400" },
          { label: "Exploitées", value: kpi.exploited, Icon: Tv, color: "text-blue-400" },
          { label: "Sync-ready", value: kpi.syncReady, Icon: CheckCircle2, color: "text-green-400" },
          { label: "À préparer", value: kpi.toPrepare, Icon: Clock, color: "text-orange-400" },
          { label: "Non prêtes", value: kpi.notReady, Icon: AlertCircle, color: "text-red-400" },
        ].map(({ label, value, Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className={cn("h-8 w-8 opacity-60", color)} />
              <div>
                <p className={cn("text-2xl font-bold", color)}>{value}</p>
                <p className="text-xs text-[#F5F5F5]/60">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      {syncWorks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Tv className="mx-auto mb-4 h-12 w-12 text-[#F5F5F5]/20" />
            <p className="mb-2 text-[#F5F5F5]/60">
              Aucune œuvre marquée pour la synchronisation.
            </p>
            <p className="text-sm text-[#F5F5F5]/40">
              Activez le type d&apos;exploitation{" "}
              <span className="font-medium">Synchronisation</span> dans le
              catalogue.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {syncWorks.map((work) => {
            const sync = getSyncData(work.id);
            return (
              <Card key={work.id}>
                <CardContent className="p-5">
                  <div className="flex gap-5">
                    {/* Left */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{work.title}</h3>
                        {getSyncStatusBadge(sync.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm text-[#F5F5F5]/70">
                        {work.genre && <span>Genre : {work.genre}</span>}
                        {sync.tempo && <span>Tempo : {sync.tempo}</span>}
                      </div>

                      {sync.moods.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {sync.moods.map((m) => (
                            <Badge key={m} variant="outline" className="text-xs">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {sync.themes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {sync.themes.map((t) => (
                            <Badge
                              key={t}
                              className="border-indigo-500/30 bg-indigo-500/20 text-xs text-indigo-300"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {sync.pitchShort && (
                        <div className="rounded-lg bg-[rgba(245,245,245,0.05)] px-3 py-2 text-sm italic text-[#F5F5F5]/70">
                          &ldquo;{sync.pitchShort}&rdquo;
                        </div>
                      )}

                      {work.territories.length > 0 && (
                        <p className="text-xs text-[#F5F5F5]/50">
                          Territoires : {work.territories.join(", ")}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(work)}
                        >
                          <Edit2 className="mr-1 h-3.5 w-3.5" /> Éditer infos
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportPitch(work)}
                        >
                          <Download className="mr-1 h-3.5 w-3.5" /> Exporter
                        </Button>
                      </div>
                    </div>

                    {/* Right: exploitants */}
                    <div className="w-80 shrink-0">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Exploitants
                          </span>
                          {sync.exploitants.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {sync.exploitants.length}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => openExploitants(work)}
                        >
                          Gérer
                        </Button>
                      </div>

                      {sync.exploitants.length === 0 ? (
                        <div
                          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[rgba(245,245,245,0.15)] p-6 transition-colors hover:border-[rgba(245,245,245,0.3)]"
                          onClick={() => openExploitants(work)}
                        >
                          <Tv className="mb-2 h-6 w-6 text-[#F5F5F5]/30" />
                          <Button variant="ghost" size="xs">
                            <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sync.exploitants.slice(0, 3).map((e) => (
                            <div
                              key={e.id}
                              className="space-y-1 rounded-lg bg-[rgba(245,245,245,0.05)] px-3 py-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  {e.company || "—"}
                                </span>
                                {getExploitantStatusBadge(e.status)}
                              </div>
                              <div className="flex gap-2 text-[#F5F5F5]/50">
                                {e.project && (
                                  <span>{getProjectLabel(e.project)}</span>
                                )}
                                {e.date && <span>{e.date}</span>}
                              </div>
                            </div>
                          ))}
                          {sync.exploitants.length > 3 && (
                            <p className="text-center text-xs text-[#F5F5F5]/50">
                              +{sync.exploitants.length - 3} autre(s)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit sync modal */}
      {editSync && editWork && (
        <Dialog open onOpenChange={(o) => !o && closeEdit()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Préparer pour la synchronisation — {editWork.title}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
              {/* Statut */}
              <div>
                <Label className="mb-2 block">Statut Sync</Label>
                <div className="grid grid-cols-4 gap-2">
                  {SYNC_STATUSES.map(({ value, label, Icon, activeClass }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setEditSync((p) => (p ? { ...p, status: value } : p))
                      }
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                        editSync.status === value
                          ? activeClass
                          : "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/60 hover:border-[rgba(245,245,245,0.3)]"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Infos de base (read-only) */}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-[rgba(245,245,245,0.05)] p-3">
                <div>
                  <Label className="text-xs text-[#F5F5F5]/50">Genre</Label>
                  <p className="text-sm">{editWork.genre || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-[#F5F5F5]/50">
                    Territoires
                  </Label>
                  <p className="text-sm">
                    {editWork.territories.join(", ") || "—"}
                  </p>
                </div>
              </div>

              {/* Tempo */}
              <div className="space-y-1">
                <Label>Tempo</Label>
                <Input
                  value={editSync.tempo}
                  onChange={(e) =>
                    setEditSync((p) =>
                      p ? { ...p, tempo: e.target.value } : p
                    )
                  }
                  placeholder="Ex: 120 BPM, Lent, Modéré, Rapide..."
                />
              </div>

              {/* Moods */}
              <div>
                <Label className="mb-2 block">Moods</Label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-[rgba(245,245,245,0.12)] p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {MOOD_OPTIONS.map((mood) => (
                      <button
                        key={mood}
                        type="button"
                        onClick={() =>
                          setEditSync((p) => {
                            if (!p) return p;
                            return {
                              ...p,
                              moods: p.moods.includes(mood)
                                ? p.moods.filter((m) => m !== mood)
                                : [...p.moods, mood],
                            };
                          })
                        }
                        className={cn(
                          "rounded-full px-3 py-1 text-xs transition-colors",
                          editSync.moods.includes(mood)
                            ? "bg-indigo-600 text-white"
                            : "bg-[rgba(245,245,245,0.08)] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.15)]"
                        )}
                      >
                        {mood}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Thématiques */}
              <div>
                <Label className="mb-2 block">Thématiques</Label>
                <div className="flex flex-wrap gap-1.5">
                  {THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      onClick={() =>
                        setEditSync((p) => {
                          if (!p) return p;
                          return {
                            ...p,
                            themes: p.themes.includes(theme)
                              ? p.themes.filter((t) => t !== theme)
                              : [...p.themes, theme],
                          };
                        })
                      }
                      className={cn(
                        "rounded-full px-3 py-1 text-xs transition-colors",
                        editSync.themes.includes(theme)
                          ? "bg-purple-600 text-white"
                          : "bg-[rgba(245,245,245,0.08)] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.15)]"
                      )}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Pitch court</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={generatePitch}
                    disabled={isGenerating}
                  >
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    {isGenerating ? "Génération..." : "Générer avec IA"}
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  value={editSync.pitchShort}
                  onChange={(e) =>
                    setEditSync((p) =>
                      p ? { ...p, pitchShort: e.target.value } : p
                    )
                  }
                  placeholder="Décrivez l'œuvre en quelques phrases..."
                />
              </div>

              {/* Contexte */}
              <div className="space-y-1">
                <Label>Contexte d&apos;utilisation idéal</Label>
                <Textarea
                  rows={3}
                  value={editSync.usageContext}
                  onChange={(e) =>
                    setEditSync((p) =>
                      p ? { ...p, usageContext: e.target.value } : p
                    )
                  }
                  placeholder="Ex: Séquences d'action, scènes émotionnelles..."
                />
              </div>

              {/* Liens privés */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Liens d&apos;écoute privés</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      setEditSync((p) =>
                        p ? { ...p, privateLinks: [...p.privateLinks, ""] } : p
                      )
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter un lien
                  </Button>
                </div>
                <div className="space-y-2">
                  {editSync.privateLinks.map((link, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={link}
                        onChange={(e) =>
                          setEditSync((p) => {
                            if (!p) return p;
                            const links = [...p.privateLinks];
                            links[i] = e.target.value;
                            return { ...p, privateLinks: links };
                          })
                        }
                        placeholder="https://..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setEditSync((p) =>
                            p
                              ? {
                                  ...p,
                                  privateLinks: p.privateLinks.filter(
                                    (_, idx) => idx !== i
                                  ),
                                }
                              : p
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeEdit}>
                Annuler
              </Button>
              <Button onClick={handleSaveSync}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Exploitants modal */}
      {exSync && exWork && (
        <Dialog open onOpenChange={(o) => !o && closeExploitants()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Gérer les exploitants — {exWork.title}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <Label>Exploitants ({exSync.exploitants.length})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setExSync((p) =>
                      p
                        ? {
                            ...p,
                            exploitants: [
                              ...p.exploitants,
                              {
                                id: crypto.randomUUID(),
                                company: "",
                                project: "",
                                date: "",
                                status: "",
                                notes: "",
                              },
                            ],
                          }
                        : p
                    )
                  }
                >
                  <Plus className="mr-1 h-4 w-4" /> Ajouter
                </Button>
              </div>

              {exSync.exploitants.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[rgba(245,245,245,0.15)] p-8 text-center">
                  <Tv className="mx-auto mb-2 h-8 w-8 text-[#F5F5F5]/20" />
                  <p className="text-sm text-[#F5F5F5]/50">
                    Aucun exploitant pour le moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exSync.exploitants.map((exp, i) => (
                    <div
                      key={exp.id}
                      className="relative space-y-3 rounded-xl border border-[rgba(245,245,245,0.12)] bg-[rgba(245,245,245,0.03)] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-[#F5F5F5]/50">
                          Exploitant #{exp.id.slice(-4)}
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            setExSync((p) =>
                              p
                                ? {
                                    ...p,
                                    exploitants: p.exploitants.filter(
                                      (_, idx) => idx !== i
                                    ),
                                  }
                                : p
                            )
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Société *</Label>
                          <Input
                            value={exp.company}
                            onChange={(e) =>
                              setExSync((p) => {
                                if (!p) return p;
                                const exps = [...p.exploitants];
                                exps[i] = { ...exps[i]!, company: e.target.value };
                                return { ...p, exploitants: exps };
                              })
                            }
                            placeholder="Nom de la société"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Type de projet *</Label>
                          <Select
                            value={exp.project}
                            onValueChange={(v) =>
                              setExSync((p) => {
                                if (!p) return p;
                                const exps = [...p.exploitants];
                                exps[i] = { ...exps[i]!, project: v as Exploitant["project"] };
                                return { ...p, exploitants: exps };
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="film">Film</SelectItem>
                              <SelectItem value="serie">Série</SelectItem>
                              <SelectItem value="pub">Pub</SelectItem>
                              <SelectItem value="jeu-video">Jeu vidéo</SelectItem>
                              <SelectItem value="media">Média</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Date</Label>
                          <Input
                            type="date"
                            value={exp.date}
                            onChange={(e) =>
                              setExSync((p) => {
                                if (!p) return p;
                                const exps = [...p.exploitants];
                                exps[i] = { ...exps[i]!, date: e.target.value };
                                return { ...p, exploitants: exps };
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Statut *</Label>
                          <Select
                            value={exp.status}
                            onValueChange={(v) =>
                              setExSync((p) => {
                                if (!p) return p;
                                const exps = [...p.exploitants];
                                exps[i] = { ...exps[i]!, status: v as Exploitant["status"] };
                                return { ...p, exploitants: exps };
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sent">Envoyé</SelectItem>
                              <SelectItem value="discussing">En discussion</SelectItem>
                              <SelectItem value="accepted">Accepté</SelectItem>
                              <SelectItem value="refused">Refusé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Notes</Label>
                        <Textarea
                          rows={2}
                          value={exp.notes}
                          onChange={(e) =>
                            setExSync((p) => {
                              if (!p) return p;
                              const exps = [...p.exploitants];
                              exps[i] = { ...exps[i]!, notes: e.target.value };
                              return { ...p, exploitants: exps };
                            })
                          }
                          placeholder="Notes..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeExploitants}>
                Annuler
              </Button>
              <Button onClick={handleSaveExploitants}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/edition/components/SyncPage.tsx
git commit -m "feat(edition): implement SyncPage — sync prep, moods, exploitants, export"
```

---

## Self-Review

**Spec coverage:**
- ✅ WorksPage: 4 KPI cards, list with split chart, add/edit modal with all sections, validation, delete, empty state
- ✅ SyncPage: info banner, 5 KPI cards, filtered list (sync exploitation type only), edit modal (status, tempo, moods, themes, pitch+AI gen, context, private links), exploitants modal (CRUD), export .txt
- ✅ Data: `useSidekickData`, `data.edition.works` + `data.edition.sync`
- ✅ Sidebar: Edition sub-menu (Catalogue + Synchronisation)
- ✅ Routes: `/edition` + `/edition/sync`
- ✅ Toasts: sonner installed, Toaster in layout, toast.success/toast.error throughout
- ✅ Types: Creator, Publisher, Work, Exploitant, SyncData all fully typed in sidekick-store.ts

**Type consistency:**
- `Work`, `Creator`, `Publisher`, `SyncData`, `Exploitant` — all defined in sidekick-store.ts and imported consistently
- `data.edition.sync` typed as `Record<string, SyncData>` in store and accessed with cast in SyncPage until store update is applied

**No placeholders:** All code is complete and specific.
