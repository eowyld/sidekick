import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type StreamingPlatformKey =
  | "spotify"
  | "deezer"
  | "appleMusic"
  | "tidal"
  | "qobuz"
  | "soundcloud";

type StreamingLinks = Record<StreamingPlatformKey, string>;

const ALL_PLATFORMS: StreamingPlatformKey[] = [
  "spotify",
  "deezer",
  "appleMusic",
  "tidal",
  "qobuz",
  "soundcloud"
];

const HOSTS: Record<StreamingPlatformKey, string[]> = {
  spotify: ["open.spotify.com"],
  deezer: ["deezer.com", "www.deezer.com"],
  appleMusic: ["music.apple.com"],
  tidal: ["tidal.com", "listen.tidal.com"],
  qobuz: ["qobuz.com", "www.qobuz.com"],
  soundcloud: ["soundcloud.com", "www.soundcloud.com"]
};

const SITE_HINT: Record<StreamingPlatformKey, string> = {
  spotify: "site:open.spotify.com/artist",
  deezer: "site:deezer.com/artist",
  appleMusic: "site:music.apple.com artist",
  tidal: "site:tidal.com artist",
  qobuz: "site:qobuz.com",
  soundcloud: "site:soundcloud.com"
};

const MUSICBRAINZ_UA = "SIDEKICK/1.0 (presskit-link-resolver)";
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

type MbArtist = { id: string; name?: string; score?: number };
type MbRelation = { type?: string; url?: { resource?: string } };

/* ---------- helpers ---------- */

function isAllowedHost(urlString: string, hosts: string[]) {
  try {
    const h = new URL(urlString).hostname;
    return hosts.some((host) => h === host || h.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function isArtistPageUrl(platform: StreamingPlatformKey, urlString: string) {
  try {
    const path = new URL(urlString).pathname.toLowerCase();
    if (path.includes("/search") || path === "/" || path === "") return false;
    const hasArtist = /(^|\/)artist(\/|$)/.test(path);
    switch (platform) {
      case "spotify":
      case "deezer":
      case "appleMusic":
      case "tidal":
        return hasArtist;
      case "qobuz":
        return hasArtist || /(^|\/)interpreter(\/|$)/.test(path);
      case "soundcloud": {
        const reserved = ["/search", "/discover", "/charts", "/upload", "/stream", "/you", "/settings"];
        const first = `/${path.split("/").filter(Boolean)[0] ?? ""}`;
        return !reserved.includes(path) && !reserved.includes(first) && path.split("/").filter(Boolean).length >= 1;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

function norm(s: string) {
  if (!s) return "";
  const t = s.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `https://${t}`;
}

function normalizeText(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function hasExactArtistMatch(candidate: string, target: string) {
  const c = normalizeText(candidate);
  const t = normalizeText(target);
  if (!c || !t) return false;
  return c === t || c.startsWith(`${t} `) || c.includes(` ${t} `) || c.endsWith(` ${t}`);
}

function matchesArtistInUrl(urlString: string, artistName: string) {
  try {
    const haystack = normalizeText(new URL(urlString).pathname);
    const tokens = normalizeText(artistName).split(" ").filter(Boolean);
    if (!tokens.length) return false;
    return tokens.every((t) => haystack.includes(t));
  } catch {
    return false;
  }
}

function emptyLinks(): StreamingLinks {
  return { spotify: "", deezer: "", appleMusic: "", tidal: "", qobuz: "", soundcloud: "" };
}

function platformFromUrl(urlString: string): StreamingPlatformKey | null {
  try {
    const h = new URL(urlString).hostname.toLowerCase();
    if (h.includes("spotify.com")) return "spotify";
    if (h.includes("deezer.com")) return "deezer";
    if (h.includes("music.apple.com")) return "appleMusic";
    if (h.includes("tidal.com")) return "tidal";
    if (h.includes("qobuz.com")) return "qobuz";
    if (h.includes("soundcloud.com")) return "soundcloud";
    return null;
  } catch {
    return null;
  }
}

function pickBestUrl(urls: string[], platform: StreamingPlatformKey, artistName: string): string {
  for (const raw of urls) {
    const url = norm(raw);
    if (!url) continue;
    if (!isAllowedHost(url, HOSTS[platform])) continue;
    if (!isArtistPageUrl(platform, url)) continue;
    if (matchesArtistInUrl(url, artistName)) return url;
  }
  return "";
}

/* ---------- MusicBrainz (two-phase: exact + fuzzy) ---------- */

async function fetchMb(queryString: string): Promise<MbArtist[]> {
  const url = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(queryString)}&fmt=json&limit=15`;
  const res = await fetch(url, {
    headers: { "User-Agent": MUSICBRAINZ_UA, Accept: "application/json" },
    cache: "no-store"
  });
  if (!res.ok) return [];
  return ((await res.json()) as { artists?: MbArtist[] }).artists || [];
}

async function getMbRelations(artistId: string): Promise<MbRelation[]> {
  const url = `https://musicbrainz.org/ws/2/artist/${artistId}?inc=url-rels&fmt=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": MUSICBRAINZ_UA, Accept: "application/json" },
    cache: "no-store"
  });
  if (!res.ok) return [];
  return ((await res.json()) as { relations?: MbRelation[] }).relations || [];
}

async function resolveViaMusicBrainz(artistName: string): Promise<StreamingLinks> {
  const links = emptyLinks();

  const [exactResults, fuzzyResults] = await Promise.all([
    fetchMb(`artist:"${artistName}"`),
    fetchMb(`artist:${artistName}`)
  ]);

  const seen = new Set<string>();
  const candidates: MbArtist[] = [];
  for (const list of [exactResults, fuzzyResults]) {
    for (const a of list) {
      if (!a.id || seen.has(a.id)) continue;
      seen.add(a.id);
      if (hasExactArtistMatch(a.name || "", artistName)) {
        candidates.push(a);
      }
    }
  }

  if (!candidates.length) return links;
  for (const candidate of candidates) {
    const relations = await getMbRelations(candidate.id);
    for (const rel of relations) {
      const resource = rel.url?.resource || "";
      if (!resource) continue;
      const platform = platformFromUrl(resource);
      if (!platform || links[platform]) continue;
      const normalized = norm(resource);
      if (isAllowedHost(normalized, HOSTS[platform]) && isArtistPageUrl(platform, normalized)) {
        links[platform] = normalized;
      }
    }
    if (Object.values(links).every(Boolean)) break;
  }

  return links;
}

/* ---------- Deezer API ---------- */

async function resolveDeezerArtist(artistName: string): Promise<string> {
  const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=10`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return "";
  const items = ((await res.json()) as { data?: Array<{ name?: string; link?: string; id?: number | string }> }).data || [];
  const exact = items.find((i) => hasExactArtistMatch(i.name || "", artistName));
  const pick = exact || items[0];
  const c = pick?.link || (pick?.id ? `https://www.deezer.com/artist/${pick.id}` : "");
  if (!c) return "";
  const n = norm(c);
  return isArtistPageUrl("deezer", n) ? n : "";
}

/* ---------- Apple Music / iTunes API ---------- */

async function resolveAppleMusicArtist(artistName: string): Promise<string> {
  const url = `https://itunes.apple.com/search?entity=musicArtist&limit=10&term=${encodeURIComponent(artistName)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return "";
  const items = ((await res.json()) as { results?: Array<{ artistName?: string; artistLinkUrl?: string }> }).results || [];
  const exact = items.find((i) => hasExactArtistMatch(i.artistName || "", artistName));
  const pick = exact || items[0];
  const c = norm(pick?.artistLinkUrl || "");
  if (!c) return "";
  return isArtistPageUrl("appleMusic", c) ? c : "";
}

/* ---------- Web search helpers ---------- */

function extractLinksFromHtml(html: string): string[] {
  const urls: string[] = [];
  for (const m of html.matchAll(/uddg=([^"&]+)/g)) {
    const d = decodeURIComponent(m[1] || "");
    if (d && !d.includes("duckduckgo.com")) urls.push(d);
  }
  return urls;
}

function extractLinksFromXml(xml: string): string[] {
  const urls: string[] = [];
  for (const m of xml.matchAll(/<link>([\s\S]*?)<\/link>/g)) {
    const raw = (m[1] || "").trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
    if (raw && !raw.includes("bing.com") && !raw.includes("google.com")) urls.push(raw);
  }
  return urls;
}

function extractLinksFromGoogleHtml(html: string): string[] {
  const urls: string[] = [];
  for (const m of html.matchAll(/href="\/url\?q=([^"&]+)/g)) {
    const d = decodeURIComponent(m[1] || "");
    if (d && !d.includes("google.") && !d.includes("youtube.")) urls.push(d);
  }
  return urls;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": BROWSER_UA },
    cache: "no-store"
  });
  if (!res.ok) return "";
  return res.text();
}

async function webSearchForPlatform(
  artistName: string,
  platform: StreamingPlatformKey
): Promise<string> {
  const hint = SITE_HINT[platform];

  const exactQuery = `"${artistName}" ${hint}`;
  const fuzzyQuery = `${artistName} ${hint}`;

  const trySearch = async (query: string): Promise<string> => {
    const encoded = encodeURIComponent(query);

    const [bingXml, ddgHtml, googleHtml] = await Promise.all([
      fetchText(`https://www.bing.com/search?q=${encoded}&format=rss`).catch(() => ""),
      fetchText(`https://duckduckgo.com/html/?q=${encoded}`).catch(() => ""),
      fetchText(`https://www.google.com/search?q=${encoded}&num=10`).catch(() => "")
    ]);

    const allUrls = [
      ...extractLinksFromXml(bingXml),
      ...extractLinksFromHtml(ddgHtml),
      ...extractLinksFromGoogleHtml(googleHtml)
    ];

    return pickBestUrl(allUrls, platform, artistName);
  };

  const exactResult = await trySearch(exactQuery);
  if (exactResult) return exactResult;

  return trySearch(fuzzyQuery);
}

/* ---------- Main handler ---------- */

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get("artist")?.trim() || "";
  if (!artist) {
    return NextResponse.json({ error: "Missing artist parameter." }, { status: 400 });
  }

  const links = emptyLinks();

  // Phase 1: MusicBrainz
  try {
    const mbLinks = await resolveViaMusicBrainz(artist);
    for (const p of ALL_PLATFORMS) {
      if (mbLinks[p]) links[p] = mbLinks[p];
    }
  } catch { /* continue */ }

  // Phase 2: Dedicated APIs (Deezer + Apple Music)
  const apiJobs: Array<Promise<void>> = [];
  if (!links.deezer) {
    apiJobs.push(
      resolveDeezerArtist(artist).then((v) => { if (v) links.deezer = v; }).catch(() => {})
    );
  }
  if (!links.appleMusic) {
    apiJobs.push(
      resolveAppleMusicArtist(artist).then((v) => { if (v) links.appleMusic = v; }).catch(() => {})
    );
  }
  await Promise.all(apiJobs);

  // Phase 3: Web search fallback for all remaining platforms (in parallel)
  const missing = ALL_PLATFORMS.filter((p) => !links[p]);
  if (missing.length) {
    const webJobs = missing.map(async (platform) => {
      try {
        const result = await webSearchForPlatform(artist, platform);
        if (result) links[platform] = result;
      } catch { /* skip */ }
    });
    await Promise.all(webJobs);
  }

  return NextResponse.json({ artist, links });
}
