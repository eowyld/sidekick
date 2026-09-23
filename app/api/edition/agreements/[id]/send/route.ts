import { NextResponse } from "next/server";
import { escapeHtml, sendEmail } from "@/lib/brevo";
import { getServiceSupabase } from "@/lib/listening-public";
import { tooManyRequests } from "@/lib/rate-limit";
import { rateLimitShared } from "@/lib/rate-limit-shared";
import {
  agreementsClosed,
  agreementUrl,
  hashAgreementToken,
  isEmail,
  isPlausibleToken,
  ownedAgreement,
  sessionUser,
} from "@/lib/edition-agreement-server";
import { ACTIVE_AGREEMENT_STATUSES, type AgreementSnapshot } from "@/modules/edition/lib/agreement-types";

/**
 * POST /api/edition/agreements/[id]/send — `{ signerId, email, token }`.
 *
 * Envoie le lien de validation par email. Le client fournit le jeton qu'il
 * détient (la base n'a que son empreinte) : on vérifie qu'il correspond bien à
 * ce co-auteur avant de l'envoyer à qui que ce soit.
 *
 * `Reply-To` = l'adresse de l'artiste, jamais `From` : un envoi au nom d'un
 * tiers casserait l'alignement SPF/DKIM du domaine.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const closed = agreementsClosed();
  if (closed) return closed;
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const limit = await rateLimitShared({ key: `edition-send:${user.id}`, limit: 20, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return tooManyRequests(limit.retryAfter);

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const signerId = typeof body.signerId === "string" ? body.signerId : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const token = typeof body.token === "string" ? body.token : "";

  if (!isEmail(email) || email.length > 254) {
    return NextResponse.json({ error: "Cette adresse email ne semble pas valide." }, { status: 400 });
  }
  if (!isPlausibleToken(token)) {
    return NextResponse.json({ error: "Lien invalide : régénère-le avant l'envoi." }, { status: 400 });
  }

  const service = getServiceSupabase();
  const agreement = await ownedAgreement(service, id, user.id);
  if (!agreement || !ACTIVE_AGREEMENT_STATUSES.includes(agreement.status)) {
    return NextResponse.json({ error: "Cet accord n'est plus en cours." }, { status: 409 });
  }

  const { data: signer } = await service
    .from("user_edition_agreement_signers")
    .select("id, display_name, token_hash")
    .eq("id", signerId)
    .eq("agreement_id", id)
    .maybeSingle();
  const row = signer as { id: string; display_name: string; token_hash: string } | null;
  if (!row || row.token_hash !== hashAgreementToken(token)) {
    return NextResponse.json({ error: "Ce lien a été remplacé : régénère-le avant l'envoi." }, { status: 409 });
  }

  const snapshot = agreement.snapshot as unknown as AgreementSnapshot;
  const url = agreementUrl(new URL(request.url).origin, token);
  const who = snapshot.proposedBy || "Un co-auteur";
  const title = snapshot.title || "une œuvre";

  const result = await sendEmail({
    to: email,
    replyTo: user.email ?? undefined,
    fromName: `${who} via SIDEKICK`,
    subject: `${who} te propose la répartition de « ${title} »`,
    text: `Bonjour ${row.display_name},\n\n${who} te propose la répartition des droits d'auteur de « ${title} ». Vérifie ta part, complète tes informations, puis valide ou conteste :\n\n${url}\n\nCe lien t'est personnel.`,
    html: `<p>Bonjour ${escapeHtml(row.display_name)},</p>
<p><strong>${escapeHtml(who)}</strong> te propose la répartition des droits d'auteur de « ${escapeHtml(title)} ».</p>
<p>Vérifie ta part, complète tes informations, puis valide ou conteste :</p>
<p><a href="${escapeHtml(url)}">Voir la répartition</a></p>
<p style="color:#666;font-size:12px">Ce lien t'est personnel, ne le transfère pas.</p>`,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "L'envoi a échoué. Copie le lien et envoie-le toi-même." }, { status: 502 });
  }

  await service
    .from("user_edition_agreement_signers")
    .update({ email, sent_at: new Date().toISOString() })
    .eq("id", row.id);

  return NextResponse.json({ ok: true });
}
