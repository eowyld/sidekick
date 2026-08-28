# Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clear, contextual error states across all module pages for SWR failures, JS crashes, and unknown routes.

**Architecture:** A shared `<PageError>` component renders all error states. Each page-level module component adds an early-return on `error` from its SWR hook, calling `mutate(KEY)` for retry. Two Next.js files handle global cases: `app/(app)/error.tsx` for JS crashes (sidebar stays visible) and `app/not-found.tsx` for 404 (standalone, dark design).

**Tech Stack:** Next.js 16 App Router, SWR, Lucide React, Tailwind CSS, custom `Button` component from `src/components/ui/button.tsx`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/components/ui/page-error.tsx` | Shared error display component |
| Create | `app/(app)/error.tsx` | Next.js Error Boundary for JS crashes within (app) layout |
| Create | `app/not-found.tsx` | Next.js 404 page, standalone dark design |
| Modify | `src/modules/tasks/components/Tasks.tsx` | Add SWR error handling |
| Modify | `src/modules/live/components/TourDatesPage.tsx` | Add SWR error handling |
| Modify | `src/modules/live/components/RehearsalsPage.tsx` | Add SWR error handling |
| Modify | `src/modules/live/components/EquipmentPage.tsx` | Add SWR error handling |
| Modify | `src/modules/live/components/ProspectionPage.tsx` | Add SWR error handling |
| Modify | `src/modules/contacts/components/ContactsPage.tsx` | Add SWR error handling |
| Modify | `src/modules/phono/components/CatalogPage.tsx` | Add SWR error handling |
| Modify | `src/modules/phono/components/SessionsStudioPage.tsx` | Add SWR error handling |
| Modify | `src/modules/marketing/components/MailingPage.tsx` | Add SWR error handling |
| Modify | `src/modules/marketing/components/MarketingCalendar.tsx` | Add SWR error handling |
| Modify | `src/modules/marketing/components/PresskitPage.tsx` | Add SWR error handling |
| Modify | `src/modules/incomes/components/RoyaltiesPage.tsx` | Add SWR error handling |
| Modify | `src/modules/incomes/components/InvoicesPage.tsx` | Add SWR error handling |
| Modify | `src/modules/incomes/components/IntermittencePage.tsx` | Add SWR error handling |
| Modify | `src/modules/calendar/components/GlobalCalendarPage.tsx` | Add SWR error handling |
| Modify | `src/modules/admin/components/StatutsPage.tsx` | Add SWR error handling |
| Modify | `src/modules/admin/components/ProceduresPage.tsx` | Add SWR error handling |
| Modify | `src/modules/edition/components/WorksPage.tsx` | Add SWR error handling |
| Modify | `src/modules/edition/components/SyncPage.tsx` | Add SWR error handling |
| Modify | `src/modules/dashboard/components/DashboardPage.tsx` | Add SWR error handling |

---

## Task 1: Create `<PageError>` component

**Files:**
- Create: `src/components/ui/page-error.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageErrorProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function PageError({ title, description, onRetry, className }: PageErrorProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center flex-1 gap-4 py-24 text-center", className)}>
      <AlertCircle size={48} style={{ color: "rgba(245,245,245,0.4)" }} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium" style={{ color: "rgba(245,245,245,0.9)" }}>
          {title}
        </p>
        {description && (
          <p className="text-sm" style={{ color: "rgba(245,245,245,0.5)" }}>
            {description}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the file was created correctly**

```bash
cat src/components/ui/page-error.tsx
```

Expected: file content printed with no errors.

---

## Task 2: Create `app/(app)/error.tsx`

**Files:**
- Create: `app/(app)/error.tsx`

- [ ] **Step 1: Create the Next.js error boundary**

```tsx
"use client";

import Link from "next/link";
import { PageError } from "@/components/ui/page-error";
import { Button } from "@/components/ui/button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 py-24">
      <PageError
        title="Une erreur inattendue s'est produite"
        description="Quelque chose s'est mal passé dans cette page. Tu peux réessayer ou revenir au Dashboard."
        onRetry={reset}
      />
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard">Retour au Dashboard</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file was created**

```bash
cat app/(app)/error.tsx
```

Expected: file content printed with no errors.

---

## Task 3: Create `app/not-found.tsx`

**Files:**
- Create: `app/not-found.tsx`

- [ ] **Step 1: Create the 404 page**

```tsx
import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 text-center"
      style={{ backgroundColor: "#101010" }}
    >
      <p
        className="text-8xl font-bold tracking-tight"
        style={{ color: "rgba(245,245,245,0.15)" }}
      >
        404
      </p>
      <Compass size={64} style={{ color: "#F0FF00" }} />
      <div className="flex flex-col gap-2">
        <p className="text-lg font-medium" style={{ color: "rgba(245,245,245,0.9)" }}>
          Cette page n&apos;existe pas
        </p>
        <p className="text-sm" style={{ color: "rgba(245,245,245,0.5)" }}>
          Le lien que tu as suivi est invalide ou la page a été déplacée.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Retour au Dashboard</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file was created**

```bash
cat app/not-found.tsx
```

Expected: file content printed with no errors.

---

## Task 4: Add error handling to `Tasks.tsx`

**Files:**
- Modify: `src/modules/tasks/components/Tasks.tsx`

SWR key for retry: `"user_tasks"`

- [ ] **Step 1: Add `error` to the hook destructure and add error handling**

Find the existing line:
```tsx
const { tasks, setTasks, loading } = useTasksData();
```

Replace with:
```tsx
const { tasks, setTasks, loading, error } = useTasksData();
```

- [ ] **Step 2: Add PageError import and error early-return**

Add import at top of file (after existing imports):
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger tes tâches"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_tasks")}
  />
);
```

- [ ] **Step 3: Verify the dev server has no compile errors**

```bash
npm run dev 2>&1 | head -20
```

Expected: no TypeScript or compile errors.

---

## Task 5: Add error handling to `TourDatesPage.tsx`

**Files:**
- Modify: `src/modules/live/components/TourDatesPage.tsx`

SWR key for retry: `"user_live"`

- [ ] **Step 1: Add `error` to the hook destructure**

Find:
```tsx
const { tourDates: dates, setTourDates: setDates, equipmentInventory, equipmentLists, loading } = useLiveData();
```

Replace with:
```tsx
const { tourDates: dates, setTourDates: setDates, equipmentInventory, equipmentLists, loading, error } = useLiveData();
```

- [ ] **Step 2: Add PageError import and error early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger tes dates de live"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_live")}
  />
);
```

---

## Task 6: Add error handling to `RehearsalsPage.tsx`

**Files:**
- Modify: `src/modules/live/components/RehearsalsPage.tsx`

SWR key for retry: `"user_live"`

- [ ] **Step 1: Check existing hook destructure**

```bash
grep -n "useLiveData\|loading\|error" src/modules/live/components/RehearsalsPage.tsx | head -10
```

- [ ] **Step 2: Add `error` to the hook destructure**

Find the existing `useLiveData()` destructure and add `error` to it. Example pattern:
```tsx
const { rehearsals, setRehearsals, loading, error } = useLiveData();
```

- [ ] **Step 3: Add PageError import and error early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger tes répétitions"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_live")}
  />
);
```

---

## Task 7: Add error handling to `EquipmentPage.tsx`

**Files:**
- Modify: `src/modules/live/components/EquipmentPage.tsx`

SWR key for retry: `"user_live"`

- [ ] **Step 1: Check existing hook destructure**

```bash
grep -n "useLiveData\|loading\|error" src/modules/live/components/EquipmentPage.tsx | head -10
```

- [ ] **Step 2: Add `error` to the hook destructure**

Find the `useLiveData()` call and add `error`:
```tsx
const { equipmentInventory, setEquipmentInventory, equipmentLists, setEquipmentLists, loading, error } = useLiveData();
```

- [ ] **Step 3: Add PageError import and error early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger ton inventaire"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_live")}
  />
);
```

---

## Task 8: Add error handling to `ProspectionPage.tsx` (live)

**Files:**
- Modify: `src/modules/live/components/ProspectionPage.tsx`

SWR key for retry: `"user_live"`

- [ ] **Step 1: Check existing hook destructure**

```bash
grep -n "useLiveData\|loading\|error" src/modules/live/components/ProspectionPage.tsx | head -10
```

- [ ] **Step 2: Add `error` to the hook destructure and add imports + early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add `error` to the `useLiveData()` destructure, then after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger ta prospection live"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_live")}
  />
);
```

---

## Task 9: Add error handling to `ContactsPage.tsx`

**Files:**
- Modify: `src/modules/contacts/components/ContactsPage.tsx`

SWR key for retry: `"user_contacts"`

- [ ] **Step 1: Add `error` to hook destructure**

Find:
```tsx
const { contacts, setContacts, loading } = useContactsData();
```

Replace with:
```tsx
const { contacts, setContacts, loading, error } = useContactsData();
```

- [ ] **Step 2: Add PageError import and error early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger tes contacts"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_contacts")}
  />
);
```

---

## Task 10: Add error handling to `CatalogPage.tsx`

**Files:**
- Modify: `src/modules/phono/components/CatalogPage.tsx`

SWR key for retry: `"user_phono"`

- [ ] **Step 1: Check existing hook destructure**

```bash
grep -n "usePhonoData\|loading\|error" src/modules/phono/components/CatalogPage.tsx | head -10
```

- [ ] **Step 2: Add `error` to hook destructure + imports + early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add `error` to the `usePhonoData()` destructure, then after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger ton catalogue"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_phono")}
  />
);
```

---

## Task 11: Add error handling to `SessionsStudioPage.tsx`

**Files:**
- Modify: `src/modules/phono/components/SessionsStudioPage.tsx`

SWR key for retry: `"user_phono"`

- [ ] **Step 1: Check existing hook destructure**

```bash
grep -n "usePhonoData\|loading\|error" src/modules/phono/components/SessionsStudioPage.tsx | head -10
```

- [ ] **Step 2: Add `error` to hook destructure + imports + early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add `error` to the `usePhonoData()` destructure, then after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger tes sessions studio"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_phono")}
  />
);
```

---

## Task 12: Add error handling to `MailingPage.tsx`

**Files:**
- Modify: `src/modules/marketing/components/MailingPage.tsx`

SWR key for retry: `"user_marketing"`

- [ ] **Step 1: Check existing hook destructure**

```bash
grep -n "useMarketingData\|loading\|error" src/modules/marketing/components/MailingPage.tsx | head -10
```

- [ ] **Step 2: Add `error` to hook destructure + imports + early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add `error` to the `useMarketingData()` destructure, then after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger tes campagnes"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_marketing")}
  />
);
```

---

## Task 13: Add error handling to `MarketingCalendar.tsx`

**Files:**
- Modify: `src/modules/marketing/components/MarketingCalendar.tsx`

SWR key for retry: `"user_marketing"`

- [ ] **Step 1: Check existing hook destructure**

```bash
grep -n "useMarketingData\|loading\|error" src/modules/marketing/components/MarketingCalendar.tsx | head -10
```

- [ ] **Step 2: Add `error` to hook destructure + imports + early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add `error` to the `useMarketingData()` destructure, then after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger le calendrier éditorial"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_marketing")}
  />
);
```

---

## Task 14: Add error handling to `PresskitPage.tsx`

**Files:**
- Modify: `src/modules/marketing/components/PresskitPage.tsx`

SWR key for retry: `"user_marketing"`

- [ ] **Step 1: Check existing hook destructure**

```bash
grep -n "useMarketingData\|loading\|error" src/modules/marketing/components/PresskitPage.tsx | head -10
```

- [ ] **Step 2: Add `error` to hook destructure + imports + early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add `error` to the `useMarketingData()` destructure, then after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger ton presskit"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_marketing")}
  />
);
```

---

## Task 15: Add error handling to `RoyaltiesPage.tsx`

**Files:**
- Modify: `src/modules/incomes/components/RoyaltiesPage.tsx`

SWR key for retry: `"user_incomes"`

- [ ] **Step 1: Check existing hook destructure**

```bash
grep -n "useIncomesData\|loading\|error" src/modules/incomes/components/RoyaltiesPage.tsx | head -10
```

- [ ] **Step 2: Add `error` to hook destructure + imports + early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add `error` to the `useIncomesData()` destructure, then after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger tes revenus"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_incomes")}
  />
);
```

---

## Task 16: Add error handling to `InvoicesPage.tsx`

**Files:**
- Modify: `src/modules/incomes/components/InvoicesPage.tsx`

SWR key for retry: `"user_incomes"`

- [ ] **Step 1: Check existing hook destructure**

```bash
grep -n "useIncomesData\|loading\|error" src/modules/incomes/components/InvoicesPage.tsx | head -10
```

- [ ] **Step 2: Add `error` to hook destructure + imports + early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add `error` to the `useIncomesData()` destructure, then after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger tes factures"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_incomes")}
  />
);
```

---

## Task 17: Add error handling to `IntermittencePage.tsx`

**Files:**
- Modify: `src/modules/incomes/components/IntermittencePage.tsx`

SWR key for retry: `"user_incomes"`

- [ ] **Step 1: Check existing hook destructure**

```bash
grep -n "useIncomesData\|loading\|error" src/modules/incomes/components/IntermittencePage.tsx | head -10
```

- [ ] **Step 2: Add `error` to hook destructure + imports + early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add `error` to the `useIncomesData()` destructure, then after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger tes données d'intermittence"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_incomes")}
  />
);
```

---

## Task 18: Add error handling to `GlobalCalendarPage.tsx`

**Files:**
- Modify: `src/modules/calendar/components/GlobalCalendarPage.tsx`

SWR key for retry: `"calendar_events"`

- [ ] **Step 1: Check existing hook destructure**

```bash
grep -n "useCalendarData\|loading\|error" src/modules/calendar/components/GlobalCalendarPage.tsx | head -10
```

- [ ] **Step 2: Add `error` to hook destructure + imports + early-return**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add `error` to the `useCalendarData()` destructure, then after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger ton calendrier"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("calendar_events")}
  />
);
```

---

## Task 19: Add error handling to `StatutsPage.tsx` and `ProceduresPage.tsx`

**Files:**
- Modify: `src/modules/admin/components/StatutsPage.tsx`
- Modify: `src/modules/admin/components/ProceduresPage.tsx`

SWR key for retry: `"user_admin"`

- [ ] **Step 1: Update `StatutsPage.tsx`**

Find the existing `useAdminData()` destructure (already has `loading`):
```tsx
const { statuses, setStatuses, loading } = useAdminData();
```

Replace with:
```tsx
const { statuses, setStatuses, loading, error } = useAdminData();
```

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger tes statuts juridiques"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_admin")}
  />
);
```

- [ ] **Step 2: Check `ProceduresPage.tsx` hook destructure**

```bash
grep -n "useAdminData\|loading\|error" src/modules/admin/components/ProceduresPage.tsx | head -10
```

- [ ] **Step 3: Update `ProceduresPage.tsx`**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add `error` to the `useAdminData()` destructure, then after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger tes démarches"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_admin")}
  />
);
```

---

## Task 20: Add error handling to `WorksPage.tsx` and `SyncPage.tsx`

**Files:**
- Modify: `src/modules/edition/components/WorksPage.tsx`
- Modify: `src/modules/edition/components/SyncPage.tsx`

SWR key for retry: `"user_edition"`

- [ ] **Step 1: Check `WorksPage.tsx` hook destructure**

```bash
grep -n "useEditionData\|loading\|error" src/modules/edition/components/WorksPage.tsx | head -10
```

- [ ] **Step 2: Update `WorksPage.tsx`**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add `error` to the `useEditionData()` destructure, then after the `if (loading)` guard (or before the main JSX if no loading guard exists):
```tsx
if (error) return (
  <PageError
    title="Impossible de charger tes œuvres"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_edition")}
  />
);
```

- [ ] **Step 3: Check `SyncPage.tsx` hook destructure**

```bash
grep -n "useEditionData\|loading\|error" src/modules/edition/components/SyncPage.tsx | head -10
```

- [ ] **Step 4: Update `SyncPage.tsx`**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

Add `error` to the `useEditionData()` destructure, then after the `if (loading)` guard:
```tsx
if (error) return (
  <PageError
    title="Impossible de charger tes données de synchronisation"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_edition")}
  />
);
```

---

## Task 21: Add error handling to `DashboardPage.tsx`

**Files:**
- Modify: `src/modules/dashboard/components/DashboardPage.tsx`

Dashboard uses multiple hooks. Handle each independently so a single failing hook doesn't block the whole dashboard.

- [ ] **Step 1: Check current hook destructures in DashboardPage**

```bash
grep -n "use.*Data\|loading\|error" src/modules/dashboard/components/DashboardPage.tsx | head -20
```

- [ ] **Step 2: Add error imports**

Add import at top of file:
```tsx
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
```

- [ ] **Step 3: Add individual error guards per hook**

For each `use*Data` call that returns an `error`, add an early-return pattern. Since the dashboard aggregates multiple hooks, wrap the return at the component body level after all hooks are called (hooks must not be called conditionally). Add a combined check:

```tsx
// After all hook calls, before the main return
const dataError = tasksError || liveError || incomesError || phonoError || calendarError;
if (dataError) return (
  <PageError
    title="Impossible de charger le tableau de bord"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => {
      mutate("user_tasks");
      mutate("user_live");
      mutate("user_incomes");
      mutate("user_phono");
      mutate("calendar_events");
    }}
  />
);
```

Note: destructure `error` (renaming to avoid conflicts) from each hook:
```tsx
const { tasks, error: tasksError } = useTasksData();
const { tourDates, rehearsals, error: liveError } = useLiveData();
const { invoices, error: incomesError } = useIncomesData();
const { sessions, error: phonoError } = usePhonoData();
const { customEvents, error: calendarError } = useCalendarData();
```

---

## Task 22: Final verification

- [ ] **Step 1: Type-check the entire project**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors. Fix any TypeScript issues before proceeding.

- [ ] **Step 2: Start the dev server and manually verify**

```bash
npm run dev
```

Open the app in a browser and verify:
1. Normal pages load without errors
2. Navigate to a non-existent route (e.g. `/does-not-exist`) → 404 page with Compass icon and "Retour au Dashboard" button
3. The 404 page is dark (`#101010` background) and has no sidebar

- [ ] **Step 3: Commit**

```bash
git add \
  src/components/ui/page-error.tsx \
  app/(app)/error.tsx \
  app/not-found.tsx \
  src/modules/tasks/components/Tasks.tsx \
  src/modules/live/components/TourDatesPage.tsx \
  src/modules/live/components/RehearsalsPage.tsx \
  src/modules/live/components/EquipmentPage.tsx \
  src/modules/live/components/ProspectionPage.tsx \
  src/modules/contacts/components/ContactsPage.tsx \
  src/modules/phono/components/CatalogPage.tsx \
  src/modules/phono/components/SessionsStudioPage.tsx \
  src/modules/marketing/components/MailingPage.tsx \
  src/modules/marketing/components/MarketingCalendar.tsx \
  src/modules/marketing/components/PresskitPage.tsx \
  src/modules/incomes/components/RoyaltiesPage.tsx \
  src/modules/incomes/components/InvoicesPage.tsx \
  src/modules/incomes/components/IntermittencePage.tsx \
  src/modules/calendar/components/GlobalCalendarPage.tsx \
  src/modules/admin/components/StatutsPage.tsx \
  src/modules/admin/components/ProceduresPage.tsx \
  src/modules/edition/components/WorksPage.tsx \
  src/modules/edition/components/SyncPage.tsx \
  src/modules/dashboard/components/DashboardPage.tsx

git commit -m "feat: add contextual error states across all module pages

- Add PageError shared component (icon, title, description, retry button)
- Add app/(app)/error.tsx for JS crash boundary (sidebar stays visible)
- Add app/not-found.tsx with dark 404 design (Compass icon, CTA)
- Add SWR error handling with contextual messages in all 20 page components"
```
