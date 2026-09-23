import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, linkState, resolveLinkRow } from "@/lib/listening-public";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = (await req.json()) as {
    sessionId?: string;
    itemId?: string;
    kind?: "play" | "progress" | "download";
    listenedMsDelta?: number;
    positionMs?: number;
    completed?: boolean;
  };

  if (!body.sessionId || !body.itemId || !body.kind) {
    return NextResponse.json({ error: "Requête incomplète." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);
  if (linkState(row) !== "ok" || !row) {
    return NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
  }

  // La session doit appartenir à ce lien : sans cette vérification, un
  // identifiant de session suffirait à écrire des statistiques ailleurs.
  const { data: session } = await supabase
    .from("user_listening_sessions")
    .select("id")
    .eq("id", body.sessionId)
    .eq("link_id", row.id)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "Session inconnue." }, { status: 404 });
  }

  const { error } = await supabase.rpc("listening_record_event", {
    p_session_id: body.sessionId,
    p_item_id: body.itemId,
    p_kind: body.kind,
    p_listened_ms_delta: Math.max(0, Math.round(body.listenedMsDelta ?? 0)),
    p_position_ms: Math.max(0, Math.round(body.positionMs ?? 0)),
    p_completed: Boolean(body.completed),
  });

  if (error) {
    console.error("[listening/event] écriture refusée", error.message);
    return NextResponse.json({ error: "L’écoute n’a pas pu être enregistrée." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
