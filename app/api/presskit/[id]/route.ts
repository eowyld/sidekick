import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID manquant." }, { status: 400 });
    }

    const supabase = await createServerSupabase();

    const { data: bySlug } = await supabase
      .from("presskit_user_slugs")
      .select("payload")
      .eq("slug", id)
      .single();

    if (bySlug?.payload) {
      return NextResponse.json({ payload: bySlug.payload });
    }

    const { data: byId } = await supabase
      .from("presskit_links")
      .select("payload")
      .eq("id", id)
      .single();

    if (byId?.payload) {
      return NextResponse.json({ payload: byId.payload });
    }

    return NextResponse.json({ error: "Lien introuvable." }, { status: 404 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Presskit get] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
