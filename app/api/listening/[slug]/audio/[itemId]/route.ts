import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  accessCookieName,
  getServiceSupabase,
  isAccessCookieValid,
  linkState,
  resolveLinkRow,
} from "@/lib/listening-public";
import { streamStorageFile } from "@/lib/storage-stream";

/**
 * Audio d'un titre d'un lien d'écoute, servi plage par plage.
 *
 * Il n'y a plus d'étape préalable : un `POST` renvoyait autrefois cette même
 * adresse, prévisible, après avoir refait les contrôles que le `GET` refait de
 * toute façon. Il coûtait un aller-retour complet avant chaque lecture — une
 * bonne part du délai au clic — sans rien protéger de plus.
 *
 * L'audio passe par notre domaine de bout en bout : ce lien est envoyé à un
 * label ou à un programmateur, une URL `…supabase.co/storage/v1/object/sign/…`
 * dans un lecteur ou une barre d'adresse n'a pas sa place là. Elle serait en
 * plus rejouable telle quelle par n'importe qui, le temps de sa validité, sans
 * repasser par le mot de passe ni par la révocation du lien.
 */

/** Résout le fichier d'un titre, ou la réponse d'erreur à rendre au visiteur. */
async function resolveAudioPath(
  slug: string,
  itemId: string
): Promise<{ audioPath: string; title: string; error?: never } | { error: Response; audioPath?: never; title?: never }> {
  const supabase = getServiceSupabase();
  // Les deux lectures partent ensemble : le titre est cherché par son seul
  // identifiant, puis son appartenance au lien est vérifiée plus bas. Chaque
  // plage demandée par le lecteur repasse ici, un aller-retour de moins par
  // requête se sent au démarrage comme à chaque saut dans la forme d'onde.
  const [row, { data: item }] = await Promise.all([
    resolveLinkRow(supabase, slug),
    supabase
      .from("user_listening_link_items")
      .select("link_id, audio_path, snapshot")
      .eq("id", itemId)
      .maybeSingle(),
  ]);

  // Revérification à chaque lecture : un lien expiré ou coupé pendant la
  // session cesse immédiatement de servir de l'audio.
  if (linkState(row) !== "ok" || !row) {
    return { error: NextResponse.json({ error: "Lien indisponible." }, { status: 404 }) };
  }

  if (row.password_hash) {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(accessCookieName(slug))?.value;
    if (!isAccessCookieValid(cookie, slug, row.password_hash)) {
      return { error: NextResponse.json({ error: "Accès refusé." }, { status: 401 }) };
    }
  }

  // Un titre d'un autre lien est traité comme introuvable : sans ce contrôle,
  // un lien ouvert servirait l'audio de n'importe quel autre.
  const typed = item as { link_id?: string; audio_path?: string } | null;
  const audioPath = typed?.link_id === row.id ? typed.audio_path : undefined;
  if (!audioPath) {
    return { error: NextResponse.json({ error: "Titre introuvable." }, { status: 404 }) };
  }

  const title =
    (item as { snapshot?: { title?: string } } | null)?.snapshot?.title ?? "titre";

  return { audioPath, title };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  const { slug, itemId } = await params;
  const resolved = await resolveAudioPath(slug, itemId);
  if (resolved.error) return resolved.error;

  return streamStorageFile(getServiceSupabase(), resolved.audioPath, {
    range: req.headers.get("range"),
  });
}
