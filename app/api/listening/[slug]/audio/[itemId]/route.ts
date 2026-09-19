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
 * Audio d'un titre d'un lien d'écoute.
 *
 * - `POST` donne au lecteur l'adresse de lecture (celle du `GET` ci-dessous).
 * - `GET` sert les octets, plage par plage.
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
  const row = await resolveLinkRow(supabase, slug);

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

  const { data: item } = await supabase
    .from("user_listening_link_items")
    .select("audio_path, snapshot")
    .eq("id", itemId)
    .eq("link_id", row.id)
    .maybeSingle();

  const audioPath = (item as { audio_path?: string } | null)?.audio_path;
  if (!audioPath) {
    return { error: NextResponse.json({ error: "Titre introuvable." }, { status: 404 }) };
  }

  const title =
    (item as { snapshot?: { title?: string } } | null)?.snapshot?.title ?? "titre";

  return { audioPath, title };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  const { slug, itemId } = await params;
  const resolved = await resolveAudioPath(slug, itemId);
  if (resolved.error) return resolved.error;

  return NextResponse.json({
    url: `/api/listening/${encodeURIComponent(slug)}/audio/${encodeURIComponent(itemId)}`,
  });
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
