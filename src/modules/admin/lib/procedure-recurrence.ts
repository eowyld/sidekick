import type { AdminProcedure } from "@/lib/sidekick-store";
import { toIsoDatePickerValue } from "@/lib/date-format";
import type { ProcedureRecurrence } from "@/modules/admin/data/procedure-templates";

/**
 * Report des échéances récurrentes, sans React.
 *
 * Vit hors des composants parce que le cron quotidien
 * (`app/api/cron/reminders/route.ts`) l'exécute côté serveur : c'est lui qui
 * fait avancer les dates pour l'artiste qui n'ouvre jamais `/admin/demarches`.
 * La page l'applique aussi, mais en affichage seulement.
 */

export function parseDateLimite(raw: string): Date {
  let iso = raw;
  if (raw.includes("/")) {
    const [d, m, y] = raw.split("/");
    iso = `${y}-${m}-${d}`;
  }
  return new Date(`${iso}T12:00:00`);
}

export function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/**
 * Identifiant de série pour regrouper les occurrences d'une même démarche
 * récurrente. L'identifiant du statut fait partie de la clé : sans lui, deux
 * statuts du même type partageraient leurs séries.
 */
export function procedureSeriesKey(p: AdminProcedure): string | null {
  const recurrence = (p.recurrence ?? "none") as ProcedureRecurrence;
  if (recurrence === "none") return null;
  const sj = (p as { statutJuridiqueId?: string }).statutJuridiqueId ?? "";
  const tk = (p as { templateKey?: string }).templateKey;
  if (tk) return `t:${sj}:${tk}`;
  return `m:${sj}:${p.label}:${recurrence}`;
}

/** Décalage d'une période, en avant (`sign` = 1) ou en arrière (`sign` = -1). */
function shiftByRecurrence(base: Date, recurrence: ProcedureRecurrence, sign: 1 | -1): void {
  if (recurrence === "monthly") base.setMonth(base.getMonth() + sign);
  if (recurrence === "quarterly") base.setMonth(base.getMonth() + 3 * sign);
  if (recurrence === "semi_annual") base.setMonth(base.getMonth() + 6 * sign);
  if (recurrence === "annual") base.setFullYear(base.getFullYear() + sign);
  if (recurrence === "biannual") base.setFullYear(base.getFullYear() + 2 * sign);
}

function shiftedIso(
  currentDate: string,
  recurrence: ProcedureRecurrence,
  sign: 1 | -1
): string | undefined {
  if (!currentDate || recurrence === "none") return undefined;
  const iso = toIsoDatePickerValue(currentDate);
  if (!iso) return undefined;
  const base = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(base.getTime())) return undefined;
  shiftByRecurrence(base, recurrence, sign);
  return base.toISOString().slice(0, 10);
}

export function computeNextDueDateStatic(
  currentDate: string,
  recurrence: ProcedureRecurrence
): string | undefined {
  return shiftedIso(currentDate, recurrence, 1);
}

export function computePrevDueDateStatic(
  currentDate: string,
  recurrence: ProcedureRecurrence
): string | undefined {
  return shiftedIso(currentDate, recurrence, -1);
}

/**
 * Si toute la série est au statut terminé et que la prochaine période est déjà
 * passée, rouvre la ligne la plus récemment terminée en « à faire » avec la
 * première échéance manquée.
 */
export function applyTermineSeriesRollover(
  anchor: AdminProcedure,
  recurrence: ProcedureRecurrence
): AdminProcedure | undefined {
  const dl = (anchor as { dateLimite?: string }).dateLimite;
  if (!dl) return undefined;
  const cursorIso = toIsoDatePickerValue(dl);
  if (!cursorIso) return undefined;
  const nextIso = computeNextDueDateStatic(cursorIso, recurrence);
  if (!nextIso) return undefined;
  const today = startOfToday();
  const nextDate = parseDateLimite(nextIso);
  if (Number.isNaN(nextDate.getTime()) || nextDate >= today) return undefined;

  let missedIso = nextIso;
  let following = computeNextDueDateStatic(missedIso, recurrence);
  while (following) {
    const fd = parseDateLimite(following);
    if (Number.isNaN(fd.getTime()) || fd >= today) break;
    missedIso = following;
    following = computeNextDueDateStatic(missedIso, recurrence);
  }

  return {
    ...anchor,
    status: "a_faire" as const,
    dateLimite: missedIso,
  };
}

/**
 * Reporte toutes les séries récurrentes intégralement terminées dont la période
 * suivante est déjà passée. Idempotent : sans échéance périmée, renvoie
 * `prev` inchangé (identité conservée, ce dont dépendent les appelants).
 */
export function applyAllRecurringRollovers(prev: AdminProcedure[]): AdminProcedure[] {
  const byKey = new Map<string, AdminProcedure[]>();
  for (const p of prev) {
    const key = procedureSeriesKey(p);
    if (!key) continue;
    const arr = byKey.get(key) ?? [];
    arr.push(p);
    byKey.set(key, arr);
  }

  const replacements = new Map<string, AdminProcedure>();

  for (const [, peers] of byKey) {
    if (peers.some((p) => ((p as { status?: string }).status ?? "a_faire") !== "termine")) {
      continue;
    }
    const dated = peers.filter((p) => (p as { dateLimite?: string }).dateLimite);
    if (dated.length === 0) continue;
    const anchor = dated.reduce((best, p) => {
      const b = (best as { dateLimite?: string }).dateLimite!;
      const c = (p as { dateLimite?: string }).dateLimite!;
      const ib = toIsoDatePickerValue(b);
      const ic = toIsoDatePickerValue(c);
      if (!ib) return p;
      if (!ic) return best;
      return ic.localeCompare(ib) > 0 ? p : best;
    });
    const recurrence = ((anchor as { recurrence?: ProcedureRecurrence }).recurrence ??
      "none") as ProcedureRecurrence;
    const rolled = applyTermineSeriesRollover(anchor, recurrence);
    if (rolled) replacements.set(anchor.id, rolled);
  }

  if (replacements.size === 0) return prev;
  return prev.map((p) => replacements.get(p.id) ?? p);
}

/** Une carte visible par série récurrente, plus les démarches ponctuelles. */
export function collapseRecurringForScope(list: AdminProcedure[]): AdminProcedure[] {
  const byKey = new Map<string, AdminProcedure[]>();
  const singles: AdminProcedure[] = [];
  for (const p of list) {
    const key = procedureSeriesKey(p);
    if (!key) {
      singles.push(p);
      continue;
    }
    const arr = byKey.get(key) ?? [];
    arr.push(p);
    byKey.set(key, arr);
  }
  const merged: AdminProcedure[] = [...singles];
  for (const [, peers] of byKey) {
    const active = peers.filter(
      (p) => ((p as { status?: string }).status ?? "a_faire") !== "termine"
    );
    let visible: AdminProcedure;
    if (active.length > 0) {
      visible = active.slice().sort((a, b) => {
        const ia = toIsoDatePickerValue((a as { dateLimite?: string }).dateLimite ?? "");
        const ib = toIsoDatePickerValue((b as { dateLimite?: string }).dateLimite ?? "");
        if (!ia) return 1;
        if (!ib) return -1;
        return ia.localeCompare(ib);
      })[0]!;
    } else {
      visible = peers.reduce((best, p) => {
        const b = (best as { dateLimite?: string }).dateLimite;
        const c = (p as { dateLimite?: string }).dateLimite;
        if (!b) return p;
        if (!c) return best;
        const ib = toIsoDatePickerValue(b);
        const ic = toIsoDatePickerValue(c);
        if (!ib) return p;
        if (!ic) return best;
        return ic.localeCompare(ib) > 0 ? p : best;
      });
    }
    merged.push(visible);
  }
  return merged;
}
