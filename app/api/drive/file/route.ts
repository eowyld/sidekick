import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { streamStorageFile } from "@/lib/storage-stream";

/**
 * GET /api/drive/file?path=… — ouvre un fichier du bucket `drive`.
 *
 * Le bucket est privé : aucun fichier n'a d'adresse permanente. Chaque
 * ouverture passe par ici, qui vérifie la session et le propriétaire, puis
 * sert les octets depuis notre domaine. L'URL signée est consommée côté
 * serveur et n'est jamais donnée au navigateur : c'est `sidekickartists.com`
 * qui s'affiche dans la barre d'adresse, pas le projet Supabase.
 *
 * Utilisable tel quel en `href` ou en `src` : même origine, donc le cookie de
 * session suit.
 */

export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path || path.includes("..")) {
    return NextResponse.json({ error: "Chemin invalide." }, { status: 400 });
  }

  // Premier segment = id du propriétaire. Vérifié ici en plus des policies RLS :
  // un fichier d'un autre compte ne doit jamais être signé.
  if (path.split("/")[0] !== userId) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const download = url.searchParams.get("download") === "1";
  const fileName = path.split("/").pop() ?? "fichier";

  return streamStorageFile(supabase, path, {
    downloadName: download ? fileName : undefined,
    range: request.headers.get("range"),
  });
}
