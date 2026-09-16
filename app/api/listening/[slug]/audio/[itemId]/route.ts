import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DRIVE_BUCKET } from "@/lib/drive-db";
import {
  accessCookieName,
  getServiceSupabase,
  isAccessCookieValid,
  linkState,
  resolveLinkRow,
} from "@/lib/listening-public";

/** 5 minutes : une URL interceptée et repartagée est morte avant d'arriver. */
/* Un master WAV se lit en plusieurs minutes et le lecteur ne redemande pas
 * d'URL en cours de titre : à 5 min, une lecture longue ou un déplacement dans
 * la piste tombait sur une URL expirée. Une heure couvre la visite entière,
 * l'URL reste privée et n'apparaît jamais dans le HTML de la page. */
const SIGNED_URL_TTL_SECONDS = 3600;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  const { slug, itemId } = await params;
  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);

  // Revérification à chaque lecture : un lien expiré ou coupé pendant la
  // session cesse immédiatement de servir de l'audio.
  if (linkState(row) !== "ok" || !row) {
    return NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
  }

  if (row.password_hash) {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(accessCookieName(slug))?.value;
    if (!isAccessCookieValid(cookie, slug, row.password_hash)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
    }
  }

  const { data: item } = await supabase
    .from("user_listening_link_items")
    .select("audio_path")
    .eq("id", itemId)
    .eq("link_id", row.id)
    .maybeSingle();

  const audioPath = (item as { audio_path?: string } | null)?.audio_path;
  if (!audioPath) {
    return NextResponse.json({ error: "Titre introuvable." }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(DRIVE_BUCKET)
    .createSignedUrl(audioPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    return NextResponse.json({ error: "Fichier indisponible." }, { status: 500 });
  }

  return NextResponse.json({
    url: data.signedUrl,
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}
