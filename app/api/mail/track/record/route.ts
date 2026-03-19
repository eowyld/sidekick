import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * Route API pour enregistrer une ouverture d'email.
 * Cette route sera appelée depuis le pixel de tracking.
 * 
 * Body:
 * {
 *   campaignId: string,
 *   email: string (optionnel, pour identifier le destinataire)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaignId, email } = body;

    if (!campaignId) {
      return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
    }

    // Récupérer l'utilisateur
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Retourner les données pour que le client les stocke dans localStorage
    // Le client mettra à jour les stats de la campagne
    return NextResponse.json({
      success: true,
      campaignId,
      email,
      openedAt: new Date().toISOString()
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Record open] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
