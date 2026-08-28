# Error Handling Design — SIDEKICK

**Date:** 2026-04-22  
**Status:** Approved

## Objective

Add clear, contextual error messages throughout the app for three categories of failures:
1. JavaScript crashes in page components (unexpected errors)
2. SWR/Supabase data-loading failures
3. Unknown routes (404)

## Approach

**Option B — Error Boundary per page + inline SWR handling**

Two independent layers:
- A shared `<PageError>` component for rendering all error states
- Per-module inline SWR error handling in page-level components
- A Next.js `app/(app)/error.tsx` for JS crashes (sidebar + header remain visible)
- A Next.js `app/not-found.tsx` for 404 (standalone, no layout)

## Section 1 — `<PageError>` Component

**File:** `src/components/ui/page-error.tsx`

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | yes | Short contextual message, e.g. "Impossible de charger tes dates de live" |
| `description` | `string` | no | Detail, e.g. "Vérifie ta connexion ou réessaie dans quelques instants." |
| `onRetry` | `() => void` | no | If provided, renders a "Réessayer" button |
| `className` | `string` | no | For contextual layout overrides |

**Visual:**
- Centered in its container (not full-screen)
- `AlertCircle` icon from Lucide, `48px`, color `rgba(245,245,245,0.4)`
- Title in `text-foreground`, description in muted text
- "Réessayer" button with `outline` variant, only shown if `onRetry` provided
- Transparent background — integrates with page background `#101010`

## Section 2 — SWR Error Handling in Page Components

Each module component that consumes a `use*Data` hook and renders critical data must handle the `error` state by returning `<PageError>` early.

**Pattern:**
```tsx
const { data, isLoading, error } = useModuleData();

if (error) return (
  <PageError
    title="Impossible de charger tes dates de live"
    description="Vérifie ta connexion ou réessaie dans quelques instants."
    onRetry={() => mutate("user_tour_dates")}
  />
);
```

The retry calls `mutate(KEY)` from SWR — no full page reload.

**Scope:** ~15-20 page-level components (not modal sub-components).

**Messages per module:**
| Module | Component | Title |
|---|---|---|
| Tasks | `Tasks.tsx` | "Impossible de charger tes tâches" |
| Live / Tour dates | `TourDatesPage.tsx` | "Impossible de charger tes dates de live" |
| Live / Répétitions | `RehearsalsPage.tsx` | "Impossible de charger tes répétitions" |
| Live / Matériel | `EquipmentPage.tsx` | "Impossible de charger ton inventaire" |
| Live / Prospection | `ProspectionPage.tsx` (live) | "Impossible de charger ta prospection live" |
| Contacts | `ContactsPage.tsx` | "Impossible de charger tes contacts" |
| Contacts / Prospection | `ProspectionPage.tsx` (contacts) | "Impossible de charger ta prospection" |
| Phono / Catalogue | `CatalogPage.tsx` | "Impossible de charger ton catalogue" |
| Phono / Sessions | `SessionsStudioPage.tsx` | "Impossible de charger tes sessions studio" |
| Marketing / Mailing | `MailingPage.tsx` | "Impossible de charger tes campagnes" |
| Marketing / Calendrier | `MarketingCalendar.tsx` | "Impossible de charger le calendrier éditorial" |
| Marketing / Presskit | `PresskitPage.tsx` | "Impossible de charger ton presskit" |
| Revenus | `RoyaltiesPage.tsx`, `InvoicesPage.tsx`, `IntermittencePage.tsx` | "Impossible de charger tes revenus" |
| Calendrier | `GlobalCalendarPage.tsx` | "Impossible de charger ton calendrier" |
| Admin | `ContractsPage.tsx`, `StatutsPage.tsx`, etc. | "Impossible de charger tes données admin" |
| Édition | `WorksPage.tsx`, `SyncPage.tsx` | "Impossible de charger tes œuvres" |
| Dashboard | `DashboardPage.tsx` | "Impossible de charger le tableau de bord" |

Default description for all: *"Vérifie ta connexion ou réessaie dans quelques instants."*

## Section 3 — `app/(app)/error.tsx` (JS Crashes)

**File:** `app/(app)/error.tsx`

- Must be `"use client"` (Next.js requirement for Error Boundaries)
- Props: `error: Error`, `reset: () => void` (injected by Next.js)
- Renders `<PageError>` with `onRetry={() => reset()}`
- Sidebar and Header remain intact — `error.tsx` only replaces `children` within the `(app)` layout
- Additional secondary link: "Retour au Dashboard" → `href="/dashboard"`, variant `ghost`

**Content:**
- Title: "Une erreur inattendue s'est produite"
- Description: "Quelque chose s'est mal passé dans cette page. Tu peux réessayer ou revenir au Dashboard."

## Section 4 — `app/not-found.tsx` (404)

**File:** `app/not-found.tsx`

- Rendered outside of the `(app)` layout — no sidebar, no header
- Must be visually self-sufficient

**Visual:**
- Background `#101010`, full-screen centered (`min-h-screen flex items-center justify-center`)
- Large `404` text above the icon — typographic style, muted color
- `Compass` icon from Lucide, `64px`, accent color `#F0FF00`
- Title: "Cette page n'existe pas"
- Description: "Le lien que tu as suivi est invalide ou la page a été déplacée."
- CTA button "Retour au Dashboard" → `href="/dashboard"`, variant `default` (yellow)

## Files to Create or Modify

| Action | File |
|---|---|
| Create | `src/components/ui/page-error.tsx` |
| Create | `app/(app)/error.tsx` |
| Create | `app/not-found.tsx` |
| Modify | ~15-20 module page components (add SWR error handling) |

## Out of Scope

- Toast/notification system for non-blocking errors
- Error logging / Sentry integration
- Loading skeleton states (separate concern)
- Modal sub-components error handling
