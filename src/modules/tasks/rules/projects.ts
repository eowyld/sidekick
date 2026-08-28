import type { Rule } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.round((target - now) / MS_PER_DAY);
}

export const projectsRules: Rule[] = [
  // Rappel quand un temps fort approche dans les 7 jours
  (ctx) => {
    if (!ctx.projects) return null;
    for (const project of ctx.projects) {
      if (project.status !== "in_progress") continue;
      for (const kd of project.keyDates ?? []) {
        const days = daysUntil(kd.date);
        if (days >= 0 && days <= 7) {
          return {
            title: `Préparer le temps fort "${kd.label}" — ${project.title}`,
            sector: "Projets",
            reason: `Temps fort prévu dans ${days === 0 ? "aujourd'hui" : `${days} jour${days > 1 ? "s" : ""}`}`,
            source: "rule",
          };
        }
      }
    }
    return null;
  },

  // Rappel quand un projet en cours n'a pas de budget configuré (aucune budget line)
  (ctx) => {
    if (!ctx.projects) return null;
    const activeWithoutBudget = ctx.projects.filter(
      (p) =>
        p.status === "in_progress" &&
        (p.keyDates?.length ?? 0) === 0 &&
        (p.linkedTracks.length > 0 || p.linkedTourDates.length > 0)
    );
    if (activeWithoutBudget.length === 0) return null;
    const p = activeWithoutBudget[0];
    return {
      title: `Configurer le budget du projet "${p.title}"`,
      sector: "Projets",
      reason: "Projet en cours avec des éléments créatifs mais aucun temps fort ni budget",
      source: "rule",
    };
  },

  // Rappel quand un projet "en_cours" n'a aucun contenu lié
  (ctx) => {
    if (!ctx.projects) return null;
    const empty = ctx.projects.find(
      (p) =>
        p.status === "in_progress" &&
        p.linkedTracks.length === 0 &&
        p.linkedWorks.length === 0 &&
        p.linkedTourDates.length === 0 &&
        (p.keyDates?.length ?? 0) === 0
    );
    if (!empty) return null;
    return {
      title: `Enrichir le projet "${empty.title}"`,
      sector: "Projets",
      reason: "Projet en cours sans titres, œuvres, dates de tournée ni temps forts rattachés",
      source: "rule",
    };
  },
];
