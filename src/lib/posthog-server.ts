import { PostHog } from "posthog-node";

type CaptureInput = Parameters<PostHog["capture"]>[0];

let posthogClient: PostHog | null = null;

/**
 * Client PostHog serveur — `null` si la clé projet n'est pas configurée.
 *
 * `new PostHog(undefined)` lève « You must pass your PostHog project's api
 * key. » : sans ce garde-fou, une variable d'environnement manquante en prod
 * fait tomber la route appelante.
 */
function getPostHogClient(): PostHog | null {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!apiKey) return null;

  if (!posthogClient) {
    posthogClient = new PostHog(apiKey, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}

/**
 * Envoie un événement analytics sans jamais faire échouer l'appelant :
 * un incident PostHog ne doit pas casser une réponse API.
 */
export function captureServerEvent(input: CaptureInput): void {
  try {
    getPostHogClient()?.capture(input);
  } catch (error) {
    console.error("[posthog] capture failed", error);
  }
}
