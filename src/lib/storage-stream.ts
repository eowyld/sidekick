import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { DRIVE_BUCKET } from "@/lib/drive-db";

/**
 * Sert un fichier du bucket `drive` depuis notre propre domaine.
 *
 * Le bucket est privé, donc il faut une URL signée pour le lire — mais cette
 * URL ne doit jamais atterrir dans le navigateur : elle expose le projet
 * Supabase, elle est partageable telle quelle le temps de sa validité, et elle
 * s'affiche dans la barre d'adresse quand on ouvre un fichier. L'URL est donc
 * signée ici, consommée ici, et seuls les octets ressortent.
 *
 * L'en-tête `Range` de la requête entrante est relayé et la réponse amont
 * renvoyée telle quelle (206 comprise) : sans ça, un lecteur audio ne peut plus
 * se déplacer dans un titre, et un WAV de 60 Mo se retélécharge en entier à
 * chaque clic sur la forme d'onde.
 */

/** Assez pour ouvrir le flux en amont ; l'URL ne sort jamais d'ici. */
const SIGNED_URL_TTL_SECONDS = 60;

/**
 * En-têtes repris de Storage. Tout le reste est réécrit : on ne relaie ni le
 * cache amont ni les en-têtes qui trahiraient l'origine du fichier.
 */
const FORWARDED_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "etag",
  "last-modified",
];

export interface StreamStorageFileOptions {
  /** Nom du fichier proposé au téléchargement. Absent = lecture en ligne. */
  downloadName?: string;
  /** En-tête `Range` de la requête entrante, relayé tel quel. */
  range?: string | null;
}

/** `filename*` en RFC 5987 : un titre accentué reste lisible au téléchargement. */
function contentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/**
 * URLs signées réutilisées tant qu'il leur reste de la marge.
 *
 * Un lecteur audio émet plusieurs requêtes par titre (ouverture, puis une
 * plage à chaque saut dans la forme d'onde) : les signer une à une ajoutait un
 * aller-retour vers Storage à chacune. L'URL ne quitte jamais le serveur, la
 * garder quelques secondes en mémoire n'expose rien. Le cache vit le temps
 * d'une instance de fonction ; un démarrage à froid repart simplement à vide.
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
/** Marge laissée avant l'expiration réelle : la requête amont doit démarrer à temps. */
const SIGNED_URL_REUSE_MS = (SIGNED_URL_TTL_SECONDS - 15) * 1000;
const SIGNED_URL_CACHE_MAX = 200;

async function signedUrlFor(supabase: SupabaseClient, path: string): Promise<string | null> {
  const now = Date.now();
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > now) return cached.url;

  const { data, error } = await supabase.storage
    .from(DRIVE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;

  if (signedUrlCache.size >= SIGNED_URL_CACHE_MAX) {
    for (const [key, entry] of signedUrlCache) {
      if (entry.expiresAt <= now) signedUrlCache.delete(key);
    }
    if (signedUrlCache.size >= SIGNED_URL_CACHE_MAX) signedUrlCache.clear();
  }
  signedUrlCache.set(path, { url: data.signedUrl, expiresAt: now + SIGNED_URL_REUSE_MS });
  return data.signedUrl;
}

export async function streamStorageFile(
  supabase: SupabaseClient,
  path: string,
  opts: StreamStorageFileOptions = {}
): Promise<Response> {
  const signedUrl = await signedUrlFor(supabase, path);
  if (!signedUrl) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
  const data = { signedUrl };

  let upstream: Response;
  try {
    upstream = await fetch(data.signedUrl, {
      headers: opts.range ? { Range: opts.range } : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Fichier indisponible." }, { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    // 416 (plage invalide) doit repasser tel quel au lecteur, qui sait le lire.
    const status = upstream.status === 416 ? 416 : 404;
    return NextResponse.json({ error: "Fichier introuvable." }, { status });
  }

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, no-store");
  headers.set("Referrer-Policy", "no-referrer");
  if (opts.downloadName) {
    headers.set("Content-Disposition", contentDisposition(opts.downloadName));
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}
