import posthog from "posthog-js";

export type AnalyticsConsent = "granted" | "denied" | "pending" | "unavailable";

const CHANGE_EVENT = "sidekick:analytics-consent-change";
export const CONSENT_GRANTED_EVENT = "sidekick:analytics-consent-granted";

export function getAnalyticsConsent(): AnalyticsConsent {
  // PostHog n'est pas initialisé en local (voir instrumentation-client.ts).
  if (!posthog.__loaded) return "unavailable";
  return posthog.get_explicit_consent_status();
}

/** À appeler une fois PostHog chargé : le bandeau peut avoir été rendu avant. */
export function notifyAnalyticsConsentChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeAnalyticsConsent(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function acceptAnalytics() {
  posthog.opt_in_capturing();
  // La page courante a été vue avant l'accord : sans ça, la visite d'arrivée manque.
  posthog.capture("$pageview");
  window.dispatchEvent(new Event(CONSENT_GRANTED_EVENT));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function declineAnalytics() {
  posthog.opt_out_capturing();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Retire le choix enregistré : le bandeau réapparaît. */
export function reopenAnalyticsConsent() {
  if (!posthog.__loaded) return;
  posthog.opt_out_capturing();
  posthog.clear_opt_in_out_capturing();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
