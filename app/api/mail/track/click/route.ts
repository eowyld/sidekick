import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * Redirige vers l'URL cible et enregistre un clic pour la campagne.
 * Query params:
 * - token: base64url(campaignId)
 * - url: URL de destination (encodée)
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const destEncoded = url.searchParams.get("url");

  if (!destEncoded) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  let dest: string;
  try {
    dest = decodeURIComponent(destEncoded);
  } catch {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  if (!token) {
    return NextResponse.redirect(dest);
  }

  try {
    const paddedToken = token + "=".repeat((4 - (token.length % 4)) % 4);
    const campaignId = Buffer.from(paddedToken, "base64url").toString("utf-8");
    if (!campaignId) {
      return NextResponse.redirect(dest);
    }

    const supabase = await createServerSupabase();
    const { data: campaign } = await supabase
      .from("mailing_campaigns")
      .select("envoyes, clics")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaign) {
      const envoyes = campaign.envoyes ?? 0;
      const anciensClics = campaign.clics ?? 0;
      const nouveauxClics = anciensClics + 1;
      const pctClics =
        envoyes > 0 ? Math.round((nouveauxClics * 10000) / envoyes) / 100 : 0;

      await supabase
        .from("mailing_campaigns")
        .update({
          clics: nouveauxClics,
          pct_clics: pctClics,
          updated_at: new Date().toISOString()
        })
        .eq("id", campaignId);
    }
  } catch (e) {
    console.error("[Track click] Error:", e);
  }

  return NextResponse.redirect(dest);
}
