import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { DRIVE_BUCKET } from "@/lib/drive-db";

/**
 * GET /api/drive/file?path=… — ouvre un fichier du bucket `drive`.
 *
 * Le bucket est privé : aucun fichier n'a d'adresse permanente. Chaque
 * ouverture passe par ici, vérifie la session et le propriétaire, puis
 * redirige vers une URL signée qui expire au bout d'une minute. Un lien copié
 * depuis l'app ne fonctionne donc que pour son titulaire connecté, et une URL
 * signée interceptée ne sert plus passé ce délai.
 *
 * Utilisable tel quel en `href` ou en `src` : même origine, donc le cookie de
 * session suit, et le navigateur suit la redirection.
 */

const SIGNED_URL_TTL_SECONDS = 60;

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
  const { data, error } = await supabase.storage
    .from(DRIVE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, download ? { download: fileName } : undefined);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const response = NextResponse.redirect(data.signedUrl, 302);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
