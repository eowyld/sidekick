import type { Rule } from "./types";

export const liveRules: Rule[] = [
  // Règles à implémenter module par module plus tard.
  // Exemple de forme attendue :
  // (ctx) => {
  //   if (!ctx.live) return null;
  //   const soon = ctx.live.tourDates.find(d => daysUntil(d.date) <= 3);
  //   if (!soon) return null;
  //   return { title: "Vérifier le backline", sector: "Live", reason: `Concert à ${soon.city} dans 3 jours`, source: "rule" };
  // },
];
