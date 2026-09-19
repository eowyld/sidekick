const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/**
 * Expéditeur par défaut. **Doit être un expéditeur vérifié côté Brevo**, sinon
 * rien ne part.
 *
 * 🔴 Le piège, rencontré le 18/09 : Brevo **accepte** l'appel API (2xx, avec un
 * `messageId`) puis rejette l'envoi de façon asynchrone si l'expéditeur n'est
 * pas validé. `sendEmail` renvoie donc `{ ok: true }`, aucune erreur n'apparaît
 * nulle part, et le message n'arrive jamais. Le motif ne se lit que dans les
 * événements du compte : « Sending has been rejected because the sender you
 * used … is not valid ».
 *
 * La valeur de repli est l'adresse technique du domaine, authentifiée
 * SPF/DKIM — jamais une adresse personnelle, qui ne sera jamais vérifiée côté
 * Brevo et qui casserait les trois envois de l'app d'un coup.
 */
const DEFAULT_FROM =
  process.env.BREVO_FROM?.trim() || "no-reply@sidekickartists.com";

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

    // Un 2xx veut dire « accepté », pas « remis » : le rejet éventuel arrive
    // ensuite, hors de cette requête. On trace le `messageId` pour pouvoir
    // relier un message manquant à son événement côté Brevo.
    const accepted = (await response.json().catch(() => null)) as
      | { messageId?: string }
      | null;
    console.info(
      `[brevo] accepté pour ${args.to} (${accepted?.messageId ?? "sans messageId"}), expéditeur ${DEFAULT_FROM}`
    );

    return { ok: true };
  } catch (error) {
    console.error("[brevo] envoi impossible", error);
    return { ok: false, reason: "send_failed" };
  }
}
