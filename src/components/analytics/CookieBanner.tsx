"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  acceptAnalytics,
  declineAnalytics,
  getAnalyticsConsent,
  subscribeAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/analytics-consent";

const getServerConsent = (): AnalyticsConsent => "unavailable";

export function useAnalyticsConsent(): AnalyticsConsent {
  return useSyncExternalStore(
    subscribeAnalyticsConsent,
    getAnalyticsConsent,
    getServerConsent,
  );
}

export function CookieBanner() {
  const consent = useAnalyticsConsent();
  if (consent !== "pending") return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookies de mesure d'audience"
      className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-xl border border-[rgba(245,245,245,0.12)] bg-[rgba(28,28,30,0.96)] p-4 shadow-2xl backdrop-blur-xl sm:left-6 sm:right-auto sm:mx-0"
    >
      <p className="text-sm leading-relaxed text-[#f5f5f5]/80">
        On aimerait mesurer l&apos;usage de SIDEKICK (pages vues, clics,
        enregistrements de session avec les champs masqués) pour savoir quoi
        améliorer. Rien n&apos;est collecté sans ton accord, et tu peux changer
        d&apos;avis à tout moment.{" "}
        <Link
          href="/confidentialite#cookies"
          className="underline decoration-[rgba(245,245,245,0.3)] underline-offset-2 hover:text-[#F0FF00]"
        >
          En savoir plus
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={declineAnalytics}>
          Refuser
        </Button>
        <Button variant="outline" size="sm" onClick={acceptAnalytics}>
          Accepter
        </Button>
      </div>
    </div>
  );
}
