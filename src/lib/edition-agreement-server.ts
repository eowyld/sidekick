import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { EDITION_AGREEMENTS_OPEN } from "@/lib/coming-soon";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";
import type { AgreementStatus, SignerStatus } from "@/modules/edition/lib/agreement-types";
import { agreementStatusFromSigners } from "@/modules/edition/lib/agreement-types";

/**
 * Serveur de l'accord de répartition (module Édition).
 *
 * Le jeton d'un lien de validation n'existe qu'à deux endroits : dans la
 * réponse de création, et dans le lien copié ou envoyé. La base n'en garde que
 * l'empreinte, comme un mot de passe : une fuite de la table ne donne accès à
 * aucun accord.
 */

/** Fonctionnalité fermée pour l'alpha : les routes répondent comme si elles n'existaient pas. */
export function agreementsClosed(): NextResponse | null {
  return EDITION_AGREEMENTS_OPEN ? null : NextResponse.json({ error: "Fonctionnalité indisponible." }, { status: 404 });
}

export function newAgreementToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashAgreementToken(token) };
}

export function hashAgreementToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Un jeton plausible : évite une requête en base pour une chaîne manifestement fausse. */
export function isPlausibleToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,60}$/.test(token);
}

export function agreementUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/accord/${token}`;
}

/** Utilisateur de la session, ou `null`. Les écritures se font ensuite en clé service. */
export async function sessionUser(): Promise<{ id: string; email: string | null } | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? null } : null;
}

export type AgreementRow = {
  id: string;
  user_id: string;
  work_id: string;
  version: number;
  snapshot: Record<string, unknown>;
  status: AgreementStatus;
  created_at: string;
};

export type SignerRow = {
  id: string;
  agreement_id: string;
  user_id: string;
  person_id: string;
  display_name: string;
  email: string | null;
  status: SignerStatus;
  info: Record<string, unknown> | null;
  comment: string | null;
  is_owner: boolean;
  sent_at: string | null;
  opened_at: string | null;
  responded_at: string | null;
};

/** Accord appartenant à l'utilisateur, ou `null`. */
export async function ownedAgreement(
  service: SupabaseClient,
  agreementId: string,
  userId: string,
): Promise<AgreementRow | null> {
  const { data } = await service
    .from("user_edition_agreements")
    .select("id, user_id, work_id, version, snapshot, status, created_at")
    .eq("id", agreementId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as AgreementRow | null) ?? null;
}

/** Recalcule le statut d'un accord actif depuis ses signataires. */
export async function refreshAgreementStatus(service: SupabaseClient, agreementId: string): Promise<AgreementStatus | null> {
  const [{ data: agreement }, { data: signers }] = await Promise.all([
    service.from("user_edition_agreements").select("status").eq("id", agreementId).maybeSingle(),
    service.from("user_edition_agreement_signers").select("status").eq("agreement_id", agreementId),
  ]);
  const current = (agreement as { status: AgreementStatus } | null)?.status;
  // Un accord remplacé ou annulé reste figé : une réponse tardive n'y change rien.
  if (!current || current === "superseded" || current === "cancelled") return current ?? null;
  const next = agreementStatusFromSigners((signers ?? []) as { status: SignerStatus }[]);
  if (next !== current) {
    await service
      .from("user_edition_agreements")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", agreementId);
  }
  return next;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "inconnu";
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}
