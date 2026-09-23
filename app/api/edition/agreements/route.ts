import { NextResponse } from "next/server";
import type { Work } from "@/lib/sidekick-store";
import { getServiceSupabase } from "@/lib/listening-public";
import { tooManyRequests } from "@/lib/rate-limit";
import { rateLimitShared } from "@/lib/rate-limit-shared";
import {
  agreementsClosed,
  newAgreementToken,
  sessionUser,
} from "@/lib/edition-agreement-server";
import { ACTIVE_AGREEMENT_STATUSES, buildSnapshot } from "@/modules/edition/lib/agreement-types";
import { splitsValid } from "@/modules/edition/lib/rights-shares";
import { needsAgreement } from "@/modules/edition/lib/work-lifecycle";
import { personDisplayName } from "@/modules/edition/lib/work-fields";

/**
 * POST /api/edition/agreements — envoie (ou renvoie) l'accord de répartition
 * d'une œuvre : l'accord actif éventuel passe `superseded`, la version suivante
 * est créée avec un jeton par co-auteur.
 *
 * Les jetons ne sont renvoyés qu'ici, une seule fois. La base n'en garde que
 * l'empreinte ; un lien perdu se régénère (`/[id]/token`).
 *
 * Le contenu de l'accord vient du client : c'est l'artiste qui propose sa
 * propre répartition, on vérifie seulement que l'œuvre est bien la sienne.
 */
export async function POST(request: Request) {
  const closed = agreementsClosed();
  if (closed) return closed;
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const limit = await rateLimitShared({ key: `edition-agreement:${user.id}`, limit: 30, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  let body: { workId?: unknown; work?: unknown; ownerPersonId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const workId = typeof body.workId === "string" ? body.workId : "";
  const work = body.work as Omit<Work, "id"> | undefined;
  const ownerPersonId = typeof body.ownerPersonId === "string" ? body.ownerPersonId : null;
  if (!workId || !work || !Array.isArray(work.persons)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!needsAgreement(work)) {
    return NextResponse.json({ error: "Un accord se fait à plusieurs : ajoute au moins un co-auteur." }, { status: 400 });
  }
  if (!work.title?.trim()) {
    return NextResponse.json({ error: "Donne un titre à l'œuvre avant d'envoyer l'accord." }, { status: 400 });
  }
  if (!splitsValid(work)) {
    return NextResponse.json({ error: "Les parts de chaque catégorie doivent totaliser 100 %." }, { status: 400 });
  }
  if (work.persons.length > 20) {
    return NextResponse.json({ error: "Trop d'ayants droit." }, { status: 400 });
  }

  const service = getServiceSupabase();

  const { data: owned } = await service
    .from("user_edition_works")
    .select("id")
    .eq("id", workId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!owned) {
    return NextResponse.json({ error: "Œuvre introuvable. Enregistre-la d'abord." }, { status: 404 });
  }

  const [{ data: prefs }, { data: previous }] = await Promise.all([
    service.from("user_preferences").select("artist_name").eq("user_id", user.id).maybeSingle(),
    service
      .from("user_edition_agreements")
      .select("id, version, status")
      .eq("work_id", workId)
      .eq("user_id", user.id)
      .order("version", { ascending: false }),
  ]);

  const proposedBy = ((prefs as { artist_name?: string | null } | null)?.artist_name ?? "").trim() || "Un co-auteur";
  const rows = (previous ?? []) as { id: string; version: number; status: string }[];
  const version = (rows[0]?.version ?? 0) + 1;
  const active = rows.filter((r) => (ACTIVE_AGREEMENT_STATUSES as string[]).includes(r.status)).map((r) => r.id);

  // D'abord libérer la place : un seul accord actif par œuvre (index unique).
  if (active.length > 0) {
    const { error } = await service
      .from("user_edition_agreements")
      .update({ status: "superseded", updated_at: new Date().toISOString() })
      .in("id", active);
    if (error) return NextResponse.json({ error: "Impossible de remplacer l'accord en cours." }, { status: 500 });
  }

  const { data: agreement, error: insertError } = await service
    .from("user_edition_agreements")
    .insert({ user_id: user.id, work_id: workId, version, snapshot: buildSnapshot(work, proposedBy), status: "pending" })
    .select("id, version, status, snapshot, created_at")
    .single();
  if (insertError || !agreement) {
    return NextResponse.json({ error: "Impossible de créer l'accord." }, { status: 500 });
  }

  const now = new Date().toISOString();
  const tokens: Record<string, string> = {};
  const signers = work.persons.map((p) => {
    const { token, hash } = newAgreementToken();
    const isOwner = p.id === ownerPersonId;
    const id = crypto.randomUUID();
    // Le lien du propriétaire n'est jamais montré : il a validé en envoyant.
    if (!isOwner) tokens[id] = token;
    return {
      id,
      agreement_id: agreement.id,
      user_id: user.id,
      person_id: p.id,
      display_name: personDisplayName(p),
      token_hash: hash,
      status: isOwner ? "validated" : "pending",
      is_owner: isOwner,
      responded_at: isOwner ? now : null,
      info: isOwner
        ? { legalName: [p.firstName, p.name].filter(Boolean).join(" "), pseudonym: p.pseudonym, ipi: "", sacemMember: "unknown" }
        : null,
    };
  });

  const { error: signersError } = await service.from("user_edition_agreement_signers").insert(signers);
  if (signersError) {
    await service.from("user_edition_agreements").delete().eq("id", agreement.id);
    return NextResponse.json({ error: "Impossible de créer les liens de validation." }, { status: 500 });
  }

  return NextResponse.json({ agreementId: agreement.id, version, tokens });
}
