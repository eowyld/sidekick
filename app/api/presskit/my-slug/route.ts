import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/** GET: retourne le slug et l’URL du presskit de l’utilisateur connecté (lecture seule, très rapide). */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return NextResponse.json({ slug: null, url: null });
    }

    const { data } = await supabase
      .from("presskit_user_slugs")
      .select("slug")
      .eq("user_id", user.id)
      .single();

    if (!data?.slug) {
      return NextResponse.json({ slug: null, url: null });
    }

    const origin = req.nextUrl.origin;
    const url = `${origin}/presskit/view/${data.slug}`;
    return NextResponse.json({ slug: data.slug, url });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Presskit my-slug] Error:", message);
    return NextResponse.json({ slug: null, url: null });
  }
}
