import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ListeningItem,
  ListeningLink,
  ListeningLinkStats,
  ListeningPlayStat,
  ListeningItemStat,
  ListeningSessionStat,
} from "@/lib/listening-types";

/**
 * Slug non devinable. 22 caractères base64url ≈ 128 bits d'entropie : le lien
 * ne peut pas être trouvé par balayage, ce qui est la première protection de
 * la page.
 */
export function generateListeningSlug(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function rowToItem(row: Record<string, unknown>): ListeningItem {
  return {
    id: row.id as string,
    position: (row.position as number) ?? 0,
    groupLabel: (row.group_label as string) ?? undefined,
    kind: (row.kind as ListeningItem["kind"]) ?? "track",
    sourceId: (row.source_id as string) ?? "",
    versionId: (row.version_id as string) ?? undefined,
    snapshot: (row.snapshot as ListeningItem["snapshot"]) ?? {
      title: "",
      mainArtist: "",
      guestArtists: [],
    },
    audioPath: (row.audio_path as string) ?? "",
    durationMs: (row.duration_ms as number) ?? 0,
    peaks: (row.peaks as number[]) ?? [],
  };
}

function rowToLink(row: Record<string, unknown>): ListeningLink {
  const items = ((row.user_listening_link_items as Record<string, unknown>[]) ?? [])
    .map(rowToItem)
    .sort((a, b) => a.position - b.position);

  return {
    id: row.id as string,
    slug: row.slug as string,
    title: (row.title as string) ?? "",
    introMessage: (row.intro_message as string) ?? "",
    coverPath: (row.cover_path as string) ?? undefined,
    // On n'expose jamais l'empreinte au client, seulement son existence.
    hasPassword: Boolean(row.password_hash),
    expiresAt: (row.expires_at as string) ?? undefined,
    allowDownload: Boolean(row.allow_download),
    presskitUrl: (row.presskit_url as string) ?? undefined,
    showLogo: row.show_logo !== false,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    items,
  };
}

const LINK_SELECT =
  "id, slug, title, intro_message, cover_path, password_hash, expires_at, allow_download, presskit_url, show_logo, is_active, created_at, updated_at, user_listening_link_items(*)";

export async function fetchListeningLinks(
  supabase: SupabaseClient,
  userId: string
): Promise<ListeningLink[]> {
  const { data, error } = await supabase
    .from("user_listening_links")
    .select(LINK_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToLink(row as Record<string, unknown>));
}

export interface ListeningLinkInput {
  title: string;
  introMessage: string;
  coverPath?: string;
  /** Mot de passe en clair. `null` retire la protection, `undefined` la laisse inchangée. */
  password?: string | null;
  expiresAt?: string | null;
  allowDownload: boolean;
  presskitUrl?: string | null;
  showLogo: boolean;
  items: Array<Omit<ListeningItem, "id">>;
}

/**
 * `scrypt` n'existe pas dans le navigateur et un hachage côté client n'aurait
 * aucune valeur : le mot de passe part en clair sur HTTPS vers une route
 * authentifiée qui renvoie l'empreinte à stocker.
 */
async function hashPasswordViaApi(password: string): Promise<string> {
  const res = await fetch("/api/listening/hash-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("Impossible de protéger le lien par mot de passe.");
  const json = (await res.json()) as { hash: string };
  return json.hash;
}

export async function createListeningLink(
  supabase: SupabaseClient,
  userId: string,
  input: ListeningLinkInput
): Promise<ListeningLink> {
  const slug = generateListeningSlug();
  const passwordHash = input.password
    ? await hashPasswordViaApi(input.password)
    : null;

  const { data: linkRow, error } = await supabase
    .from("user_listening_links")
    .insert({
      user_id: userId,
      slug,
      title: input.title,
      intro_message: input.introMessage,
      cover_path: input.coverPath ?? null,
      password_hash: passwordHash,
      expires_at: input.expiresAt ?? null,
      allow_download: input.allowDownload,
      presskit_url: input.presskitUrl ?? null,
      show_logo: input.showLogo,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const linkId = (linkRow as { id: string }).id;
  await replaceItems(supabase, linkId, input.items);

  const created = await fetchLinkById(supabase, linkId);
  if (!created) throw new Error("Lien créé mais introuvable.");
  return created;
}

export async function updateListeningLink(
  supabase: SupabaseClient,
  linkId: string,
  input: ListeningLinkInput
): Promise<ListeningLink> {
  const patch: Record<string, unknown> = {
    title: input.title,
    intro_message: input.introMessage,
    cover_path: input.coverPath ?? null,
    expires_at: input.expiresAt ?? null,
    allow_download: input.allowDownload,
    presskit_url: input.presskitUrl ?? null,
    show_logo: input.showLogo,
    updated_at: new Date().toISOString(),
  };

  // `undefined` = ne pas toucher au mot de passe existant ; `null` = le retirer.
  if (input.password === null) {
    patch.password_hash = null;
  } else if (typeof input.password === "string" && input.password.length > 0) {
    patch.password_hash = await hashPasswordViaApi(input.password);
  }

  const { error } = await supabase
    .from("user_listening_links")
    .update(patch)
    .eq("id", linkId);

  if (error) throw new Error(error.message);

  await replaceItems(supabase, linkId, input.items);

  const updated = await fetchLinkById(supabase, linkId);
  if (!updated) throw new Error("Lien mis à jour mais introuvable.");
  return updated;
}

async function replaceItems(
  supabase: SupabaseClient,
  linkId: string,
  items: Array<Omit<ListeningItem, "id">>
): Promise<void> {
  const { error: delError } = await supabase
    .from("user_listening_link_items")
    .delete()
    .eq("link_id", linkId);
  if (delError) throw new Error(delError.message);

  if (items.length === 0) return;

  const { error: insError } = await supabase
    .from("user_listening_link_items")
    .insert(
      items.map((item, index) => ({
        link_id: linkId,
        position: index,
        group_label: item.groupLabel ?? null,
        kind: item.kind,
        source_id: item.sourceId,
        version_id: item.versionId ?? null,
        snapshot: item.snapshot,
        audio_path: item.audioPath,
        duration_ms: item.durationMs,
        peaks: item.peaks,
      }))
    );
  if (insError) throw new Error(insError.message);
}

export async function fetchLinkById(
  supabase: SupabaseClient,
  linkId: string
): Promise<ListeningLink | null> {
  const { data, error } = await supabase
    .from("user_listening_links")
    .select(LINK_SELECT)
    .eq("id", linkId)
    .single();
  if (error) return null;
  return rowToLink(data as Record<string, unknown>);
}

export async function setListeningLinkActive(
  supabase: SupabaseClient,
  linkId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from("user_listening_links")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", linkId);
  if (error) throw new Error(error.message);
}

/** Suppression définitive : la page devient introuvable et les stats tombent en cascade. */
export async function deleteListeningLink(
  supabase: SupabaseClient,
  linkId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_listening_links")
    .delete()
    .eq("id", linkId);
  if (error) throw new Error(error.message);
}

export async function fetchListeningStats(
  supabase: SupabaseClient,
  linkId: string
): Promise<ListeningLinkStats> {
  const { data: sessions, error } = await supabase
    .from("user_listening_sessions")
    .select(
      "id, visitor_name, created_at, last_seen_at, user_listening_plays(item_id, listened_ms, max_position_ms, play_count, completed, downloaded)"
    )
    .eq("link_id", linkId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const identified: ListeningSessionStat[] = [];
  let anonymousSessionCount = 0;
  const anonymousListenedMsByItem: Record<string, number> = {};
  let downloadCount = 0;
  let completionSum = 0;
  let completionCount = 0;
  let lastPlayedAt: string | undefined;
  let totalListenedMs = 0;
  const sessionDates: string[] = [];
  const itemStats: Record<string, ListeningItemStat> = {};

  for (const raw of (sessions ?? []) as Record<string, unknown>[]) {
    const plays: ListeningPlayStat[] = (
      (raw.user_listening_plays as Record<string, unknown>[]) ?? []
    ).map((p) => ({
      itemId: p.item_id as string,
      listenedMs: (p.listened_ms as number) ?? 0,
      maxPositionMs: (p.max_position_ms as number) ?? 0,
      playCount: (p.play_count as number) ?? 0,
      completed: Boolean(p.completed),
      downloaded: Boolean(p.downloaded),
    }));

    sessionDates.push(raw.created_at as string);

    for (const play of plays) {
      if (play.downloaded) downloadCount += 1;
      completionSum += play.completed ? 1 : 0;
      completionCount += 1;
      totalListenedMs += play.listenedMs;

      const item = (itemStats[play.itemId] ??= {
        itemId: play.itemId,
        listeners: 0,
        listenedMs: 0,
        reachedMs: [],
        completions: 0,
        replays: 0,
        downloads: 0,
      });
      item.listeners += 1;
      item.listenedMs += play.listenedMs;
      item.reachedMs.push(play.maxPositionMs);
      if (play.completed) item.completions += 1;
      item.replays += Math.max(0, play.playCount - 1);
      if (play.downloaded) item.downloads += 1;
    }

    const seenAt = raw.last_seen_at as string;
    if (!lastPlayedAt || seenAt > lastPlayedAt) lastPlayedAt = seenAt;

    const visitorName = (raw.visitor_name as string) ?? undefined;
    if (visitorName) {
      identified.push({
        id: raw.id as string,
        visitorName,
        createdAt: raw.created_at as string,
        lastSeenAt: seenAt,
        plays,
      });
    } else {
      anonymousSessionCount += 1;
      for (const play of plays) {
        anonymousListenedMsByItem[play.itemId] =
          (anonymousListenedMsByItem[play.itemId] ?? 0) + play.listenedMs;
      }
    }
  }

  return {
    linkId,
    sessionCount: (sessions ?? []).length,
    sessionDates,
    totalListenedMs,
    itemStats,
    identifiedSessions: identified,
    anonymousSessionCount,
    anonymousListenedMsByItem,
    downloadCount,
    averageCompletion: completionCount > 0 ? completionSum / completionCount : 0,
    lastPlayedAt,
  };
}
