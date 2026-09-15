"use client";

import { reopenAnalyticsConsent } from "@/lib/analytics-consent";
import { cn } from "@/lib/utils";

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={reopenAnalyticsConsent} className={cn(className)}>
      Gérer les cookies
    </button>
  );
}
