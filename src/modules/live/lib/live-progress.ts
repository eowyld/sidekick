import type { ProspectionEntry, RehearsalItem } from "@/hooks/useLiveData";
import type { TourDate } from "../data/defaultRepresentations";
import { isChecked, productionSteps, type LiveProduction, type PreparationState } from "./live-model";
import { inTour, isUpcoming, plural, prospectsOf } from "./live-links";

/**
 * Progression d'un spectacle ou d'une tournée. Les étapes que les données
 * permettent d'établir se calculent ; les autres restent à cocher.
 *
 * Une étape est cochée si l'utilisateur l'a cochée (`preparation[id]`, voir
 * `isChecked`) ou, pour une étape calculée, si les données le constatent.
 * Une étape cochée par le calcul ne se décoche pas : elle reflète les données.
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

export type ProgressSummary = { steps: StepStatus[]; done: number; total: number; percent: number; next?: string; finished?: boolean };

export type ProgressContext = { tourDates: TourDate[]; rehearsals: RehearsalItem[]; prospection: ProspectionEntry[]; today: string };

type Verdict = { ok: boolean; blockers: Blocker[] };

const CONFIRMED = new Set(["Confirmée", "Signée", "Finalisée"]);
const verdict = (ok: boolean, blockers: Blocker[]): Verdict => ({ ok, blockers: ok ? [] : blockers });
const dateBlocker = (d: TourDate, what: string): Blocker => ({ label: `${d.venue || d.city || "Date"} (${d.date}) : ${what}`, href: `/live/representations/${d.id}` });

/** Une tournée dont toutes les dates sont passées : plus rien à recalculer, elle reste acquise. */
function isTourFinished(tour: LiveProduction, ctx: ProgressContext): boolean {
    const dates = inTour(tour.id, ctx.tourDates);
    return dates.length > 0 && dates.every(d => d.status === "Passée" || !isUpcoming(d.date, ctx.today));
}

function tourVerdicts(tour: LiveProduction, ctx: ProgressContext): Record<string, Verdict> {
    const upcoming = inTour(tour.id, ctx.tourDates).filter(d => d.status !== "Passée" && isUpcoming(d.date, ctx.today));
    const confirmed = upcoming.filter(d => CONFIRMED.has(d.status));
    const prospects = prospectsOf(tour.id, ctx.prospection);
    const noConfirmed: Blocker[] = confirmed.length ? [] : [{ label: "Aucune date confirmée" }];
    const missing = (keys: string[], what: string) => confirmed.filter(d => keys.some(k => !isChecked(d.details?.preparation?.[k]))).map(d => dateBlocker(d, what));
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
    const planned = ctx.rehearsals.some(r => r.details?.productionId === show.id);
    const sheet = show.technical;
    const hasPeople = (sheet?.people?.length ?? 0) > 0;
    const hasBrought = show.equipmentListIds.length > 0 || (sheet?.brought?.length ?? 0) > 0;
    const hasAnything = hasBrought || (sheet?.venue?.length ?? 0) > 0 || Object.values<string>(sheet?.details ?? {}).some(v => v.trim());
    return {
        setlist: verdict(show.setlist.length > 0, [{ label: "Setlist vide" }]),
        equipment: verdict(hasBrought, [{ label: "Aucun matériel apporté renseigné" }]),
        rehearsal: verdict(planned, [{ label: "Aucune répétition rattachée à ce live" }]),
        technical: verdict(hasPeople && hasAnything, [...(hasPeople ? [] : [{ label: "Équipe et contacts à renseigner" }]), ...(hasAnything ? [] : [{ label: "Matériel ou détails à renseigner" }])]),
    };
}

export function productionProgress(p: LiveProduction, ctx: ProgressContext): ProgressSummary {
    if (p.kind === "tour" && isTourFinished(p, ctx)) {
        const steps = productionSteps(p.kind).map(([id, label]): StepStatus => ({ id, label, manual: false, computed: true, blockers: [], stored: p.preparation?.[id], state: "done" }));
        return { steps, done: steps.length, total: steps.length, percent: 100, finished: true };
    }
    const verdicts = p.kind === "tour" ? tourVerdicts(p, ctx) : showVerdicts(p, ctx);
    const steps = productionSteps(p.kind).map(([id, label]): StepStatus => {
        const stored = p.preparation?.[id];
        const v = verdicts[id];
        if (!v)
            return { id, label, manual: true, computed: false, blockers: [], stored, state: isChecked(stored) ? "done" : "todo" };
        const state: PreparationState = isChecked(stored) || v.ok ? "done" : "todo";
        return { id, label, manual: false, computed: v.ok, blockers: v.blockers, stored, state };
    });
    const done = steps.filter(s => s.state === "done").length;
    return { steps, done, total: steps.length, percent: steps.length ? Math.round(done / steps.length * 100) : 100, next: steps.find(s => s.state !== "done")?.label };
}

/** Pose ou retire (`undefined` = revenir au calcul) la valeur d'une étape. */
export function withStep(preparation: Record<string, PreparationState>, id: string, state: PreparationState | undefined): Record<string, PreparationState> {
    const next = { ...preparation };
    if (state) next[id] = state;
    else delete next[id];
    return next;
}
