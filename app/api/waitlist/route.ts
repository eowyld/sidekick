import { NextResponse } from "next/server";

function isValidEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  const e = email.trim();
  if (!e) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/**
 * POST /api/waitlist — capture email pour la landing.
 * En prod : définir WAITLIST_WEBHOOK_URL (Zapier, Make, Slack incoming webhook, etc.)
 * pour persister les inscriptions ; sinon la réponse indique persisted: false.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body
      ? (body as { email: unknown }).email
      : undefined;

  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const webhook = process.env.WAITLIST_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      const r = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "sidekick-landing" })
      });
      if (r.ok) {
        return NextResponse.json({ ok: true, persisted: true });
      }
      return NextResponse.json({ ok: false, error: "webhook_rejected" }, { status: 502 });
    } catch {
      return NextResponse.json({ ok: false, error: "webhook_failed" }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: true, persisted: false });
}
