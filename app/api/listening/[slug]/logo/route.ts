import { NextResponse } from "next/server";
import { decodeDataUrl } from "@/lib/data-url";
import { getServiceSupabase, linkState, listeningLogo, resolveLinkRow } from "@/lib/listening-public";

/**
 * Logo de l'artiste sur un lien d'écoute : la page et le mail d'invitation.
 *
 * Mêmes règles que la pochette (`../cover/route.ts`) : servi depuis notre
 * domaine, rien pour un lien coupé ou expiré, et pas de contrôle du mot de
 * passe, puisque le proxy d'images de Gmail n'a pas le cookie d'accès. Le logo
 * est déjà un PNG de 320 px au plus : pas de variante pour le mail, le PNG
 * passe dans Outlook et garde sa transparence.
 *
 * Cache court : un logo retiré ou masqué doit disparaître vite.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);

  if (linkState(row) !== "ok" || !row || !row.show_logo) {
    return NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
  }

  const logo = await listeningLogo(supabase, row.user_id);
  const image = logo ? decodeDataUrl(logo) : null;
  if (!image) {
    return NextResponse.json({ error: "Pas de logo." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.type,
      "Content-Length": String(image.bytes.length),
      "Cache-Control": "public, max-age=300",
    },
  });
}
