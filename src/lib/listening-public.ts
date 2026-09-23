import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { LinkState } from "@/lib/listening-types";
import { logoFor, type LogoExports } from "@/lib/artist-logo";

/**
 * Client service role : les pages publiques n'ont pas de session Supabase,
 * la RLS est donc contournée après validation du slug et de l'état du lien.
 * Même pattern que `app/api/calendar/ical/[token]/route.ts`.
 */
export function getServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante.");
  }
  return createClient(url, key);
}

// ─── Mot de passe ───────────────────────────────────────────────────────────

/** Format stocké : `scrypt$<sel hex>$<empreinte hex>`. */
export function hashListeningPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyListeningPassword(
  password: string,
  stored: string
): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  // Comparaison à temps constant : une comparaison naïve laisserait fuiter
  // le mot de passe caractère par caractère.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ─── Cookie d'accès ─────────────────────────────────────────────────────────

/**
 * Le cookie ne contient aucun secret : c'est un HMAC du slug et de l'empreinte
 * du mot de passe. Changer le mot de passe invalide donc automatiquement tous
 * les cookies déjà distribués.
 */
function hmacSecret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante.");
  return key;
}

export function accessCookieName(slug: string): string {
  return `listen_${slug.slice(0, 22)}`;
}

export function accessCookieValue(slug: string, passwordHash: string): string {
  return createHmac("sha256", hmacSecret())
    .update(`${slug}:${passwordHash}`)
    .digest("hex");
}

export function isAccessCookieValid(
  cookieValue: string | undefined,
  slug: string,
  passwordHash: string
): boolean {
  if (!cookieValue) return false;
  const expected = accessCookieValue(slug, passwordHash);
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ─── Résolution d'un lien ───────────────────────────────────────────────────

export interface LinkRow {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  intro_message: string;
  cover_path: string | null;
  password_hash: string | null;
  expires_at: string | null;
  allow_download: boolean;
  presskit_url: string | null;
  show_logo: boolean;
  is_active: boolean;
}

export async function resolveLinkRow(
  supabase: SupabaseClient,
  slug: string
): Promise<LinkRow | null> {
  const { data, error } = await supabase
    .from("user_listening_links")
    .select(
      "id, user_id, slug, title, intro_message, cover_path, password_hash, expires_at, allow_download, presskit_url, show_logo, is_active"
    )
    .eq("slug", slug)
    .maybeSingle();
  // Le visiteur ne doit rien apprendre d'une erreur base — il verra « lien
  // inactif » —, mais sans trace serveur une panne serait indistinguable d'un
  // lien supprimé, donc indébogable.
  if (error) {
    console.error("[Listening] resolveLinkRow:", error.message);
    return null;
  }
  if (!data) return null;
  return data as LinkRow;
}

/**
 * État d'un lien du point de vue du visiteur. `gone` couvre aussi bien le lien
 * supprimé que désactivé : la page publique ne distingue pas les deux, pour ne
 * rien révéler des intentions de l'artiste.
 */
export function linkState(row: LinkRow | null): LinkState {
  if (!row || !row.is_active) return "gone";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return "expired";
  }
  return "ok";
}

/** Empreinte d'IP : distinguer des sessions sans conserver d'adresse en clair. */
export function hashIp(ip: string): string {
  return createHmac("sha256", hmacSecret()).update(ip).digest("hex").slice(0, 32);
}

// ─── Logo de l'artiste ──────────────────────────────────────────────────────

/**
 * Le logo à montrer sur le lien d'écoute (version pour fonds sombres, repli
 * sur la claire), ou `undefined` si l'artiste n'en a pas ou l'a masqué ici.
 * Requête à part : une base sans les colonnes du logo ne doit pas faire
 * tomber le reste de la charge (nom d'artiste compris).
 */
export async function listeningLogo(
  supabase: SupabaseClient,
  userId: string
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("artist_logo, artist_logo_dark, artist_logo_exports")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return undefined;
  const row = data as {
    artist_logo: string | null;
    artist_logo_dark: string | null;
    artist_logo_exports: Partial<LogoExports> | null;
  };
  return logoFor({ light: row.artist_logo, dark: row.artist_logo_dark }, row.artist_logo_exports, "listening");
}
