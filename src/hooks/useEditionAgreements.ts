"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { createClient, getSessionUser } from "@/lib/supabase";
import type { Work } from "@/lib/sidekick-store";
import { EDITION_AGREEMENTS_OPEN } from "@/lib/coming-soon";
import type { Agreement, AgreementSigner, AgreementSnapshot } from "@/modules/edition/lib/agreement-types";

export const EDITION_AGREEMENTS_KEY = "user_edition_agreements";

type Data = { agreements: Agreement[]; unavailable: boolean };
const FALLBACK: Data = { agreements: [], unavailable: false };

/**
 * Accords de répartition, en lecture par RLS. Toutes les écritures passent par
 * `/api/edition/agreements` : c'est ce qui garantit qu'une validation vient du
 * co-auteur lui-même.
 *
 * Tables absentes (migration pas encore appliquée) : le module reste
 * utilisable, simplement sans accord (`unavailable`).
 */
async function fetchAgreements(): Promise<Data> {
  const supabase = createClient();
  const {
    data: { user },
  } = await getSessionUser(supabase);
  if (!user) return FALLBACK;

  const [a, s] = await Promise.all([
    supabase
      .from("user_edition_agreements")
      .select("id, work_id, version, status, snapshot, created_at")
      .order("version", { ascending: false }),
    supabase
      .from("user_edition_agreement_signers")
      .select("id, agreement_id, person_id, display_name, email, status, info, comment, is_owner, sent_at, opened_at, responded_at, created_at")
      .order("created_at", { ascending: true }),
  ]);
  if (a.error || s.error) return { agreements: [], unavailable: true };

  const signersBy = new Map<string, AgreementSigner[]>();
  for (const row of s.data ?? []) {
    const signer: AgreementSigner = {
      id: row.id as string,
      agreementId: row.agreement_id as string,
      personId: row.person_id as string,
      displayName: row.display_name as string,
      email: (row.email as string | null) ?? null,
      status: row.status as AgreementSigner["status"],
      info: (row.info as AgreementSigner["info"]) ?? null,
      comment: (row.comment as string | null) ?? null,
      isOwner: row.is_owner as boolean,
      sentAt: (row.sent_at as string | null) ?? null,
      openedAt: (row.opened_at as string | null) ?? null,
      respondedAt: (row.responded_at as string | null) ?? null,
    };
    signersBy.set(signer.agreementId, [...(signersBy.get(signer.agreementId) ?? []), signer]);
  }

  return {
    unavailable: false,
    agreements: (a.data ?? []).map((row) => ({
      id: row.id as string,
      workId: row.work_id as string,
      version: row.version as number,
      status: row.status as Agreement["status"],
      snapshot: row.snapshot as AgreementSnapshot,
      createdAt: row.created_at as string,
      signers: signersBy.get(row.id as string) ?? [],
    })),
  };
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error || "La requête a échoué.");
  return json;
}

export function useEditionAgreements() {
  const { data, isLoading, mutate } = useSWR<Data>(EDITION_AGREEMENTS_OPEN ? EDITION_AGREEMENTS_KEY : null, fetchAgreements, { fallbackData: FALLBACK });
  const agreements = data?.agreements ?? [];

  /** Envoie l'accord : renvoie les jetons de chaque co-auteur, à ne garder qu'en mémoire. */
  const sendAgreement = useCallback(
    async (workId: string, work: Omit<Work, "id">, ownerPersonId: string | null) => {
      const result = await post<{ agreementId: string; version: number; tokens: Record<string, string> }>(
        "/api/edition/agreements",
        { workId, work, ownerPersonId },
      );
      await mutate();
      return result;
    },
    [mutate],
  );

  const regenerateToken = useCallback(
    async (agreementId: string, signerId: string) => {
      const { token } = await post<{ token: string }>(`/api/edition/agreements/${agreementId}/token`, { signerId });
      return token;
    },
    [],
  );

  const emailLink = useCallback(
    async (agreementId: string, signerId: string, email: string, token: string) => {
      await post(`/api/edition/agreements/${agreementId}/send`, { signerId, email, token });
      await mutate();
    },
    [mutate],
  );

  const cancelAgreement = useCallback(
    async (agreementId: string, reason?: "edit") => {
      await post(`/api/edition/agreements/${agreementId}/cancel`, { reason });
      await mutate();
    },
    [mutate],
  );

  return {
    agreements,
    unavailable: data?.unavailable ?? false,
    loading: isLoading,
    refresh: mutate,
    sendAgreement,
    regenerateToken,
    emailLink,
    cancelAgreement,
  };
}
