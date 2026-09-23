import { formatDuration } from "@/lib/audio-peaks";
import type { ListeningLink } from "@/lib/listening-types";

/**
 * Mail d'invitation à un lien d'écoute.
 *
 * Mise en page en tableaux et styles en ligne : c'est le seul HTML que Gmail,
 * Outlook et Apple Mail rendent de la même façon. Couleurs en hexadécimal plein,
 * Outlook ignore `rgba()`.
 */

const MAX_LISTED_ITEMS = 8;

const C = {
  page: "#0b0b0b",
  card: "#171717",
  line: "#2a2a2a",
  text: "#f5f5f5",
  body: "#d6d6d6",
  muted: "#8f8f8f",
  accent: "#F0FF00",
  onAccent: "#101010",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * URL de pochette lisible par le proxy d'images du destinataire, ou rien.
 * Toujours servie par `/cover` en JPEG, y compris pour une data: URL (que
 * Gmail n'affiche pas), du WebP (qu'Outlook n'affiche pas) et un lien sous
 * mot de passe (la route ne l'exige pas).
 */
export function inviteCoverUrl(link: ListeningLink, origin: string): string | null {
  if (!link.coverPath) return null;
  if (/^https?:/.test(link.coverPath)) return link.coverPath;
  return `${origin}/api/listening/${encodeURIComponent(link.slug)}/cover?format=jpeg`;
}

export function inviteEmailHtml(options: {
  link: ListeningLink;
  message: string;
  url: string;
  origin: string;
  artistName: string;
  recipientName: string;
  /** Route du logo, absente s'il n'y en a pas ou que le réglage l'a masqué ici. */
  logoUrl?: string;
}): string {
  const { link, message, url, origin, artistName, recipientName, logoUrl } = options;
  const title = link.title.trim() || "Écoute privée";
  const cover = inviteCoverUrl(link, origin);
  const items = [...link.items].sort((a, b) => a.position - b.position);
  const listed = items.slice(0, MAX_LISTED_ITEMS);
  const hidden = items.length - listed.length;

  const paragraphs = message
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.body}">${escape(block).replace(/\n/g, "<br />")}</p>`
    )
    .join("");

  const preheader = escape(message.replace(/\s+/g, " ").trim().slice(0, 120));

  const coverRow = cover
    ? `<tr><td style="padding:0"><img src="${escape(cover)}" width="520" alt="${escape(title)}" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:12px 12px 0 0" /></td></tr>`
    : "";

  const logoRow = logoUrl
    ? `<img src="${escape(logoUrl)}" height="32" alt="${escape(artistName.trim())}" style="display:block;height:32px;width:auto;max-width:200px;border:0;margin:0 0 8px" />`
    : "";

  const trackRows = listed
    .map((item, index) => {
      const version = item.snapshot.versionLabel
        ? ` <span style="color:${C.muted}">(${escape(item.snapshot.versionLabel)})</span>`
        : "";
      const duration = item.durationMs > 0 ? formatDuration(item.durationMs) : "";
      return `<tr>
  <td width="28" style="padding:10px 0;border-top:1px solid ${C.line};font-size:13px;color:${C.muted};vertical-align:top">${index + 1}</td>
  <td style="padding:10px 0;border-top:1px solid ${C.line};font-size:14px;color:${C.text};vertical-align:top">${escape(item.snapshot.title || "Sans titre")}${version}</td>
  <td align="right" style="padding:10px 0;border-top:1px solid ${C.line};font-size:13px;color:${C.muted};vertical-align:top;white-space:nowrap">${duration}</td>
</tr>`;
    })
    .join("");

  const moreRow =
    hidden > 0
      ? `<tr><td></td><td colspan="2" style="padding:10px 0;border-top:1px solid ${C.line};font-size:13px;color:${C.muted}">et ${hidden} autre${hidden > 1 ? "s" : ""} titre${hidden > 1 ? "s" : ""}</td></tr>`
      : "";

  const notes: string[] = [];
  if (recipientName.trim()) notes.push(`Lien personnel, réservé à ${escape(recipientName.trim())}.`);
  if (link.hasPassword) notes.push("Un mot de passe est demandé à l'ouverture.");
  if (link.expiresAt) {
    const date = new Date(link.expiresAt).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    notes.push(`Disponible jusqu'au ${date}.`);
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>${escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:520px;font-family:${FONT}">

<tr><td style="padding:0 4px 24px">${paragraphs}</td></tr>

<tr><td>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.card};border:1px solid ${C.line};border-radius:12px">
${coverRow}
<tr><td style="padding:24px 24px 8px">
  ${logoRow}
  <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:${C.accent}">Écoute privée</p>
  <p style="margin:0;font-size:22px;font-weight:700;line-height:1.25;color:${C.text}">${escape(title)}</p>
  ${artistName.trim() ? `<p style="margin:4px 0 0;font-size:15px;color:${C.muted}">${escape(artistName.trim())}</p>` : ""}
</td></tr>
${
  trackRows
    ? `<tr><td style="padding:12px 24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${trackRows}${moreRow}</table></td></tr>`
    : ""
}
<tr><td style="padding:24px 24px 8px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="border-radius:999px;background:${C.accent}">
      <a href="${escape(url)}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:${C.onAccent};text-decoration:none;border-radius:999px">Écouter</a>
    </td>
  </tr></table>
</td></tr>
<tr><td style="padding:8px 24px 24px">
  ${notes.length ? `<p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${C.muted}">${notes.join(" ")}</p>` : ""}
  <p style="margin:0;font-size:12px;line-height:1.5;color:${C.muted}">Si le bouton ne s'ouvre pas : <a href="${escape(url)}" style="color:${C.text};word-break:break-all">${escape(url)}</a></p>
</td></tr>
</table>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
