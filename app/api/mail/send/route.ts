import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { tooManyRequests } from "@/lib/rate-limit";
import { rateLimitShared } from "@/lib/rate-limit-shared";
import { classifyRefreshFailure, isUsableRefreshToken } from "@/lib/mail-refresh-error";
import { readMailRefreshToken } from "@/lib/mail-connections";

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
/**
 * Le client envoie tous les contacts d'un segment en un seul appel, sans
 * découpage : la borne doit couvrir une vraie liste d'artiste indépendant tout
 * en gardant un plafond. À revoir le jour où l'envoi sera découpé en lots.
 */
const MAX_RECIPIENTS_PER_CALL = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, fromEmail, campaignId, campaignName } = body;

    if (!to || !subject || !html || !fromEmail) {
      return NextResponse.json(
        { error: "Il manque un destinataire, un objet, un message ou une adresse d'envoi." },
        { status: 400 }
      );
    }

    // `to` n'était pas borné : un seul appel pouvait viser des milliers
    // d'adresses, contournant la limite de débit qui compte les appels.
    const recipients = Array.isArray(to) ? to : [to];
    if (
      recipients.length === 0 ||
      recipients.length > MAX_RECIPIENTS_PER_CALL ||
      !recipients.every((r) => typeof r === "string" && EMAIL_PATTERN.test(r))
    ) {
      return NextResponse.json(
        {
          error: `Destinataires invalides : ${MAX_RECIPIENTS_PER_CALL} adresses valides au maximum par envoi.`,
          recipientCount: recipients.length,
        },
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
      return NextResponse.json({ error: "Ta session a expiré. Reconnecte-toi." }, { status: 401 });
    }

    // Un envoi de campagne part de la boîte de l'utilisateur : une boucle
    // grillerait son quota Gmail et abîmerait sa réputation d'expéditeur.
    const limit = await rateLimitShared({
      key: `mail-send:${user.id}`,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return tooManyRequests(limit.retryAfter);
    }

    const meta = user.user_metadata ?? {};
    const mailFrom = meta.mail_from as string | null;
    const gmailEmail = (meta.gmail_email as string | null) ?? (mailFrom && mailFrom.includes("gmail") ? mailFrom : null);
    const outlookEmail = (meta.outlook_email as string | null) ?? (mailFrom && (mailFrom.includes("outlook") || mailFrom.includes("hotmail")) ? mailFrom : null);
    const hasGmail = isUsableRefreshToken(meta.gmail_refresh_token);
    const hasOutlook = isUsableRefreshToken(meta.outlook_refresh_token);

    const connectedEmails: string[] = [];
    if (hasGmail && gmailEmail) connectedEmails.push(gmailEmail);
    if (hasOutlook && outlookEmail) connectedEmails.push(outlookEmail);

    if (!connectedEmails.includes(fromEmail)) {
      return NextResponse.json(
        { error: "Adresse d'envoi non connectée. Choisis une adresse connectée dans Paramètres > Intégrations." },
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
        { error: "Cette adresse d'envoi n'est pas prise en charge. Connecte Gmail dans Paramètres > Intégrations." },
        { status: 400 }
      );
    }

    // La table d'abord, les métadonnées en repli (transition du 21/09). La
    // connexion elle-même reste décidée par les métadonnées ci-dessus : une
    // adresse déconnectée ne repart pas depuis une ligne de table oubliée.
    const refreshTokenKey = mailProvider === "gmail" ? "gmail_refresh_token" : "outlook_refresh_token";
    const metaToken = meta[refreshTokenKey];
    const refreshToken =
      (await readMailRefreshToken(user.id, mailProvider)) ??
      (isUsableRefreshToken(metaToken) ? metaToken : null);

    if (!refreshToken) {
      return NextResponse.json(
        { error: `Compte ${mailProvider} non connecté. Reconnecte l'adresse dans Paramètres > Intégrations.` },
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
    // Le détail technique reste dans les journaux : l'écran reçoit une phrase.
    return NextResponse.json({ error: "L'envoi a échoué. Réessaie dans un instant." }, { status: 500 });
  }
}

/**
 * Refus de l'échange du refresh token. `invalid_grant` est définitif (token
 * révoqué, expiré ou app Google en mode test) : seule une reconnexion règle le
 * problème, on le signale donc avec un code que l'interface sait exploiter.
 */
async function refreshFailure(provider: "Gmail" | "Outlook", res: Response) {
  const errText = await res.text();
  console.error(`[Send email] ${provider} token refresh failed:`, res.status, errText);

  if (classifyRefreshFailure(errText) === "reauth_required") {
    return NextResponse.json(
      {
        error: `La connexion à ${provider} a expiré. Reconnecte ton adresse pour envoyer des mails.`,
        code: "mail_reauth_required",
        provider: provider.toLowerCase(),
      },
      { status: 401 }
    );
  }
  return NextResponse.json(
    { error: `Impossible de se connecter à ${provider}. Réessaie, ou reconnecte ton adresse dans Paramètres > Intégrations.` },
    { status: 502 }
  );
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
      { error: "L'envoi par Gmail n'est pas configuré sur le serveur." },
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

  if (!tokenRes.ok) return refreshFailure("Gmail", tokenRes);

  const { access_token } = await tokenRes.json();

  // 2) Construire le message email au format RFC 2822
  const toArray = Array.isArray(to) ? to : [to];
  const toHeader = toArray.join(", ");

  // Un en-tête ne peut porter que de l'ASCII : sans l'encodage RFC 2047, les
  // accents de l'objet arrivaient en « Ã© ». Le corps passe en base64 pour la
  // même raison, faute de quoi il est lu comme du 7 bits.
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
  const encodedBody = Buffer.from(html, "utf-8")
    .toString("base64")
    .replace(/.{76}/g, "$&\r\n");

  const emailContent = [
    `MIME-Version: 1.0`,
    `To: ${toHeader}`,
    `From: ${fromEmail}`,
    `Subject: ${encodedSubject}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    encodedBody
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
      { error: "Gmail a refusé l'envoi. Réessaie dans un instant." },
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
      { error: "L'envoi par Outlook n'est pas configuré sur le serveur." },
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

  if (!tokenRes.ok) return refreshFailure("Outlook", tokenRes);

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
      { error: "Outlook a refusé l'envoi. Réessaie dans un instant." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
