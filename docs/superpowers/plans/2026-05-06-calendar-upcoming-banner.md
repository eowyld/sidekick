# Calendar — Bannière "À venir" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le panneau "Prochains événements" par une bannière horizontale scrollable affichant les événements Tier 1 & 2 à venir, avec compte à rebours compact (`J-3`) + sous-ligne expressive (`Ce vendredi`). Le calendrier mensuel passe en pleine largeur.

**Architecture:** La logique de sélection et de formatage des dates est extraite dans un utilitaire `calendar-banner-utils.ts`. Le composant `UpcomingBanner.tsx` est autonome et ne reçoit que `filteredEvents` + `onEventClick`. `GlobalCalendarPage.tsx` câble les deux et supprime le panneau "Prochains événements".

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Lucide React — aucune dépendance nouvelle.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/modules/calendar/components/calendar-banner-utils.ts` | **Créer** | Sélection des events + calcul des labels countdown |
| `src/modules/calendar/components/UpcomingBanner.tsx` | **Créer** | Composant bannière scrollable |
| `src/modules/calendar/components/GlobalCalendarPage.tsx` | **Modifier** | Supprimer panneau droit, câbler bannière, grid full-width |

---

## Task 1 — Utilitaires de la bannière

**Files:**
- Create: `src/modules/calendar/components/calendar-banner-utils.ts`

- [ ] **Step 1 : Créer le fichier utilitaire complet**

```ts
// src/modules/calendar/components/calendar-banner-utils.ts
import type { CalendarEvent, CalendarEventType } from "./GlobalCalendarPage";

// Reprise du EVENT_TIER depuis GlobalCalendarPage (copie locale pour éviter le couplage)
const BANNER_TIER: Record<CalendarEventType, 1 | 2 | 3> = {
  representation:     1,
  album_release:      1,
  track_release:      1,
  rehearsal:          2,
  session:            2,
  marketing_content:  2,
  edition_event:      2,
  custom:             2,
  admin_procedure:    2,
  admin_status_start: 2,
  admin_status_end:   2,
  invoice:            3,
  task_deadline:      3,
};

const DAY_NAMES_FR = [
  "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi",
];

const MONTH_NAMES_FR = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

/** Nombre de jours calendaires entre aujourd'hui (minuit) et dateKey. */
export function daysUntil(dateKey: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Label compact : "Auj.", "J-1", "J-7", "J-42" */
export function compactCountdown(days: number): string {
  if (days === 0) return "Auj.";
  if (days === 1) return "J-1";
  return `J-${days}`;
}

/** Sous-ligne expressive en français. */
export function expressiveCountdown(dateKey: string, days: number): string {
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  if (days === 2) return "Après-demain";

  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = DAY_NAMES_FR[date.getDay()];

  if (days <= 6) return `Ce ${dayName.toLowerCase()}`;
  if (days <= 13) return `${dayName} prochain`;

  // Au-delà de 2 semaines : date courte "15 juin"
  return `${d} ${MONTH_NAMES_FR[m - 1]}`;
}

/** Couleur du countdown : accent jaune si ≤ 3 jours, blanc sinon. */
export function countdownColorClass(days: number): string {
  return days <= 3 ? "text-[#F0FF00]" : "text-[#F5F5F5]/70";
}

/**
 * Sélectionne les events à afficher dans la bannière :
 * 1. Tous les Tier 1 dans les 90 prochains jours, triés par date.
 * 2. Si < 4 cartes, compléter avec les Tier 2 les plus proches.
 * 3. Tier 3 jamais inclus. Max 8 cartes.
 */
export function selectBannerEvents(events: CalendarEvent[]): CalendarEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 90);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const todayKey = today.toISOString().slice(0, 10);

  const future = events.filter((e) => e.dateKey >= todayKey);

  const tier1 = future
    .filter((e) => BANNER_TIER[e.type] === 1 && e.dateKey <= cutoffKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  if (tier1.length >= 4) return tier1.slice(0, 8);

  const tier2 = future
    .filter((e) => BANNER_TIER[e.type] === 2)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const combined = [...tier1];
  for (const ev of tier2) {
    if (combined.length >= 8) break;
    if (!combined.find((e) => e.id === ev.id)) combined.push(ev);
  }

  combined.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return combined.slice(0, 8);
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit
```

Attendu : exit 0, aucun message d'erreur.

---

## Task 2 — Composant `UpcomingBanner`

**Files:**
- Create: `src/modules/calendar/components/UpcomingBanner.tsx`
- Depends on: `calendar-banner-utils.ts`, types exportés depuis `GlobalCalendarPage.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// src/modules/calendar/components/UpcomingBanner.tsx
"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarSector } from "./GlobalCalendarPage";
import {
  selectBannerEvents,
  daysUntil,
  compactCountdown,
  expressiveCountdown,
  countdownColorClass,
} from "./calendar-banner-utils";

// Dupliqué localement pour éviter d'importer l'objet entier de GlobalCalendarPage
// (qui est un module client très lourd). On n'a besoin que du borderClass + Icon.
import {
  Mic2, Music2, Briefcase, Megaphone, BookOpen, DollarSign,
} from "lucide-react";

const SECTOR_CARD_CONFIG: Record<
  CalendarSector,
  { borderTopClass: string; Icon: React.ElementType; iconColor: string }
> = {
  live:      { borderTopClass: "border-t-blue-400",    iconColor: "text-blue-400",    Icon: Mic2 },
  phono:     { borderTopClass: "border-t-red-400",     iconColor: "text-red-400",     Icon: Music2 },
  admin:     { borderTopClass: "border-t-violet-400",  iconColor: "text-violet-400",  Icon: Briefcase },
  marketing: { borderTopClass: "border-t-emerald-400", iconColor: "text-emerald-400", Icon: Megaphone },
  edition:   { borderTopClass: "border-t-cyan-400",    iconColor: "text-cyan-400",    Icon: BookOpen },
  revenus:   { borderTopClass: "border-t-orange-400",  iconColor: "text-orange-400",  Icon: DollarSign },
  other:     { borderTopClass: "border-t-white/20",    iconColor: "text-[#F5F5F5]/40", Icon: CalendarDays },
};

function formatDateFr(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

type Props = {
  filteredEvents: CalendarEvent[];
  onEventClick: (ev: CalendarEvent) => void;
  onAddEvent: () => void;
};

export function UpcomingBanner({ filteredEvents, onEventClick, onAddEvent }: Props) {
  const bannerEvents = useMemo(
    () => selectBannerEvents(filteredEvents),
    [filteredEvents]
  );

  if (bannerEvents.length === 0) {
    return (
      <div className="flex items-center gap-4 border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.4)] px-5 py-4">
        <CalendarDays className="h-5 w-5 shrink-0 text-[#F5F5F5]/30" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[#F5F5F5]/70">Rien à l'horizon.</p>
          <p className="mt-0.5 text-[12px] text-[#F5F5F5]/40">
            Cale une date de scène, une session ou une sortie — ça apparaîtra ici.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddEvent}
          className="shrink-0 text-[12px] font-medium text-[#F0FF00] hover:underline"
        >
          + Événement
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Fade droit pour indiquer le scroll */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#101010] to-transparent z-10" />

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {bannerEvents.map((ev) => {
          const days = daysUntil(ev.dateKey);
          const compact = compactCountdown(days);
          const expressive = expressiveCountdown(ev.dateKey, days);
          const countdownColor = countdownColorClass(days);
          const { borderTopClass, Icon, iconColor } = SECTOR_CARD_CONFIG[ev.sector];

          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => onEventClick(ev)}
              className={cn(
                "group flex w-[200px] shrink-0 flex-col gap-2 border border-t-[3px] border-[rgba(245,245,245,0.10)] p-4 text-left",
                "bg-[rgba(44,44,46,0.72)] backdrop-blur-xl",
                "transition-colors duration-150 hover:bg-[rgba(44,44,46,0.90)] hover:border-[rgba(245,245,245,0.18)]",
                borderTopClass
              )}
            >
              {/* Compte à rebours */}
              <div className="flex items-end justify-between gap-2">
                <span className={cn("text-[22px] font-bold leading-none tabular-nums", countdownColor)}>
                  {compact}
                </span>
                <span className="text-[11px] text-[#F5F5F5]/40 leading-none mb-0.5">
                  {expressive}
                </span>
              </div>

              {/* Titre */}
              <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#F5F5F5] group-hover:text-white">
                {ev.label}
              </p>

              {/* Sous-type + lieu */}
              <div className="flex items-center gap-1.5 mt-auto">
                <Icon className={cn("h-3 w-3 shrink-0", iconColor)} />
                <span className="line-clamp-1 text-[11px] text-[#F5F5F5]/50">
                  {ev.subLabel}
                  {ev.place ? ` · ${ev.place}` : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Masquer la scrollbar horizontale (CSS global)**

Dans `app/globals.css`, s'assurer que la classe `scrollbar-none` existe (elle est probablement déjà là via Tailwind). Vérifier ou ajouter :

```css
/* app/globals.css — ajouter si absent */
.scrollbar-none {
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

Attendu : exit 0.

---

## Task 3 — Câblage dans `GlobalCalendarPage`

**Files:**
- Modify: `src/modules/calendar/components/GlobalCalendarPage.tsx`

- [ ] **Step 1 : Importer `UpcomingBanner`**

Ajouter après l'import de `ICalSyncPanel` (ligne ~22) :

```tsx
import { UpcomingBanner } from "./UpcomingBanner";
```

- [ ] **Step 2 : Supprimer le panneau "Prochains événements" et passer la grille en full-width**

Localiser :

```tsx
      {/* ── Grille calendrier + liste ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Calendrier mensuel */}
        <Card className="lg:col-span-2">
```

Remplacer par :

```tsx
      {/* ── Grille calendrier ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4">

        {/* Calendrier mensuel */}
        <Card className="">
```

Puis supprimer entièrement le bloc `{/* Prochains événements */}` (la `Card` entière avec son `CardHeader`, `CardContent`, et la `ul` des `upcomingEvents`).

- [ ] **Step 3 : Insérer la bannière entre les filtres et la grille**

Juste avant `{/* ── Grille calendrier ──... */}`, ajouter :

```tsx
      {/* ── Bannière À venir ───────────────────────────────────────────────── */}
      <UpcomingBanner
        filteredEvents={filteredEvents}
        onEventClick={(ev) => setSelectedEvent(ev)}
        onAddEvent={() => {
          setEditingEventId(null);
          setNewEventName("");
          setNewEventTime("");
          setNewEventPlace("");
          setNewEventSector("other");
          setNewEventDate(toDateKey(currentDate));
          setCustomDialogOpen(true);
        }}
      />
```

- [ ] **Step 4 : Supprimer `upcomingEvents` si inutilisé**

Vérifier que `upcomingEvents` n'est plus référencé ailleurs dans le fichier après suppression du panneau. Si c'est le cas, supprimer le `useMemo` correspondant (bloc autour de la ligne 720) :

```tsx
// À supprimer si plus référencé :
const upcomingEvents = useMemo(() => {
  return filteredEvents
    .filter((e) => !e.isPast)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(0, 20);
}, [filteredEvents]);
```

- [ ] **Step 5 : Vérifier compilation + lint**

```bash
npx tsc --noEmit && npm run lint
```

Attendu : exit 0 sur les deux.

- [ ] **Step 6 : Vérifier visuellement dans le dev server**

```bash
npm run dev
```

Ouvrir `http://localhost:3000/calendar`.

Checklist visuelle :
- [ ] Bannière visible entre les filtres et la grille
- [ ] Cartes horizontales scrollables, fade à droite visible
- [ ] Liseré top coloré par secteur sur chaque carte
- [ ] Countdown en jaune si ≤ 3 jours, blanc/60 sinon
- [ ] Sous-ligne expressive correcte (Demain / Ce vendredi / 15 juin…)
- [ ] Clic sur une carte ouvre bien le dialog event existant
- [ ] CTA "+ Événement" dans l'état vide fonctionne
- [ ] Calendrier mensuel en pleine largeur, cellules plus larges
- [ ] Panneau "Prochains événements" disparu
- [ ] Aucun scrollbar horizontal visible sur la bannière

---

## Self-Review

**Spec coverage :**
- ✅ Bannière scrollable horizontale avec cartes
- ✅ Sélection Tier 1 (90 j) puis Tier 2 en remplissage, max 8
- ✅ Tier 3 exclu
- ✅ Format compact `J-N` en gros + sous-ligne expressive
- ✅ Couleur countdown : jaune ≤ 3 j, neutre au-delà
- ✅ Liseré top coloré par secteur (différent du liseré gauche de la grille)
- ✅ État vide avec CTA
- ✅ Calendrier full-width
- ✅ "Prochains événements" supprimé

**Placeholders :** aucun — chaque step contient le code complet.

**Type consistency :** `CalendarEvent` et `CalendarSector` exportés depuis `GlobalCalendarPage.tsx` et utilisés identiquement dans les deux nouveaux fichiers. `CalendarEventType` exporté via le type `CalendarEvent["type"]` — vérifier qu'il est bien `export type` dans GlobalCalendarPage (il l'est : `export type CalendarEventType = ...`).
