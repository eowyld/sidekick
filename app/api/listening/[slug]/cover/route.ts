import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  accessCookieName,
  getServiceSupabase,
  isAccessCookieValid,
  linkState,
  resolveLinkRow,
} from "@/lib/listening-public";
import { streamStorageFile } from "@/lib/storage-stream";

/**
 * Pochette d'un lien d'écoute.
 *
 * Servie depuis notre domaine pour la même raison que l'audio : la charge
 * utile du lien envoyé à un label ne doit renvoyer vers aucune URL Supabase.
 * Les mêmes contrôles s'appliquent — un lien coupé ou expiré n'a plus de
 * pochette non plus.
 */
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

  if (row.password_hash) {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(accessCookieName(slug))?.value;
    if (!isAccessCookieValid(cookie, slug, row.password_hash)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
    }
  }

  return streamStorageFile(supabase, row.cover_path, {
    range: req.headers.get("range"),
  });
}
