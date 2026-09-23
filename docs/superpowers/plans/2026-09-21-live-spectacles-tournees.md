# Live — « Spectacles & tournées » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire de `/live` la tour de contrôle « Spectacles & tournées » : une carte par spectacle / DJ set avec ses tournées, la tournée devenue une étape rattachée obligatoirement à un spectacle, reliée à ses dates, répétitions et à la prospection, avec une progression calculée et forçable.

**Architecture:** Deux modules purs portent toute la logique (`live-links.ts` : qui appartient à quoi ; `live-progress.ts` : les étapes calculées), vérifiés par un script d'assertions. Les écrans ne font que les appeler. Stockage inchangé (`tour` reste un `LiveKind`, liens dans `details` / `data`), sauf une colonne `tour_id` sur la prospection. Une reprise one-shot complète le spectacle des événements rattachés seulement à une tournée.

**Tech Stack:** Next.js 16 (App Router), React, TypeScript, SWR, Supabase, Tailwind, Radix (`src/components/ui/`), Leaflet, lucide-react.

**Spec :** `docs/superpowers/specs/2026-09-21-live-spectacles-tournees-design.md`

---

## Règles de travail propres à ce dépôt (priment sur le skill)

- **Aucun commit, aucun `git add`, aucun `git push`** pendant l'exécution (`CLAUDE.md`). L'utilisateur commitera lui-même après vérification en dev. Les étapes « Commit » du skill sont remplacées par des points de contrôle `tsc`.
- **Pas de suite de tests.** La logique pure est couverte par `scripts/check-live-progress.ts`, lancé avec `npx --yes tsx scripts/check-live-progress.ts`. Les écrans se vérifient avec `npx tsc --noEmit`, `npx eslint <fichiers>` et des captures Playwright (tâche 12).
- **`cn()` ne fusionne pas les classes Tailwind** : pour dimensionner un `Input` / `Select`, mettre la largeur sur un `div` parent, jamais en `className` du primitif.
- **Pas de tiret cadratin (—) dans les textes d'interface.** Les commentaires de code ne sont pas concernés.
- **Le compte de captures (`SHOT_EMAIL`) est le seul compte de la base, avec de vraies données.** Ne rien supprimer avec, ne pas y créer de données de test sans les retirer ensuite.
- La base Supabase de dev **est** la base de prod (un seul projet). Appliquer la migration SQL est une action en production : **demander à l'utilisateur avant** (tâche 1).

## Carte des fichiers

| Fichier | Rôle | Action |
|---|---|---|
| `supabase/migrations/20260921100000_live_prospection_tour.sql` | colonne `tour_id` | créer |
| `src/hooks/useLiveData.ts` | `ProspectionEntry.tourId` + mappers + appel de la reprise | modifier |
| `src/modules/live/lib/live-links.ts` | relations spectacle / tournée / événements, libellés, anomalies | créer |
| `src/modules/live/lib/live-progress.ts` | étapes calculées et forçages | créer |
| `scripts/check-live-progress.ts` | assertions sur les deux modules purs | créer |
| `src/modules/live/lib/migrate-live-tour-links.ts` | reprise : spectacle déduit de la tournée | créer |
| `src/modules/live/components/shared/LiveUI.tsx` | `Choice` : prop `noneLabel` | modifier |
| `src/modules/live/components/shared/ComputedPreparation.tsx` | checklist calculée / forçable | créer |
| `src/modules/live/components/spectacles/StatusSplit.tsx` | barre de répartition par statut | créer |
| `src/modules/live/components/spectacles/TourRow.tsx` | ligne de tournée | créer |
| `src/modules/live/components/spectacles/ShowCard.tsx` | carte d'un spectacle / DJ set | créer |
| `src/modules/live/components/spectacles/OrphanZone.tsx` | zone « À rattacher » | créer |
| `src/modules/live/components/spectacles/TourMap.tsx` | carte Leaflet (extraite de la Vue d'ensemble) | créer |
| `src/modules/live/components/spectacles/TourSections.tsx` | sections de la fiche de tournée + `EventLine` | créer |
| `src/modules/live/components/LiveHomePage.tsx` | page `/live` | créer |
| `src/modules/live/components/LiveOverviewPage.tsx` | ancienne Vue d'ensemble | supprimer |
| `src/modules/live/components/ProductionsPage.tsx` | ancienne liste | supprimer |
| `app/(app)/live/page.tsx`, `app/(app)/live/spectacles/page.tsx` | routes | modifier |
| `src/components/layout/Sidebar.tsx` | sous-items Live | modifier |
| `src/modules/live/components/ProductionEditPage.tsx` | fiches spectacle / tournée | réécrire |
| `src/modules/live/components/EventEditPage.tsx` | cascade Spectacle → Tournée | modifier |
| `src/modules/live/components/RehearsalsPage.tsx` | filtre tournée | modifier |
| `src/modules/live/components/TourDatesPage.tsx` | filtres spectacle / tournée | modifier |
| `src/modules/live/components/ProspectionPage.tsx` | champ et filtre tournée | modifier |
| `ALPHA.md` | avancement + recette de déploiement | modifier |

---

### Task 1: Colonne `tour_id` sur la prospection

**Files:**
- Create: `supabase/migrations/20260921100000_live_prospection_tour.sql`
- Modify: `src/hooks/useLiveData.ts:57-71` (type), `:247-286` (mappers)

- [ ] **Step 1: Écrire la migration**

```sql
-- Live : une entrée de prospection peut être rattachée à une tournée
-- (user_live_productions.id, kind = 'tour'). Pas de clé étrangère : les liens
-- Live (details.productionId / tourId) n'en ont pas non plus, et une tournée
-- supprimée ne doit pas emporter l'historique de démarchage.
alter table public.user_live_prospection add column if not exists tour_id text;
```

- [ ] **Step 2: Ajouter `tourId` au type**

Dans `src/hooks/useLiveData.ts`, type `ProspectionEntry`, après `reliabilityTier: ReliabilityTier;` :

```ts
  /** Tournée pour laquelle ce lieu est démarché. */
  tourId?: string;
```

- [ ] **Step 3: Mapper la colonne**

Dans `prospectionToRow`, après `last_contact: lastContact ?? null,` :

```ts
    tour_id: e.tourId ?? null,
```

Dans `rowToProspection`, après `lastContact: getLastContactFromTouchpoints(touchpoints),` :

```ts
    tourId: (row.tour_id as string) ?? undefined,
```

- [ ] **Step 4: Vérifier la migration à blanc, puis demander avant d'appliquer**

Run: `npx supabase db push --linked --dry-run`
Expected: la liste des migrations à pousser contient `20260921100000_live_prospection_tour.sql`. Si elle en contient d'autres, **s'arrêter et le signaler à l'utilisateur**, ne rien pousser.

Puis **demander à l'utilisateur** l'autorisation d'appliquer (`npx supabase db push --linked`). La colonne est additive et nullable : le front en production actuel l'ignore (`select("*")`), l'appliquer avant le déploiement ne casse rien. Sans elle, toute écriture de prospection échoue en dev comme en prod après la tâche 11.

- [ ] **Step 5: Point de contrôle**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

---

### Task 2: Module `live-links.ts`

**Files:**
- Create: `src/modules/live/lib/live-links.ts`

- [ ] **Step 1: Écrire le module**

```ts
import type { ProspectionEntry, RehearsalItem } from "@/hooks/useLiveData";
import type { TourDate, TourStatus } from "../data/defaultRepresentations";
import { PIPELINE_ORDER } from "../data/statusMeta";
import { dateISO, type LiveDetails, type LiveProduction } from "./live-model";

/**
 * Qui appartient à quoi dans Live. Une échelle à trois niveaux :
 * spectacle / DJ set (l'objet) → tournée (une campagne de cet objet) →
 * représentation (une occurrence). `details.productionId` dit toujours quel
 * spectacle est joué ; `details.tourId` ne fait que regrouper.
 */

type Linked = { details?: LiveDetails };

export const isTour = (p: LiveProduction) => p.kind === "tour";

export function showsOf(productions: LiveProduction[]): LiveProduction[] {
    return productions.filter(p => p.kind !== "tour");
}

export function toursOf(showId: string, productions: LiveProduction[]): LiveProduction[] {
    return productions.filter(p => p.kind === "tour" && p.productionId === showId);
}

export function inTour<T extends Linked>(tourId: string, items: T[]): T[] {
    return items.filter(i => i.details?.tourId === tourId);
}

/** Dates d'un spectacle jouées hors de toute tournée. */
export function looseDatesOf(showId: string, dates: TourDate[]): TourDate[] {
    return dates.filter(d => d.details?.productionId === showId && !d.details?.tourId);
}

export function prospectsOf(tourId: string, prospection: ProspectionEntry[]): ProspectionEntry[] {
    return prospection.filter(p => p.tourId === tourId);
}

export function byDate<T extends { date: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => dateISO(a.date).localeCompare(dateISO(b.date)));
}

export const isUpcoming = (date: string, today: string) => dateISO(date) >= today;

/** « 0 date », « 1 date », « 3 dates » : en français, 0 est au singulier. */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

/** « Automne 2026 · Le live » : lève les homonymes entre tournées de spectacles différents. */
export function tourLabel(tour: LiveProduction, productions: LiveProduction[]): string {
    const show = productions.find(p => p.id === tour.productionId);
    return show ? `${tour.title} · ${show.title}` : tour.title;
}

/** Options d'un choix de tournée, limitées au spectacle donné s'il y en a un. */
export function tourOptions(productions: LiveProduction[], showId?: string): { value: string; label: string }[] {
    const tours = showId ? toursOf(showId, productions) : productions.filter(isTour);
    return tours.map(t => ({ value: t.id, label: tourLabel(t, productions) }));
}

export function statusCounts(dates: TourDate[]): { status: TourStatus; count: number }[] {
    return PIPELINE_ORDER.map(status => ({ status, count: dates.filter(d => d.status === status).length })).filter(c => c.count > 0);
}

export type NextUp = { kind: "date" | "rehearsal"; id: string; title: string; date: string; href: string };

/** L'événement à venir le plus proche, représentation ou répétition. */
export function nextUp(dates: TourDate[], rehearsals: RehearsalItem[], today: string): NextUp | null {
    const items: NextUp[] = [
        ...dates.filter(d => isUpcoming(d.date, today)).map(d => ({ kind: "date" as const, id: String(d.id), title: [d.venue, d.city].filter(Boolean).join(" · ") || "Représentation", date: d.date, href: `/live/representations/${d.id}` })),
        ...rehearsals.filter(r => isUpcoming(r.date, today)).map(r => ({ kind: "rehearsal" as const, id: String(r.id), title: r.label || "Répétition", date: r.date, href: `/live/repetitions/${r.id}` })),
    ];
    return byDate(items)[0] ?? null;
}

/** « aujourd'hui », « demain », « dans 3 j », « dans 2 sem. », « dans 4 mois ». */
export function relativeDay(date: string, today: string): string {
    const diff = Math.round((Date.parse(`${dateISO(date)}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 86_400_000);
    if (!Number.isFinite(diff)) return date;
    if (diff <= 0) return "aujourd’hui";
    if (diff === 1) return "demain";
    if (diff < 7) return `dans ${diff} j`;
    if (diff < 60) return `dans ${Math.round(diff / 7)} sem.`;
    return `dans ${Math.round(diff / 30)} mois`;
}

export type LinkIssue =
    | { type: "tour-without-show"; tour: LiveProduction }
    | { type: "date-without-show"; date: TourDate }
    | { type: "mismatch"; event: "date" | "rehearsal"; id: string; title: string; date: string; tour: LiveProduction; productionId: string };

/**
 * Ce qui contredit la règle « une tournée = un spectacle » et doit être
 * rattaché à la main. Les dates passées sans spectacle sont ignorées : les
 * lister noierait la zone sous l'historique.
 */
export function linkIssues(productions: LiveProduction[], dates: TourDate[], rehearsals: RehearsalItem[], today: string): LinkIssue[] {
    const issues: LinkIssue[] = [];
    const shows = new Set(showsOf(productions).map(p => p.id));
    for (const tour of productions.filter(isTour))
        if (!tour.productionId || !shows.has(tour.productionId))
            issues.push({ type: "tour-without-show", tour });
    for (const date of dates)
        if (!date.details?.productionId && !date.details?.tourId && isUpcoming(date.date, today))
            issues.push({ type: "date-without-show", date });
    const check = (event: "date" | "rehearsal", id: string, title: string, date: string, details?: LiveDetails) => {
        const tour = details?.tourId ? productions.find(p => p.id === details.tourId) : undefined;
        if (tour?.productionId && details?.productionId && details.productionId !== tour.productionId)
            issues.push({ type: "mismatch", event, id, title, date, tour, productionId: details.productionId });
    };
    for (const d of dates) check("date", String(d.id), d.venue || d.city || "Représentation", d.date, d.details);
    for (const r of rehearsals) check("rehearsal", String(r.id), r.label || "Répétition", r.date, r.details);
    return issues;
}
```

- [ ] **Step 2: Point de contrôle**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

---

### Task 3: Module `live-progress.ts` et son script de vérification

**Files:**
- Create: `scripts/check-live-progress.ts`
- Create: `src/modules/live/lib/live-progress.ts`

- [ ] **Step 1: Écrire le script d'assertions (il doit échouer : le module n'existe pas)**

```ts
// scripts/check-live-progress.ts — règles de progression et de rattachement Live.
//
//   npx --yes tsx scripts/check-live-progress.ts
//
// Pas de suite de tests dans le projet : ce script tient lieu de spécification
// exécutable pour live-progress.ts et live-links.ts.
import assert from "node:assert/strict";
import type { TourDate } from "../src/modules/live/data/defaultRepresentations";
import type { ProspectionEntry, RehearsalItem } from "../src/hooks/useLiveData";
import { emptyTechnical, newProduction, type LiveProduction } from "../src/modules/live/lib/live-model";
import { productionProgress, withStep, type ProgressContext } from "../src/modules/live/lib/live-progress";
import { linkIssues, nextUp, relativeDay, tourOptions } from "../src/modules/live/lib/live-links";

const today = "2026-09-21";
const show: LiveProduction = { ...newProduction("show"), id: "show", title: "Le live" };
const tour: LiveProduction = { ...newProduction("tour"), id: "tour", title: "Automne", productionId: "show" };
const date = (id: number, over: Partial<TourDate> = {}): TourDate => ({ id, city: "Nantes", venue: `Salle ${id}`, date: "01/10/2026", status: "Confirmée", address: "", timetable: [], transport: false, lodging: false, remuneration: false, equipment: false, details: { productionId: "show", tourId: "tour" }, ...over });
const rehearsal = (over: Partial<RehearsalItem> = {}): RehearsalItem => ({ id: "r", date: "10/09/2026", time: "", location: "", remunerations: [], equipments: [], details: { productionId: "show" }, ...over });
const prospect = (status: string): ProspectionEntry => ({ id: status, venueName: "Lieu", city: "", contact: "", email: "", instagram: "", facebook: "", phone: "", status, touchpoints: [], reliabilityTier: "neutral", tourId: "tour" });
const ctx = (tourDates: TourDate[], rehearsals: RehearsalItem[] = [], prospection: ProspectionEntry[] = []): ProgressContext => ({ tourDates, rehearsals, prospection, today });
const step = (p: LiveProduction, c: ProgressContext, id: string) => productionProgress(p, c).steps.find(s => s.id === id)!;

// Dates confirmées : une date en option bloque, une date passée ne compte pas.
assert.equal(step(tour, ctx([date(1), date(2, { status: "En option" })]), "dates").state, "todo");
assert.equal(step(tour, ctx([date(1), date(2, { status: "En option" })]), "dates").blockers.length, 1);
assert.equal(step(tour, ctx([date(1)]), "dates").state, "done");
assert.equal(step(tour, ctx([date(1), date(2, { status: "En option", date: "01/09/2026" })]), "dates").state, "done");
assert.equal(step(tour, ctx([]), "dates").state, "todo");

// Logistique et cachets : « sans objet » sur la date ne bloque pas.
const prepared = date(1, { details: { productionId: "show", tourId: "tour", preparation: { transport: "done", lodging: "na", payment: "done" } } });
assert.equal(step(tour, ctx([prepared]), "logistics").state, "done");
assert.equal(step(tour, ctx([prepared]), "fees").state, "done");
assert.equal(step(tour, ctx([date(1)]), "logistics").blockers.length, 1);
assert.equal(step(tour, ctx([]), "fees").state, "todo");
// Une date en option n'est pas exigée pour la logistique.
assert.equal(step(tour, ctx([prepared, date(2, { status: "En option" })]), "logistics").state, "done");

// Forçage : l'étape est faite, mais ce qui bloque reste visible.
const forced = step({ ...tour, preparation: { logistics: "done" } }, ctx([date(1)]), "logistics");
assert.equal(forced.state, "done");
assert.equal(forced.computed, false);
assert.equal(forced.blockers.length, 1);
// « todo » enregistré avant la refonte = pas de forçage.
assert.equal(step({ ...tour, preparation: { dates: "todo" } }, ctx([date(1)]), "dates").state, "done");
// « Revenir au calcul » supprime la clé.
assert.deepEqual(withStep({ dates: "done", fees: "na" }, "dates", undefined), { fees: "na" });

// Prospection : faite dès qu'un lieu rattaché est accepté.
assert.equal(step(tour, ctx([], [], [prospect("En discussion")]), "booking").state, "todo");
assert.equal(step(tour, ctx([], [], [prospect("Accepté")]), "booking").state, "done");
assert.equal(step(tour, ctx([], [], [{ ...prospect("Accepté"), tourId: "autre" }]), "booking").state, "todo");

// Spectacle : quatre étapes calculées, deux manuelles.
const full: LiveProduction = { ...show, setlist: [{ id: "a", title: "A", artist: "", duration: "3:00", note: "" }], equipmentListIds: ["kit"], technical: { ...emptyTechnical(), contact: "Régie", sound: "2 DI" } };
const pr = productionProgress(full, ctx([], [rehearsal()]));
assert.deepEqual(pr.steps.filter(s => s.state === "done").map(s => s.id), ["setlist", "equipment", "rehearsal", "technical"]);
assert.deepEqual(pr.steps.filter(s => s.manual).map(s => s.id), ["concept", "team"]);
assert.equal(pr.next, "Concept du spectacle");
assert.equal(pr.percent, 67);
// Une répétition à venir ne compte pas comme effectuée.
assert.equal(step(full, ctx([], [rehearsal({ date: "30/09/2026" })]), "rehearsal").state, "todo");
// Étape manuelle cochée.
assert.equal(step({ ...full, preparation: { concept: "done" } }, ctx([]), "concept").state, "done");

// Rattachements à reprendre.
const other: LiveProduction = { ...newProduction("show"), id: "other", title: "Autre" };
const orphan: LiveProduction = { ...newProduction("tour"), id: "orphan", title: "Orpheline" };
const issues = linkIssues([show, other, tour, orphan], [date(3, { details: { productionId: "other", tourId: "tour" } }), date(4, { details: {} }), date(5, { details: {}, date: "01/01/2026" })], [], today);
assert.deepEqual(issues.map(i => i.type).sort(), ["date-without-show", "mismatch", "tour-without-show"]);

// Choix de tournée filtré sur le spectacle, libellé désambiguïsé.
assert.deepEqual(tourOptions([show, other, tour, orphan], "show").map(o => o.label), ["Automne · Le live"]);

// Prochaine échéance, toutes sortes confondues.
assert.equal(nextUp([date(1, { date: "05/10/2026" })], [rehearsal({ date: "25/09/2026" })], today)?.kind, "rehearsal");
assert.equal(relativeDay("22/09/2026", today), "demain");

console.log("✓ live-progress / live-links : toutes les règles tiennent");
```

- [ ] **Step 2: Lancer le script, vérifier qu'il échoue**

Run: `npx --yes tsx scripts/check-live-progress.ts`
Expected: FAIL, erreur de résolution sur `../src/modules/live/lib/live-progress`.

- [ ] **Step 3: Écrire `live-progress.ts`**

```ts
import type { ProspectionEntry, RehearsalItem } from "@/hooks/useLiveData";
import type { TourDate } from "../data/defaultRepresentations";
import { productionSteps, type LiveProduction, type PreparationState } from "./live-model";
import { inTour, isUpcoming, plural, prospectsOf } from "./live-links";

/**
 * Progression d'un spectacle ou d'une tournée. Les étapes que les données
 * permettent d'établir se calculent ; les autres restent à cocher.
 *
 * Pour une étape calculée, `preparation[id]` ne sert qu'au forçage : `done` ou
 * `na` l'emportent sur le calcul, `todo` ou une clé absente laissent le calcul
 * décider. Ainsi les coches posées avant la refonte se lisent comme des
 * forçages, sans reprise de données.
 */

export type Blocker = { label: string; href?: string };

export type StepStatus = {
    id: string;
    label: string;
    /** Étape que rien dans les données ne permet d'établir (concept, équipe). */
    manual: boolean;
    /** Verdict des données ; toujours `false` pour une étape manuelle. */
    computed: boolean;
    /** Ce qui empêche le calcul de conclure, même quand l'étape est forcée. */
    blockers: Blocker[];
    /** Valeur enregistrée : forçage d'une étape calculée, ou coche d'une étape manuelle. */
    stored?: PreparationState;
    /** État retenu, forçage compris. */
    state: PreparationState;
};

export type ProgressSummary = { steps: StepStatus[]; done: number; total: number; percent: number; next?: string };

export type ProgressContext = { tourDates: TourDate[]; rehearsals: RehearsalItem[]; prospection: ProspectionEntry[]; today: string };

type Verdict = { ok: boolean; blockers: Blocker[] };

const CONFIRMED = new Set(["Confirmée", "Signée", "Finalisée"]);
const settled = (state?: PreparationState) => state === "done" || state === "na";
const verdict = (ok: boolean, blockers: Blocker[]): Verdict => ({ ok, blockers: ok ? [] : blockers });
const dateBlocker = (d: TourDate, what: string): Blocker => ({ label: `${d.venue || d.city || "Date"} (${d.date}) : ${what}`, href: `/live/representations/${d.id}` });

function tourVerdicts(tour: LiveProduction, ctx: ProgressContext): Record<string, Verdict> {
    const upcoming = inTour(tour.id, ctx.tourDates).filter(d => d.status !== "Passée" && isUpcoming(d.date, ctx.today));
    const confirmed = upcoming.filter(d => CONFIRMED.has(d.status));
    const prospects = prospectsOf(tour.id, ctx.prospection);
    const noConfirmed: Blocker[] = confirmed.length ? [] : [{ label: "Aucune date confirmée" }];
    const missing = (keys: string[], what: string) => confirmed.filter(d => keys.some(k => !settled(d.details?.preparation?.[k]))).map(d => dateBlocker(d, what));
    const fees = missing(["payment"], "rémunération à convenir");
    const logistics = missing(["transport", "lodging"], "transport ou logement à organiser");
    const options = upcoming.filter(d => d.status === "En option");
    return {
        booking: verdict(prospects.some(p => p.status === "Accepté"), [{ label: prospects.length ? `${plural(prospects.length, "lieu démarché", "lieux démarchés")}, aucun accepté` : "Aucun lieu démarché pour cette tournée", href: `/live/prospection?tourId=${tour.id}` }]),
        dates: verdict(upcoming.length > 0 && !options.length, upcoming.length ? options.map(d => dateBlocker(d, "encore en option")) : [{ label: "Aucune date à venir" }]),
        fees: verdict(confirmed.length > 0 && !fees.length, [...noConfirmed, ...fees]),
        logistics: verdict(confirmed.length > 0 && !logistics.length, [...noConfirmed, ...logistics]),
    };
}

function showVerdicts(show: LiveProduction, ctx: ProgressContext): Record<string, Verdict> {
    const past = ctx.rehearsals.filter(r => r.details?.productionId === show.id && !isUpcoming(r.date, ctx.today));
    const contact = (show.technical?.contact ?? "").trim();
    const sound = (show.technical?.sound ?? "").trim();
    return {
        setlist: verdict(show.setlist.length > 0, [{ label: "Setlist vide" }]),
        equipment: verdict(show.equipmentListIds.length > 0, [{ label: "Aucune liste de matériel associée" }]),
        rehearsal: verdict(past.length > 0, [{ label: "Aucune répétition passée pour ce live", href: `/live/repetitions/nouvelle?productionId=${show.id}` }]),
        technical: verdict(!!contact && !!sound, [...(contact ? [] : [{ label: "Contact technique à renseigner" }]), ...(sound ? [] : [{ label: "Son & retours à renseigner" }])]),
    };
}

export function productionProgress(p: LiveProduction, ctx: ProgressContext): ProgressSummary {
    const verdicts = p.kind === "tour" ? tourVerdicts(p, ctx) : showVerdicts(p, ctx);
    const steps = productionSteps(p.kind).map(([id, label]): StepStatus => {
        const stored = p.preparation?.[id];
        const v = verdicts[id];
        if (!v)
            return { id, label, manual: true, computed: false, blockers: [], stored, state: stored ?? "todo" };
        const state: PreparationState = stored === "done" || stored === "na" ? stored : v.ok ? "done" : "todo";
        return { id, label, manual: false, computed: v.ok, blockers: v.blockers, stored, state };
    });
    const required = steps.filter(s => s.state !== "na");
    const done = required.filter(s => s.state === "done").length;
    return { steps, done, total: required.length, percent: required.length ? Math.round(done / required.length * 100) : 100, next: required.find(s => s.state !== "done")?.label };
}

/** Pose ou retire (`undefined` = revenir au calcul) la valeur d'une étape. */
export function withStep(preparation: Record<string, PreparationState>, id: string, state: PreparationState | undefined): Record<string, PreparationState> {
    const next = { ...preparation };
    if (state) next[id] = state;
    else delete next[id];
    return next;
}
```

- [ ] **Step 4: Lancer le script, vérifier qu'il passe**

Run: `npx --yes tsx scripts/check-live-progress.ts`
Expected: `✓ live-progress / live-links : toutes les règles tiennent`

Si une assertion échoue, corriger le module, pas l'assertion : les assertions reprennent la spec.

- [ ] **Step 5: Point de contrôle**

Run: `npx tsc --noEmit`
Expected: aucune erreur. (`scripts/` est-il couvert par `tsconfig.json` ? Si `tsc` y signale des erreurs d'import `.ts`, c'est le script qu'il faut adapter, pas la configuration.)

---

### Task 4: Reprise des événements rattachés à une tournée sans spectacle

**Files:**
- Create: `src/modules/live/lib/migrate-live-tour-links.ts`
- Modify: `src/hooks/useLiveData.ts:318` (fetcher)

- [ ] **Step 1: Écrire la reprise**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiveDetails } from "./live-model";

/**
 * Reprise du 21/09 : un événement rattaché à une tournée mais pas à un
 * spectacle reçoit le spectacle de sa tournée. Depuis la refonte,
 * `details.productionId` est la seule source pour « quel spectacle ».
 *
 * Idempotente : seules les lignes à compléter sont écrites. Un échec n'est pas
 * bloquant, contrairement à `migrateLiveDetails` : rien n'est perdu, la ligne
 * reste visible dans sa tournée et la reprise retentera au prochain chargement.
 */
export async function migrateLiveTourLinks(client: SupabaseClient, userId: string, productions: Record<string, unknown>[], tables: [string, Record<string, unknown>[]][]) {
    const showOfTour = new Map<string, string>();
    for (const row of productions) {
        const data = (row.data ?? {}) as { productionId?: string };
        if (row.kind === "tour" && data.productionId)
            showOfTour.set(String(row.id), data.productionId);
    }
    if (!showOfTour.size)
        return;
    for (const [table, rows] of tables) {
        for (const row of rows) {
            const details = (row.details ?? {}) as LiveDetails;
            const show = details.tourId ? showOfTour.get(details.tourId) : undefined;
            if (!show || details.productionId)
                continue;
            const next: LiveDetails = { ...details, productionId: show };
            const { error } = await client.from(table).update({ details: next }).eq("id", row.id).eq("user_id", userId);
            if (error)
                return;
            row.details = next;
        }
    }
}
```

- [ ] **Step 2: L'appeler dans le fetcher**

Dans `src/hooks/useLiveData.ts`, ligne 6, sous `import { migrateLiveDetails } from "@/modules/live/lib/migrate-live-details";` :

```ts
import { migrateLiveTourLinks } from "@/modules/live/lib/migrate-live-tour-links";
```

puis juste après la ligne `if (!td.error && !rh.error) await migrateLiveDetails(...)` :

```ts
  // Même précaution : sans les trois tranches, on ne sait pas ce qui manque.
  if (!td.error && !rh.error && !productions.error)
    await migrateLiveTourLinks(supabase, user.id, productions.data ?? [], [["user_tour_dates", td.data ?? []], ["user_rehearsals", rh.data ?? []]]);
```

- [ ] **Step 3: Point de contrôle**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

---

### Task 5: `Choice` avec libellé « aucun » configurable, et `ComputedPreparation`

**Files:**
- Modify: `src/modules/live/components/shared/LiveUI.tsx:90-120`
- Create: `src/modules/live/components/shared/ComputedPreparation.tsx`

- [ ] **Step 1: Ajouter `noneLabel` à `Choice`**

Remplacer la signature et l'item « aucun » :

```tsx
export function Choice({ label, value, onChange, options, placeholder = "Choisir", optional, noneLabel = "Aucun" }: {
    label: string;
    value?: string;
    onChange: (value: string) => void;
    options: {
        value: string;
        label: string;
    }[];
    placeholder?: string;
    optional?: boolean;
    /** Libellé de l'option vide quand `optional` : « Hors tournée », « Toutes »… */
    noneLabel?: string;
}) {
```

et, dans le `SelectContent` :

```tsx
        {(optional || !value) && <SelectItem value="__none">
        {optional ? noneLabel : placeholder}
        </SelectItem>}
```

- [ ] **Step 2: Écrire `ComputedPreparation.tsx`**

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PreparationState } from "../../lib/live-model";
import type { ProgressSummary, StepStatus } from "../../lib/live-progress";
import { ProgressBar } from "./LiveUI";

/**
 * Checklist d'un spectacle ou d'une tournée. Une étape manuelle se coche ; une
 * étape calculée se lit, se déplie sur ce qui la bloque, et se force au besoin.
 * `onChange(id, undefined)` = revenir au calcul.
 */
export function ComputedPreparation({ summary, onChange, color = "#F0FF00" }: {
    summary: ProgressSummary;
    onChange: (id: string, state: PreparationState | undefined) => void;
    color?: string;
}) {
    const [open, setOpen] = useState<string | null>(null);
    return <div className="space-y-4">
    <div className="flex justify-between text-xs text-[#F5F5F5]/60">
    <span>{summary.done} / {summary.total} étapes</span>
    <span style={{ color }}>{summary.percent}%</span>
    </div>
    <ProgressBar percent={summary.percent} color={color}/>
    <div className="divide-y divide-[#F5F5F5]/[.06]">
        {summary.steps.map(s => <div key={s.id} className="py-2.5">
        <div className="flex items-start justify-between gap-2">
            {s.manual
                ? <button type="button" onClick={() => onChange(s.id, s.state === "done" ? "todo" : "done")} aria-pressed={s.state === "done"} className="flex items-center gap-2 text-left text-xs focus-visible:outline-[#F0FF00]">
                <Dot state={s.state}/>
                <Label step={s}/>
                </button>
                : <button type="button" onClick={() => s.blockers.length && setOpen(open === s.id ? null : s.id)} aria-expanded={s.blockers.length ? open === s.id : undefined} className="flex min-w-0 items-start gap-2 text-left text-xs focus-visible:outline-[#F0FF00]">
                <Dot state={s.state}/>
                <span className="min-w-0">
                <Label step={s}/>
                <Hint step={s}/>
                </span>
                </button>}
        {s.manual
            ? <button type="button" onClick={() => onChange(s.id, s.state === "na" ? "todo" : "na")} className="shrink-0 text-[10px] text-[#F5F5F5]/45 hover:text-[#F5F5F5]" aria-label={`${s.label} : ${s.state === "na" ? "rendre nécessaire" : "non nécessaire"}`}>
            {s.state === "na" ? "Rétablir" : "Non nécessaire"}
            </button>
            : <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label={`Forcer l’étape « ${s.label} »`}><MoreHorizontal size={13}/></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            {s.stored !== "done" && <DropdownMenuItem onSelect={() => onChange(s.id, "done")}>Marquer faite</DropdownMenuItem>}
            {s.stored !== "na" && <DropdownMenuItem onSelect={() => onChange(s.id, "na")}>Marquer sans objet</DropdownMenuItem>}
            {(s.stored === "done" || s.stored === "na") && <DropdownMenuItem onSelect={() => onChange(s.id, undefined)}>Revenir au calcul</DropdownMenuItem>}
            </DropdownMenuContent>
            </DropdownMenu>}
        </div>
        {open === s.id && <ul className="mt-2 space-y-1 pl-7">
            {s.blockers.map((b, i) => <li key={i} className="text-[11px] text-[#F5F5F5]/55">
            {b.href ? <Link href={b.href} className="hover:text-[#F0FF00]">{b.label}</Link> : b.label}
            </li>)}
        </ul>}
        </div>)}
    </div>
    </div>;
}

function Dot({ state }: { state: PreparationState }) {
    return <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", state === "done" ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-400" : "border-[#F5F5F5]/20 text-[#F5F5F5]/40")}>
    {state === "done" && <Check size={12}/>}
    </span>;
}

function Label({ step }: { step: StepStatus }) {
    return <span className={cn("block pt-0.5", step.state === "na" && "text-[#F5F5F5]/35 line-through")}>{step.label}</span>;
}

/** Sous le libellé : ce que dit le calcul, surtout quand un forçage le masque. */
function Hint({ step }: { step: StepStatus }) {
    const forced = step.stored === "done" || step.stored === "na";
    const first = step.blockers[0];
    const more = step.blockers.length > 1 ? ` (+${step.blockers.length - 1})` : "";
    const text = forced
        ? `${step.stored === "na" ? "Marquée sans objet" : "Marquée faite"}${first ? ` · ${first.label}${more}` : ""}`
        : first ? `${first.label}${more}` : "";
    if (!text)
        return null;
    return <span className="mt-0.5 block text-[10px] text-[#F5F5F5]/40">{text}</span>;
}
```

- [ ] **Step 3: Point de contrôle**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

---

### Task 6: Composants de la page Spectacles & tournées

**Files:**
- Create: `src/modules/live/components/spectacles/StatusSplit.tsx`
- Create: `src/modules/live/components/spectacles/TourRow.tsx`
- Create: `src/modules/live/components/spectacles/ShowCard.tsx`
- Create: `src/modules/live/components/spectacles/OrphanZone.tsx`

- [ ] **Step 1: `StatusSplit.tsx`**

```tsx
import type { TourDate } from "@/hooks/useLiveData";
import { STATUS_META } from "../../data/statusMeta";
import { statusCounts } from "../../lib/live-links";

/** Répartition des dates par statut commercial, en une barre segmentée. */
export function StatusSplit({ dates }: { dates: TourDate[] }) {
    const counts = statusCounts(dates);
    if (!counts.length)
        return null;
    return <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={counts.map(c => `${c.count} ${c.status}`).join(", ")}>
        {counts.map(c => <div key={c.status} className="h-full rounded-full" style={{ flexGrow: c.count, minWidth: 8, background: STATUS_META[c.status].color }} title={`${c.status} : ${c.count}`}/>)}
    </div>;
}
```

- [ ] **Step 2: `TourRow.tsx`**

```tsx
import Link from "next/link";
import { Route } from "lucide-react";
import type { LiveProduction } from "../../lib/live-model";
import { byDate, inTour, isUpcoming, plural, prospectsOf } from "../../lib/live-links";
import { productionProgress, type ProgressContext } from "../../lib/live-progress";
import { ProgressBar } from "../shared/LiveUI";
import { StatusSplit } from "./StatusSplit";

export const TOUR_COLOR = "#38BDF8";

/** Une tournée, résumée en une ligne cliquable : dans une carte de spectacle ou sa fiche. */
export function TourRow({ tour, ctx }: { tour: LiveProduction; ctx: ProgressContext }) {
    const dates = byDate(inTour(tour.id, ctx.tourDates));
    const rehearsals = inTour(tour.id, ctx.rehearsals);
    const prospects = prospectsOf(tour.id, ctx.prospection);
    const pr = productionProgress(tour, ctx);
    const period = !dates.length ? "Pas encore de date" : dates.length === 1 ? dates[0].date : `${dates[0].date} → ${dates[dates.length - 1].date}`;
    return <Link href={`/live/spectacles/${tour.id}`} className="group block rounded-lg border border-[#F5F5F5]/[.07] bg-[#101010]/40 p-3 transition-colors hover:border-[#38BDF8]/40">
    <div className="flex items-center justify-between gap-3">
    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
    <Route size={14} className="shrink-0" style={{ color: TOUR_COLOR }}/>
    <span className="truncate group-hover:text-[#38BDF8]">{tour.title || "Tournée sans titre"}</span>
    </span>
    <span className="shrink-0 text-[11px] text-[#F5F5F5]/45">{period}</span>
    </div>
    <p className="mt-1.5 text-[11px] text-[#F5F5F5]/50">
    {plural(dates.length, "date")} · {plural(rehearsals.length, "répétition")} · {plural(prospects.length, "lieu démarché", "lieux démarchés")}
    </p>
    <div className="mt-2.5 space-y-1.5">
    <StatusSplit dates={dates.filter(d => isUpcoming(d.date, ctx.today))}/>
    <ProgressBar percent={pr.percent} color={TOUR_COLOR}/>
    </div>
    <p className="mt-1.5 flex justify-between gap-3 text-[11px] text-[#F5F5F5]/45">
    <span className="truncate">{pr.next ? `Prochaine étape · ${pr.next}` : "Tournée prête"}</span>
    <span style={{ color: TOUR_COLOR }}>{pr.percent}%</span>
    </p>
    </Link>;
}
```

- [ ] **Step 3: `ShowCard.tsx`**

La carte n'est pas un lien en entier : elle contient des liens (tournées, échéance), et un lien dans un lien est invalide.

```tsx
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Disc3, FileText, ListMusic, Mic2, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KIND_META, setlistDuration, type LiveProduction } from "../../lib/live-model";
import { isUpcoming, looseDatesOf, nextUp, plural, relativeDay, toursOf } from "../../lib/live-links";
import { productionProgress, type ProgressContext } from "../../lib/live-progress";
import { ProgressBar } from "../shared/LiveUI";
import { TourRow } from "./TourRow";

/** Un spectacle ou un DJ set, avec l'état de l'objet et tout ce qui en découle. */
export function ShowCard({ show, productions, ctx }: { show: LiveProduction; productions: LiveProduction[]; ctx: ProgressContext }) {
    const meta = KIND_META[show.kind];
    const Icon = show.kind === "dj" ? Disc3 : Mic2;
    const pr = productionProgress(show, ctx);
    const tours = toursOf(show.id, productions);
    const loose = looseDatesOf(show.id, ctx.tourDates);
    const looseUpcoming = loose.filter(d => isUpcoming(d.date, ctx.today)).length;
    const next = nextUp(ctx.tourDates.filter(d => d.details?.productionId === show.id), ctx.rehearsals.filter(r => r.details?.productionId === show.id), ctx.today);
    const technicalReady = pr.steps.find(s => s.id === "technical")?.computed;
    return <article className="flex flex-col rounded-xl border border-[#F5F5F5]/10 p-5" style={{ background: `linear-gradient(160deg, ${meta.color}10, rgba(44,44,46,.45) 45%)` }}>
    <div className="flex items-center justify-between">
    <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: meta.color }}><Icon size={13}/>{meta.label}</span>
    <span className="text-xs tabular-nums" style={{ color: meta.color }}>{pr.percent}%</span>
    </div>
    <Link href={`/live/spectacles/${show.id}`} className="group mt-4 flex items-center gap-2">
    <h2 className="truncate text-lg font-semibold group-hover:text-[#F0FF00]">{show.title || "Sans titre"}</h2>
    <ArrowUpRight size={15} className="shrink-0 text-[#F5F5F5]/30 group-hover:text-[#F0FF00]"/>
    </Link>
    <div className="mt-3">
    <ProgressBar percent={pr.percent} color={meta.color}/>
    <p className="mt-1.5 text-xs text-[#F5F5F5]/50">{pr.next ? `Prochaine étape · ${pr.next}` : "Prêt pour la scène"}</p>
    </div>
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#F5F5F5]/60">
    <span className="flex items-center gap-1.5"><ListMusic size={13}/>{plural(show.setlist.length, "morceau", "morceaux")} · {setlistDuration(show.setlist)} min</span>
    <span className="flex items-center gap-1.5"><FileText size={13}/>{technicalReady ? "Fiche technique prête" : "Fiche technique à compléter"}</span>
    <span className="flex items-center gap-1.5"><Package size={13}/>{plural(show.equipmentListIds.length, "liste de matériel", "listes de matériel")}</span>
    </div>
    <div className="mt-5 flex-1 space-y-2">
    <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#F5F5F5]/40">Sur la route</p>
    {tours.map(t => <TourRow key={t.id} tour={t} ctx={ctx}/>)}
    {loose.length > 0 && <Link href={`/live/representations?productionId=${show.id}&tourId=hors`} className="flex items-center justify-between gap-3 rounded-lg border border-[#F5F5F5]/[.07] bg-[#101010]/40 p-3 text-sm transition-colors hover:border-[#F5F5F5]/25">
        <span className="flex items-center gap-2"><CalendarDays size={14} className="text-[#F5F5F5]/50"/>Hors tournée</span>
        <span className="text-[11px] text-[#F5F5F5]/50">{plural(loose.length, "date")}{looseUpcoming ? `, ${looseUpcoming} à venir` : ""}</span>
        </Link>}
    {!tours.length && !loose.length && <p className="text-xs text-[#F5F5F5]/45">Pas encore de date. Monte une tournée ou ajoute une date isolée.</p>}
    </div>
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#F5F5F5]/[.06] pt-3">
    <span className="min-w-0 truncate text-xs text-[#F5F5F5]/55">
    {next ? <Link href={next.href} className="hover:text-[#F0FF00]">{next.kind === "rehearsal" ? "Répétition" : "Date"} · {next.title} · {relativeDay(next.date, ctx.today)}</Link> : "Rien de prévu"}
    </span>
    <Button asChild size="xs" variant="secondary">
    <Link href={`/live/spectacles/nouveau?kind=tour&productionId=${show.id}`}><Plus size={12} className="mr-1"/>Monter une tournée</Link>
    </Button>
    </div>
    </article>;
}
```

- [ ] **Step 4: `OrphanZone.tsx`**

```tsx
"use client";
import { Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveData } from "@/hooks/useLiveData";
import type { LiveDetails } from "../../lib/live-model";
import { showsOf, type LinkIssue } from "../../lib/live-links";
import { Choice } from "../shared/LiveUI";

type Mismatch = Extract<LinkIssue, { type: "mismatch" }>;

/** Ce qui contredit « une tournée = un spectacle ». Disparaît une fois vide. */
export function OrphanZone({ issues }: { issues: LinkIssue[] }) {
    const live = useLiveData();
    if (!issues.length)
        return null;
    const shows = showsOf(live.productions).map(p => ({ value: p.id, label: p.title }));
    const titleOf = (id: string) => live.productions.find(p => p.id === id)?.title ?? "un autre live";
    const fix = (issue: Mismatch, patch: Partial<LiveDetails>) => issue.event === "date"
        ? void live.setTourDates(prev => prev.map(d => String(d.id) === issue.id ? { ...d, details: { ...d.details, ...patch } } : d))
        : void live.setRehearsals(prev => prev.map(r => String(r.id) === issue.id ? { ...r, details: { ...r.details, ...patch } } : r));
    return <section className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/[.05] p-5">
    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
    <h2 className="flex items-center gap-2 text-sm font-semibold"><Unlink size={15} className="text-amber-300"/>À rattacher</h2>
    <p className="text-xs text-[#F5F5F5]/50">Une tournée part toujours avec un spectacle ou un DJ set, et chaque date dit quel live elle joue.</p>
    </div>
    <ul className="space-y-2">
        {issues.map(issue => {
            if (issue.type === "tour-without-show")
                return <li key={`tour-${issue.tour.id}`} className="grid items-end gap-3 rounded-lg bg-[#101010]/40 p-3 md:grid-cols-[1fr_260px]">
                <p className="text-sm">Tournée « {issue.tour.title || "sans titre"} » : quel live emmène-t-elle ?</p>
                <Choice label="Spectacle ou DJ set" value="" placeholder="Choisir" onChange={productionId => { if (productionId) void live.setProductions(prev => prev.map(p => p.id === issue.tour.id ? { ...p, productionId } : p)); }} options={shows}/>
                </li>;
            if (issue.type === "date-without-show")
                return <li key={`date-${issue.date.id}`} className="grid items-end gap-3 rounded-lg bg-[#101010]/40 p-3 md:grid-cols-[1fr_260px]">
                <p className="text-sm">Date « {issue.date.venue || issue.date.city || "sans lieu"} » du {issue.date.date} : quel live y est joué ?</p>
                <Choice label="Spectacle ou DJ set" value="" placeholder="Choisir" onChange={productionId => { if (productionId) void live.setTourDates(prev => prev.map(d => d.id === issue.date.id ? { ...d, details: { ...d.details, productionId } } : d)); }} options={shows}/>
                </li>;
            return <li key={`${issue.event}-${issue.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#101010]/40 p-3">
            <p className="min-w-0 text-sm">{issue.event === "date" ? "La date" : "La répétition"} « {issue.title} » du {issue.date} joue « {titleOf(issue.productionId)} », mais sa tournée « {issue.tour.title} » emmène « {titleOf(issue.tour.productionId ?? "")} ».</p>
            <div className="flex shrink-0 gap-2">
            <Button size="xs" variant="secondary" onClick={() => fix(issue, { productionId: issue.tour.productionId })}>Aligner sur la tournée</Button>
            <Button size="xs" variant="ghost" onClick={() => fix(issue, { tourId: undefined })}>Sortir de la tournée</Button>
            </div>
            </li>;
        })}
    </ul>
    </section>;
}
```

- [ ] **Step 5: Point de contrôle**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

---

### Task 7: Carte d'itinéraire extraite

**Files:**
- Create: `src/modules/live/components/spectacles/TourMap.tsx`

Le code Leaflet vient de `LiveOverviewPage.tsx:174-317` et `:524-542`. Trois changements : il prend ses points en props, il les ordonne par date (c'est un itinéraire), et il détruit la carte au démontage. Les points sont résumés en une chaîne `key` pour que l'effet ne se relance pas à chaque rendu du formulaire qui l'héberge.

- [ ] **Step 1: Écrire le composant**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Layer, Map as LeafletMap } from "leaflet";
import type { RehearsalItem, TourDate } from "@/hooks/useLiveData";
import { CONCERT_COLOR, REHEARSAL_COLOR } from "../../data/statusMeta";
import { byDate } from "../../lib/live-links";

type Place = { query: string; city: string; label: string; rehearsal: boolean };
type Coords = { lat: number; lng: number };

const normalize = (value?: string | null) => (value || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Partagé entre montages : une adresse déjà géocodée ne repart pas chez Nominatim. */
const geoCache = new Map<string, Coords>();

async function geocode(query: string, city: string): Promise<Coords> {
    const key = query.toLowerCase().trim() || "france";
    const cached = geoCache.get(key);
    if (cached)
        return cached;
    let coords: Coords | undefined;
    try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query || "France")}&limit=5`);
        const data: Array<{ lat: string; lon: string; address?: { city?: string; town?: string; village?: string } }> = await resp.json();
        if (data?.length) {
            const target = normalize(city);
            const best = (target && data.find(item => { const a = item.address || {}; return (normalize(a.city) || normalize(a.town) || normalize(a.village)) === target; })) || data[0];
            coords = { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
        }
    }
    catch {
        /* réseau indisponible : point par défaut */
    }
    const result = coords ?? { lat: 46.5, lng: 2.5 };
    geoCache.set(key, result);
    return result;
}

/** Itinéraire d'une tournée : ses dates et ses répétitions, dans l'ordre du calendrier. */
export function TourMap({ dates, rehearsals }: { dates: TourDate[]; rehearsals: RehearsalItem[] }) {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const places = byDate([
        ...dates.map(d => ({ date: d.date, place: { query: d.address?.trim() || [d.venue, d.city].filter(Boolean).join(", "), city: d.city, label: [d.organisateur, d.venue].filter(Boolean).join(" · ") || d.city || "Représentation", rehearsal: false } })),
        ...rehearsals.map(r => ({ date: r.date, place: { query: r.address?.trim() || [r.location, r.city].filter(Boolean).join(", "), city: r.city ?? "", label: r.label || "Répétition", rehearsal: true } })),
    ]).map(x => x.place);
    const key = JSON.stringify(places);

    useEffect(() => {
        const list: Place[] = JSON.parse(key);
        if (!hydrated || !containerRef.current || !list.length)
            return;
        let cancelled = false;
        (async () => {
            const points: (Coords & { label: string; rehearsal: boolean })[] = [];
            for (const p of list)
                points.push({ ...(await geocode(p.query, p.city)), label: p.label, rehearsal: p.rehearsal });
            const L = await import("leaflet");
            if (cancelled || !containerRef.current)
                return;
            const dot = (color: string) => L.divIcon({ className: "", html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px rgba(16,16,16,0.95),0 0 12px ${color};"></span>`, iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -10] });
            let map = mapRef.current;
            if (!map) {
                map = L.map(containerRef.current, { center: [46.5, 2.5], zoom: 5, scrollWheelZoom: false, attributionControl: false });
                // Tuiles OSM standard (sans clé), assombries par le filtre CSS du conteneur.
                L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map);
                mapRef.current = map;
            }
            const current = map;
            // Retirer marqueurs et tracé précédents, garder le fond de carte.
            current.eachLayer((layer: Layer) => { if (!(layer instanceof L.TileLayer)) current.removeLayer(layer); });
            const latlngs: [number, number][] = points.map(p => [p.lat, p.lng]);
            points.forEach((p, i) => L.marker(latlngs[i], { icon: dot(p.rehearsal ? REHEARSAL_COLOR : CONCERT_COLOR) }).addTo(current).bindPopup(p.label));
            if (latlngs.length === 1)
                current.setView(latlngs[0], 6);
            else
                current.fitBounds(L.polyline(latlngs, { color: CONCERT_COLOR, weight: 2, opacity: 0.7, dashArray: "1 6" }).addTo(current).getBounds().pad(0.3));
        })();
        return () => { cancelled = true; };
    }, [hydrated, key]);

    useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

    if (!places.length)
        return <p className="text-sm text-[#F5F5F5]/50">Ajoute des dates à la tournée pour tracer son itinéraire.</p>;
    return <div>
    <div className="mb-3 flex justify-end gap-4 text-[11px] text-[#F5F5F5]/55">
    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CONCERT_COLOR }}/>Concert</span>
    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: REHEARSAL_COLOR }}/>Répétition</span>
    </div>
    <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-lg border border-[rgba(245,245,245,0.08)] bg-[#101010] [&_.leaflet-container]:bg-[#101010] [&_.leaflet-tile-pane]:[filter:invert(1)_hue-rotate(180deg)_brightness(0.75)_contrast(0.95)_grayscale(0.6)]"/>
    </div>;
}
```

- [ ] **Step 2: Point de contrôle**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

---

### Task 8: Page `/live`, routes, sidebar, suppression des anciennes pages

**Files:**
- Create: `src/modules/live/components/LiveHomePage.tsx`
- Modify: `app/(app)/live/page.tsx`, `app/(app)/live/spectacles/page.tsx`
- Modify: `src/components/layout/Sidebar.tsx:48-49`
- Modify: `src/modules/live/components/RehearsalsPage.tsx:42`, `src/modules/live/components/TourDatesPage.tsx:35`
- Delete: `src/modules/live/components/LiveOverviewPage.tsx`, `src/modules/live/components/ProductionsPage.tsx`

- [ ] **Step 1: Écrire `LiveHomePage.tsx`**

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { CalendarClock, Disc3, Mic2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageError } from "@/components/ui/page-error";
import { PageLoader } from "@/components/ui/page-loader";
import { useLiveData } from "@/hooks/useLiveData";
import { STATUS_META } from "../data/statusMeta";
import { KIND_META, todayISO } from "../lib/live-model";
import { isUpcoming, linkIssues, nextUp, relativeDay, showsOf } from "../lib/live-links";
import type { ProgressContext } from "../lib/live-progress";
import { Jump, LiveHeader, Segments, WriteError } from "./shared/LiveUI";
import { OrphanZone } from "./spectacles/OrphanZone";
import { ShowCard } from "./spectacles/ShowCard";

/** Tour de contrôle Live : chaque spectacle / DJ set, ses tournées, ce qui arrive. */
export function LiveHomePage() {
    const live = useLiveData();
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    if (live.loading)
        return <PageLoader />;
    // Les cartes croisent les quatre tranches : sans l'une d'elles, elles
    // afficheraient une progression fausse plutôt qu'une absence.
    const loadError = live.sliceError("productions", "tourDates", "rehearsals", "prospection");
    if (loadError)
        return <PageError title="Impossible de charger tes spectacles" description={loadError} onRetry={() => mutate("user_live")}/>;
    const today = todayISO();
    const ctx: ProgressContext = { tourDates: live.tourDates, rehearsals: live.rehearsals, prospection: live.prospection, today };
    const shows = showsOf(live.productions);
    const shown = shows.filter(p => (filter === "all" || p.kind === filter) && p.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    const upcomingDates = live.tourDates.filter(d => isUpcoming(d.date, today));
    const pending = upcomingDates.filter(d => d.status === "En option").length;
    const next = nextUp(live.tourDates, live.rehearsals, today);
    return <div>
    <LiveHeader title="Spectacles & tournées" description="Tes lives, les tournées qui les emmènent, et tout ce qui les fait avancer." actions={<>
        <Button asChild variant="outline"><Link href="/live/spectacles/nouveau?kind=dj"><Disc3 size={14} className="mr-2"/>DJ set</Link></Button>
        <Button asChild><Link href="/live/spectacles/nouveau?kind=show"><Plus size={14} className="mr-2"/>Spectacle</Link></Button>
        </>}/>
    <WriteError message={live.error}/>
    <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-[#F5F5F5]/[.08] bg-[rgba(44,44,46,.45)] px-5 py-4">
    <div className="flex min-w-0 items-center gap-3">
    <CalendarClock size={18} className="shrink-0 text-[#F0FF00]"/>
        {next ? <Link href={next.href} className="min-w-0 hover:text-[#F0FF00]">
        <p className="text-[10px] uppercase tracking-[.14em] text-[#F5F5F5]/45">Prochaine échéance · {relativeDay(next.date, today)}</p>
        <p className="truncate text-sm font-medium">{next.kind === "rehearsal" ? "Répétition" : "Date"} · {next.title}</p>
        </Link> : <p className="text-sm text-[#F5F5F5]/55">Rien de prévu pour le moment</p>}
    </div>
    <div className="ml-auto flex flex-wrap gap-6 text-xs text-[#F5F5F5]/55">
    <Link href="/live/representations" className="hover:text-[#F5F5F5]"><span className="mr-1.5 text-lg font-light tabular-nums text-[#F5F5F5]">{upcomingDates.length}</span>{upcomingDates.length > 1 ? "dates à venir" : "date à venir"}</Link>
        {pending > 0 && <Link href={`/live/representations?status=${encodeURIComponent("En option")}`} className="hover:text-[#F5F5F5]"><span className="mr-1.5 text-lg font-light tabular-nums" style={{ color: STATUS_META["En option"].color }}>{pending}</span>encore en option</Link>}
    </div>
    </div>
    <OrphanZone issues={linkIssues(live.productions, live.tourDates, live.rehearsals, today)}/>
        {!shows.length ? <div>
        <EmptyState icon={Mic2} title="Ton prochain live commence ici" description="Crée un spectacle ou un DJ set. Tu pourras ensuite l’emmener en tournée, planifier ses répétitions et démarcher des lieux."/>
        <div className="flex justify-center"><Jump href="/live/representations/nouvelle">Ajouter une date</Jump><Jump href="/live/repetitions/nouvelle">Planifier une répétition</Jump></div>
        </div> : <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <Segments value={filter} onChange={setFilter} items={[{ id: "all", label: "Tout", count: shows.length }, { id: "show", label: KIND_META.show.plural, count: shows.filter(p => p.kind === "show").length }, { id: "dj", label: KIND_META.dj.plural, count: shows.filter(p => p.kind === "dj").length }]}/>
        <div className="w-full max-w-52">
        <Input aria-label="Rechercher un spectacle ou un DJ set" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        </div>
            {shown.length ? <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {shown.map(show => <ShowCard key={show.id} show={show} productions={live.productions} ctx={ctx}/>)}
            </div> : <EmptyState icon={Mic2} title="Aucun résultat" description="Essaie un autre nom ou un autre filtre."/>}
        </>}
    </div>;
}
```

- [ ] **Step 2: Brancher les routes**

`app/(app)/live/page.tsx` :

```tsx
import { LiveHomePage } from "@/modules/live/components/LiveHomePage";

export default function LivePage() {
  return <LiveHomePage />;
}
```

`app/(app)/live/spectacles/page.tsx` (l'ancienne liste ; les fiches `[id]` et `nouveau` restent) :

```tsx
import { redirect } from "next/navigation";

/** La liste des spectacles est devenue la page /live. */
export default function Page() {
    redirect("/live");
}
```

- [ ] **Step 3: Sidebar**

Dans `src/components/layout/Sidebar.tsx`, remplacer les deux lignes :

```ts
      { href: "/live", label: "Vue d'ensemble" },
      { href: "/live/spectacles", label: "Spectacles & tournées" },
```

par :

```ts
      { href: "/live", label: "Spectacles & tournées" },
```

- [ ] **Step 4: Repointer les liens vers l'ancienne liste**

`RehearsalsPage.tsx:42` : `href="/live/spectacles"` → `href="/live"`.
`TourDatesPage.tsx:35` : `href="/live/spectacles"` → `href="/live"`.

Puis vérifier qu'il n'en reste aucun :

Run: `grep -rn '"/live/spectacles"' src app`
Expected: aucune ligne (les liens vers `/live/spectacles/${id}` et `/live/spectacles/nouveau` restent, ils ne correspondent pas au motif exact).

- [ ] **Step 5: Supprimer les anciennes pages**

Run: `rm src/modules/live/components/LiveOverviewPage.tsx src/modules/live/components/ProductionsPage.tsx`

Puis : `grep -rn "LiveOverviewPage\|ProductionsPage" src app`
Expected: aucune ligne.

- [ ] **Step 6: Point de contrôle**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

---

### Task 9: Fiches spectacle et tournée

**Files:**
- Create: `src/modules/live/components/spectacles/TourSections.tsx`
- Rewrite: `src/modules/live/components/ProductionEditPage.tsx`

- [ ] **Step 1: Écrire `TourSections.tsx`**

```tsx
import Link from "next/link";
import { CalendarDays, Map as MapIcon, Mic2, Plus, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUS_META } from "../../data/statusMeta";
import { dateISO, type LiveProduction } from "../../lib/live-model";
import { byDate, inTour, isUpcoming, plural, prospectsOf } from "../../lib/live-links";
import type { ProgressContext } from "../../lib/live-progress";
import { Panel } from "../shared/LiveUI";
import { StatusSplit } from "./StatusSplit";
import { TourMap } from "./TourMap";

export function EventLine({ href, title, date, tag, tagColor }: { href: string; title: string; date: string; tag?: string; tagColor?: string }) {
    return <Link href={href} className="flex items-center justify-between gap-3 rounded-lg bg-[#101010]/40 p-3 text-sm hover:text-[#F0FF00]">
    <span className="min-w-0 truncate">{title}</span>
    <span className="flex shrink-0 items-center gap-3 text-xs text-[#F5F5F5]/50">
    {tag && <span style={{ color: tagColor }}>{tag}</span>}
    {date}
    </span>
    </Link>;
}

/** Le corps d'une fiche de tournée : la campagne lue en entier. */
export function TourSections({ tour, ctx }: { tour: LiveProduction; ctx: ProgressContext }) {
    const dates = byDate(inTour(tour.id, ctx.tourDates));
    const rehearsals = byDate(inTour(tour.id, ctx.rehearsals));
    const prospects = prospectsOf(tour.id, ctx.prospection);
    const firstUpcoming = dates.find(d => isUpcoming(d.date, ctx.today));
    const warmup = firstUpcoming ? rehearsals.filter(r => isUpcoming(r.date, ctx.today) && dateISO(r.date) <= dateISO(firstUpcoming.date)) : [];
    const byStatus = Object.entries(prospects.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }), {}));
    const query = `productionId=${tour.productionId ?? ""}&tourId=${tour.id}`;
    const add = (href: string, label: string) => <Button asChild size="xs" variant="secondary"><Link href={href}><Plus size={12} className="mr-1"/>{label}</Link></Button>;
    return <>
    <Panel title="Dates" icon={CalendarDays} description={dates.length ? plural(dates.length, "date") : undefined} action={add(`/live/representations/nouvelle?${query}`, "Ajouter une date")}>
    <div className="space-y-2">
    <StatusSplit dates={dates.filter(d => isUpcoming(d.date, ctx.today))}/>
    {dates.map(d => <EventLine key={d.id} href={`/live/representations/${d.id}`} title={[d.venue || "Lieu à préciser", d.city].filter(Boolean).join(" · ")} date={d.date} tag={d.status} tagColor={STATUS_META[d.status].color}/>)}
    {!dates.length && <p className="text-sm text-[#F5F5F5]/50">Aucune date pour l’instant.</p>}
    </div>
    </Panel>
    <Panel title="Répétitions de la tournée" icon={Mic2} color="#38BDF8" description="Résidence, filage avant le départ, raccords." action={add(`/live/repetitions/nouvelle?${query}`, "Planifier une répétition")}>
    <div className="space-y-2">
    {firstUpcoming && !warmup.length && <p className="rounded-lg border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-xs text-amber-200">Aucune répétition prévue avant la première date ({firstUpcoming.date}).</p>}
    {firstUpcoming && warmup.length > 0 && <p className="text-xs text-[#F5F5F5]/55">{plural(warmup.length, "répétition prévue", "répétitions prévues")} avant la première date.</p>}
    {rehearsals.map(r => <EventLine key={r.id} href={`/live/repetitions/${r.id}`} title={[r.label || "Répétition", r.location || r.city].filter(Boolean).join(" · ")} date={r.date}/>)}
    {!rehearsals.length && <p className="text-sm text-[#F5F5F5]/50">Aucune répétition rattachée à cette tournée.</p>}
    </div>
    </Panel>
    <Panel title="Prospection" icon={Radar} color="#FB923C" description={prospects.length ? plural(prospects.length, "lieu démarché", "lieux démarchés") : undefined} action={add(`/live/prospection?tourId=${tour.id}`, "Démarcher un lieu")}>
    <div className="space-y-3">
    {byStatus.length > 0 && <div className="flex flex-wrap gap-2 text-xs">
        {byStatus.map(([status, count]) => <span key={status} className="rounded-md bg-[#F5F5F5]/[.06] px-2 py-1"><span className="tabular-nums text-[#F5F5F5]">{count}</span> <span className="text-[#F5F5F5]/55">{status}</span></span>)}
    </div>}
    {prospects.map(p => <Link key={p.id} href={`/live/prospection?tourId=${tour.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-[#101010]/40 p-3 text-sm hover:text-[#F0FF00]">
        <span className="min-w-0 truncate">{[p.venueName, p.city].filter(Boolean).join(" · ")}</span>
        <span className="shrink-0 text-xs text-[#F5F5F5]/50">{p.status}</span>
        </Link>)}
    {!prospects.length && <p className="text-sm text-[#F5F5F5]/50">Aucun lieu démarché pour cette tournée.</p>}
    </div>
    </Panel>
    <Panel title="Itinéraire" icon={MapIcon} color="#38BDF8">
    <TourMap dates={dates} rehearsals={rehearsals}/>
    </Panel>
    </>;
}
```

- [ ] **Step 2: Réécrire `ProductionEditPage.tsx`**

Remplacer tout le fichier par :

```tsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ClipboardCheck, FileDown, Mic2, Plus, Route, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useLiveData } from "@/hooks/useLiveData";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { KIND_META, newProduction, todayISO, type LiveKind, type LiveProduction } from "../lib/live-model";
import { byDate, looseDatesOf, showsOf, toursOf } from "../lib/live-links";
import { productionProgress, withStep, type ProgressContext } from "../lib/live-progress";
import { LiveHeader, Panel, TextField, Choice } from "./shared/LiveUI";
import { ComputedPreparation } from "./shared/ComputedPreparation";
import { SetlistEditor } from "./shared/SetlistEditor";
import { TechnicalEditor } from "./shared/TechnicalEditor";
import { EquipmentPicker } from "./shared/EquipmentPicker";
import { TourRow } from "./spectacles/TourRow";
import { EventLine, TourSections } from "./spectacles/TourSections";
import { exportLivePDF, technicalSections } from "../lib/live-pdf";
export function ProductionEditPage({ id }: {
    id: string | null;
}) {
    const data = useLiveData();
    const { projects, loading: projectsLoading } = useProjectsData();
    const query = useSearchParams();
    const [blank] = useState(() => newProduction());
    if (data.loading || projectsLoading)
        return <PageLoader />;
    const existing = data.productions.find(p => p.id === id);
    // Même précaution que sur la fiche événement : distinguer « pas chargé » de
    // « supprimé », sinon la panne d'une table se lit comme une disparition.
    const loadError = data.sliceError("productions");
    if (loadError)
        return <PageError title="Impossible de charger Live" description={loadError} onRetry={() => mutate("user_live")}/>;
    if (id && !existing)
        return <PageError title="Spectacle introuvable" description="Ce spectacle a peut-être été supprimé." onRetry={() => mutate("user_live")}/>;
    const project = projects.find(p => p.id === query.get("projectId"));
    const rawKind = query.get("kind");
    const kind: LiveKind = rawKind === "dj" || rawKind === "tour" ? rawKind : "show";
    // Une tournée se monte depuis un spectacle : il arrive pré-rempli.
    const parent = kind === "tour" ? data.productions.find(p => p.id === query.get("productionId") && p.kind !== "tour") : undefined;
    const initial = existing ?? { ...blank, kind, title: project?.title ?? "", description: project?.description ?? "", projectId: project?.id, productionId: parent?.id, preparation: project ? { concept: project.manualMilestones.liveConceptDone ? "done" as const : "todo" as const, setlist: project.manualMilestones.liveSetlistDone ? "done" as const : "todo" as const, team: project.manualMilestones.liveTeamDone ? "done" as const : "todo" as const } : {} };
    return <ProductionForm key={id ?? "new"} initial={initial} isNew={!id}/>;
}
function ProductionForm({ initial, isNew }: {
    initial: LiveProduction;
    isNew: boolean;
}) {
    const router = useRouter();
    const { productions, setProductions, tourDates, rehearsals, prospection, error } = useLiveData();
    const [form, setForm] = useState(initial);
    const [baseline, setBaseline] = useState(JSON.stringify(initial));
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [created, setCreated] = useState(!isNew);
    const dirty = JSON.stringify(form) !== baseline;
    useUnsavedChangesGuard(dirty);
    const patch = (value: Partial<LiveProduction>) => setForm(prev => ({ ...prev, ...value }));
    const meta = KIND_META[form.kind];
    const isTour = form.kind === "tour";
    const show = isTour ? productions.find(p => p.id === form.productionId && p.kind !== "tour") : undefined;
    const ctx: ProgressContext = { tourDates, rehearsals, prospection, today: todayISO() };
    const summary = productionProgress(form, ctx);
    const save = async () => { if (!form.title.trim()) {
        toast.error("Donne un nom à ton live.");
        return;
    } if (isTour && !form.productionId) {
        toast.error("Choisis le spectacle ou le DJ set que cette tournée emmène.");
        return;
    } if (form.setlist.some(t => !t.title.trim() || (t.duration && !/^\d+(:[0-5]\d)?$/.test(t.duration)))) {
        toast.error("Chaque morceau doit avoir un titre et une durée au format 3:30, si renseignée.");
        return;
    } setSaving(true); const next = { ...form, title: form.title.trim() }; const ok = await setProductions(prev => prev.some(p => p.id === form.id) ? prev.map(p => p.id === form.id ? next : p) : [...prev, next]); setSaving(false); if (ok) {
        setForm(next);
        setBaseline(JSON.stringify(next));
        setCreated(true);
        toast.success(isTour ? "Tournée enregistrée" : "Live enregistré");
        router.replace(`/live/spectacles/${form.id}`);
    } };
    const linked = (d: { details?: { productionId?: string; tourId?: string } }) => d.details?.productionId === form.id || d.details?.tourId === form.id;
    const used = tourDates.filter(linked).length + rehearsals.filter(linked).length + productions.filter(p => p.productionId === form.id).length + prospection.filter(p => p.tourId === form.id).length;
    const remove = async () => { setSaving(true); if (await setProductions(prev => prev.filter(p => p.id !== form.id))) {
        setBaseline(JSON.stringify(form));
        router.push("/live");
    } setSaving(false); };
    const tours = toursOf(form.id, productions);
    const loose = byDate(looseDatesOf(form.id, tourDates));
    return <div>
    <LiveHeader title={form.title || (form.kind === "dj" ? "Nouveau DJ set" : isTour ? "Nouvelle tournée" : "Nouveau spectacle")} eyebrow={`LIVE / ${meta.label}`} back="/live" description={isTour && show ? `Tournée de « ${show.title} »` : undefined} actions={<><Button variant="outline" onClick={() => void exportLivePDF(`Fiche technique — ${form.title || "Live"}`, meta.label, technicalSections(form.technical))}><FileDown size={14} className="mr-2"/>Fiche technique PDF</Button><Button disabled={saving} onClick={() => void save()}>
        <Save size={14} className="mr-2"/>
        {saving ? "Enregistrement…" : "Enregistrer"}
        </Button></>}/>
        {error && <p role="alert" className="mb-4 text-sm text-rose-300">
        {error}
        </p>}
    <fieldset disabled={saving} className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
    <div className="space-y-5">
    <Panel title={isTour ? "La tournée" : "Identité du live"} icon={isTour ? Route : Mic2} color={meta.color}>
    <div className="space-y-4">
    <TextField label="Nom" value={form.title} onChange={title => patch({ title })} placeholder={form.kind === "dj" ? "Club session, autumn set" : isTour ? "Tournée d’automne 2026" : "Le nom de ton spectacle"} required/>
    {isTour && (created && show
        ? <div className="space-y-2">
        <p className="text-xs text-[#F5F5F5]/65">Spectacle ou DJ set de la tournée</p>
        <Link href={`/live/spectacles/${show.id}`} className="text-sm text-[#F0FF00] hover:underline">{show.title}</Link>
        </div>
        : <Choice label="Spectacle ou DJ set de la tournée *" value={form.productionId} placeholder="Choisir le live à emmener" onChange={productionId => patch({ productionId: productionId || undefined })} options={showsOf(productions).map(p => ({ value: p.id, label: p.title }))}/>)}
    <TextField label={form.kind === "dj" ? "Ambiance & intention musicale" : isTour ? "Intention de la tournée" : "Concept & intention"} value={form.description} onChange={description => patch({ description })} area/>
    </div>
    </Panel>
    {isTour && created && <TourSections tour={form} ctx={ctx}/>}
    {!isTour && <SetlistEditor value={form.setlist} onChange={setlist => patch({ setlist })} dj={form.kind === "dj"}/>}
    <EquipmentPicker listIds={form.equipmentListIds} onChange={equipmentListIds => patch({ equipmentListIds })}/>
    <TechnicalEditor value={form.technical} onChange={technical => patch({ technical })}/>
        {created && !isTour && <><Panel title="Tournées" icon={Route} color="#38BDF8" action={<Button asChild size="xs" variant="secondary">
            <Link href={`/live/spectacles/nouveau?kind=tour&productionId=${form.id}`}><Plus size={12} className="mr-1"/>Monter une tournée</Link>
            </Button>}>
        <div className="space-y-2">
            {tours.map(t => <TourRow key={t.id} tour={t} ctx={ctx}/>)}
            {!tours.length && <p className="text-sm text-[#F5F5F5]/50">Pas encore de tournée. Monte-en une quand ce live est prêt à prendre la route.</p>}
        </div>
        </Panel><Panel title="Dates hors tournée" icon={CalendarDays} action={<Button asChild size="xs" variant="secondary">
            <Link href={`/live/representations/nouvelle?productionId=${form.id}`}><Plus size={12} className="mr-1"/>Ajouter une date</Link>
            </Button>}>
        <div className="space-y-2">
            {loose.map(d => <EventLine key={d.id} href={`/live/representations/${d.id}`} title={[d.venue || "Lieu à préciser", d.city].filter(Boolean).join(" · ")} date={d.date}/>)}
            {!loose.length && <p className="text-sm text-[#F5F5F5]/50">Aucune date isolée pour l’instant.</p>}
        </div>
        </Panel></>}
    </div>
    <aside className="space-y-4 xl:sticky xl:top-6">
    <Panel title="Préparation" icon={ClipboardCheck} color={meta.color}>
    <ComputedPreparation summary={summary} color={meta.color} onChange={(stepId, state) => patch({ preparation: withStep(form.preparation, stepId, state) })}/>
    </Panel>
        {created && !isTour && <Button asChild variant="secondary" className="w-full">
        <Link href={`/live/repetitions/nouvelle?productionId=${form.id}`}>Travailler cette setlist</Link>
        </Button>}
    <p className="px-1 text-xs text-[#F5F5F5]/45">
    {dirty ? "Modifications non enregistrées" : "Toutes les modifications sont enregistrées"}
    </p>
    {created && <Button variant="ghost" size="sm" className="text-rose-300" onClick={() => setDeleting(true)}><Trash2 size={13} className="mr-2"/>Supprimer</Button>}
    </aside>
    </fieldset>
    <Dialog open={deleting} onOpenChange={setDeleting}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Supprimer « {form.title} » ?</DialogTitle>
    <DialogDescription>
    {used ? `${isTour ? "Cette tournée" : "Ce live"} est encore utilisé. Détache-le des dates, répétitions, tournées ou lieux démarchés avant de le supprimer.` : "La setlist et la fiche technique seront supprimées."}
    </DialogDescription>
    </DialogHeader>
    <DialogFooter>
    <Button variant="outline" onClick={() => setDeleting(false)}>Annuler</Button>
    <Button variant="destructive" disabled={!!used || saving} onClick={() => void remove()}>Supprimer</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    </div>;
}
```

Différences avec l'ancienne version, à vérifier en relisant : le `Choice` de spectacle n'est plus `optional` et n'est modifiable que tant que la tournée n'a pas de spectacle valide ; la section « Dates associées » est remplacée par « Tournées » + « Dates hors tournée » pour un spectacle et par `TourSections` pour une tournée ; `Preparation` est remplacé par `ComputedPreparation` ; retour et suppression mènent à `/live` ; le décompte `used` inclut les lieux démarchés.

- [ ] **Step 3: Point de contrôle**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

---

### Task 10: Cascade Spectacle → Tournée dans le formulaire événement

**Files:**
- Modify: `src/modules/live/components/EventEditPage.tsx:21` (imports), `:63-64` (pré-remplissage), `:98-110` (`applyShow` / `applyTour`), `:111-116` (validation), `:185-186` (choix), `:271-273` (aperçu)

- [ ] **Step 1: Imports**

Après la ligne d'import de `../lib/live-model`, ajouter :

```ts
import { showsOf, tourOptions } from "../lib/live-links";
```

- [ ] **Step 2: Pré-remplissage : la tournée décide du spectacle**

Remplacer la ligne 64 :

```ts
    const show = live.productions.find(p => p.id === (params.get("productionId") || tour?.productionId));
```

par :

```ts
    // Une tournée n'emmène qu'un spectacle : s'il y a une tournée, c'est le sien.
    const show = live.productions.find(p => p.id === (tour?.productionId || params.get("productionId")));
```

- [ ] **Step 3: Remplacer `applyShow` et `applyTour` (lignes 100-110)**

```ts
    const tour = live.productions.find(t => t.id === form.details.tourId);
    const applyShow = (id: string) => {
        const p = live.productions.find(x => x.id === id);
        if (id && form.details.setlist?.length && id !== form.details.productionId && !window.confirm("Remplacer la setlist de cet événement par celle du spectacle ?"))
            return;
        details({
            productionId: id || undefined,
            // Une tournée appartient à un seul spectacle : en changer l'en détache.
            ...(tour && tour.productionId !== id ? { tourId: undefined } : {}),
            ...(p ? { setlist: p.setlist.map(t => ({ ...t })), technical: { ...p.technical }, equipmentListIds: [...new Set([...(form.details.equipmentListIds ?? []), ...p.equipmentListIds])] } : {}),
        });
    };
    const applyTour = (id: string) => {
        const next = live.productions.find(p => p.id === id);
        const show = next ? live.productions.find(p => p.id === next.productionId) : undefined;
        // Choisir une tournée impose son spectacle, même si un autre était choisi.
        const switching = show && show.id !== form.details.productionId ? show : undefined;
        if (switching && form.details.setlist?.length && !window.confirm(`Cette tournée emmène « ${switching.title} ». Remplacer la setlist de cet événement par celle de ce spectacle ?`))
            return;
        details({
            tourId: id || undefined,
            ...(switching ? { productionId: switching.id, setlist: switching.setlist.map(t => ({ ...t })), technical: { ...switching.technical } } : {}),
            equipmentListIds: [...new Set([...(form.details.equipmentListIds ?? []), ...(next?.equipmentListIds ?? []), ...(switching?.equipmentListIds ?? [])])],
        });
    };
```

Et simplifier la ligne 99 (`linkedProjects`) qui recalculait la tournée : remplacer `live.productions.find(t => t.id === form.details.tourId)?.projectId` par `tour?.projectId`. Comme `tour` est désormais déclaré après `linkedProjects`, **déplacer la déclaration `const tour = …` juste après `const production = …` (ligne 98)**, avant `linkedProjects`.

- [ ] **Step 4: Une représentation joue un spectacle**

Dans `save`, juste après le bloc qui vérifie le titre et la date (après son `return;` et sa `}`), ajouter :

```ts
        if (!rehearsal && !form.details.productionId) {
            toast.error("Choisis le spectacle ou le DJ set joué à cette date.");
            setTab("essential");
            return;
        }
```

- [ ] **Step 5: Les deux choix (lignes 185-186)**

Remplacer :

```tsx
        <Choice label="Spectacle / DJ set" value={form.details.productionId} optional onChange={applyShow} options={live.productions.filter(p => p.kind !== "tour").map(p => ({ value: p.id, label: p.title }))}/>
        {!rehearsal && <Choice label="Tournée" value={form.details.tourId} optional onChange={applyTour} options={live.productions.filter(p => p.kind === "tour").map(p => ({ value: p.id, label: p.title }))}/>}
```

par :

```tsx
        <Choice label={rehearsal ? "Spectacle / DJ set" : "Spectacle / DJ set *"} value={form.details.productionId} optional={rehearsal} placeholder="Choisir le live joué" onChange={applyShow} options={showsOf(live.productions).map(p => ({ value: p.id, label: p.title }))}/>
        <Choice label="Tournée" value={form.details.tourId} optional noneLabel="Hors tournée" onChange={applyTour} options={tourOptions(live.productions, form.details.productionId)}/>
```

- [ ] **Step 6: La tournée dans l'aperçu**

Dans le panneau « En un coup d’œil », juste après le lien `{production && <Link …>{production.title}</Link>}`, ajouter :

```tsx
        {tour && <Link href={`/live/spectacles/${tour.id}`} className="block text-[#38BDF8] hover:underline">
        {tour.title}
        </Link>}
```

- [ ] **Step 7: Point de contrôle**

Run: `npx tsc --noEmit`
Expected: aucune erreur. Une erreur « `tour` utilisé avant sa déclaration » signifie que l'étape 3 n'a pas déplacé la déclaration.

---

### Task 11: Filtres de tournée (Représentations, Répétitions) et prospection rattachée

**Files:**
- Modify: `src/modules/live/components/TourDatesPage.tsx`
- Modify: `src/modules/live/components/RehearsalsPage.tsx`
- Modify: `src/modules/live/components/ProspectionPage.tsx`

- [ ] **Step 1: Représentations : filtres Spectacle et Tournée**

Dans `TourDatesPage.tsx`, ajouter l'import :

```ts
import { showsOf, tourOptions } from "../lib/live-links";
```

Remplacer `const [tour, setTour] = useState("");` par :

```ts
    // `tourId=hors` : les dates jouées hors tournée (lien « Hors tournée » d'une carte).
    const [tour, setTour] = useState(params.get("tourId") ?? "");
    const [show, setShow] = useState(params.get("productionId") ?? "");
```

Dans le calcul de `shown`, remplacer `(!tour || d.details?.tourId === tour)` par :

```ts
(!show || d.details?.productionId === show) && (!tour || (tour === "hors" ? !d.details?.tourId : d.details?.tourId === tour))
```

Remplacer le bloc de filtres (grille + deux `Choice`) :

```tsx
    <div className="my-5 grid items-end gap-3 md:grid-cols-[1fr_220px_180px]">
    <Input aria-label="Rechercher une date" placeholder="Rechercher un lieu, une ville…" value={search} onChange={e => setSearch(e.target.value)}/>
    <Choice label="Tournée" optional value={tour} onChange={setTour} options={productions.filter(p => p.kind === "tour").map(p => ({ value: p.id, label: p.title }))}/>
    <Choice label="Statut" optional value={status} onChange={setStatus} options={Object.keys(STATUS_META).map(value => ({ value, label: value }))}/>
    </div>
```

par :

```tsx
    <div className="my-5 grid items-end gap-3 md:grid-cols-[1fr_200px_220px_160px]">
    <Input aria-label="Rechercher une date" placeholder="Rechercher un lieu, une ville…" value={search} onChange={e => setSearch(e.target.value)}/>
    <Choice label="Spectacle" optional noneLabel="Tous" value={show} onChange={v => { setShow(v); setTour(""); }} options={showsOf(productions).map(p => ({ value: p.id, label: p.title }))}/>
    <Choice label="Tournée" optional noneLabel="Toutes" value={tour} onChange={setTour} options={[{ value: "hors", label: "Hors tournée" }, ...tourOptions(productions, show || undefined)]}/>
    <Choice label="Statut" optional noneLabel="Tous" value={status} onChange={setStatus} options={Object.keys(STATUS_META).map(value => ({ value, label: value }))}/>
    </div>
```

- [ ] **Step 2: Répétitions : filtre Tournée et « Spectacle · Tournée »**

Dans `RehearsalsPage.tsx`, compléter les imports :

```ts
import { tourOptions } from "../lib/live-links";
import { Choice, LiveHeader, Segments, WriteError } from "./shared/LiveUI";
```

(la seconde remplace l'import existant de `./shared/LiveUI`). Après `const [search, setSearch] = useState("");` — attention, `params` est déclaré après : **déplacer `const params = useSearchParams();` avant les `useState`**, puis ajouter :

```ts
    const [tour, setTour] = useState(params.get("tourId") ?? "");
```

Dans le calcul de `shown`, ajouter la condition `&& (!tour || r.details?.tourId === tour)` à côté du filtre de recherche.

Remplacer la barre Segments + recherche :

```tsx
    <div className="mb-5 flex items-center justify-between gap-4">
    <Segments value={period} onChange={setPeriod} items={[{ id: "upcoming", label: "À venir", count: upcoming.length }, { id: "past", label: "Passées", count: rehearsals.length - upcoming.length }]}/>
    <Input aria-label="Rechercher une répétition" className="max-w-60" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}/>
    </div>
```

par :

```tsx
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
    <Segments value={period} onChange={setPeriod} items={[{ id: "upcoming", label: "À venir", count: upcoming.length }, { id: "past", label: "Passées", count: rehearsals.length - upcoming.length }]}/>
    <div className="flex flex-wrap items-end gap-3">
    <div className="w-56"><Choice label="Tournée" optional noneLabel="Toutes" value={tour} onChange={setTour} options={tourOptions(productions)}/></div>
    <div className="w-60"><Input aria-label="Rechercher une répétition" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}/></div>
    </div>
    </div>
```

Dans la carte d'une répétition, après `const show = productions.find(...)`, ajouter :

```ts
            const inTour = productions.find(p => p.id === r.details?.tourId);
```

et remplacer `{show ? ` · ${show.title}` : ""}` par :

```tsx
            {show ? ` · ${show.title}` : ""}
            {inTour ? ` · ${inTour.title}` : ""}
```

- [ ] **Step 3: Prospection : champ et filtre Tournée**

Dans `ProspectionPage.tsx` :

Imports — ajouter :

```ts
import { useSearchParams } from "next/navigation";
import { tourOptions } from "../lib/live-links";
```

Constantes — sous `const STATUS_FILTER_ALL = "__all__";` :

```ts
const TOUR_FILTER_ALL = "__all__";
```

`emptyForm` — ajouter en dernier champ :

```ts
  tourId: "",
```

Dans `ProspectionPage()` : ajouter `productions` à la déstructuration de `useLiveData()`, et après `const [statusFilter, …]` :

```ts
  const params = useSearchParams();
  // Arrivée depuis une fiche de tournée : la liste s'ouvre sur ses lieux.
  const [tourFilter, setTourFilter] = useState<string>(params.get("tourId") ?? TOUR_FILTER_ALL);
```

`startCreate` — une entrée créée sous un filtre de tournée y est rattachée :

```ts
  const startCreate = () => {
    setEditingId("new");
    setForm({ ...emptyForm, tourId: tourFilter === TOUR_FILTER_ALL ? "" : tourFilter });
  };
```

`startEdit` — ajouter au `setForm({...})` : `tourId: entry.tourId ?? "",`

`saveEntry` — dans l'objet de création (après `lastContact: undefined,`) et dans celui de modification (après `reliabilityTier: form.reliabilityTier,`) :

```ts
          tourId: form.tourId || undefined,
```

Filtrage — remplacer la déclaration de `filteredByStatus` par :

```ts
  const filteredByTour = tourFilter === TOUR_FILTER_ALL ? activeEntries : activeEntries.filter((entry) => entry.tourId === tourFilter);

  const filteredByStatus =
    statusFilter === STATUS_FILTER_ALL
      ? filteredByTour
      : filteredByTour.filter((entry) => normalizeText(computeDisplayStatus({ status: entry.status, lastContact: entry.computedLastContact })) === normalizeText(statusFilter));
```

et, près de `importableContacts` :

```ts
  const tourChoices = tourOptions(productions);
```

Barre d'outils — après le `Select` de statut, dans le même conteneur :

```tsx
              {tourChoices.length > 0 && (
                <Select value={tourFilter} onValueChange={setTourFilter}>
                  <SelectTrigger className="h-7 w-full text-xs sm:w-[200px]">
                    <SelectValue placeholder="Toutes les tournées" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TOUR_FILTER_ALL}>Toutes les tournées</SelectItem>
                    {tourChoices.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
```

(`SelectTrigger` reçoit déjà `h-7 w-full … sm:w-[170px]` dans ce fichier pour le filtre de statut : on suit le même usage local.)

`NoResult` — `hasFilters={statusFilter !== STATUS_FILTER_ALL || tourFilter !== TOUR_FILTER_ALL}` et `onReset={() => { setSearchTerm(""); setStatusFilter(STATUS_FILTER_ALL); setTourFilter(TOUR_FILTER_ALL); }}`.

Formulaire — dans la colonne « Lieu », juste après la grille `Nom du lieu` / `Ville` (après son `</div>` de fermeture), ajouter :

```tsx
                {tourChoices.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="tourId" className="text-xs text-[#F5F5F5]/55">Tournée</Label>
                    <Select value={form.tourId || "__none"} onValueChange={(v) => setForm((prev) => ({ ...prev, tourId: v === "__none" ? "" : v }))}>
                      <SelectTrigger id="tourId">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Hors tournée</SelectItem>
                        {tourChoices.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
```

- [ ] **Step 4: Point de contrôle**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

---

### Task 12: Vérification

**Files:** aucun fichier du dépôt ; un script de captures dans le scratchpad de la session.

- [ ] **Step 1: Types, lint, règles**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npx eslint src/modules/live src/hooks/useLiveData.ts src/components/layout/Sidebar.tsx "app/(app)/live" scripts/check-live-progress.ts`
Expected: aucune erreur. Si des avertissements apparaissent dans `ProspectionPage.tsx` ou `EventEditPage.tsx`, vérifier avec `git diff` que les lignes signalées font partie de nos modifications avant de les corriger : ces fichiers en portaient peut-être déjà.

Run: `npx --yes tsx scripts/check-live-progress.ts`
Expected: `✓ live-progress / live-links : toutes les règles tiennent`

- [ ] **Step 2: Build de production**

Run: `npm run build`
Expected: build réussi (c'est lui qui attrape un `useSearchParams` sans `Suspense` sur une page statique ; les autres pages Live l'utilisent déjà de la même façon).

- [ ] **Step 3: Captures connectées**

Lancer `npm run dev` en arrière-plan, puis un script Playwright écrit dans le scratchpad, sur le modèle de la connexion de `scripts/shots.mjs` (lignes 50-58 : `#email`, `#password`, `button[type="submit"]`, identifiants `SHOT_EMAIL` / `SHOT_PASSWORD` de `.env.local`). Capturer en 1440×900 :

1. `/live` : bandeau, pas de zone « À rattacher » si les données sont cohérentes, une carte par spectacle avec ses tournées en lignes.
2. La fiche d'une tournée existante : spectacle en lecture seule, sections Dates, Répétitions, Prospection, Itinéraire (attendre ~8 s pour les tuiles).
3. La fiche d'un spectacle : sections Tournées et Dates hors tournée, colonne Préparation avec étapes calculées et leurs indications.
4. `/live/spectacles/nouveau?kind=tour` : choix du spectacle obligatoire.
5. `/live/representations/nouvelle` : choisir un spectacle, puis ouvrir le choix Tournée et vérifier qu'il ne liste que ses tournées, précédées de « Hors tournée ».
6. `/live/spectacles` : redirige vers `/live`.

Lire chaque capture. **Ne rien enregistrer ni supprimer** avec ce compte : il porte les vraies données de l'utilisateur.

- [ ] **Step 4: Ce que les captures ne tranchent pas, à faire vérifier par l'utilisateur**

Lister pour l'utilisateur, sans les faire soi-même :
- créer une tournée depuis une carte, lui rattacher une date et une répétition, vérifier qu'elles apparaissent dans la fiche et que la progression bouge quand on coche le logement de la date ;
- forcer une étape, vérifier que l'indication « Marquée faite · … » reste, puis « Revenir au calcul » ;
- rattacher un lieu de prospection à la tournée, et vérifier qu'il apparaît dans sa fiche ;
- après ces essais, supprimer les données de test créées.

- [ ] **Step 5: Mettre à jour `ALPHA.md`**

Ajouter à la journée du lundi 21/09, dans la section d'avancement, un paragraphe sur la refonte Live (ce qui a changé, pour qui, et ce qui reste à vérifier à la main), et à la **recette de déploiement** l'étape :

> Appliquer `20260921100000_live_prospection_tour.sql` en production **avant** de déployer le front (`npx supabase db push --linked --dry-run`, puis sans `--dry-run`). Sans la colonne, toute écriture de prospection échoue.

Signaler aussi que la capture `public/images/landing/live.png` (générée par `scripts/shots.mjs` sur `/live`) montrait la carte de l'ancienne Vue d'ensemble : elle montrera désormais la nouvelle page. Ne pas la régénérer sans que l'utilisateur le demande.

- [ ] **Step 6: Rendre compte, sans commit**

Résumer à l'utilisateur ce qui est fait, ce qui a été vérifié et comment, ce qui reste à vérifier à la main (Step 4), et rappeler que rien n'est commité.
