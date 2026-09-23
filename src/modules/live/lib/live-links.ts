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
