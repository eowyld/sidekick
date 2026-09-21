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

  // Nom affiché : l'identité déclarée à l'onboarding (`user_preferences`),
  // puis le presskit (fermé pour l'alpha, mais peut-être renseigné avant),
  // puis un libellé neutre. `user_presskit_profile` ne porte pas de colonne
  // `artist_name` : son nom est `artist_title`, `streaming_artist_name` en repli.
  const [{ data: prefs }, { data: profile }] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("artist_name")
      .eq("user_id", row.user_id)
      .maybeSingle(),
    supabase
      .from("user_presskit_profile")
      .select("artist_title, streaming_artist_name")
      .eq("user_id", row.user_id)
      .maybeSingle(),
  ]);

  // Bucket privé, et l'adresse reste sur notre domaine : la pochette est
  // servie par `/cover`, qui refait les mêmes contrôles à chaque requête.
  const coverUrl = row.cover_path
    ? /^(data:|https?:)/.test(row.cover_path)
      ? row.cover_path
      : `/api/listening/${encodeURIComponent(slug)}/cover`
    : undefined;

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
        ((prefs as { artist_name?: string | null } | null)?.artist_name ?? "").trim() ||
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
      const snapshot = r.snapshot as PublicListeningLink["items"][number]["snapshot"];
      return {
        id: r.id as string,
        position: (r.position as number) ?? 0,
        groupLabel: (r.group_label as string) ?? undefined,
        kind: (r.kind as PublicListeningLink["items"][number]["kind"]) ?? "track",
        // La couverture principale passe par la route privée du lien. On peut
        // donc la réutiliser dans la tracklist sans exposer son chemin Storage.
        snapshot: {
          ...snapshot,
          cover: snapshot.cover
            ? snapshot.cover === row.cover_path
              ? coverUrl
              : /^(data:|https?:)/.test(snapshot.cover)
                ? snapshot.cover
                : undefined
            : undefined,
        },
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
