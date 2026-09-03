/**
 * Canonical public origin. Override per environment with NEXT_PUBLIC_SITE_URL
 * (preview deployments, staging domains). Never hardcode the domain elsewhere —
 * a stale literal silently poisons canonicals, OG tags and the sitemap.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
  "https://sidekickartists.com";
