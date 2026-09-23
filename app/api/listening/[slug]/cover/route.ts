import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { DRIVE_BUCKET } from "@/lib/drive-db";
import { getServiceSupabase, linkState, resolveLinkRow } from "@/lib/listening-public";
import { streamStorageFile } from "@/lib/storage-stream";
import { decodeDataUrl } from "@/lib/data-url";

/**
 * Pochette d'un lien d'écoute.
 *
 * Servie depuis notre domaine pour la même raison que l'audio : la charge
 * utile du lien envoyé à un label ne doit renvoyer vers aucune URL Supabase.
 * Un lien coupé ou expiré n'a plus de pochette non plus.
 *
 * Le mot de passe, lui, ne s'applique pas ici (21/09) : le mail d'invitation
 * affiche la pochette, et le proxy d'images de Gmail n'a pas le cookie
 * d'accès. Le mot de passe protège l'écoute ; la pochette est déjà montrée
 * à ceux qui ont reçu le lien, les seuls à en connaître le slug.
 *
 * `?format=jpeg` : variante du mail. Outlook sur ordinateur n'affiche pas le
 * WebP, et une data: URL n'est affichée par aucun client : on réencode en JPEG,
 * au double de la largeur affichée (520 px) pour les écrans Retina.
 */
const MAIL_COVER_WIDTH = 1040;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);

  if (linkState(row) !== "ok" || !row?.cover_path) {
    return NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
  }

  const dataUrl = row.cover_path.startsWith("data:") ? decodeDataUrl(row.cover_path) : null;
  if (row.cover_path.startsWith("data:") && !dataUrl) {
    return NextResponse.json({ error: "Pochette illisible." }, { status: 404 });
  }

  if (req.nextUrl.searchParams.get("format") === "jpeg") {
    let source: Buffer;
    if (dataUrl) {
      source = dataUrl.bytes;
    } else {
      const { data, error } = await supabase.storage.from(DRIVE_BUCKET).download(row.cover_path);
      if (error || !data) {
        return NextResponse.json({ error: "Pochette introuvable." }, { status: 404 });
      }
      source = Buffer.from(await data.arrayBuffer());
    }
    try {
      const jpeg = await sharp(source)
        .rotate()
        .resize({ width: MAIL_COVER_WIDTH, withoutEnlargement: true })
        .flatten({ background: "#171717" })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
      return new NextResponse(new Uint8Array(jpeg), {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(jpeg.length),
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch {
      return NextResponse.json({ error: "Pochette illisible." }, { status: 422 });
    }
  }

  // Pochette importée en data: URL (stockée telle quelle dans la ligne) : un
  // <img> hors navigateur ne la lit pas, on la sert en binaire.
  if (dataUrl) {
    return new NextResponse(new Uint8Array(dataUrl.bytes), {
      headers: {
        "Content-Type": dataUrl.type,
        "Content-Length": String(dataUrl.bytes.length),
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return streamStorageFile(supabase, row.cover_path, {
    range: req.headers.get("range"),
  });
}
