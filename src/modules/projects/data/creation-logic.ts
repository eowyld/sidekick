import type {
  CreationStep, CreationPhase, Track, Session, Work,
} from "@/lib/sidekick-store";
// Live est servi par Supabase : ses types font autorité sur ceux du store legacy.
import type { TourDate, RehearsalItem } from "@/hooks/useLiveData";
import { CREATION_PHASE_ORDER } from "@/lib/sidekick-store";
import { frToIso, isValidDateFr } from "@/lib/date-format";

// ─── Phase active & progression ────────────────────────────────────────────────

/** Une phase est terminée si elle a ≥1 étape et que toutes sont "done". */
export function isPhaseDone(steps: CreationStep[], phase: CreationPhase): boolean {
  const s = steps.filter((x) => x.phase === phase);
  return s.length > 0 && s.every((x) => x.status === "done");
}

/** Phase active = première phase (ayant des étapes) non terminée dans l'ordre ; sinon "sortie". */
export function computeActivePhase(steps: CreationStep[]): CreationPhase {
  return (
    CREATION_PHASE_ORDER.find((p) => steps.some((s) => s.phase === p) && !isPhaseDone(steps, p)) ??
    "sortie"
  );
}

/** Toutes les phases ayant au moins une étape sont-elles terminées ? */
export function allPhasesDone(steps: CreationStep[]): boolean {
  const phasesWithSteps = CREATION_PHASE_ORDER.filter(
    (p) => steps.some((s) => s.phase === p)
  );
  return phasesWithSteps.length > 0 && phasesWithSteps.every((p) => isPhaseDone(steps, p));
}

export function phaseProgress(
  steps: CreationStep[],
  phase: CreationPhase
): { done: number; total: number; pct: number } {
  const s = steps.filter((x) => x.phase === phase);
  const done = s.filter((x) => x.status === "done").length;
  return { done, total: s.length, pct: s.length === 0 ? 0 : Math.round((done / s.length) * 100) };
}

export function globalProgress(
  steps: CreationStep[]
): { done: number; total: number; pct: number } {
  const done = steps.filter((s) => s.status === "done").length;
  return { done, total: steps.length, pct: steps.length === 0 ? 0 : Math.round((done / steps.length) * 100) };
}

// ─── Signaux auto ───────────────────────────────────────────────────────────────

export interface CreationSignal {
  label: string;
  tone: "accent" | "muted";
}

/** Données de modules déjà filtrées sur les éléments liés au projet. */
export interface CreationSignalContext {
  tracks: Track[];
  sessions: Session[];
  works: Work[];
  tourDates: TourDate[];
  rehearsals: RehearsalItem[];
}

const plural = (n: number) => (n > 1 ? "s" : "");

/** YYYY-MM-DD d'aujourd'hui, pour comparer les dates de concerts. */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse une date fr (JJ/MM/AAAA) ou ISO (AAAA-MM-JJ) → clé AAAA-MM-JJ, ou null. */
function toKey(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (isValidDateFr(s)) return frToIso(s);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

export function deriveSignals(
  phase: CreationPhase,
  ctx: CreationSignalContext
): CreationSignal[] {
  const out: CreationSignal[] = [];

  if (phase === "creation") {
    const enProd = ctx.tracks.filter((t) => t.status === "en_production").length;
    if (enProd > 0) out.push({ label: `${enProd} titre${plural(enProd)} en production`, tone: "muted" });

    const deposed = ctx.works.filter(
      (w) => w.status === "registered-sacem" || w.status === "accepted-sacem"
    ).length;
    if (deposed > 0) out.push({ label: `${deposed} œuvre${plural(deposed)} déposée${plural(deposed)} SACEM`, tone: "accent" });

    const inProgress = ctx.works.filter((w) => w.status === "in-progress").length;
    if (inProgress > 0) out.push({ label: `${inProgress} œuvre${plural(inProgress)} en cours`, tone: "muted" });
  }

  if (phase === "production") {
    const mixed = ctx.tracks.filter((t) => t.status === "mixe").length;
    if (mixed > 0) out.push({ label: `${mixed} titre${plural(mixed)} mixé${plural(mixed)}`, tone: "muted" });

    const mastered = ctx.tracks.filter((t) => t.status === "masterise").length;
    if (mastered > 0) out.push({ label: `${mastered} titre${plural(mastered)} masterisé${plural(mastered)}`, tone: "accent" });

    if (ctx.sessions.length > 0) out.push({ label: `${ctx.sessions.length} session${plural(ctx.sessions.length)} studio`, tone: "muted" });
    if (ctx.rehearsals.length > 0) out.push({ label: `${ctx.rehearsals.length} répétition${plural(ctx.rehearsals.length)}`, tone: "muted" });
  }

  if (phase === "sortie") {
    const published = ctx.tracks.filter((t) => t.status === "publie").length;
    if (published > 0) out.push({ label: `${published} titre${plural(published)} publié${plural(published)}`, tone: "accent" });

    const tk = todayKey();
    const upcoming = ctx.tourDates.filter((d) => {
      const k = toKey(d.date);
      return k !== null && k >= tk;
    }).length;
    if (upcoming > 0) out.push({ label: `${upcoming} concert${plural(upcoming)} à venir`, tone: "accent" });

    const exploited = ctx.works.filter((w) => w.status === "accepted-sacem").length;
    if (exploited > 0) out.push({ label: `${exploited} œuvre${plural(exploited)} exploitée${plural(exploited)}`, tone: "muted" });
  }

  return out;
}
