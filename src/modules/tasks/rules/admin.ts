import type { Rule } from "./types";

function daysUntil(dateValue?: string | null): number | null {
  if (!dateValue) return null;
  const d = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const adminRules: Rule[] = [
  (ctx) => {
    if (!ctx.admin) return null;

    const pending = ctx.admin.procedures.find((proc) => {
      const status = String((proc as { status?: string }).status ?? "a_faire");
      if (status === "termine") return false;
      const due = (proc as { dateLimite?: string }).dateLimite;
      const days = daysUntil(due ?? null);
      return days !== null && days <= 7;
    });

    if (!pending) return null;

    const days = daysUntil((pending as { dateLimite?: string }).dateLimite ?? null);
    const statusId = (pending as { statutJuridiqueId?: string }).statutJuridiqueId;
    const linkedStatus =
      statusId ? ctx.admin.structures.find((status) => status.id === statusId)?.name : null;
    const urgency = days !== null && days < 0 ? "en retard" : `dans ${days} jour${days === 1 ? "" : "s"}`;

    return {
      title: `Finaliser: ${pending.label}`,
      sector: "Admin",
      reason: linkedStatus ? `Échéance ${urgency} (${linkedStatus})` : `Échéance ${urgency}`,
      source: "rule",
    };
  },
];
