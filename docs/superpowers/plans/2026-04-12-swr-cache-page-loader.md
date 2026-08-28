# SWR Cache + PageLoader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éliminer le flash de page vide lors du chargement et mettre en cache les données Supabase en session via SWR.

**Architecture:** Un composant `PageLoader` partagé remplace tous les états de chargement existants. Les 10 hooks de données Supabase sont migrés du pattern `useEffect+useState` vers `useSWR`, avec un `SWRProvider` global configuré avec stale-while-revalidate à 30s. `useDriveData` et `useSidekickData` sont exclus de la migration SWR.

**Tech Stack:** Next.js 15 App Router, SWR (npm), Supabase JS client, TypeScript, Tailwind CSS

---

## File Map

**Créer:**
- `src/components/ui/page-loader.tsx` — Spinner partagé
- `src/components/providers/SWRProvider.tsx` — Config SWR globale

**Modifier:**
- `src/app/layout.tsx` — Injecter SWRProvider
- `src/hooks/useTasksData.ts` — Migrer vers useSWR
- `src/hooks/useContactsData.ts` — Migrer vers useSWR
- `src/hooks/useCalendarData.ts` — Migrer vers useSWR
- `src/hooks/useAdminData.ts` — Migrer vers useSWR
- `src/hooks/useLiveData.ts` — Migrer vers useSWR
- `src/hooks/useMarketingData.ts` — Migrer vers useSWR
- `src/hooks/usePhonoData.ts` — Migrer vers useSWR
- `src/hooks/useEditionData.ts` — Migrer vers useSWR
- `src/hooks/useIncomesData.ts` — Migrer vers useSWR
- `src/hooks/useContractsData.ts` — Migrer vers useSWR (si structure compatible, sinon PageLoader only)
- `src/modules/tasks/components/Tasks.tsx` — Ajouter PageLoader
- `src/modules/live/components/TourDatesPage.tsx` — Ajouter PageLoader
- `src/modules/live/components/RehearsalsPage.tsx` — Ajouter PageLoader
- `src/modules/live/components/ProspectionPage.tsx` — Ajouter PageLoader
- `src/modules/live/components/EquipmentPage.tsx` — Remplacer loading texte
- `src/modules/phono/components/CatalogPage.tsx` — Ajouter PageLoader
- `src/modules/phono/components/AlbumsPage.tsx` — Ajouter PageLoader
- `src/modules/phono/components/TracksPage.tsx` — Ajouter PageLoader
- `src/modules/phono/components/SessionsStudioPage.tsx` — Remplacer loading texte
- `src/modules/dashboard/components/DashboardPage.tsx` — Ajouter PageLoader
- `src/modules/incomes/components/RoyaltiesPage.tsx` — Ajouter PageLoader
- `src/modules/incomes/components/IntermittencePage.tsx` — Ajouter PageLoader
- `src/modules/incomes/components/InvoicesPage.tsx` — Remplacer loading texte
- `src/modules/incomes/components/IncomesOverviewPage.tsx` — Ajouter PageLoader
- `src/modules/incomes/components/CopyrightPage.tsx` — Ajouter PageLoader
- `src/modules/incomes/components/NeighboringRightsPage.tsx` — Ajouter PageLoader
- `src/modules/marketing/components/MailingPage.tsx` — Ajouter PageLoader
- `src/modules/marketing/components/PresskitPage.tsx` — Ajouter PageLoader
- `src/modules/marketing/components/MarketingOverviewPage.tsx` — Ajouter PageLoader
- `src/modules/admin/components/StatutsPage.tsx` — Ajouter PageLoader
- `src/modules/admin/components/ProceduresPage.tsx` — Ajouter PageLoader
- `src/modules/admin/components/AdminOverviewPage.tsx` — Ajouter PageLoader
- `src/modules/admin/components/ContractsPage.tsx` — Ajouter PageLoader
- `src/modules/edition/components/WorksPage.tsx` — Ajouter PageLoader
- `src/modules/edition/components/SyncPage.tsx` — Ajouter PageLoader
- `src/modules/settings/components/SettingsPage.tsx` — Remplacer Loader2 par PageLoader
- `src/modules/calendar/components/ICalSyncPanel.tsx` — Remplacer texte brut
- `src/modules/admin/components/DocumentsPage.tsx` — Ajouter PageLoader (useDriveData.isLoading)

---

## Task 1 : Installer SWR

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installer la dépendance**

```bash
npm install swr
```

Expected output: `added 1 package` (SWR n'a aucune dépendance tierce)

- [ ] **Step 2: Vérifier l'installation**

```bash
node -e "require('swr'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install swr for data caching"
```

---

## Task 2 : Créer le composant PageLoader

**Files:**
- Create: `src/components/ui/page-loader.tsx`

- [ ] **Step 1: Créer le fichier**

```tsx
// src/components/ui/page-loader.tsx
export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 py-24">
      <div className="h-8 w-8 rounded-full border-2 border-[#F0FF00] border-t-transparent animate-spin" />
      <p className="text-sm" style={{ color: "rgba(245,245,245,0.5)" }}>
        Chargement des données…
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier que le build TypeScript est propre**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: aucune erreur sur ce fichier

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/page-loader.tsx
git commit -m "feat: add shared PageLoader spinner component"
```

---

## Task 3 : Créer le SWRProvider et l'injecter dans le layout

**Files:**
- Create: `src/components/providers/SWRProvider.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Créer le provider**

```tsx
// src/components/providers/SWRProvider.tsx
"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 30_000,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
```

- [ ] **Step 2: Injecter dans le layout**

Fichier actuel `src/app/layout.tsx` :
```tsx
import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import "../styles/globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-[#101010] text-[#F5F5F5] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

Remplacer par :
```tsx
import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { SWRProvider } from "@/components/providers/SWRProvider";
import "../styles/globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-[#101010] text-[#F5F5F5] antialiased">
        <SWRProvider>
          <AuthProvider>{children}</AuthProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: aucune erreur

- [ ] **Step 4: Commit**

```bash
git add src/components/providers/SWRProvider.tsx src/app/layout.tsx
git commit -m "feat: add SWRProvider with 30s stale-while-revalidate config"
```

---

## Task 4 : Migrer useTasksData vers SWR

**Files:**
- Modify: `src/hooks/useTasksData.ts`

Le hook actuel utilise `useEffect` + `useState` + `setLoading`. Le pattern optimiste dans `setTasks` est conservé, on ajoute `mutate` pour invalider le cache après chaque opération réussie.

- [ ] **Step 1: Réécrire le hook**

```ts
// src/hooks/useTasksData.ts
"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";
import type { Todo } from "@/lib/sidekick-store";

const KEY = "user_tasks";

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

async function fetchTasks(): Promise<Todo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_tasks")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToTodo);
}

export function useTasksData() {
  const { data: tasks = [], isLoading, error: swrError, mutate: mutateLocal } = useSWR<Todo[]>(KEY, fetchTasks);

  const error = swrError ? (swrError as Error).message : null;

  const setTasks = useCallback((fn: (prev: Todo[]) => Todo[]) => {
    const snapshot = tasks;
    const next = fn(tasks);

    // Optimistic update
    mutateLocal(next, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        mutateLocal(snapshot, false);
        return;
      }

      const prevMap = new Map(snapshot.map((t) => [t.id, t]));
      const nextMap = new Map(next.map((t) => [t.id, t]));

      const toUpsert = next.filter((t) => {
        const old = prevMap.get(t.id);
        return !old || JSON.stringify(old) !== JSON.stringify(t);
      });
      const toDelete = snapshot.filter((t) => !nextMap.has(t.id)).map((t) => t.id);

      const ops: Array<Promise<{ error: { message: string } | null }>> = [];

      if (toUpsert.length > 0) {
        ops.push(
          supabase
            .from("user_tasks")
            .upsert(toUpsert.map((t) => ({ ...todoToRow(t), user_id: user.id })))
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      if (toDelete.length > 0) {
        ops.push(
          supabase
            .from("user_tasks")
            .delete()
            .in("id", toDelete)
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      const results = await Promise.all(ops);
      const firstError = results.find((r) => r.error);
      if (firstError?.error) {
        mutateLocal(snapshot, false);
      } else {
        // Revalider le cache SWR silencieusement
        mutate(KEY);
      }
    })();
  }, [tasks, mutateLocal]);

  return { tasks, setTasks, loading: isLoading, error };
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: aucune erreur

- [ ] **Step 3: Tester en dev**

```bash
npm run dev
```

Naviguer vers la page Tasks, vérifier : spinner visible au premier chargement, données apparaissent, revenir puis retourner → données immédiates sans spinner.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTasksData.ts
git commit -m "feat: migrate useTasksData to SWR with 30s cache"
```

---

## Task 5 : Migrer useContactsData vers SWR

**Files:**
- Modify: `src/hooks/useContactsData.ts`

- [ ] **Step 1: Réécrire le hook**

Lire le fichier actuel pour récupérer les types et mappers, puis remplacer le corps de `useContactsData` :

```ts
// src/hooks/useContactsData.ts
"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  city: string;
  email: string;
  instagram: string;
  phone: string;
  notes: string;
  createdAt?: string;
}

const KEY = "user_contacts";

function rowToContact(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    firstName: (row.first_name as string) ?? "",
    lastName: (row.last_name as string) ?? "",
    role: (row.role as string) ?? "",
    city: (row.city as string) ?? "",
    email: (row.email as string) ?? "",
    instagram: (row.instagram as string) ?? "",
    phone: (row.phone as string) ?? "",
    notes: (row.notes as string) ?? "",
    createdAt: (row.created_at as string) ?? undefined,
  };
}

function contactToRow(contact: Contact): Record<string, unknown> {
  return {
    id: contact.id,
    first_name: contact.firstName,
    last_name: contact.lastName,
    role: contact.role,
    city: contact.city,
    email: contact.email,
    instagram: contact.instagram,
    phone: contact.phone,
    notes: contact.notes,
    created_at: contact.createdAt ?? null,
  };
}

async function fetchContacts(): Promise<Contact[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_contacts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToContact);
}

export function useContactsData() {
  const { data: contacts = [], isLoading, error: swrError, mutate: mutateLocal } = useSWR<Contact[]>(KEY, fetchContacts);

  const error = swrError ? (swrError as Error).message : null;

  const setContacts = useCallback((fn: (prev: Contact[]) => Contact[]) => {
    const snapshot = contacts;
    const next = fn(contacts);

    mutateLocal(next, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { mutateLocal(snapshot, false); return; }

      const prevMap = new Map(snapshot.map((c) => [c.id, c]));
      const nextMap = new Map(next.map((c) => [c.id, c]));

      const toUpsert = next.filter((c) => {
        const old = prevMap.get(c.id);
        return !old || JSON.stringify(old) !== JSON.stringify(c);
      });
      const toDelete = snapshot.filter((c) => !nextMap.has(c.id)).map((c) => c.id);

      const ops: Array<Promise<{ error: { message: string } | null }>> = [];

      if (toUpsert.length > 0) {
        ops.push(
          supabase.from("user_contacts")
            .upsert(toUpsert.map((c) => ({ ...contactToRow(c), user_id: user.id })))
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }
      if (toDelete.length > 0) {
        ops.push(
          supabase.from("user_contacts")
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
  }, [contacts, mutateLocal]);

  return { contacts, setContacts, loading: isLoading, error };
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useContactsData.ts
git commit -m "feat: migrate useContactsData to SWR"
```

---

## Task 6 : Migrer useCalendarData vers SWR

**Files:**
- Modify: `src/hooks/useCalendarData.ts`

- [ ] **Step 1: Réécrire le hook**

```ts
// src/hooks/useCalendarData.ts
"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";

export type CalendarSector = "live" | "phono" | "admin" | "marketing" | "edition" | "revenus" | "other";

export interface CustomCalendarItem {
  id: string;
  title: string;
  date: string;
  time?: string;
  place?: string;
  sector: CalendarSector;
}

const KEY = "calendar_events";

function rowToItem(row: Record<string, unknown>): CustomCalendarItem {
  return {
    id: row.source_id as string,
    title: row.label as string,
    date: row.date as string,
    time: (row.time as string) ?? undefined,
    place: (row.place as string) ?? undefined,
    sector: (row.sector as CalendarSector) ?? "other",
  };
}

function itemToRow(item: CustomCalendarItem): Record<string, unknown> {
  return {
    source_module: "custom",
    source_id: item.id,
    label: item.title,
    date: item.date,
    time: item.time ?? null,
    place: item.place ?? null,
    sector: item.sector,
    type: "custom",
  };
}

async function fetchCalendarEvents(): Promise<CustomCalendarItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("source_module", "custom")
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToItem);
}

export function useCalendarData() {
  const { data: customEvents = [], isLoading, error: swrError, mutate: mutateLocal } = useSWR<CustomCalendarItem[]>(KEY, fetchCalendarEvents);

  const error = swrError ? (swrError as Error).message : null;

  const setCustomEvents = useCallback((fn: (prev: CustomCalendarItem[]) => CustomCalendarItem[]) => {
    const snapshot = customEvents;
    const next = fn(customEvents);

    mutateLocal(next, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { mutateLocal(snapshot, false); return; }

      const prevMap = new Map(snapshot.map((e) => [e.id, e]));
      const nextMap = new Map(next.map((e) => [e.id, e]));

      const toUpsert = next.filter((e) => {
        const old = prevMap.get(e.id);
        return !old || JSON.stringify(old) !== JSON.stringify(e);
      });
      const toDelete = snapshot.filter((e) => !nextMap.has(e.id)).map((e) => e.id);

      const supabase2 = createClient();
      const ops: Array<Promise<{ error: { message: string } | null }>> = [];

      if (toUpsert.length > 0) {
        ops.push(
          supabase2.from("calendar_events")
            .upsert(toUpsert.map((e) => ({ ...itemToRow(e), user_id: user.id })))
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }
      if (toDelete.length > 0) {
        ops.push(
          supabase2.from("calendar_events")
            .delete().in("source_id", toDelete).eq("source_module", "custom")
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
  }, [customEvents, mutateLocal]);

  return { customEvents, setCustomEvents, loading: isLoading, error };
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCalendarData.ts
git commit -m "feat: migrate useCalendarData to SWR"
```

---

## Task 7 : Migrer useAdminData vers SWR

**Files:**
- Modify: `src/hooks/useAdminData.ts`

Ce hook gère 3 tables (`user_admin_statuses`, `user_admin_structures`, `user_admin_procedures`). Le fetcher SWR retourne un objet `{ statuses, structures, procedures }`.

- [ ] **Step 1: Lire le hook actuel en entier**

```bash
cat src/hooks/useAdminData.ts
```

Note les types `AdminStatus`, `AdminStructure`, `AdminProcedure` et les row mappers existants — ils sont conservés tels quels.

- [ ] **Step 2: Réécrire le hook**

Conserver tous les types, mappers, et le `makeUpdater` existants. Remplacer uniquement le `useEffect` de chargement initial et les setters d'état locaux :

```ts
// Remplacer l'import en haut :
import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";
// (conserver les imports de types depuis @/lib/sidekick-store)

const KEY = "user_admin";

// Conserver tous les mappers existants (statusToRow, rowToStatus, etc.)
// Conserver makeUpdater tel quel

async function fetchAdminData() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { statuses: [], structures: [], procedures: [] };

  const [{ data: statusRows }, { data: structureRows }, { data: procedureRows }] = await Promise.all([
    supabase.from("user_admin_statuses").select("*"),
    supabase.from("user_admin_structures").select("*"),
    supabase.from("user_admin_procedures").select("*"),
  ]);

  return {
    statuses: (statusRows ?? []).map(rowToStatus),
    structures: (structureRows ?? []).map(rowToStructure),
    procedures: (procedureRows ?? []).map(rowToProcedure),
  };
}

export function useAdminData() {
  const { data, isLoading, error: swrError, mutate: mutateLocal } = useSWR(KEY, fetchAdminData, {
    fallbackData: { statuses: [], structures: [], procedures: [] },
  });

  const statuses = data?.statuses ?? [];
  const structures = data?.structures ?? [];
  const procedures = data?.procedures ?? [];
  const error = swrError ? (swrError as Error).message : null;

  // Utiliser makeUpdater comme avant, mais mettre à jour mutateLocal après chaque op réussie
  // Pour chaque setter (setStatuses, setStructures, setProcedures) :
  // - Appeler mutateLocal({ ...data, statuses: next }, false) pour l'optimistic update
  // - Appeler mutate(KEY) après succès

  const setStatuses = useCallback((fn: (prev: AdminStatus[]) => AdminStatus[]) => {
    const snapshot = statuses;
    const next = fn(statuses);
    mutateLocal({ statuses: next, structures, procedures }, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { mutateLocal({ statuses: snapshot, structures, procedures }, false); return; }

      const prevMap = new Map(snapshot.map((s) => [s.id, s]));
      const nextMap = new Map(next.map((s) => [s.id, s]));
      const toUpsert = next.filter((s) => { const old = prevMap.get(s.id); return !old || JSON.stringify(old) !== JSON.stringify(s); });
      const toDelete = snapshot.filter((s) => !nextMap.has(s.id)).map((s) => s.id);

      const ops: Array<Promise<{ error: { message: string } | null }>> = [];
      if (toUpsert.length > 0) ops.push(supabase.from("user_admin_statuses").upsert(toUpsert.map((s) => statusToRow(s, user.id))).then(({ error }) => ({ error: error ? { message: error.message } : null })));
      if (toDelete.length > 0) ops.push(supabase.from("user_admin_statuses").delete().in("id", toDelete).then(({ error }) => ({ error: error ? { message: error.message } : null })));

      const results = await Promise.all(ops);
      if (results.find((r) => r.error)) { mutateLocal({ statuses: snapshot, structures, procedures }, false); }
      else { mutate(KEY); }
    })();
  }, [statuses, structures, procedures, mutateLocal]);

  const setStructures = useCallback((fn: (prev: AdminStructure[]) => AdminStructure[]) => {
    const snapshot = structures;
    const next = fn(structures);
    mutateLocal({ statuses, structures: next, procedures }, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { mutateLocal({ statuses, structures: snapshot, procedures }, false); return; }

      const prevMap = new Map(snapshot.map((s) => [s.id, s]));
      const nextMap = new Map(next.map((s) => [s.id, s]));
      const toUpsert = next.filter((s) => { const old = prevMap.get(s.id); return !old || JSON.stringify(old) !== JSON.stringify(s); });
      const toDelete = snapshot.filter((s) => !nextMap.has(s.id)).map((s) => s.id);

      const ops: Array<Promise<{ error: { message: string } | null }>> = [];
      if (toUpsert.length > 0) ops.push(supabase.from("user_admin_structures").upsert(toUpsert.map((s) => structureToRow(s, user.id))).then(({ error }) => ({ error: error ? { message: error.message } : null })));
      if (toDelete.length > 0) ops.push(supabase.from("user_admin_structures").delete().in("id", toDelete).then(({ error }) => ({ error: error ? { message: error.message } : null })));

      const results = await Promise.all(ops);
      if (results.find((r) => r.error)) { mutateLocal({ statuses, structures: snapshot, procedures }, false); }
      else { mutate(KEY); }
    })();
  }, [statuses, structures, procedures, mutateLocal]);

  const setProcedures = useCallback((fn: (prev: AdminProcedure[]) => AdminProcedure[]) => {
    const snapshot = procedures;
    const next = fn(procedures);
    mutateLocal({ statuses, structures, procedures: next }, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { mutateLocal({ statuses, structures, procedures: snapshot }, false); return; }

      const prevMap = new Map(snapshot.map((p) => [p.id, p]));
      const nextMap = new Map(next.map((p) => [p.id, p]));
      const toUpsert = next.filter((p) => { const old = prevMap.get(p.id); return !old || JSON.stringify(old) !== JSON.stringify(p); });
      const toDelete = snapshot.filter((p) => !nextMap.has(p.id)).map((p) => p.id);

      const ops: Array<Promise<{ error: { message: string } | null }>> = [];
      if (toUpsert.length > 0) ops.push(supabase.from("user_admin_procedures").upsert(toUpsert.map((p) => procedureToRow(p, user.id))).then(({ error }) => ({ error: error ? { message: error.message } : null })));
      if (toDelete.length > 0) ops.push(supabase.from("user_admin_procedures").delete().in("id", toDelete).then(({ error }) => ({ error: error ? { message: error.message } : null })));

      const results = await Promise.all(ops);
      if (results.find((r) => r.error)) { mutateLocal({ statuses, structures, procedures: snapshot }, false); }
      else { mutate(KEY); }
    })();
  }, [statuses, structures, procedures, mutateLocal]);

  return { statuses, setStatuses, structures, setStructures, procedures, setProcedures, loading: isLoading, error };
}
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAdminData.ts
git commit -m "feat: migrate useAdminData to SWR (3 tables)"
```

---

## Task 8 : Migrer useLiveData, useMarketingData, usePhonoData, useEditionData, useIncomesData vers SWR

**Files:**
- Modify: `src/hooks/useLiveData.ts`
- Modify: `src/hooks/useMarketingData.ts`
- Modify: `src/hooks/usePhonoData.ts`
- Modify: `src/hooks/useEditionData.ts`
- Modify: `src/hooks/useIncomesData.ts`

Ces hooks sont plus volumineux mais suivent exactement le même pattern que Tasks/Contacts. Pour chacun :

**Pattern appliqué identique à Task 4 :**
1. Créer une fonction `async fetchXxx(): Promise<{ ... }>` qui fait tous les selects Supabase du hook
2. Remplacer le `useEffect` + `useState(loading)` par `useSWR(KEY, fetchXxx, { fallbackData: { ... } })`
3. Chaque setter conserve la logique optimiste et appelle `mutateLocal(next, false)` + `mutate(KEY)` après succès

**Clés SWR à utiliser :**
- `useLiveData` → `"user_live"`
- `useMarketingData` → `"user_marketing"`
- `usePhonoData` → `"user_phono"`
- `useEditionData` → `"user_edition"`
- `useIncomesData` → `"user_incomes"`

- [ ] **Step 1: Lire chaque hook avant de le modifier**

```bash
cat src/hooks/useLiveData.ts
cat src/hooks/useMarketingData.ts
cat src/hooks/usePhonoData.ts
cat src/hooks/useEditionData.ts
cat src/hooks/useIncomesData.ts
```

Pour chaque hook, noter :
- Les types et mappers (conservés tels quels)
- Les tables Supabase fetchées (à regrouper dans le fetcher SWR)
- Les setters exposés (à mettre à jour avec `mutateLocal` + `mutate(KEY)`)

- [ ] **Step 2: Migrer useLiveData**

Appliquer le pattern SWR. Le fetcher regroupe tous les selects (tour_dates, rehearsals, equipment_inventory, equipment_lists, live_prospection). Retourner `{ tourDates, rehearsals, inventory, lists, prospection }`.

- [ ] **Step 3: Migrer useMarketingData**

Le fetcher regroupe les selects (mailing_campaigns, mailing_contacts, mailing_segments, marketing_events, presskit_profile).

- [ ] **Step 4: Migrer usePhonoData**

Le fetcher regroupe les selects (phono_tracks, phono_albums, phono_podcasts, phono_sessions).

- [ ] **Step 5: Migrer useEditionData**

Le fetcher regroupe les selects (edition_works, edition_sync).

- [ ] **Step 6: Migrer useIncomesData**

Le fetcher regroupe les selects (royalties_imports, royalties_manual, invoices, intermittence_missions).

- [ ] **Step 7: Vérifier TypeScript sur tous les hooks**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: aucune erreur

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useLiveData.ts src/hooks/useMarketingData.ts src/hooks/usePhonoData.ts src/hooks/useEditionData.ts src/hooks/useIncomesData.ts
git commit -m "feat: migrate live/marketing/phono/edition/incomes hooks to SWR"
```

---

## Task 9 : Évaluer et migrer useContractsData

**Files:**
- Modify: `src/hooks/useContractsData.ts`

Ce hook a une structure différente (3 collections, upload de signatures image, listener `onAuthStateChange`). Lire en entier avant de décider.

- [ ] **Step 1: Lire le hook en entier**

```bash
cat src/hooks/useContractsData.ts
```

- [ ] **Step 2: Évaluer la compatibilité SWR**

Si le hook :
- Fetch uniquement depuis Supabase DB (pas de Storage complexe) → migrer vers SWR avec clé `"user_contracts"`, fetcher qui regroupe les 3 tables
- A un `onAuthStateChange` listener → conserver ce listener, mais remplacer l'appel à `load()` par `mutate("user_contracts")` pour revalider le cache

Si le hook est trop couplé à l'état auth pour SWR (ex: signature upload avec état intermédiaire complexe) → ne pas migrer SWR, uniquement ajouter `<PageLoader />` dans `ContractsPage`.

- [ ] **Step 3: Appliquer la décision**

Si migration SWR : pattern identique aux autres hooks. Fetcher `fetchContracts` appelle `fetchUserContractTemplates`, `fetchUserContracts`, `fetchUserContractSignatures` en `Promise.all`. Les mutations conservent leur logique.

Si PageLoader uniquement : passer directement à Task 10.

- [ ] **Step 4: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useContractsData.ts
git commit -m "feat: migrate useContractsData to SWR (or add PageLoader only)"
```

---

## Task 10 : Ajouter PageLoader dans Tasks.tsx

**Files:**
- Modify: `src/modules/tasks/components/Tasks.tsx`

- [ ] **Step 1: Ajouter l'import et le guard**

Dans `Tasks.tsx`, après la ligne `const { tasks, setTasks, loading } = useTasksData();`, ajouter :

```tsx
import { PageLoader } from "@/components/ui/page-loader";

// Dans le corps du composant, avant le return principal :
if (loading) return <PageLoader />;
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/tasks/components/Tasks.tsx
git commit -m "feat: add PageLoader to Tasks"
```

---

## Task 11 : Ajouter PageLoader dans les pages Live

**Files:**
- Modify: `src/modules/live/components/TourDatesPage.tsx`
- Modify: `src/modules/live/components/RehearsalsPage.tsx`
- Modify: `src/modules/live/components/ProspectionPage.tsx`
- Modify: `src/modules/live/components/EquipmentPage.tsx`

Pour chaque fichier, le hook `useLiveData` expose `loading`. Pattern à appliquer :

```tsx
import { PageLoader } from "@/components/ui/page-loader";

// Dans le composant, remplacer tout guard loading existant OU ajouter avant le return principal :
if (loading) return <PageLoader />;
```

- [ ] **Step 1: Lire chaque fichier pour trouver où insérer le guard**

```bash
grep -n "loading\|return (" src/modules/live/components/TourDatesPage.tsx | head -10
grep -n "loading\|return (" src/modules/live/components/RehearsalsPage.tsx | head -10
grep -n "loading\|return (" src/modules/live/components/ProspectionPage.tsx | head -10
grep -n "loading\|return (" src/modules/live/components/EquipmentPage.tsx | head -10
```

- [ ] **Step 2: Appliquer le guard dans les 4 fichiers**

Dans TourDatesPage, RehearsalsPage, ProspectionPage : ajouter `if (loading) return <PageLoader />;` après la destructuration du hook useLiveData.

Dans EquipmentPage : remplacer le bloc `if (loading) { return (<div className="p-6"><h1>Matériel</h1>...`) par `if (loading) return <PageLoader />;`.

- [ ] **Step 3: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/live/components/TourDatesPage.tsx src/modules/live/components/RehearsalsPage.tsx src/modules/live/components/ProspectionPage.tsx src/modules/live/components/EquipmentPage.tsx
git commit -m "feat: add PageLoader to Live pages"
```

---

## Task 12 : Ajouter PageLoader dans les pages Phono

**Files:**
- Modify: `src/modules/phono/components/CatalogPage.tsx`
- Modify: `src/modules/phono/components/AlbumsPage.tsx`
- Modify: `src/modules/phono/components/TracksPage.tsx`
- Modify: `src/modules/phono/components/SessionsStudioPage.tsx`

- [ ] **Step 1: Localiser les variables loading dans chaque fichier**

```bash
grep -n "usePhonoData\|loading" src/modules/phono/components/CatalogPage.tsx | head -5
grep -n "usePhonoData\|loading" src/modules/phono/components/AlbumsPage.tsx | head -5
grep -n "usePhonoData\|loading" src/modules/phono/components/TracksPage.tsx | head -5
grep -n "usePhonoData\|loading" src/modules/phono/components/SessionsStudioPage.tsx | head -5
```

- [ ] **Step 2: Ajouter/remplacer le guard dans les 4 fichiers**

Ajouter `import { PageLoader } from "@/components/ui/page-loader";` et `if (loading) return <PageLoader />;` après la destructuration du hook.

Dans SessionsStudioPage : remplacer le bloc `if (loading) { return (<div>...`) par `if (loading) return <PageLoader />;`.

- [ ] **Step 3: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/phono/components/CatalogPage.tsx src/modules/phono/components/AlbumsPage.tsx src/modules/phono/components/TracksPage.tsx src/modules/phono/components/SessionsStudioPage.tsx
git commit -m "feat: add PageLoader to Phono pages"
```

---

## Task 13 : Ajouter PageLoader dans les pages Incomes, Marketing, Admin, Edition, Dashboard

**Files:**
- Modify: `src/modules/incomes/components/RoyaltiesPage.tsx`
- Modify: `src/modules/incomes/components/IntermittencePage.tsx`
- Modify: `src/modules/incomes/components/InvoicesPage.tsx`
- Modify: `src/modules/incomes/components/IncomesOverviewPage.tsx`
- Modify: `src/modules/incomes/components/CopyrightPage.tsx`
- Modify: `src/modules/incomes/components/NeighboringRightsPage.tsx`
- Modify: `src/modules/marketing/components/MailingPage.tsx`
- Modify: `src/modules/marketing/components/PresskitPage.tsx`
- Modify: `src/modules/marketing/components/MarketingOverviewPage.tsx`
- Modify: `src/modules/admin/components/StatutsPage.tsx`
- Modify: `src/modules/admin/components/ProceduresPage.tsx`
- Modify: `src/modules/admin/components/AdminOverviewPage.tsx`
- Modify: `src/modules/admin/components/ContractsPage.tsx`
- Modify: `src/modules/edition/components/WorksPage.tsx`
- Modify: `src/modules/edition/components/SyncPage.tsx`
- Modify: `src/modules/dashboard/components/DashboardPage.tsx`

- [ ] **Step 1: Pour chaque fichier, identifier le hook utilisé et la variable loading**

```bash
grep -rn "useIncomesData\|useMarketingData\|useAdminData\|useEditionData\|loading" \
  src/modules/incomes/components/RoyaltiesPage.tsx \
  src/modules/incomes/components/IntermittencePage.tsx \
  src/modules/incomes/components/InvoicesPage.tsx \
  src/modules/marketing/components/MailingPage.tsx \
  src/modules/admin/components/StatutsPage.tsx | head -30
```

- [ ] **Step 2: Appliquer le guard dans tous les fichiers**

Pour chaque fichier :
1. Ajouter `import { PageLoader } from "@/components/ui/page-loader";`
2. Remplacer tout bloc `if (loading) return <div>Chargement…</div>` existant par `if (loading) return <PageLoader />;`
3. Si aucun guard n'existe, ajouter `if (loading) return <PageLoader />;` après la destructuration du hook de données

- [ ] **Step 3: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 4: Commit**

```bash
git add \
  src/modules/incomes/components/RoyaltiesPage.tsx \
  src/modules/incomes/components/IntermittencePage.tsx \
  src/modules/incomes/components/InvoicesPage.tsx \
  src/modules/incomes/components/IncomesOverviewPage.tsx \
  src/modules/incomes/components/CopyrightPage.tsx \
  src/modules/incomes/components/NeighboringRightsPage.tsx \
  src/modules/marketing/components/MailingPage.tsx \
  src/modules/marketing/components/PresskitPage.tsx \
  src/modules/marketing/components/MarketingOverviewPage.tsx \
  src/modules/admin/components/StatutsPage.tsx \
  src/modules/admin/components/ProceduresPage.tsx \
  src/modules/admin/components/AdminOverviewPage.tsx \
  src/modules/admin/components/ContractsPage.tsx \
  src/modules/edition/components/WorksPage.tsx \
  src/modules/edition/components/SyncPage.tsx \
  src/modules/dashboard/components/DashboardPage.tsx
git commit -m "feat: add PageLoader to Incomes/Marketing/Admin/Edition/Dashboard pages"
```

---

## Task 14 : Ajouter PageLoader dans SettingsPage, ICalSyncPanel, DocumentsPage

**Files:**
- Modify: `src/modules/settings/components/SettingsPage.tsx`
- Modify: `src/modules/calendar/components/ICalSyncPanel.tsx`
- Modify: `src/modules/admin/components/DocumentsPage.tsx`

- [ ] **Step 1: SettingsPage — remplacer Loader2 par PageLoader**

Lire la section loading dans SettingsPage :
```bash
grep -n "Loader2\|isLoading\|loading" src/modules/settings/components/SettingsPage.tsx | head -10
```

Remplacer le bloc existant :
```tsx
// Avant (ligne ~90)
if (loading) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// Après
if (loading) return <PageLoader />;
```

Supprimer l'import `Loader2` de lucide-react si plus utilisé ailleurs dans le fichier.

- [ ] **Step 2: ICalSyncPanel — remplacer texte brut**

```bash
grep -n "loading" src/modules/calendar/components/ICalSyncPanel.tsx
```

Remplacer :
```tsx
// Avant
if (loading) {
  return <div className="text-sm text-white/50 py-4">Chargement…</div>;
}

// Après
if (loading) return <PageLoader />;
```

- [ ] **Step 3: DocumentsPage — ajouter PageLoader sur isLoading**

```bash
grep -n "isLoading\|useDriveData" src/modules/admin/components/DocumentsPage.tsx | head -5
```

Ajouter après la destructuration de `useDriveData` :
```tsx
import { PageLoader } from "@/components/ui/page-loader";

// Dans le composant, après const { isLoading, ... } = useDriveData();
if (isLoading) return <PageLoader />;
```

- [ ] **Step 4: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/settings/components/SettingsPage.tsx src/modules/calendar/components/ICalSyncPanel.tsx src/modules/admin/components/DocumentsPage.tsx
git commit -m "feat: replace legacy loading states with PageLoader in Settings/Calendar/Documents"
```

---

## Task 15 : Vérification finale

**Files:** aucun

- [ ] **Step 1: Build de production**

```bash
npm run build 2>&1 | tail -20
```

Expected: aucune erreur de build

- [ ] **Step 2: Type check complet**

```bash
npx tsc --noEmit 2>&1
```

Expected: aucune erreur

- [ ] **Step 3: Vérifier l'absence de guards loading manquants**

```bash
grep -rn "useLiveData\|useTasksData\|usePhonoData\|useMarketingData\|useAdminData\|useEditionData\|useIncomesData\|useContactsData\|useCalendarData" src/modules --include="*.tsx" -l
```

Pour chaque fichier listé, vérifier qu'il contient `PageLoader` :
```bash
grep -rL "PageLoader" src/modules --include="*.tsx" | xargs grep -l "useLiveData\|useTasksData\|usePhonoData\|useMarketingData\|useAdminData\|useEditionData\|useIncomesData\|useContactsData\|useCalendarData" 2>/dev/null
```

Expected: aucun fichier listé (tous les composants qui utilisent un hook de données ont un PageLoader)

- [ ] **Step 4: Test manuel en dev**

```bash
npm run dev
```

Vérifier :
1. Premier chargement d'une page → spinner visible, jamais de vide
2. Naviguer vers une autre page puis revenir → données instantanées, pas de spinner
3. Attendre 35s sur une page puis naviguer → re-fetch transparent en arrière-plan

- [ ] **Step 5: Commit final si ajustements**

```bash
git add -A
git commit -m "fix: final adjustments after integration testing"
```
