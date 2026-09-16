import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  accessCookieName,
  getServiceSupabase,
  isAccessCookieValid,
  linkState,
  resolveLinkRow,
} from "@/lib/listening-public";
import type { PublicListeningLink } from "@/lib/listening-types";
import { DRIVE_BUCKET } from "@/lib/drive-db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);
  const state = linkState(row);

  // Lien mort : on ne renvoie jamais la tracklist, même partiellement.
  if (state !== "ok" || !row) {
    return NextResponse.json({ state });
  }

  if (row.password_hash) {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(accessCookieName(slug))?.value;
    if (!isAccessCookieValid(cookie, slug, row.password_hash)) {
      return NextResponse.json({ state: "locked" as const, title: row.title });
    }
  }

  const { data: items } = await supabase
    .from("user_listening_link_items")
    .select("id, position, group_label, kind, snapshot, duration_ms, peaks")
    .eq("link_id", row.id)
    .order("position", { ascending: true });

  // `user_presskit_profile` ne porte pas de colonne `artist_name` : le nom
  // affiché est `artist_title`, avec `streaming_artist_name` en repli.
  const { data: profile } = await supabase
    .from("user_presskit_profile")
    .select("artist_title, streaming_artist_name")
    .eq("user_id", row.user_id)
    .maybeSingle();

  let coverUrl: string | undefined;
  if (row.cover_path) {
    // Bucket privé : URL signée, valable le temps d'une visite.
    const { data } = await supabase.storage
      .from(DRIVE_BUCKET)
      .createSignedUrl(row.cover_path, 3600);
    coverUrl = data?.signedUrl;
  }

  const payload: PublicListeningLink = {
    slug,
    title: row.title,
    introMessage: row.intro_message,
    coverUrl,
    artistName: (() => {
      const p = profile as
        | { artist_title?: string; streaming_artist_name?: string }
        | null;
      return (
        (p?.artist_title ?? "").trim() ||
        (p?.streaming_artist_name ?? "").trim() ||
        "Artiste"
      );
    })(),
    requiresPassword: Boolean(row.password_hash),
    expiresAt: row.expires_at ?? undefined,
    allowDownload: row.allow_download,
    presskitUrl: row.presskit_url ?? undefined,
    // Aucune URL audio ici : elles sont demandées une par une au moment du play.
    items: (items ?? []).map((i) => {
      const r = i as Record<string, unknown>;
      return {
        id: r.id as string,
        position: (r.position as number) ?? 0,
        groupLabel: (r.group_label as string) ?? undefined,
        kind: (r.kind as "track" | "podcast") ?? "track",
        snapshot: r.snapshot as PublicListeningLink["items"][number]["snapshot"],
        durationMs: (r.duration_ms as number) ?? 0,
        peaks: (r.peaks as number[]) ?? [],
      };
    }),
  };

  // Le nom porté par l'invitation pré-remplit la porte d'identification :
  // le destinataire d'un envoi mail n'a rien à saisir.
  let inviteName: string | undefined;
  const inviteId = req.nextUrl.searchParams.get("i");
  if (inviteId) {
    const { data: invite } = await supabase
      .from("user_listening_invites")
      .select("contact_name")
      .eq("id", inviteId)
      .eq("link_id", row.id)
      .maybeSingle();
    inviteName = (invite as { contact_name?: string } | null)?.contact_name;
  }

  return NextResponse.json({ state: "ok" as const, link: payload, inviteName });
}
