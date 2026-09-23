import type { Work } from "@/lib/sidekick-store";
import type { AgreementSummary } from "./agreement-types";

/**
 * Cycle de vie d'une œuvre : Brouillon → Accord en cours → Accord validé →
 * Déclarée SACEM → Acceptée.
 *
 * Seules la déclaration et l'acceptation se cochent. L'accord se calcule depuis
 * ses signataires. Le champ `status` garde ses valeurs historiques en base
 * (Projets, la RPC de création et le jeu de démo les lisent) : on ne fait que
 * les relire.
 */
export type ManualStatus = "draft" | "declared" | "accepted";

export type LifecycleStep =
  | "draft"
  | "agreement-pending"
  | "agreement-contested"
  | "agreement-validated"
  | "declared"
  | "accepted";

export function manualStatus(status: Work["status"]): ManualStatus {
  if (status === "accepted-sacem") return "accepted";
  if (status === "registered-sacem") return "declared";
  return "draft";
}

export function storedStatus(m: ManualStatus): Work["status"] {
  if (m === "accepted") return "accepted-sacem";
  if (m === "declared") return "registered-sacem";
  return "in-progress";
}

/** Un accord n'a de sens qu'à plusieurs : les éditeurs figurent dans l'accord mais ne le valident pas. */
export function needsAgreement(work: Pick<Work, "persons">): boolean {
  return work.persons.length >= 2;
}

export function lifecycleStep(work: Pick<Work, "status" | "persons">, agreement: AgreementSummary | null): LifecycleStep {
  const manual = manualStatus(work.status);
  if (manual === "accepted") return "accepted";
  if (manual === "declared") return "declared";
  if (!needsAgreement(work) || !agreement) return "draft";
  if (agreement.status === "contested") return "agreement-contested";
  if (agreement.status === "validated") return "agreement-validated";
  if (agreement.status === "pending") return "agreement-pending";
  return "draft";
}

export const STEP_META: Record<LifecycleStep, { label: string; color: string; index: number }> = {
  draft: { label: "Brouillon", color: "#94A3B8", index: 0 },
  "agreement-pending": { label: "Accord en cours", color: "#F59E0B", index: 1 },
  "agreement-contested": { label: "Accord contesté", color: "#F87171", index: 1 },
  "agreement-validated": { label: "Accord validé", color: "#38BDF8", index: 2 },
  declared: { label: "Déclarée SACEM", color: "#A78BFA", index: 3 },
  accepted: { label: "Acceptée", color: "#34D399", index: 4 },
};

export const TIMELINE_LABELS = ["Brouillon", "Accord", "Accord validé", "Déclarée", "Acceptée"];

export function stepLabel(step: LifecycleStep, agreement: AgreementSummary | null): string {
  if (step === "agreement-pending" && agreement) return `Accord ${agreement.validated}/${agreement.total}`;
  return STEP_META[step].label;
}

/** Déclarée sans accord validé alors qu'il y a des co-auteurs : légitime pour une œuvre ancienne, à signaler quand même. */
export function declaredWithoutAgreement(work: Pick<Work, "status" | "persons">, agreement: AgreementSummary | null): boolean {
  return manualStatus(work.status) !== "draft" && needsAgreement(work) && agreement?.status !== "validated";
}
