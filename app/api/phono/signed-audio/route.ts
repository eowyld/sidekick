// app/api/phono/signed-audio/route.ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { DRIVE_BUCKET, driveFileHref } from "@/lib/drive-db";

/**
 * Donne au lecteur l'adresse de lecture d'un fichier du Drive.
 *
 * L'adresse rendue est celle de `/api/drive/file`, sur notre domaine : elle ne
 * porte aucune URL Supabase et ne périme pas, c'est la session qui décide.
 * La route reste utile malgré ça — elle vérifie le propriétaire et l'existence
 * du fichier avant la lecture, ce qui donne un message clair plutôt qu'un
 * lecteur muet.
 */

/** Horizon rendu au cache du client. La session expire bien avant. */
const URL_LIFETIME_MS = 12 * 3600 * 1000;

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

  // Existence vérifiée sans signer quoi que ce soit : `list` sur le dossier
  // parent suffit, et l'erreur remonte ici plutôt que dans le lecteur.
  const lastSlash = audioPath.lastIndexOf("/");
  const folder = audioPath.slice(0, lastSlash);
  const fileName = audioPath.slice(lastSlash + 1);
  const { data, error } = await supabase.storage
    .from(DRIVE_BUCKET)
    .list(folder, { search: fileName, limit: 100 });

  if (error || !data?.some((entry) => entry.name === fileName)) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    url: driveFileHref(audioPath),
    expiresAt: Date.now() + URL_LIFETIME_MS,
  });
}
