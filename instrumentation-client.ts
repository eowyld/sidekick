import posthog from "posthog-js";

/**
 * Point d'initialisation **unique** de PostHog côté navigateur.
 *
 * Il y en avait deux — celui-ci et un second dans `PostHogProvider` — avec des
 * `api_host` différents. Comme `posthog.init` ignore les appels suivants pour
 * un même token, c'est ce fichier qui gagnait toujours : la garde localhost et
 * le masquage des champs de saisie déclarés dans le provider n'ont jamais été
 * appliqués. Toute la configuration vit donc ici, et le provider ne fait plus
 * que l'identification.
 */

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

/*
 * En local, on n'envoie rien par défaut. Les événements de développement
 * polluaient le projet de production, et surtout le proxy `/ingest` traversait
 * le serveur de dev Next : quand celui-ci n'arrivait pas à relayer la requête,
 * il répondait 500 et posthog-js le remontait en erreur de console.
 * `NEXT_PUBLIC_ENABLE_POSTHOG_DEV=true` permet de tester l'instrumentation.
 */
const isLocalhost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
const enableInDev = process.env.NEXT_PUBLIC_ENABLE_POSTHOG_DEV === "true";

if (token && (!isLocalhost || enableInDev)) {
  posthog.init(token, {
    // Proxy via les rewrites de `next.config.mjs` : les bloqueurs de pub
    // reconnaissent le domaine PostHog, pas le nôtre.
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    // `PostHogPageView` capture `$pageview` à la main sur changement de route.
    // Sans ce `false`, chaque vue serait comptée deux fois.
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    capture_exceptions: true,
    // L'application affiche des revenus, des factures et des contrats : le
    // contenu des champs ne doit jamais partir dans un enregistrement.
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: { password: true },
    },
    debug: process.env.NODE_ENV === "development",
  });
}
