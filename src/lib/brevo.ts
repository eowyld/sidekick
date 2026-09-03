const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/** Expéditeur par défaut — doit être un expéditeur vérifié côté Brevo. */
const DEFAULT_FROM = process.env.BREVO_FROM?.trim() || "eliott.matton@gmail.com";

/** Le contenu vient parfois de l'utilisateur : jamais interprété comme du HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type SendEmailResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "send_failed"; detail?: string };

/**
 * Envoi transactionnel via Brevo.
 *
 * Ne lève jamais : un email est un effet de bord, il ne doit pas faire échouer
 * l'action qui l'a déclenché. L'appelant décide quoi faire du résultat.
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  fromName?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    console.error("[brevo] BREVO_API_KEY absente, envoi ignoré");
    return { ok: false, reason: "not_configured" };
  }

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: DEFAULT_FROM, name: args.fromName ?? "SIDEKICK" },
        to: [{ email: args.to }],
        replyTo: args.replyTo ? { email: args.replyTo } : undefined,
        subject: args.subject,
        textContent: args.text,
        htmlContent: args.html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[brevo] envoi refusé", response.status, detail);
      return { ok: false, reason: "send_failed", detail };
    }

    return { ok: true };
  } catch (error) {
    console.error("[brevo] envoi impossible", error);
    return { ok: false, reason: "send_failed" };
  }
}
