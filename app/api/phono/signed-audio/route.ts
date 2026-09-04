// app/api/phono/signed-audio/route.ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { DRIVE_BUCKET } from "@/lib/drive-db";

/** Durée de vie d'une URL de lecture. Assez longue pour un titre, assez courte
 *  pour qu'une URL qui fuite ne serve pas indéfiniment. */
const SIGNED_URL_TTL_SECONDS = 3600;

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let audioPath: unknown;
  try {
    ({ audioPath } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  if (typeof audioPath !== "string" || !audioPath) {
    return NextResponse.json({ error: "audioPath manquant." }, { status: 400 });
  }

  // Le premier segment du chemin est l'id du propriétaire. Le vérifier ici
  // évite qu'un utilisateur signe le fichier d'un autre : les policies RLS ne
  // s'appliquent pas à createSignedUrl côté serveur.
  if (audioPath.split("/")[0] !== userId) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from(DRIVE_BUCKET)
    .createSignedUrl(audioPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  });
}
