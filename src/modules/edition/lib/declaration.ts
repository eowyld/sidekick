import type { Work } from "@/lib/sidekick-store";
import type { Agreement } from "./agreement-types";
import { rightsShares } from "./rights-shares";
import { formatPct } from "./sacem-keys";
import { roleLabel } from "./work-fields";

/**
 * Récapitulatif à recopier dans l'espace membre SACEM. SIDEKICK ne déclare
 * rien lui-même : il rassemble en un bloc ce que le formulaire demande, avec
 * les informations complétées par les co-auteurs dans l'accord (nom civil,
 * IPI), qui ne sont nulle part ailleurs.
 */
export function declarationRecap(work: Omit<Work, "id">, agreement: Agreement | null): string {
  const shares = new Map(rightsShares(work).map((s) => [s.key, s]));
  const infoBy = new Map((agreement?.signers ?? []).map((s) => [s.personId, s.info]));
  const lines: string[] = [`Titre : ${work.title || "(sans titre)"}`];
  if (work.duration) lines.push(`Durée : ${work.duration}`);
  if (work.genre) lines.push(`Genre : ${work.genre}`);
  if (work.iswc) lines.push(`ISWC : ${work.iswc}`);
  if (work.firstExploitationDate) lines.push(`Première exploitation : ${new Date(work.firstExploitationDate).toLocaleDateString("fr-FR")}`);
  lines.push("", "Ayants droit :");
  for (const p of work.persons) {
    const info = infoBy.get(p.id);
    const legal = info?.legalName || [p.firstName, p.name].filter(Boolean).join(" ") || "(nom civil à compléter)";
    const s = shares.get(p.id);
    const parts = [
      legal,
      p.pseudonym && `pseudonyme ${p.pseudonym}`,
      p.roles.map(roleLabel).join(" / "),
      info?.ipi && `IPI ${info.ipi}`,
      s && `DEP ${formatPct(s.depPct)}, DRM ${formatPct(s.drmPct)}`,
    ].filter(Boolean);
    lines.push(`- ${parts.join(" · ")}`);
  }
  if (!work.selfPublished) {
    for (const pub of work.externalPublishers) {
      const s = shares.get(`pub:${pub.id}`);
      lines.push(`- ${pub.name} · Éditeur${pub.coad ? ` · COAD ${pub.coad}` : ""}${s ? ` · DEP ${formatPct(s.depPct)}, DRM ${formatPct(s.drmPct)}` : ""}`);
    }
  }
  if (agreement?.status === "validated") {
    lines.push("", `Répartition validée par tous les co-auteurs (accord v${agreement.version}).`);
  }
  return lines.join("\n");
}
