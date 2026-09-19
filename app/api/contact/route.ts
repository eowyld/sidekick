import { NextResponse } from "next/server";

import { escapeHtml, sendEmail } from "@/lib/brevo";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/contact — formulaire de contact public.
 *
 * Seule route publique qui déclenche un envoi d'email : c'est donc la seule
 * porte par laquelle un inconnu peut consommer le quota Brevo. Trois gardes,
 * dans cet ordre de coût croissant : un champ piège rempli par les robots et
 * par personne d'autre, une limite par adresse IP, et des bornes de longueur.
 *
 * L'adresse de l'expéditeur part en `Reply-To` et jamais en `From` : un envoi
 * au nom d'un tiers casserait l'alignement SPF/DKIM du domaine, et c'est la
 * délivrabilité de tous les autres emails de l'app qui trinquerait.
 */

/** Généreux pour une personne, étroit pour un script. */
const RATE_LIMIT = { limit: 3, windowMs: 10 * 60 * 1000 };

const MAX = { name: 120, email: 254, subject: 160, message: 5000 };

/** Adresse de l'appelant derrière le proxy Vercel. */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "inconnu";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Champ piège : invisible à l'écran, donc rempli uniquement par un robot qui
  // remplit tout. On répond 200 pour ne pas lui apprendre qu'il a été repéré.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Nom, adresse email et message sont nécessaires." },
      { status: 400 }
    );
  }
  if (!isEmail(email)) {
    return NextResponse.json(
      { error: "Cette adresse email ne semble pas valide." },
      { status: 400 }
    );
  }
  if (
    name.length > MAX.name ||
    email.length > MAX.email ||
    subject.length > MAX.subject ||
    message.length > MAX.message
  ) {
    return NextResponse.json({ error: "Message trop long." }, { status: 400 });
  }

  const limit = rateLimit({ key: `contact:${clientIp(request)}`, ...RATE_LIMIT });
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfter);
  }

  const heading = subject || "Sans objet";
  const result = await sendEmail({
    to: LEGAL_CONTACT_EMAIL,
    replyTo: email,
    fromName: "SIDEKICK (formulaire de contact)",
    subject: `Contact site : ${heading}`,
    text: `${name} <${email}>\nObjet : ${heading}\n\n${message}`,
    html: `<p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p>
<p>Objet : ${escapeHtml(heading)}</p>
<hr />
<p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`,
  });

  if (!result.ok) {
    // L'adresse de repli est affichée sur la page : la personne a toujours un
    // moyen de nous joindre, même quand Brevo est indisponible.
    return NextResponse.json(
      { error: "L'envoi a échoué. Écris-nous directement par email." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
