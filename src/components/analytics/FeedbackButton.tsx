"use client";

import { MessageSquare } from "lucide-react";
import { usePostHog } from "posthog-js/react";

export function FeedbackButton() {
  const posthog = usePostHog();

  function handleClick() {
    if (!posthog) return;
    posthog.capture("feedback_button_clicked");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (posthog as any).renderSurvey?.("feedback", "body");
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Donner un feedback"
      className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl transition-colors hover:border-[#F0FF00]/40 hover:text-[#F0FF00]"
    >
      <MessageSquare size={18} />
    </button>
  );
}
