import type { Rule } from "./types";

/** Une semaine sans ouverture : le délai au-delà duquel une relance est légitime. */
const RELANCE_AFTER_DAYS = 7;

export const phonoRules: Rule[] = [
  (ctx) => {
    if (!ctx.phono) return null;

    const threshold = Date.now() - RELANCE_AFTER_DAYS * 24 * 60 * 60 * 1000;

    const stale = ctx.phono.invites.find((invite) => {
      if (invite.firstOpenedAt) return false;
      if (new Date(invite.sentAt).getTime() > threshold) return false;
      // Un lien coupé ou expiré ne mérite pas de relance : le destinataire ne
      // pourrait de toute façon rien écouter.
      const link = ctx.phono?.links.find((l) => l.id === invite.linkId);
      if (!link || !link.isActive) return false;
      if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
        return false;
      }
      // Une relance déjà notée ne doit pas être resuggérée.
      if (ctx.tasks.some((t) => t.title?.includes(invite.contactName))) return false;
      return true;
    });

    if (!stale) return null;

    const link = ctx.phono.links.find((l) => l.id === stale.linkId);
    const title = link?.title || "votre lien d'écoute";

    return {
      title: `Relancer ${stale.contactName} sur « ${title} »`,
      sector: "Phono",
      reason: `Lien envoyé il y a plus de ${RELANCE_AFTER_DAYS} jours, jamais ouvert`,
      source: "rule",
    };
  },
];
