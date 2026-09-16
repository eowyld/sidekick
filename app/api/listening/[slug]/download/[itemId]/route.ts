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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  const { slug, itemId } = await params;
  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);

  if (linkState(row) !== "ok" || !row) {
    return NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
  }

  // Le contrôle est ici, jamais côté client : masquer le bouton ne protège rien.
  if (!row.allow_download) {
    return NextResponse.json(
      { error: "Téléchargement désactivé." },
      { status: 403 }
    );
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
    .select("audio_path, snapshot")
    .eq("id", itemId)
    .eq("link_id", row.id)
    .maybeSingle();

  const audioPath = (item as { audio_path?: string } | null)?.audio_path;
  if (!audioPath) {
    return NextResponse.json({ error: "Titre introuvable." }, { status: 404 });
  }

  const title = (
    (item as { snapshot?: { title?: string } } | null)?.snapshot?.title ?? "titre"
  ).replace(/[^a-zA-Z0-9._-]/g, "-");
  const extension = audioPath.includes(".")
    ? audioPath.slice(audioPath.lastIndexOf("."))
    : "";

  const { data, error } = await supabase.storage
    .from(DRIVE_BUCKET)
    .createSignedUrl(audioPath, 60, { download: `${title}${extension}` });

  if (error || !data) {
    return NextResponse.json({ error: "Fichier indisponible." }, { status: 500 });
  }

  const sessionId = req.nextUrl.searchParams.get("session");
  if (sessionId) {
    await supabase.rpc("listening_record_event", {
      p_session_id: sessionId,
      p_item_id: itemId,
      p_kind: "download",
      p_listened_ms_delta: 0,
      p_position_ms: 0,
      p_completed: false,
    });
  }

  return NextResponse.redirect(data.signedUrl);
}
