import { NextResponse } from "next/server";
import { escapeHtml, sendEmail } from "@/lib/brevo";
import { getServiceSupabase } from "@/lib/listening-public";
import { tooManyRequests } from "@/lib/rate-limit";
import { rateLimitShared } from "@/lib/rate-limit-shared";
import {
  agreementsClosed,
  clientIp,
  hashAgreementToken,
  isPlausibleToken,
  refreshAgreementStatus,
  type AgreementRow,
  type SignerRow,
} from "@/lib/edition-agreement-server";
import type { AgreementSnapshot, PublicAgreement, SacemMember } from "@/modules/edition/lib/agreement-types";
import { ACTIVE_AGREEMENT_STATUSES } from "@/modules/edition/lib/agreement-types";
import { SITE_URL } from "@/lib/site";

/**
 * Page publique d'un co-auteur : `GET` lit l'accord, `POST` enregistre sa
 * réponse. Aucune session : le jeton du lien est la seule clé, résolu par son
 * empreinte, puis tout passe en clé service.
 *
 * Ne renvoie jamais les coordonnées ni les informations des autres
 * co-auteurs : seulement leur nom, leur rôle, leur part et s'ils ont répondu.
 */

const MAX = { legalName: 160, pseudonym: 120, ipi: 20, comment: 2000 };

async function resolve(token: string) {
  if (!isPlausibleToken(token)) return null;
  const service = getServiceSupabase();
  const { data: signer } = await service
    .from("user_edition_agreement_signers")
    .select("id, agreement_id, user_id, person_id, display_name, email, status, info, comment, is_owner, sent_at, opened_at, responded_at")
    .eq("token_hash", hashAgreementToken(token))
    .maybeSingle();
  if (!signer) return null;
  const s = signer as SignerRow;
  const [{ data: agreement }, { data: all }] = await Promise.all([
    service
      .from("user_edition_agreements")
      .select("id, user_id, work_id, version, snapshot, status, created_at")
      .eq("id", s.agreement_id)
      .maybeSingle(),
    service
      .from("user_edition_agreement_signers")
      .select("person_id, display_name, status, is_owner")
      .eq("agreement_id", s.agreement_id),
  ]);
  if (!agreement) return null;
  return {
    service,
    signer: s,
    agreement: agreement as AgreementRow,
    others: (all ?? []) as { person_id: string; display_name: string; status: SignerRow["status"]; is_owner: boolean }[],
  };
}

function toPublic(r: NonNullable<Awaited<ReturnType<typeof resolve>>>): PublicAgreement {
  const active = ACTIVE_AGREEMENT_STATUSES.includes(r.agreement.status);
  return {
    state: active ? "open" : r.agreement.status === "superseded" ? "superseded" : "cancelled",
    agreementStatus: r.agreement.status,
    version: r.agreement.version,
    createdAt: r.agreement.created_at,
    snapshot: r.agreement.snapshot as unknown as AgreementSnapshot,
    me: {
      personId: r.signer.person_id,
      displayName: r.signer.display_name,
      status: r.signer.status,
      info: (r.signer.info as PublicAgreement["me"]["info"]) ?? null,
      comment: r.signer.comment,
      respondedAt: r.signer.responded_at,
    },
    signers: r.others.map((o) => ({ personId: o.person_id, displayName: o.display_name, status: o.status, isOwner: o.is_owner })),
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const closed = agreementsClosed();
  if (closed) return closed;
  const limit = await rateLimitShared({ key: `accord:${clientIp(request)}`, limit: 120, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  const { token } = await params;
  const r = await resolve(token);
  if (!r) return NextResponse.json({ state: "unknown" });

  if (!r.signer.opened_at) {
    await r.service
      .from("user_edition_agreement_signers")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", r.signer.id);
  }
  return NextResponse.json(toPublic(r));
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const closed = agreementsClosed();
  if (closed) return closed;
  const limit = await rateLimitShared({ key: `accord-post:${clientIp(request)}`, limit: 20, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  const { token } = await params;
  const r = await resolve(token);
  if (!r) return NextResponse.json({ error: "Lien inconnu." }, { status: 404 });
  if (!ACTIVE_AGREEMENT_STATUSES.includes(r.agreement.status)) {
    return NextResponse.json({ error: "Cet accord n'est plus en cours." }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const decision = body.decision === "validate" || body.decision === "contest" ? body.decision : null;
  const rawInfo = (body.info ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const info = {
    legalName: str(rawInfo.legalName, MAX.legalName),
    pseudonym: str(rawInfo.pseudonym, MAX.pseudonym),
    ipi: str(rawInfo.ipi, MAX.ipi).replace(/\s+/g, ""),
    sacemMember: (["yes", "no", "unknown"].includes(rawInfo.sacemMember as string) ? rawInfo.sacemMember : "unknown") as SacemMember,
  };
  const comment = str(body.comment, MAX.comment);

  if (!decision) return NextResponse.json({ error: "Choisis de valider ou de contester." }, { status: 400 });
  if (!info.legalName) return NextResponse.json({ error: "Ton nom civil est nécessaire : c'est sous ce nom que l'œuvre se déclare." }, { status: 400 });
  if (info.ipi && !/^\d{9,11}$/.test(info.ipi)) return NextResponse.json({ error: "Le numéro IPI compte 9 à 11 chiffres." }, { status: 400 });
  if (decision === "contest" && !comment) return NextResponse.json({ error: "Dis en quelques mots ce qui ne va pas." }, { status: 400 });

  const now = new Date().toISOString();
  const { error } = await r.service
    .from("user_edition_agreement_signers")
    .update({
      status: decision === "validate" ? "validated" : "contested",
      info,
      comment: decision === "contest" ? comment : comment || null,
      responded_at: now,
    })
    .eq("id", r.signer.id);
  if (error) return NextResponse.json({ error: "Ta réponse n'a pas pu être enregistrée." }, { status: 500 });

  const status = await refreshAgreementStatus(r.service, r.agreement.id);
  await notifyOwner(r, decision, comment, status);

  const fresh = await resolve(token);
  return NextResponse.json(fresh ? toPublic(fresh) : { state: "unknown" });
}

/**
 * Prévient l'artiste d'une contestation, ou quand tout le monde a validé.
 * Une validation isolée ne mérite pas un email : la fiche suffit.
 */
async function notifyOwner(
  r: NonNullable<Awaited<ReturnType<typeof resolve>>>,
  decision: "validate" | "contest",
  comment: string,
  status: string | null,
) {
  if (decision === "validate" && status !== "validated") return;
  try {
    const { data } = await r.service.auth.admin.getUserById(r.agreement.user_id);
    const to = data.user?.email;
    if (!to) return;
    const snapshot = r.agreement.snapshot as unknown as AgreementSnapshot;
    const title = snapshot.title || "ton œuvre";
    const link = `${SITE_URL}/edition/${encodeURIComponent(r.agreement.work_id)}`;
    const subject =
      decision === "contest"
        ? `${r.signer.display_name} conteste la répartition de « ${title} »`
        : `Tout le monde a validé la répartition de « ${title} »`;
    const lead =
      decision === "contest"
        ? `${r.signer.display_name} conteste la répartition de « ${title} » :\n\n« ${comment} »\n\nCorrige la répartition puis renvoie l'accord.`
        : `Tous les co-auteurs ont validé la répartition de « ${title} ». Tu peux la déclarer à la SACEM.`;
    await sendEmail({
      to,
      subject,
      text: `${lead}\n\n${link}`,
      html: `<p>${escapeHtml(lead).replace(/\n/g, "<br />")}</p><p><a href="${escapeHtml(link)}">Ouvrir l'œuvre</a></p>`,
    });
  } catch (e) {
    console.error("[accord] notification non envoyée", e);
  }
}
