# Event Dialog Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les dialogs d'événements textuels du calendrier et du dashboard par un composant visuel partagé au format "ticket" (bloc date coloré à gauche, badge secteur, champs tabulaires, CTA jaune vers le module).

**Architecture:** Un nouveau composant `EventDialog` est extrait dans `src/components/ui/event-dialog.tsx`. `GlobalCalendarPage` et `DashboardPage` cessent d'embarquer leur propre Dialog et utilisent ce composant. La logique de rendu des champs (actuellement un switch-case dans le JSX) est extraite dans un helper `buildCalendarEventFields`.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Lucide React, Radix UI Dialog (via `src/components/ui/dialog.tsx`)

---

## File Structure

| Fichier | Action | Rôle |
|---|---|---|
| `src/components/ui/event-dialog.tsx` | **Créer** | Composant partagé EventDialog |
| `src/modules/calendar/components/GlobalCalendarPage.tsx` | **Modifier** | Remplacer Dialog événement + extraire helper fields |
| `src/modules/dashboard/components/DashboardPage.tsx` | **Modifier** | Remplacer Dialog événement |

---

## Task 1 — Créer `src/components/ui/event-dialog.tsx`

**Files:**
- Create: `src/components/ui/event-dialog.tsx`

- [ ] **Step 1 : Créer le fichier avec le composant complet**

```tsx
"use client";

import { useRouter } from "next/navigation";
import {
  Mic2,
  Music2,
  BookOpen,
  Briefcase,
  Megaphone,
  DollarSign,
  CalendarDays,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type EventSector =
  | "live"
  | "phono"
  | "admin"
  | "marketing"
  | "edition"
  | "revenus"
  | "other";

export type EventDialogField = { label: string; value: string | ReactNode };

type EventDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subLabel: string;
  /** YYYY-MM-DD */
  dateKey: string;
  sector: EventSector;
  isPast?: boolean;
  fields?: EventDialogField[];
  /** Si fourni, affiche le CTA jaune */
  ctaLabel?: string;
  ctaHref?: string;
  /** Événements custom seulement — remplace le CTA */
  onEdit?: () => void;
  onDelete?: () => void;
};

const SECTOR_CONFIG: Record<
  EventSector,
  {
    label: string;
    dateBg: string;
    dateTextClass: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    Icon: React.ElementType;
  }
> = {
  live: {
    label: "Live",
    dateBg: "bg-blue-900",
    dateTextClass: "text-white",
    badgeBg: "bg-blue-400/[0.12]",
    badgeBorder: "border-blue-400/25",
    badgeText: "text-blue-400",
    Icon: Mic2,
  },
  phono: {
    label: "Phono",
    dateBg: "bg-red-900",
    dateTextClass: "text-white",
    badgeBg: "bg-red-400/[0.12]",
    badgeBorder: "border-red-400/25",
    badgeText: "text-red-400",
    Icon: Music2,
  },
  admin: {
    label: "Admin",
    dateBg: "bg-violet-900",
    dateTextClass: "text-white",
    badgeBg: "bg-violet-400/[0.12]",
    badgeBorder: "border-violet-400/25",
    badgeText: "text-violet-400",
    Icon: Briefcase,
  },
  marketing: {
    label: "Marketing",
    dateBg: "bg-emerald-900",
    dateTextClass: "text-white",
    badgeBg: "bg-emerald-400/[0.12]",
    badgeBorder: "border-emerald-400/25",
    badgeText: "text-emerald-400",
    Icon: Megaphone,
  },
  edition: {
    label: "Édition",
    dateBg: "bg-cyan-900",
    dateTextClass: "text-white",
    badgeBg: "bg-cyan-400/[0.12]",
    badgeBorder: "border-cyan-400/25",
    badgeText: "text-cyan-400",
    Icon: BookOpen,
  },
  revenus: {
    label: "Revenus",
    dateBg: "bg-orange-900",
    dateTextClass: "text-white",
    badgeBg: "bg-orange-400/[0.12]",
    badgeBorder: "border-orange-400/25",
    badgeText: "text-orange-400",
    Icon: DollarSign,
  },
  other: {
    label: "Autre",
    dateBg: "bg-[rgba(245,245,245,0.04)] border-r border-[rgba(245,245,245,0.08)]",
    dateTextClass: "text-[#F5F5F5]/70",
    badgeBg: "bg-white/[0.08]",
    badgeBorder: "border-white/[0.12]",
    badgeText: "text-[#F5F5F5]/55",
    Icon: CalendarDays,
  },
};

function parseDateKey(dateKey: string): { day: string; month: string } {
  const parts = dateKey.split("-");
  if (parts.length !== 3) return { day: "—", month: "—" };
  const [y, m, d] = parts;
  const date = new Date(
    parseInt(y, 10),
    parseInt(m, 10) - 1,
    parseInt(d, 10)
  );
  return {
    day: d,
    month: date
      .toLocaleDateString("fr-FR", { month: "short" })
      .replace(".", ""),
  };
}

export function EventDialog({
  open,
  onClose,
  title,
  subLabel,
  dateKey,
  sector,
  isPast,
  fields = [],
  ctaLabel,
  ctaHref,
  onEdit,
  onDelete,
}: EventDialogProps) {
  const router = useRouter();
  const cfg = SECTOR_CONFIG[sector];
  const { day, month } = parseDateKey(dateKey);
  const Icon = cfg.Icon;
  const hasCustomActions = !ctaLabel && (onEdit || onDelete);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        {/* ── Header ─────────────────────────────────── */}
        <div className="flex">
          {/* Date block */}
          <div
            className={cn(
              "flex flex-col items-center justify-center px-4 py-5 min-w-[64px] shrink-0",
              cfg.dateBg,
              isPast && "opacity-50"
            )}
          >
            <span
              className={cn(
                "text-[30px] font-extralight leading-none",
                cfg.dateTextClass
              )}
            >
              {day}
            </span>
            <span
              className={cn(
                "mt-1 text-[9px] font-bold tracking-[0.12em] uppercase",
                cfg.dateTextClass,
                "opacity-55"
              )}
            >
              {month}
            </span>
          </div>

          {/* Meta */}
          <div className="flex-1 px-4 py-4 flex flex-col justify-center gap-1 min-w-0">
            <DialogHeader className="p-0 space-y-0 text-left">
              <span
                className={cn(
                  "inline-flex w-fit items-center gap-1.5 rounded px-2 py-0.5",
                  "text-[10px] font-bold tracking-[0.07em] uppercase border",
                  cfg.badgeBg,
                  cfg.badgeBorder,
                  cfg.badgeText
                )}
              >
                <Icon className="w-3 h-3 shrink-0" />
                {cfg.label}
              </span>
              <DialogTitle className="text-[14px] font-semibold text-[#F5F5F5] leading-snug mt-1.5 truncate">
                {title}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-[#F5F5F5]/40">
                {subLabel}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* ── Fields ─────────────────────────────────── */}
        {fields.length > 0 && (
          <>
            <div className="h-px bg-[rgba(245,245,245,0.07)]" />
            <div className="px-4 py-1">
              {fields.map((f, i) => (
                <div
                  key={i}
                  className="flex gap-2 py-[6px] border-b border-[rgba(245,245,245,0.05)] last:border-0 text-[12px]"
                >
                  <span className="text-[11px] text-[#F5F5F5]/33 min-w-[80px] shrink-0">
                    {f.label}
                  </span>
                  <span className="text-[#F5F5F5]/82 min-w-0">{f.value}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Footer ─────────────────────────────────── */}
        <div className="flex justify-end items-center gap-2 px-4 py-[10px] border-t border-[rgba(245,245,245,0.08)]">
          {hasCustomActions ? (
            <>
              {onDelete && (
                <Button variant="destructive" size="sm" onClick={onDelete}>
                  Supprimer
                </Button>
              )}
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  Modifier
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Fermer
              </Button>
              {ctaLabel && ctaHref && (
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    router.push(ctaHref);
                  }}
                >
                  {ctaLabel}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2 : Vérifier les types avec TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep event-dialog
```

Attendu : aucune erreur sur `event-dialog.tsx`.

---

## Task 2 — Refactorer `GlobalCalendarPage.tsx`

**Files:**
- Modify: `src/modules/calendar/components/GlobalCalendarPage.tsx`

Le fichier fait 1683 lignes. On va :
1. Ajouter deux helpers (`buildCalendarEventFields`, `getCalendarEventCta`) juste avant la fonction `GlobalCalendarPage`
2. Ajouter l'import d'`EventDialog`
3. Remplacer le second `<Dialog>` (celui d'affichage, lignes ~1305–1679) par `<EventDialog />`

- [ ] **Step 1 : Ajouter l'import EventDialog**

Dans la section imports, ajouter après les imports existants de `@/components/ui/dialog` :

```tsx
import { EventDialog, type EventDialogField } from "@/components/ui/event-dialog";
```

Supprimer simultanément les imports de Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription **uniquement si** ils ne sont plus utilisés qu'une seule fois (le dialog custom les utilise encore — vérifier). Si le dialog de création les utilise toujours, les conserver.

> **Note :** Le dialog de création d'événement custom (variable `customDialogOpen`) utilise aussi `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`. Ces imports doivent être **conservés**.

- [ ] **Step 2 : Ajouter le helper `buildCalendarEventFields`**

Insérer ce bloc juste avant la déclaration de `export function GlobalCalendarPage()` (après `DEFAULT_SECTOR_FILTERS`) :

```tsx
// ── CTA par type d'événement ───────────────────────────────────────────────
const EVENT_CTA: Partial<
  Record<CalendarEventType, { label: string; href: string }>
> = {
  representation:     { label: "Voir dans Live →",      href: "/live" },
  rehearsal:          { label: "Voir dans Live →",      href: "/live" },
  session:            { label: "Voir dans Phono →",     href: "/phono" },
  album_release:      { label: "Voir dans Phono →",     href: "/phono" },
  track_release:      { label: "Voir dans Phono →",     href: "/phono" },
  invoice:            { label: "Voir dans Revenus →",   href: "/revenus" },
  task_deadline:      { label: "Voir les tâches →",     href: "/tasks" },
  marketing_content:  { label: "Voir dans Marketing →", href: "/marketing" },
  admin_procedure:    { label: "Voir dans Admin →",     href: "/admin" },
  admin_status_start: { label: "Voir dans Admin →",     href: "/admin" },
  admin_status_end:   { label: "Voir dans Admin →",     href: "/admin" },
  edition_event:      { label: "Voir dans Édition →",   href: "/edition" },
};

// ── Champs par type d'événement ────────────────────────────────────────────
function buildCalendarEventFields(
  type: CalendarEventType,
  source: unknown
): EventDialogField[] {
  if (!source) return [];

  if (type === "representation") {
    const r = source as TourDateItem;
    const fields: EventDialogField[] = [
      { label: "Salle", value: r.venue || "—" },
      { label: "Ville", value: r.city || "—" },
    ];
    if (r.address) fields.push({ label: "Adresse", value: r.address });
    if (r.organisateur) fields.push({ label: "Organisateur", value: r.organisateur });
    if (r.status) fields.push({ label: "Statut", value: r.status });
    if (r.timetable && r.timetable.length > 0) {
      fields.push({
        label: "Horaires",
        value: (
          <div className="flex flex-col gap-0.5">
            {r.timetable.map((t, i) => (
              <span key={i} className="flex gap-2">
                <span className="min-w-[38px] text-[#F5F5F5]/35 tabular-nums">{t.time}</span>
                <span>{t.activity}</span>
              </span>
            ))}
          </div>
        ),
      });
    }
    if (r.note) fields.push({ label: "Note", value: r.note });
    return fields;
  }

  if (type === "rehearsal") {
    const r = source as RehearsalItem;
    const fields: EventDialogField[] = [{ label: "Lieu", value: r.location }];
    if (r.time) fields.push({ label: "Heure", value: r.time });
    if (r.address) fields.push({ label: "Adresse", value: r.address });
    if (r.note) fields.push({ label: "Note", value: r.note });
    return fields;
  }

  if (type === "invoice") {
    const i = source as InvoiceItem;
    const fields: EventDialogField[] = [
      { label: "N° facture", value: i.number },
      { label: "Client", value: i.client },
    ];
    if (i.subject) fields.push({ label: "Objet", value: i.subject });
    if (i.amount) fields.push({ label: "Montant", value: i.amount.includes("€") ? i.amount : `${i.amount} €` });
    fields.push({ label: "Statut", value: i.status === "payee" ? "Payée" : "En attente" });
    return fields;
  }

  if (type === "session") {
    const s = source as SessionItem;
    const fields: EventDialogField[] = [{ label: "Lieu", value: s.location }];
    if (s.time) fields.push({ label: "Heure", value: s.time });
    if (s.sessionType) fields.push({ label: "Type", value: s.sessionType });
    return fields;
  }

  if (type === "album_release" || type === "track_release") {
    // source est PhonoAlbumItem | PhonoTrackItem | PhonoPodcastItem
    const a = source as { title?: string; artist?: string; mainArtist?: string; type?: string; artists?: string };
    const fields: EventDialogField[] = [];
    const artist = a.artist ?? a.mainArtist ?? a.artists;
    if (artist) fields.push({ label: "Artiste", value: artist });
    if (a.type) {
      const typeLabel = a.type === "ep" ? "EP" : a.type === "single" ? "Single" : a.type === "album" ? "Album" : a.type;
      fields.push({ label: "Type", value: typeLabel });
    }
    return fields;
  }

  if (type === "task_deadline") {
    const t = source as TaskItem;
    const fields: EventDialogField[] = [
      { label: "Tâche", value: t.title || "—" },
      { label: "Statut", value: (t.done ?? t.status === "done") ? "Terminée" : "À faire" },
    ];
    if (t.description) fields.push({ label: "Description", value: t.description });
    return fields;
  }

  if (type === "marketing_content") {
    const m = source as MarketingItem;
    const fields: EventDialogField[] = [];
    if (m.title) fields.push({ label: "Titre", value: m.title });
    if (m.status) fields.push({ label: "Statut", value: m.status });
    if (Array.isArray(m.platforms) && m.platforms.length > 0)
      fields.push({ label: "Plateformes", value: m.platforms.join(", ") });
    if (Array.isArray(m.contentTypes) && m.contentTypes.length > 0)
      fields.push({ label: "Types", value: m.contentTypes.join(", ") });
    return fields;
  }

  if (type === "admin_procedure") {
    const p = source as AdminProcedureItem;
    const fields: EventDialogField[] = [{ label: "Démarche", value: p.label || "—" }];
    if (p.organisme) fields.push({ label: "Organisme", value: p.organisme });
    if (p.status) fields.push({ label: "Statut", value: p.status });
    if (p.notes) fields.push({ label: "Notes", value: p.notes });
    return fields;
  }

  if (type === "admin_status_start" || type === "admin_status_end") {
    const s = source as AdminStatusItem;
    const fields: EventDialogField[] = [{ label: "Statut", value: s.nom || "—" }];
    if (s.type) fields.push({ label: "Type", value: s.type });
    fields.push({ label: "Actif", value: s.actif ? "Oui" : "Non" });
    if (s.notes) fields.push({ label: "Notes", value: s.notes });
    return fields;
  }

  if (type === "edition_event") {
    const e = source as EditionCalendarItem;
    const fields: EventDialogField[] = [{ label: "Événement", value: e.title || "—" }];
    if (typeof e.start === "string") fields.push({ label: "Début", value: e.start });
    if (typeof e.end === "string") fields.push({ label: "Fin", value: e.end });
    return fields;
  }

  if (type === "custom") {
    const c = source as CustomCalendarItem;
    const fields: EventDialogField[] = [];
    if (c.time) fields.push({ label: "Heure", value: c.time });
    if (c.place) fields.push({ label: "Lieu", value: c.place });
    return fields;
  }

  return [];
}
```

- [ ] **Step 3 : Remplacer le Dialog d'affichage d'événement**

Trouver le second `<Dialog>` dans le JSX — celui qui commence par :
```tsx
<Dialog
  open={!!selectedEvent}
  onOpenChange={(open) => !open && closeSelectedEventDialog()}
>
```
et se termine 374 lignes plus loin avec `</Dialog>`.

Remplacer **tout ce bloc** par :

```tsx
{selectedEventDetails && (() => {
  const ev = selectedEventDetails.event;
  const cta = ev.type !== "custom" ? (EVENT_CTA[ev.type] ?? null) : null;
  const fields = buildCalendarEventFields(ev.type, selectedEventDetails.source);
  return (
    <EventDialog
      open={!!selectedEvent}
      onClose={closeSelectedEventDialog}
      title={ev.label}
      subLabel={ev.subLabel ?? ""}
      dateKey={ev.dateKey}
      sector={ev.sector}
      isPast={ev.isPast}
      fields={fields}
      ctaLabel={cta?.label}
      ctaHref={cta?.href}
      onEdit={ev.type === "custom" ? () => handleEditCustomEvent(ev.id) : undefined}
      onDelete={ev.type === "custom" ? () => handleDeleteCustomEvent(ev.id) : undefined}
    />
  );
})()}
```

> **Attention :** Le bloc `{selectedEventDetails && (() => { ... })()}` doit être placé en dehors du return JSX principal, au même niveau que le Dialog custom — c'est-à-dire comme le dernier enfant du `<div className="space-y-5">`.

- [ ] **Step 4 : Supprimer les imports Dialog devenus inutiles**

Vérifier si `DialogDescription` est encore utilisé dans le dialog custom. Si non, le retirer de l'import. Les autres (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`) sont utilisés par le dialog de création — les garder.

- [ ] **Step 5 : Vérifier le type**

```bash
npx tsc --noEmit 2>&1 | grep -E "(GlobalCalendarPage|event-dialog)"
```

Attendu : aucune erreur TypeScript.

- [ ] **Step 6 : Tester visuellement**

Lancer `npm run dev`, ouvrir `/calendar`, activer un filtre secteur, cliquer sur un événement. Vérifier :
- Le bloc date s'affiche avec la bonne couleur de secteur
- Le titre et sous-label sont corrects
- Les champs s'affichent
- Le CTA navigue vers le bon module
- Les événements custom ont Modifier/Supprimer à la place du CTA

---

## Task 3 — Refactorer `DashboardPage.tsx`

**Files:**
- Modify: `src/modules/dashboard/components/DashboardPage.tsx`

- [ ] **Step 1 : Ajouter l'import EventDialog**

```tsx
import { EventDialog } from "@/components/ui/event-dialog";
```

Supprimer les imports `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` du fichier (ils ne servent que pour l'unique dialog d'événement).

- [ ] **Step 2 : Ajouter le helper `getRibbonCta`**

Juste avant `export function DashboardPage()` :

```tsx
function getRibbonCta(
  id: string
): { label: string; href: string } | null {
  if (id.startsWith("live-rep-") || id.startsWith("live-reh-"))
    return { label: "Voir dans Live →", href: "/live" };
  if (id.startsWith("rev-inv-"))
    return { label: "Voir dans Revenus →", href: "/revenus" };
  if (id.startsWith("phono-ses-"))
    return { label: "Voir dans Phono →", href: "/phono" };
  // Les événements custom n'ont pas de CTA
  return null;
}
```

- [ ] **Step 3 : Remplacer le Dialog**

Trouver le `<Dialog open={!!selectedRibbonEvent} ...>` (lignes ~304–347) et remplacer tout le bloc par :

```tsx
{selectedRibbonEvent && (() => {
  const cta = getRibbonCta(selectedRibbonEvent.id);
  const isCustom = selectedRibbonEvent.id.startsWith("custom-");
  return (
    <EventDialog
      open={!!selectedRibbonEvent}
      onClose={() => setSelectedRibbonEvent(null)}
      title={selectedRibbonEvent.title}
      subLabel={selectedRibbonEvent.detail?.subLabel ?? ""}
      dateKey={selectedRibbonEvent.detail?.dateKey ?? ""}
      sector={selectedRibbonEvent.sector}
      fields={(selectedRibbonEvent.detail?.fields ?? []).map((f) => ({
        label: f.label,
        value: f.value,
      }))}
      ctaLabel={!isCustom ? cta?.label : undefined}
      ctaHref={!isCustom ? cta?.href : undefined}
    />
  );
})()}
```

- [ ] **Step 4 : Supprimer `SECTOR_DIALOG_CONFIG`**

La constante `SECTOR_DIALOG_CONFIG` (lignes ~19–27) n'est plus utilisée. La supprimer.

- [ ] **Step 5 : Vérifier le type**

```bash
npx tsc --noEmit 2>&1 | grep -E "(DashboardPage|event-dialog)"
```

Attendu : aucune erreur TypeScript.

- [ ] **Step 6 : Tester visuellement**

Sur `/` (dashboard), cliquer sur un événement dans le ruban hebdomadaire. Vérifier :
- Bloc date visible avec couleur du secteur
- Badge secteur correct
- Champs key/value affichés
- CTA navigue vers le bon module

---

## Self-Review

**Spec coverage :**
- ✅ Direction B (ticket/date) — implémentée dans `EventDialog`
- ✅ Uniforme — un seul composant pour tous les types
- ✅ CTA "Voir dans [Module] →" — via `EVENT_CTA` et `getRibbonCta`
- ✅ Composant partagé calendrier + dashboard
- ✅ Custom events → Modifier/Supprimer à la place du CTA
- ✅ Timetable — rendu ReactNode dans `buildCalendarEventFields`
- ✅ Événements passés → `isPast` prop → opacité du bloc date
- ✅ Dialog de création non touché

**Placeholder scan :** aucun TBD.

**Type consistency :**
- `EventDialogField` défini en Task 1, utilisé dans Task 2 (`buildCalendarEventFields`) — cohérent
- `EventSector` dans `event-dialog.tsx` est le même ensemble de valeurs que `CalendarSector` dans `GlobalCalendarPage.tsx` — le type est re-déclaré localement pour éviter une dépendance circulaire
- `parseDateKey` dans Task 1 prend `YYYY-MM-DD` — même format que `dateKey` dans `CalendarEvent` — cohérent
