import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * Injecte un pixel de tracking dans le HTML de l'email.
 * Génère un token unique pour chaque destinataire.
 */
function injectTrackingPixel(
  html: string,
  campaignId: string,
  to: string | string[],
  userId: string,
  origin: string
): string {
  // Générer un token unique pour cette campagne et cet utilisateur
  // Format: base64url(campaignId|userId|timestamp)
  const timestamp = Date.now();
  const tokenData = `${campaignId}|${userId}|${timestamp}`;
  const token = Buffer.from(tokenData)
    .toString("base64url")
    .replace(/=/g, "");

  const trackingPixelUrl = `${origin}/api/mail/track/open?token=${token}`;
  
  // Pixel invisible 1x1
  const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
  
  // Injecter le pixel à la fin du body, ou créer un body si nécessaire
  if (html.includes("</body>")) {
    return html.replace("</body>", `${trackingPixel}</body>`);
  } else {
    // Si pas de body, ajouter le pixel à la fin
    return `${html}${trackingPixel}`;
  }
}

/**
 * Enveloppe tous les liens <a href="..."> avec une URL de redirection pour tracker les clics.
 */
function injectClickTracking(html: string, campaignId: string, origin: string): string {
  const token = Buffer.from(campaignId, "utf-8").toString("base64url").replace(/=/g, "");
  const clickBase = `${origin}/api/mail/track/click`;
  return html.replace(
    /<a\s+([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (_match, before: string, url: string, after: string) => {
      if (url.startsWith("mailto:") || url.startsWith("#")) return _match;
      const trackedUrl = `${clickBase}?token=${token}&url=${encodeURIComponent(url)}`;
      return `<a ${before}href="${trackedUrl}"${after}>`;
    }
  );
}

/**
 * Route API pour envoyer un email via Gmail ou Outlook.
 * Body attendu:
 * {
 *   to: string | string[],
 *   subject: string,
 *   html: string,
 *   fromEmail: string,
 *   campaignId?: string (optionnel, pour le tracking)
 *   campaignName?: string (optionnel, pour l'historique)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, fromEmail, campaignId, campaignName } = body;

    if (!to || !subject || !html || !fromEmail) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html, fromEmail" },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur et ses métadonnées
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const meta = user.user_metadata ?? {};
    const mailFrom = meta.mail_from as string | null;
    const gmailEmail = (meta.gmail_email as string | null) ?? (mailFrom && mailFrom.includes("gmail") ? mailFrom : null);
    const outlookEmail = (meta.outlook_email as string | null) ?? (mailFrom && (mailFrom.includes("outlook") || mailFrom.includes("hotmail")) ? mailFrom : null);
    const hasGmail = !!(meta.gmail_refresh_token as string | undefined);
    const hasOutlook = !!(meta.outlook_refresh_token as string | undefined);

    const connectedEmails: string[] = [];
    if (hasGmail && gmailEmail) connectedEmails.push(gmailEmail);
    if (hasOutlook && outlookEmail) connectedEmails.push(outlookEmail);

    if (!connectedEmails.includes(fromEmail)) {
      return NextResponse.json(
        { error: "Adresse d'envoi non connectée. Choisis une adresse connectée dans Paramètres > Configuration mail." },
        { status: 400 }
      );
    }

    let mailProvider: "gmail" | "outlook" | null = null;
    if (fromEmail.endsWith("@gmail.com") || (hasGmail && gmailEmail === fromEmail)) {
      mailProvider = "gmail";
    } else if (fromEmail.includes("@outlook.") || fromEmail.includes("@hotmail.") || (hasOutlook && outlookEmail === fromEmail)) {
      mailProvider = "outlook";
    }

    if (!mailProvider) {
      return NextResponse.json(
        { error: "Unsupported email provider. Connect Gmail or Outlook." },
        { status: 400 }
      );
    }

    const refreshTokenKey = mailProvider === "gmail" ? "gmail_refresh_token" : "outlook_refresh_token";
    const refreshToken = meta[refreshTokenKey] as string | null;

    if (!refreshToken) {
      return NextResponse.json(
        { error: `Compte ${mailProvider} non connecté. Reconnecte l'adresse dans Paramètres > Configuration mail.` },
        { status: 400 }
      );
    }

    // Injecter le pixel d'ouverture et le tracking des clics sur les liens si campaignId est fourni
    let htmlWithTracking = html;
    if (campaignId) {
      const origin = req.nextUrl.origin;
      htmlWithTracking = injectTrackingPixel(htmlWithTracking, campaignId, to, user.id, origin);
      htmlWithTracking = injectClickTracking(htmlWithTracking, campaignId, origin);
    }

    // Envoyer l'email selon le provider
    let sendResult: NextResponse;
    if (mailProvider === "gmail") {
      sendResult = await sendViaGmail(
        refreshToken,
        fromEmail,
        to,
        subject,
        htmlWithTracking
      );
    } else {
      sendResult = await sendViaOutlook(
        refreshToken,
        fromEmail,
        to,
        subject,
        htmlWithTracking
      );
    }

    // Si l'envoi a échoué, renvoyer tel quel
    if (!sendResult.ok) {
      return sendResult;
    }

    // Mettre à jour / créer la campagne dans Supabase si un campaignId est fourni
    if (campaignId) {
      try {
        const toArray = Array.isArray(to) ? to : [to];
        const envoyes = toArray.length;

        const { error: upsertError } = await supabase
          .from("mailing_campaigns")
          .upsert(
            {
              id: campaignId,
              user_id: user.id,
              name: campaignName || subject || "Campagne sans nom",
              date_envoi: new Date().toISOString(),
              envoyes,
              from_email: fromEmail,
              subject,
              accroche: body.accroche ?? null,
              content_html: html
            },
            { onConflict: "id" }
          );

        if (upsertError) {
          console.error(
            "[Send email] Failed to upsert mailing_campaigns:",
            upsertError.message
          );
        }
      } catch (e) {
        console.error("[Send email] Unexpected error upserting campaign:", e);
      }
    }

    return sendResult;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Send email] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Envoie un email via l'API Gmail
 */
async function sendViaGmail(
  refreshToken: string,
  fromEmail: string,
  to: string | string[],
  subject: string,
  html: string
) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Google OAuth credentials not configured" },
      { status: 500 }
    );
  }

  // 1) Échanger le refresh_token contre un access_token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token"
    })
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("[Send email] Gmail token refresh failed:", tokenRes.status, errText);
    return NextResponse.json(
      { error: "Failed to refresh Gmail access token" },
      { status: 500 }
    );
  }

  const { access_token } = await tokenRes.json();

  // 2) Construire le message email au format RFC 2822
  const toArray = Array.isArray(to) ? to : [to];
  const toHeader = toArray.join(", ");
  
  const emailContent = [
    `To: ${toHeader}`,
    `From: ${fromEmail}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    html
  ].join("\r\n");

  // Encoder en base64url (Gmail exige base64url, pas base64)
  const encodedMessage = Buffer.from(emailContent)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // 3) Envoyer via l'API Gmail
  const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      raw: encodedMessage
    })
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text();
    console.error("[Send email] Gmail send failed:", sendRes.status, errText);
    return NextResponse.json(
      { error: "Failed to send email via Gmail API" },
      { status: 500 }
    );
  }

  const result = await sendRes.json();
  return NextResponse.json({ success: true, messageId: result.id });
}

/**
 * Envoie un email via l'API Microsoft Graph (Outlook)
 */
async function sendViaOutlook(
  refreshToken: string,
  fromEmail: string,
  to: string | string[],
  subject: string,
  html: string
) {
  const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Microsoft OAuth credentials not configured" },
      { status: 500 }
    );
  }

  // 1) Échanger le refresh_token contre un access_token
  const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token"
    })
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("[Send email] Outlook token refresh failed:", tokenRes.status, errText);
    return NextResponse.json(
      { error: "Failed to refresh Outlook access token" },
      { status: 500 }
    );
  }

  const { access_token } = await tokenRes.json();

  // 2) Construire le message pour Microsoft Graph
  const toArray = Array.isArray(to) ? to : [to];
  const recipients = toArray.map((email) => ({
    emailAddress: {
      address: email
    }
  }));

  // 3) Envoyer via Microsoft Graph API
  const sendRes = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: {
        subject,
        body: {
          contentType: "HTML",
          content: html
        },
        toRecipients: recipients
      }
    })
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text();
    console.error("[Send email] Outlook send failed:", sendRes.status, errText);
    return NextResponse.json(
      { error: "Failed to send email via Outlook API" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
