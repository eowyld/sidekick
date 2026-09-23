/**
 * Limitation de débit partagée entre instances (fonction Postgres
 * `rate_limit_hit`, migration 20260921210000).
 *
 * Tant que la migration n'est pas appliquée, ou si Supabase ne répond pas, on
 * retombe sur le compteur en mémoire de `rate-limit.ts` : une panne de la base
 * ne doit pas bloquer les envois, et le garde-fou local reste en place.
 */
import { getServiceSupabase } from "@/lib/listening-public";
import { rateLimit, type RateLimitResult } from "@/lib/rate-limit";

let sharedUnavailableLogged = false;

export async function rateLimitShared(args: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  try {
    const { data, error } = await getServiceSupabase().rpc("rate_limit_hit", {
      p_key: args.key,
      p_limit: args.limit,
      p_window_ms: args.windowMs,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (!error && row && typeof row.allowed === "boolean") {
      return { allowed: row.allowed, retryAfter: Number(row.retry_after) || 0 };
    }
    if (!sharedUnavailableLogged) {
      console.warn("[rate-limit] limiteur partagé indisponible, repli en mémoire:", error?.message);
      sharedUnavailableLogged = true;
    }
  } catch (e) {
    if (!sharedUnavailableLogged) {
      console.warn("[rate-limit] limiteur partagé indisponible, repli en mémoire:", e instanceof Error ? e.message : e);
      sharedUnavailableLogged = true;
    }
  }
  return rateLimit(args);
}
