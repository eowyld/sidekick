import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/listening-public";
import {
  agreementsClosed,
  ownedAgreement,
  sessionUser,
} from "@/lib/edition-agreement-server";
import { ACTIVE_AGREEMENT_STATUSES } from "@/modules/edition/lib/agreement-types";

/**
 * POST /api/edition/agreements/[id]/cancel — `{ reason?: "edit" }`.
 *
 * Retire l'accord en cours et rend la répartition modifiable. Avec
 * `reason: "edit"`, l'accord passe `superseded` (une nouvelle version va
 * suivre) ; sinon `cancelled`. Les liens déjà envoyés affichent l'un ou l'autre.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const closed = agreementsClosed();
  if (closed) return closed;
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { reason?: unknown };
  const status = body.reason === "edit" ? "superseded" : "cancelled";
  const service = getServiceSupabase();
  const agreement = await ownedAgreement(service, id, user.id);
  if (!agreement) return NextResponse.json({ error: "Accord introuvable." }, { status: 404 });
  if (!ACTIVE_AGREEMENT_STATUSES.includes(agreement.status)) return NextResponse.json({ ok: true });

  const { error } = await service
    .from("user_edition_agreements")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "Impossible d'annuler l'accord." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
