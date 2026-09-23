import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Espaces applicatifs et pages non publiques — hors index, pour tous les robots. */
const DISALLOW = [
  "/api/",
  "/dashboard",
  "/tasks",
  "/calendar",
  "/contacts",
  "/phono",
  "/edition",
  "/live",
  "/marketing",
  "/incomes",
  "/admin",
  "/settings",
  "/projects",
  "/login",
  "/inscription",
  "/auth",
  "/presskit",
  "/accord",
];

const ALLOW = ["/", "/faq", "/blog", "/blog/", "/blog/*"];

/**
 * Les crawlers d'assistants (GPTBot, ClaudeBot, Google-Extended, PerplexityBot,
 * CCBot) sont volontairement autorisés sur les pages publiques : le contenu
 * comparatif et la FAQ ont vocation à être cités. On leur applique
 * explicitement la même politique que `*` pour que ce soit non ambigu — les
 * bloquer rendrait le site invisible aux assistants.
 */
const AI_USER_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "PerplexityBot",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ALLOW, disallow: DISALLOW },
      ...AI_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: ALLOW,
        disallow: DISALLOW,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
