import type { PersonRole, Work } from "@/lib/sidekick-store";
import { computeKey, hasExternalPublisher, type SacemKey } from "./sacem-keys";
import { rightsShares } from "./rights-shares";

export type AgreementStatus = "pending" | "validated" | "contested" | "superseded" | "cancelled";
export type SignerStatus = "pending" | "validated" | "contested";
export type SacemMember = "yes" | "no" | "unknown";

export const ACTIVE_AGREEMENT_STATUSES: AgreementStatus[] = ["pending", "validated", "contested"];

/**
 * Photo figée de la répartition au moment de l'envoi. C'est elle que les
 * co-auteurs valident, et non l'œuvre vivante : modifier l'œuvre ensuite ne
 * change pas ce qui a été accepté.
 */
export interface AgreementSnapshot {
  title: string;
  proposedBy: string;
  persons: {
    id: string;
    firstName: string;
    name: string;
    pseudonym: string;
    roles: PersonRole[];
    depPct: number;
    drmPct: number;
  }[];
  publishers: { id: string; name: string; coad: string; depPct: number; drmPct: number }[];
  dep: SacemKey;
  drm: SacemKey;
}

export interface SignerInfo {
  legalName: string;
  pseudonym: string;
  ipi: string;
  sacemMember: SacemMember;
}

export interface AgreementSigner {
  id: string;
  agreementId: string;
  personId: string;
  displayName: string;
  email: string | null;
  status: SignerStatus;
  info: SignerInfo | null;
  comment: string | null;
  isOwner: boolean;
  sentAt: string | null;
  openedAt: string | null;
  respondedAt: string | null;
}

export interface Agreement {
  id: string;
  workId: string;
  version: number;
  status: AgreementStatus;
  snapshot: AgreementSnapshot;
  createdAt: string;
  signers: AgreementSigner[];
}

/** Ce que reçoit la page publique d'un co-auteur. Jamais les coordonnées ni les infos des autres. */
export type PublicAgreement = {
  state: "open" | "superseded" | "cancelled";
  agreementStatus: AgreementStatus;
  version: number;
  createdAt: string;
  snapshot: AgreementSnapshot;
  me: {
    personId: string;
    displayName: string;
    status: SignerStatus;
    info: SignerInfo | null;
    comment: string | null;
    respondedAt: string | null;
  };
  signers: { personId: string; displayName: string; status: SignerStatus; isOwner: boolean }[];
};

export interface AgreementSummary {
  status: AgreementStatus;
  version: number;
  validated: number;
  total: number;
  contested: number;
}

export function isActiveAgreement(a: Pick<Agreement, "status">): boolean {
  return ACTIVE_AGREEMENT_STATUSES.includes(a.status);
}

export function summarize(a: Agreement): AgreementSummary {
  return {
    status: a.status,
    version: a.version,
    validated: a.signers.filter((s) => s.status === "validated").length,
    total: a.signers.length,
    contested: a.signers.filter((s) => s.status === "contested").length,
  };
}

/** Statut d'un accord déduit de ses signataires : une contestation l'emporte, puis l'attente. */
export function agreementStatusFromSigners(signers: Pick<AgreementSigner, "status">[]): AgreementStatus {
  if (signers.some((s) => s.status === "contested")) return "contested";
  if (signers.length > 0 && signers.every((s) => s.status === "validated")) return "validated";
  return "pending";
}

export function buildSnapshot(work: Omit<Work, "id">, proposedBy: string): AgreementSnapshot {
  const shares = rightsShares(work);
  const byKey = new Map(shares.map((s) => [s.key, s]));
  const hasPublisher = hasExternalPublisher(work);
  return {
    title: work.title.trim(),
    proposedBy,
    persons: work.persons.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      name: p.name,
      pseudonym: p.pseudonym,
      roles: p.roles,
      depPct: byKey.get(p.id)?.depPct ?? 0,
      drmPct: byKey.get(p.id)?.drmPct ?? 0,
    })),
    publishers: hasPublisher
      ? work.externalPublishers.map((pub) => ({
          id: pub.id,
          name: pub.name,
          coad: pub.coad,
          depPct: byKey.get(`pub:${pub.id}`)?.depPct ?? 0,
          drmPct: byKey.get(`pub:${pub.id}`)?.drmPct ?? 0,
        }))
      : [],
    dep: computeKey("dep", work.persons, hasPublisher),
    drm: computeKey("drm", work.persons, hasPublisher),
  };
}
