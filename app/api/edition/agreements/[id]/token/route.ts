import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/listening-public";
import { tooManyRequests } from "@/lib/rate-limit";
import { rateLimitShared } from "@/lib/rate-limit-shared";
import {
  agreementsClosed,
  newAgreementToken,
  ownedAgreement,
  sessionUser,
} from "@/lib/edition-agreement-server";
import { ACTIVE_AGREEMENT_STATUSES } from "@/modules/edition/lib/agreement-types";

/**
 * POST /api/edition/agreements/[id]/token — `{ signerId }`.
 *
 * Nouveau lien pour un co-auteur. L'ancien cesse de fonctionner : c'est aussi
 * le moyen de couper un lien envoyé à la mauvaise personne.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const closed = agreementsClosed();
  if (closed) return closed;
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const limit = await rateLimitShared({ key: `edition-token:${user.id}`, limit: 60, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { signerId?: unknown };
  const signerId = typeof body.signerId === "string" ? body.signerId : "";

  const service = getServiceSupabase();
  const agreement = await ownedAgreement(service, id, user.id);
  if (!agreement || !ACTIVE_AGREEMENT_STATUSES.includes(agreement.status)) {
    return NextResponse.json({ error: "Cet accord n'est plus en cours." }, { status: 409 });
  }

  const { token, hash } = newAgreementToken();
  const { data, error } = await service
    .from("user_edition_agreement_signers")
    .update({ token_hash: hash })
    .eq("id", signerId)
    .eq("agreement_id", id)
    .eq("is_owner", false)
    .select("id")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Co-auteur introuvable." }, { status: 404 });

  return NextResponse.json({ token });
}
