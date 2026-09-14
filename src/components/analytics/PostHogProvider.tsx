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

/**
 * L'initialisation vit dans `instrumentation-client.ts`, qui s'exécute avant
 * React : un second `posthog.init` ici serait ignoré par posthog-js et ne
 * ferait qu'entretenir l'illusion d'une configuration active.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  useIdentifyUser();

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
