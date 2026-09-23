import type { Rule } from "./types";
import { dateFR, dateISO, todayISO } from "@/modules/live/lib/live-model";
import { isActiveAgreement } from "@/modules/edition/lib/agreement-types";
import { undeclaredProgramDates, workLife } from "@/modules/edition/lib/work-life";

/** Au-delà, un programme non déclaré relève de l'archive, plus de la relance. */
const PROGRAM_WINDOW_DAYS = 180;
/** Une semaine sans réponse : le délai au-delà duquel relancer un co-auteur est légitime. */
const RELANCE_AFTER_DAYS = 7;
const DAY = 86_400_000;

const alreadyNoted = (tasks: { title?: string }[], needle: string) => tasks.some((t) => t.title?.includes(needle));

export const editionRules: Rule[] = [
  // Programme de concert à déclarer.
  (ctx) => {
    if (!ctx.edition) return null;
    const today = todayISO();
    const since = new Date(Date.now() - PROGRAM_WINDOW_DAYS * DAY).toISOString().slice(0, 10);
    const date = undeclaredProgramDates(ctx.edition.works, ctx.edition.tourDates, ctx.edition.tracks, ctx.edition.artistName, today).find(
      (d) => dateISO(d.date) >= since,
    );
    if (!date) return null;
    const title = `Déclarer le programme du concert du ${dateFR(date.date)} à la SACEM`;
    if (alreadyNoted(ctx.tasks, title)) return null;
    return {
      title,
      sector: "Edition",
      reason: `${date.venue || date.city || "Ce concert"} a joué tes œuvres : sans programme déclaré, leurs droits d'exécution publique ne te reviennent pas`,
      source: "rule",
    };
  },

  // Enregistrement sorti, œuvre non déclarée.
  (ctx) => {
    if (!ctx.edition) return null;
    const today = todayISO();
    const work = ctx.edition.works.find(
      (w) => workLife(w, ctx.edition!.tracks, [], ctx.edition!.artistName, today).releasedUndeclared,
    );
    if (!work) return null;
    const title = `Déclarer « ${work.title} » à la SACEM`;
    if (alreadyNoted(ctx.tasks, title)) return null;
    return {
      title,
      sector: "Edition",
      reason: "Un enregistrement de cette œuvre est sorti : ses droits d'auteur ne te sont pas reversés tant qu'elle n'est pas déclarée",
      source: "rule",
    };
  },

  // Co-auteur qui n'a pas répondu à l'accord.
  (ctx) => {
    if (!ctx.edition) return null;
    const threshold = Date.now() - RELANCE_AFTER_DAYS * DAY;
    for (const agreement of ctx.edition.agreements) {
      if (!isActiveAgreement(agreement) || agreement.status !== "pending") continue;
      const signer = agreement.signers.find(
        (s) => s.status === "pending" && new Date(s.sentAt ?? agreement.createdAt).getTime() < threshold,
      );
      if (!signer) continue;
      const title = `Relancer ${signer.displayName} sur l'accord de « ${agreement.snapshot.title} »`;
      if (alreadyNoted(ctx.tasks, signer.displayName)) continue;
      return {
        title,
        sector: "Edition",
        reason: `Accord envoyé il y a plus de ${RELANCE_AFTER_DAYS} jours, toujours sans réponse`,
        source: "rule",
      };
    }
    return null;
  },
];
