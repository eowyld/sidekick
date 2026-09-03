"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase";

/**
 * Rattache la session PostHog à l'utilisateur Supabase, et marque l'ouverture
 * de l'application.
 *
 * Sans `identify`, l'anonyme d'avant l'inscription et le connecté d'après sont
 * deux personnes distinctes pour PostHog : la rétention par cohorte
 * d'inscription serait alors ininterprétable.
 *
 * `app_opened` n'est envoyé qu'une fois par session de navigation (garde
 * sessionStorage) : c'est l'événement de retour sur lequel se lit la rétention
 * à J+3, il ne doit pas être gonflé par les changements de page.
 */
function useIdentifyUser() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled || !user) return;

        posthog.identify(user.id, {
          email: user.email,
          signup_date: user.created_at,
        });

        const key = `ph_app_opened_${user.id}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          posthog.capture("app_opened");
        }
      } catch {
        /* analytics : jamais bloquant */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  useIdentifyUser();

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
    const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";
    const enableInDev = process.env.NEXT_PUBLIC_ENABLE_POSTHOG_DEV === "true";

    // Avoid noisy "Failed to fetch" in local dev when analytics endpoint is blocked.
    if (!token || (isLocalhost && !enableInDev)) return;

    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      capture_pageview: false,
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: { password: true },
      },
      autocapture: true,
      capture_exceptions: true,
      loaded: () => {
        posthog.set_config({ api_host: host });
      },
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
