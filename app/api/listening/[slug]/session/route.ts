import { NextRequest, NextResponse } from "next/server";
import {
  getServiceSupabase,
  hashIp,
  linkState,
  resolveLinkRow,
} from "@/lib/listening-public";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = (await req.json()) as { visitorName?: string; inviteId?: string };
  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);

  if (linkState(row) !== "ok" || !row) {
    return NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const visitorName = body.visitorName?.trim();

  const { data, error } = await supabase
    .from("user_listening_sessions")
    .insert({
      link_id: row.id,
      invite_id: body.inviteId ?? null,
      // Chaîne vide traitée comme une écoute anonyme assumée.
      visitor_name: visitorName && visitorName.length > 0 ? visitorName : null,
      user_agent: req.headers.get("user-agent") ?? "",
      ip_hash: hashIp(ip),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Première ouverture de l'invitation : c'est ce qui éteint la règle de relance.
  if (body.inviteId) {
    await supabase
      .from("user_listening_invites")
      .update({ first_opened_at: new Date().toISOString() })
      .eq("id", body.inviteId)
      .is("first_opened_at", null);
  }

  return NextResponse.json({ sessionId: (data as { id: string }).id });
}
