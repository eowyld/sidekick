import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * Route API pour tracker les ouvertures d'emails.
 * Sert un pixel transparent 1x1 et enregistre l'ouverture.
 * 
 * Query params:
 * - token: token unique identifiant l'email (campaignId|userId|timestamp en base64url)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      // Retourner un pixel transparent même sans token (pour éviter les erreurs)
      return serveTrackingPixel();
    }

    // Décoder le token pour récupérer campaignId et userId
    try {
      // Ajouter le padding si nécessaire pour base64url
      const paddedToken = token + "=".repeat((4 - (token.length % 4)) % 4);
      const decoded = Buffer.from(paddedToken, "base64url").toString("utf-8");
      const [campaignId, userId, timestamp] = decoded.split("|");

      if (!campaignId || !userId) {
        return serveTrackingPixel();
      }

      // Mettre à jour les stats d'ouverture dans Supabase
      const supabase = await createServerSupabase();

      // Récupérer la campagne actuelle
      const { data: campaign, error } = await supabase
        .from("mailing_campaigns")
        .select("envoyes, ouverts")
        .eq("id", campaignId)
        .maybeSingle();

      if (!error && campaign) {
        const envoyes = campaign.envoyes ?? 0;
        const anciensOuverts = campaign.ouverts ?? 0;
        const nouveauxOuverts = anciensOuverts + 1;
        const pctOuverture =
          envoyes > 0 ? Math.round((nouveauxOuverts * 10000) / envoyes) / 100 : 0;

        const { error: updateError } = await supabase
          .from("mailing_campaigns")
          .update({
            ouverts: nouveauxOuverts,
            pct_ouverture: pctOuverture,
            updated_at: new Date().toISOString()
          })
          .eq("id", campaignId);

        if (updateError) {
          console.error(
            "[Track open] Failed to update mailing_campaigns:",
            updateError.message
          );
        }
      }

      console.log(
        `[Track open] Email opened - Campaign: ${campaignId}, User: ${userId}, Timestamp: ${timestamp}`
      );

    } catch (e) {
      // Token invalide, servir quand même le pixel
      console.error("[Track open] Invalid token:", e);
    }

    return serveTrackingPixel();
  } catch (e) {
    // En cas d'erreur, servir quand même le pixel pour ne pas bloquer l'email
    return serveTrackingPixel();
  }
}

/**
 * Retourne un pixel transparent 1x1 (GIF)
 */
function serveTrackingPixel() {
  // Pixel GIF transparent 1x1
  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  return new NextResponse(pixel, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}
