/**
 * Images stockées en data URL dans une ligne (pochette importée, logo) : un
 * <img> hors navigateur (proxy d'images d'un client mail) ne les lit pas, les
 * routes publiques les servent en binaire.
 */
export function decodeDataUrl(value: string): { bytes: Buffer; type: string } | null {
  const match = value.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match || !match[2]) return null;
  const bytes = Buffer.from(match[3], "base64");
  return { bytes, type: sniffImageType(bytes) ?? match[1] ?? "image/jpeg" };
}

/** Le type déclaré ment parfois (du WebP étiqueté `image/jpeg`) : on lit l'en-tête. */
function sniffImageType(bytes: Buffer): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes.subarray(0, 4).toString("hex") === "89504e47") return "image/png";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (bytes.subarray(0, 3).toString("ascii") === "GIF") return "image/gif";
  return null;
}
