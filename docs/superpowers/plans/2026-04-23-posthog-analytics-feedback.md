# PostHog — Analytics, Error Tracking & Feedback Testeurs Alpha

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installer PostHog dans SIDEKICK pour couvrir analytics d'usage, error tracking, et feedback testeurs alpha — un seul outil, sans backend custom.

**Architecture:** Un `PostHogProvider` client dans `app/layout.tsx` initialise PostHog globalement. Un `PostHogPageView` gère les pageviews App Router. Un `GlobalErrorBoundary` dans le layout app catch les erreurs React. Un `FeedbackButton` flottant déclenche une PostHog Survey. Les events custom sont appelés directement dans chaque composant module via `posthog.capture()`.

**Tech Stack:** `posthog-js`, Next.js 16 App Router, React class component (ErrorBoundary), Tailwind, Lucide React.

---

## Variables d'environnement (à faire avant tout)

Avant de démarrer, ajouter dans `.env.local` :

```
NEXT_PUBLIC_POSTHOG_KEY=phc_XXXXXXXXXXXXXXXX
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Et dans les variables d'environnement Vercel (Settings → Environment Variables).

La clé se trouve dans le dashboard PostHog : Settings → Project → Project API Key.

---

## File Map

**Nouveaux fichiers :**
- `src/components/analytics/PostHogProvider.tsx` — init PostHog, wraps children
- `src/components/analytics/PostHogPageView.tsx` — capture `$pageview` sur chaque route change
- `src/components/analytics/GlobalErrorBoundary.tsx` — React class ErrorBoundary avec report PostHog
- `src/components/analytics/FeedbackButton.tsx` — bouton flottant qui ouvre une PostHog Survey

**Fichiers modifiés :**
- `app/layout.tsx` — wrap avec `PostHogProvider` + `PostHogPageView`
- `app/(app)/layout.tsx` — wrap avec `GlobalErrorBoundary` + `FeedbackButton`
- `app/(app)/error.tsx` — ajout `posthog.capture('error_page_shown')` au mount
- `src/app/(auth)/login/page.tsx` — `posthog.capture('user_signed_in')` + `posthog.identify()`
- `src/components/layout/Header.tsx` — `posthog.capture('user_signed_out')` + `posthog.reset()`
- `src/modules/tasks/components/TaskModal.tsx` — `task_created`
- `src/modules/tasks/components/TaskCard.tsx` — `task_completed`, `task_deleted`
- `src/modules/tasks/components/AiSuggestions.tsx` — `ai_suggestion_converted`
- `src/modules/calendar/components/GlobalCalendarPage.tsx` — `event_created`, `event_deleted`
- `src/modules/phono/components/TracksPage.tsx` — `track_created`
- `src/modules/phono/components/AlbumsPage.tsx` — `album_created`
- `src/modules/phono/components/CatalogPage.tsx` — `podcast_created`
- `src/modules/phono/components/SessionsPage.tsx` — `session_created`
- `src/modules/live/components/TourDatesPage.tsx` — `tour_date_created`, `tour_date_deleted`, `tour_transport_added`, `tour_accommodation_added`, `tour_fee_added`
- `src/modules/live/components/RehearsalsPage.tsx` — `rehearsal_created`, `rehearsal_deleted`, `rehearsal_fee_added`, `rehearsal_equipment_added`
- `src/modules/live/components/EquipmentPage.tsx` — `equipment_list_created`, `equipment_item_added`
- `src/modules/contacts/components/ContactsPage.tsx` — `contact_created`, `contact_deleted`
- `src/modules/incomes/components/InvoicesPage.tsx` — `invoice_created`, `invoice_downloaded`
- `src/modules/incomes/components/IntermittenceMissions.tsx` — `mission_created`
- `src/modules/incomes/components/RoyaltiesImports.tsx` — `royalties_import_uploaded`
- `src/modules/incomes/components/CopyrightPage.tsx` ou `CopyrightHistorique.tsx` — `publishing_statement_imported`
- `src/modules/edition/components/WorksPage.tsx` — `work_created`, `work_track_linked`
- `src/modules/marketing/components/MailingPage.tsx` — `post_created`, `mail_sent`, `campaign_saved_draft`, `campaign_loaded`
- `src/modules/marketing/components/PresskitPage.tsx` — `presskit_pdf_downloaded`, `presskit_link_copied`, `presskit_reset`
- `src/modules/admin/components/StatutsPage.tsx` — `status_created`
- `src/modules/admin/components/ProceduresPage.tsx` — `procedure_created`
- `src/modules/admin/components/ContractsPage.tsx` — `contract_created`, `contract_template_created`, `contract_signature_created`
- `src/modules/projects/components/ProjectsPage.tsx` — `project_created`
- `src/modules/admin/components/DocumentsPage.tsx` — `file_added`, `file_deleted`, `file_renamed`, `file_moved`
- Settings components (password, profile, modules) — `password_changed`, `profile_name_updated`, `gmail_connected`, `outlook_connected`, `module_visibility_updated`

---

## Task 1: Installer posthog-js

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Installer le package**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npm install posthog-js
```

Expected output: `added 1 package` (ou similaire), pas d'erreur.

- [ ] **Step 2: Vérifier l'installation**

```bash
grep "posthog-js" package.json
```

Expected: `"posthog-js": "^X.X.X"` dans dependencies.

---

## Task 2: PostHogProvider

**Files:**
- Create: `src/components/analytics/PostHogProvider.tsx`

- [ ] **Step 1: Créer le provider**

```tsx
"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import type { ReactNode } from "react";

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      capture_pageview: false, // géré manuellement via PostHogPageView
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: { password: true },
      },
      autocapture: true,
      capture_exceptions: true,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
```

- [ ] **Step 2: Vérifier que le fichier compile sans erreur**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep "PostHogProvider" | head -10
```

Expected: aucune erreur liée à ce fichier.

---

## Task 3: PostHogPageView

**Files:**
- Create: `src/components/analytics/PostHogPageView.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog) return;
    let url = pathname;
    const params = searchParams.toString();
    if (params) url += `?${params}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, posthog]);

  return null;
}
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep "PostHogPageView" | head -10
```

Expected: aucune erreur.

---

## Task 4: Intégrer dans app/layout.tsx

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Lire le fichier actuel**

Lire `app/layout.tsx` pour confirmer la structure avant modification.

- [ ] **Step 2: Ajouter le provider**

Remplacer le contenu de `app/layout.tsx` par :

```tsx
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import "./globals.css";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";

const siteDescription =
  "SIDEKICK centralise phono, publishing, royalties, mailing, marketing, organisation de tournée, administration et facturation pour les artistes de musique indépendants.";

function getMetadataBase(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit);
    } catch {
      /* ignore */
    }
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "SIDEKICK — Ta carrière musicale, un seul outil",
    template: "%s | SIDEKICK"
  },
  description: siteDescription,
  applicationName: "SIDEKICK",
  keywords: [
    "musique indépendante",
    "artiste",
    "manager",
    "tournée",
    "royalties",
    "publishing",
    "marketing musical"
  ],
  authors: [{ name: "SIDEKICK" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "SIDEKICK",
    title: "SIDEKICK — Ta carrière musicale, un seul outil",
    description: siteDescription
  },
  twitter: {
    card: "summary_large_image",
    title: "SIDEKICK — Ta carrière musicale, un seul outil",
    description: siteDescription
  },
  robots: {
    index: true,
    follow: true
  }
};

export const viewport: Viewport = {
  themeColor: "#101010",
  colorScheme: "dark"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep -E "layout|PostHog" | head -10
```

Expected: aucune erreur.

- [ ] **Step 4: Tester en dev**

```bash
npm run dev
```

Ouvrir `http://localhost:3000`. Dans le dashboard PostHog → Live Events, vérifier qu'un event `$pageview` apparaît.

---

## Task 5: GlobalErrorBoundary

**Files:**
- Create: `src/components/analytics/GlobalErrorBoundary.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
"use client";

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import posthog from "posthog-js";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    posthog.capture("error_caught", {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      pathname: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return null; // Next.js error.tsx prend le relai
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep "GlobalErrorBoundary" | head -10
```

Expected: aucune erreur.

---

## Task 6: FeedbackButton

**Files:**
- Create: `src/components/analytics/FeedbackButton.tsx`

- [ ] **Step 1: Créer le bouton**

```tsx
"use client";

import { MessageSquare } from "lucide-react";
import { usePostHog } from "posthog-js/react";

export function FeedbackButton() {
  const posthog = usePostHog();

  function handleClick() {
    if (!posthog) return;
    posthog.capture("feedback_button_clicked");
    // Ouvre la survey configurée dans PostHog dashboard avec l'action "Show survey"
    // La survey doit être créée dans PostHog → Surveys et ciblée sur tous les utilisateurs
    posthog.renderSurvey?.("feedback");
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Donner un feedback"
      className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl transition-colors hover:border-[#F0FF00]/40 hover:text-[#F0FF00]"
    >
      <MessageSquare size={18} />
    </button>
  );
}
```

> **Note PostHog Surveys :** Le bouton capture l'event `feedback_button_clicked`. Pour déclencher la survey, créer une survey dans PostHog dashboard (Surveys → New Survey) avec le déclencheur "API" — elle s'affiche via `posthog.renderSurvey()`. Si `renderSurvey` n'est pas disponible dans ta version, utiliser `posthog.getActiveMatchingSurveys()` pour récupérer la survey et l'afficher manuellement.

- [ ] **Step 2: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep "FeedbackButton" | head -10
```

Expected: aucune erreur.

---

## Task 7: Intégrer ErrorBoundary + FeedbackButton dans app/(app)/layout.tsx

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Modifier le layout**

```tsx
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsSidebar } from "@/components/layout/SettingsSidebar";
import { GlobalErrorBoundary } from "@/components/analytics/GlobalErrorBoundary";
import { FeedbackButton } from "@/components/analytics/FeedbackButton";

function AppLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isSettings = pathname.startsWith("/settings");

  return (
    <GlobalErrorBoundary>
      <div className="flex min-h-screen bg-background text-foreground">
        {isSettings ? <SettingsSidebar /> : <Sidebar />}
        <div className="flex flex-1 flex-col bg-background">
          <Header />
          <main className="flex-1 bg-background p-6">{children}</main>
        </div>
        <Toaster richColors theme="dark" />
        <FeedbackButton />
      </div>
    </GlobalErrorBoundary>
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

- [ ] **Step 2: Vérifier en dev**

```bash
npm run dev
```

Naviguer dans l'app. Le bouton `MessageSquare` doit apparaître en bas à droite. Inspecter : fond semi-transparent, hover jaune.

---

## Task 8: Identify + Sign-in/Sign-out events

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Lire login/page.tsx pour trouver le callback post-login**

Lire `src/app/(auth)/login/page.tsx` et identifier où `user` devient disponible après connexion (dans le `useEffect` sur `user`).

- [ ] **Step 2: Ajouter identify + capture dans login/page.tsx**

Dans le `useEffect` qui réagit à `user`, après la confirmation que l'utilisateur est connecté :

```ts
import { usePostHog } from "posthog-js/react";

// dans le composant :
const posthog = usePostHog();

useEffect(() => {
  if (!loading && user) {
    posthog?.identify(user.id, {
      email: user.email,
      name: user.user_metadata?.full_name ?? user.user_metadata?.first_name ?? undefined,
    });
    posthog?.capture("user_signed_in", { method: "google" });
    router.replace(nextPath);
  }
}, [loading, user, posthog, nextPath, router]);
```

- [ ] **Step 3: Lire Header.tsx pour trouver le handler de déconnexion**

Lire `src/components/layout/Header.tsx` et identifier la fonction de sign-out.

- [ ] **Step 4: Ajouter sign-out event dans Header.tsx**

Dans la fonction de sign-out (avant ou après l'appel Supabase) :

```ts
import { usePostHog } from "posthog-js/react";

// dans le composant :
const posthog = usePostHog();

async function handleSignOut() {
  posthog?.capture("user_signed_out");
  posthog?.reset();
  // ... appel supabase.auth.signOut() existant
}
```

- [ ] **Step 5: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep -E "login|Header" | head -10
```

Expected: aucune erreur.

---

## Task 9: error.tsx — report PostHog

**Files:**
- Modify: `app/(app)/error.tsx`

- [ ] **Step 1: Modifier error.tsx**

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { PageError } from "@/components/ui/page-error";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.capture("error_page_shown", {
      error: error.message,
      digest: error.digest,
    });
  }, [error, posthog]);

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

- [ ] **Step 2: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep "error" | head -10
```

Expected: aucune erreur.

---

## Task 10: Events Tasks

**Files:**
- Modify: `src/modules/tasks/components/TaskModal.tsx`
- Modify: `src/modules/tasks/components/TaskCard.tsx`
- Modify: `src/modules/tasks/components/AiSuggestions.tsx`

- [ ] **Step 1: Lire TaskModal.tsx pour identifier la fonction onSave**

Lire le fichier et trouver où `onSave(task)` est appelé (submit du formulaire).

- [ ] **Step 2: Ajouter task_created dans TaskModal.tsx**

Dans la fonction qui appelle `onSave`, ajouter avant ou après l'appel :

```ts
import { usePostHog } from "posthog-js/react";

// dans le composant :
const posthog = usePostHog();

// dans le handler submit, si c'est une création (pas une édition) :
posthog?.capture("task_created", { module: "tasks" });
```

> Vérifier si `TaskModal` sait si c'est une création ou une édition (prop `task` null = création).

- [ ] **Step 3: Lire TaskCard.tsx pour trouver les handlers complete/delete**

Lire le fichier et identifier les fonctions qui marquent une tâche comme faite et qui la suppriment.

- [ ] **Step 4: Ajouter task_completed et task_deleted dans TaskCard.tsx**

```ts
import { usePostHog } from "posthog-js/react";

// dans le composant :
const posthog = usePostHog();

// dans le handler de complétion :
posthog?.capture("task_completed", { module: "tasks" });

// dans le handler de suppression :
posthog?.capture("task_deleted", { module: "tasks" });
```

- [ ] **Step 5: Lire AiSuggestions.tsx pour trouver le handler de conversion**

Lire le fichier et identifier où une suggestion est convertie en vraie tâche.

- [ ] **Step 6: Ajouter ai_suggestion_converted dans AiSuggestions.tsx**

```ts
import { usePostHog } from "posthog-js/react";

// dans le composant :
const posthog = usePostHog();

// dans le handler de conversion :
posthog?.capture("ai_suggestion_converted", { module: "tasks" });
```

- [ ] **Step 7: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep -E "TaskModal|TaskCard|AiSuggestions" | head -10
```

---

## Task 11: Events Calendar

**Files:**
- Modify: `src/modules/calendar/components/GlobalCalendarPage.tsx`

- [ ] **Step 1: Lire GlobalCalendarPage.tsx pour identifier création/suppression d'events**

Lire le fichier. Chercher les fonctions qui créent et suppriment des événements personnalisés (`source_module: 'custom'`).

- [ ] **Step 2: Ajouter les captures**

```ts
import { usePostHog } from "posthog-js/react";

const posthog = usePostHog();

// création :
posthog?.capture("event_created", { module: "calendar" });

// suppression :
posthog?.capture("event_deleted", { module: "calendar" });
```

- [ ] **Step 3: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep "GlobalCalendar" | head -10
```

---

## Task 12: Events Phono

**Files:**
- Modify: `src/modules/phono/components/TracksPage.tsx`
- Modify: `src/modules/phono/components/AlbumsPage.tsx`
- Modify: `src/modules/phono/components/CatalogPage.tsx`
- Modify: `src/modules/phono/components/SessionsPage.tsx`

- [ ] **Step 1: Pour chaque fichier, lire et identifier le handler de création**

Lire chaque fichier, chercher les fonctions `handleCreate`, `handleSave`, `onSubmit` ou similaires.

- [ ] **Step 2: Ajouter les captures**

Dans `TracksPage.tsx` :
```ts
posthog?.capture("track_created", { module: "phono" });
```

Dans `AlbumsPage.tsx` :
```ts
posthog?.capture("album_created", { module: "phono" });
```

Dans `CatalogPage.tsx` (podcasts) :
```ts
posthog?.capture("podcast_created", { module: "phono" });
```

Dans `SessionsPage.tsx` :
```ts
posthog?.capture("session_created", { module: "phono" });
```

Dans chaque fichier, importer et instancier posthog :
```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();
```

- [ ] **Step 3: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep -i "phono\|tracks\|albums\|catalog\|sessions" | head -10
```

---

## Task 13: Events Live

**Files:**
- Modify: `src/modules/live/components/TourDatesPage.tsx`
- Modify: `src/modules/live/components/RehearsalsPage.tsx`
- Modify: `src/modules/live/components/EquipmentPage.tsx`

- [ ] **Step 1: Lire TourDatesPage.tsx et identifier les handlers**

Chercher les créations/suppressions de dates de tournée, et les ajouts de transport, logement, rémunération.

- [ ] **Step 2: Ajouter les captures dans TourDatesPage.tsx**

```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();

// création date :
posthog?.capture("tour_date_created", { module: "live" });
// suppression :
posthog?.capture("tour_date_deleted", { module: "live" });
// transport ajouté :
posthog?.capture("tour_transport_added", { module: "live" });
// logement ajouté :
posthog?.capture("tour_accommodation_added", { module: "live" });
// rémunération ajoutée :
posthog?.capture("tour_fee_added", { module: "live" });
```

- [ ] **Step 3: Lire RehearsalsPage.tsx et ajouter les captures**

```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();

posthog?.capture("rehearsal_created", { module: "live" });
posthog?.capture("rehearsal_deleted", { module: "live" });
posthog?.capture("rehearsal_fee_added", { module: "live" });
posthog?.capture("rehearsal_equipment_added", { module: "live" });
```

- [ ] **Step 4: Lire EquipmentPage.tsx et ajouter les captures**

```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();

posthog?.capture("equipment_list_created", { module: "live" });
posthog?.capture("equipment_item_added", { module: "live" });
```

- [ ] **Step 5: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep -i "tour\|rehearsal\|equipment" | head -10
```

---

## Task 14: Events Contacts

**Files:**
- Modify: `src/modules/contacts/components/ContactsPage.tsx`

- [ ] **Step 1: Lire ContactsPage.tsx et identifier création/suppression**

- [ ] **Step 2: Ajouter les captures**

```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();

posthog?.capture("contact_created", { module: "contacts" });
posthog?.capture("contact_deleted", { module: "contacts" });
```

- [ ] **Step 3: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep "Contacts" | head -10
```

---

## Task 15: Events Incomes

**Files:**
- Modify: `src/modules/incomes/components/InvoicesPage.tsx`
- Modify: `src/modules/incomes/components/IntermittenceMissions.tsx`
- Modify: `src/modules/incomes/components/RoyaltiesImports.tsx`
- Modify: `src/modules/incomes/components/CopyrightHistorique.tsx` (ou `CopyrightPage.tsx`)

- [ ] **Step 1: Lire chaque fichier et identifier les handlers**

- [ ] **Step 2: Ajouter les captures**

Dans `InvoicesPage.tsx` :
```ts
posthog?.capture("invoice_created", { module: "incomes" });
// dans le handler de téléchargement PDF :
posthog?.capture("invoice_downloaded", { module: "incomes" });
```

Dans `IntermittenceMissions.tsx` :
```ts
posthog?.capture("mission_created", { module: "incomes" });
```

Dans `RoyaltiesImports.tsx` :
```ts
posthog?.capture("royalties_import_uploaded", { module: "incomes" });
```

Dans `CopyrightHistorique.tsx` ou `CopyrightPage.tsx` (celui qui gère l'import de relevé) :
```ts
posthog?.capture("publishing_statement_imported", { module: "incomes" });
```

Chaque fichier : `import { usePostHog } from "posthog-js/react";` + `const posthog = usePostHog();`

- [ ] **Step 3: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep -i "invoice\|mission\|royalt\|copyright" | head -10
```

---

## Task 16: Events Édition

**Files:**
- Modify: `src/modules/edition/components/WorksPage.tsx`

- [ ] **Step 1: Lire WorksPage.tsx et identifier création d'oeuvre et liaison oeuvre/titre**

- [ ] **Step 2: Ajouter les captures**

```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();

posthog?.capture("work_created", { module: "edition" });
// dans le handler de liaison oeuvre ↔ track phono :
posthog?.capture("work_track_linked", { module: "edition" });
```

- [ ] **Step 3: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep "Works" | head -10
```

---

## Task 17: Events Marketing

**Files:**
- Modify: `src/modules/marketing/components/MailingPage.tsx`
- Modify: `src/modules/marketing/components/PresskitPage.tsx`

- [ ] **Step 1: Lire MailingPage.tsx et identifier les handlers**

Chercher : publication d'un post, envoi de mail, sauvegarde de campagne en brouillon, chargement d'une campagne existante.

- [ ] **Step 2: Ajouter les captures dans MailingPage.tsx**

```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();

posthog?.capture("post_created", { module: "marketing" });
posthog?.capture("mail_sent", { module: "marketing" });
posthog?.capture("campaign_saved_draft", { module: "marketing" });
posthog?.capture("campaign_loaded", { module: "marketing" });
```

- [ ] **Step 3: Lire PresskitPage.tsx et identifier les handlers**

Chercher : téléchargement PDF, copie du lien, réinitialisation.

- [ ] **Step 4: Ajouter les captures dans PresskitPage.tsx**

```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();

posthog?.capture("presskit_pdf_downloaded", { module: "marketing" });
posthog?.capture("presskit_link_copied", { module: "marketing" });
posthog?.capture("presskit_reset", { module: "marketing" });
```

- [ ] **Step 5: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep -i "mailing\|presskit" | head -10
```

---

## Task 18: Events Admin

**Files:**
- Modify: `src/modules/admin/components/StatutsPage.tsx`
- Modify: `src/modules/admin/components/ProceduresPage.tsx`
- Modify: `src/modules/admin/components/ContractsPage.tsx`

- [ ] **Step 1: Lire chaque fichier et identifier les handlers de création**

- [ ] **Step 2: Ajouter les captures**

Dans `StatutsPage.tsx` :
```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();
posthog?.capture("status_created", { module: "admin" });
```

Dans `ProceduresPage.tsx` :
```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();
posthog?.capture("procedure_created", { module: "admin" });
```

Dans `ContractsPage.tsx` :
```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();
posthog?.capture("contract_created", { module: "admin" });
posthog?.capture("contract_template_created", { module: "admin" });
posthog?.capture("contract_signature_created", { module: "admin" });
```

- [ ] **Step 3: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep -i "statut\|procedure\|contract" | head -10
```

---

## Task 19: Events Projets + Documents

**Files:**
- Modify: `src/modules/projects/components/ProjectsPage.tsx`
- Modify: `src/modules/admin/components/DocumentsPage.tsx`

- [ ] **Step 1: Lire ProjectsPage.tsx et identifier la création de projet**

- [ ] **Step 2: Ajouter project_created**

```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();
posthog?.capture("project_created", { module: "projects" });
```

- [ ] **Step 3: Lire DocumentsPage.tsx et identifier les handlers fichiers**

Chercher : ajout, suppression, renommage, déplacement de fichier.

- [ ] **Step 4: Ajouter les captures dans DocumentsPage.tsx**

```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();

posthog?.capture("file_added", { module: "documents" });
posthog?.capture("file_deleted", { module: "documents" });
posthog?.capture("file_renamed", { module: "documents" });
posthog?.capture("file_moved", { module: "documents" });
```

- [ ] **Step 5: Vérifier compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | grep -i "project\|document" | head -10
```

---

## Task 20: Events Paramètres

**Files:**
- Modify: Settings components (lire `src/modules/settings/components/` pour identifier les bons fichiers)

- [ ] **Step 1: Lire le dossier settings**

```bash
ls src/modules/settings/components/
```

- [ ] **Step 2: Identifier les fichiers responsables de chaque action**

- Mot de passe → fichier gérant le changement de mot de passe
- Prénom/nom → fichier gérant le profil
- Gmail/Outlook → fichier gérant les intégrations mail
- Modules affichés → fichier gérant la visibilité des modules

- [ ] **Step 3: Ajouter les captures dans chaque fichier identifié**

```ts
import { usePostHog } from "posthog-js/react";
const posthog = usePostHog();

// changement mot de passe :
posthog?.capture("password_changed", { module: "settings" });

// profil mis à jour :
posthog?.capture("profile_name_updated", { module: "settings" });

// Gmail connecté :
posthog?.capture("gmail_connected", { module: "settings" });

// Outlook connecté :
posthog?.capture("outlook_connected", { module: "settings" });

// visibilité modules modifiée :
posthog?.capture("module_visibility_updated", { module: "settings" });
```

- [ ] **Step 4: Vérifier compilation globale**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 erreurs.

---

## Task 21: Build de validation final

- [ ] **Step 1: Lancer le build de production**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` sans erreurs TypeScript ni erreurs de build.

- [ ] **Step 2: Vérifier en dev que PostHog reçoit des events**

```bash
npm run dev
```

- Se connecter avec Google
- Naviguer sur 3 pages différentes
- Créer une tâche
- Dans PostHog → Live Events : vérifier `user_signed_in`, `$pageview` (×3), `task_created`

- [ ] **Step 3: Vérifier que le bouton feedback est visible**

Le bouton `MessageSquare` doit apparaître en bas à droite de toutes les pages de l'app shell, absent des pages auth et landing.

---

## Note sur PostHog Surveys (configuration sans code)

Une fois le code déployé, configurer les surveys directement dans le dashboard PostHog (Surveys → New Survey) :

1. **Survey déclenchée après 5 min cumulées** : condition `Session duration > 300s`
2. **Survey après 10 items créés** : condition sur un event count custom (configurer avec les events de création)
3. **Fréquence max 1/semaine** : option "Display frequency" → Weekly
4. **Survey hebdo si connecté >1 fois** : condition `user property: $session_count > 1` + Weekly

Format recommandé : NPS (0-10) + question ouverte "Qu'est-ce qui t'a bloqué aujourd'hui ?"
