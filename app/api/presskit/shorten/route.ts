import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { randomBytes } from "crypto";

const SLUG_LENGTH = 8;
const SLUG_CHARS = "abcdefghijkmnopqrstuvwxyz23456789";

function generateSlug(): string {
  const bytes = randomBytes(SLUG_LENGTH);
  let slug = "";
  for (let i = 0; i < SLUG_LENGTH; i++) {
    slug += SLUG_CHARS[bytes[i]! % SLUG_CHARS.length];
  }
  return slug;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return NextResponse.json({ error: "Connecte-toi pour obtenir ton lien." }, { status: 401 });
    }

    const body = await req.json();
    const payload = body?.payload ?? body;

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Payload presskit manquant." }, { status: 400 });
    }

    const userId = user.id;

    const { data: existing } = await supabase
      .from("presskit_user_slugs")
      .select("slug")
      .eq("user_id", userId)
      .single();

    let slug: string;

    if (existing?.slug) {
      const { error: updateError } = await supabase
        .from("presskit_user_slugs")
        .update({ payload, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (updateError) {
        console.error("[Presskit shorten] Update error:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      slug = existing.slug;
    } else {
      slug = generateSlug();
      const maxAttempts = 10;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const { error: insertError } = await supabase
          .from("presskit_user_slugs")
          .insert({ user_id: userId, slug, payload });

        if (!insertError) break;
        if (insertError.code === "23505") {
          slug = generateSlug();
          continue;
        }
        console.error("[Presskit shorten] Insert error:", insertError);
        return NextResponse.json(
          {
            error:
              insertError.message?.includes("does not exist") || insertError.code === "42P01"
                ? "Table presskit_user_slugs manquante. Exécute la migration Supabase (20250207820000_presskit_user_slugs.sql)."
                : insertError.message || "Erreur serveur."
          },
          { status: 500 }
        );
      }
    }

    const origin = req.nextUrl.origin;
    const url = `${origin}/presskit/view/${slug}`;
    return NextResponse.json({ id: slug, url });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Presskit shorten] Error:", message);
    return NextResponse.json(
      { error: message || "Erreur serveur." },
      { status: 500 }
    );
  }
}
