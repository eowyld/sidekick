"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import type { ReactNode } from "react";

export function PostHogProvider({ children }: { children: ReactNode }) {
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
