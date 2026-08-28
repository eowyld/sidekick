"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { PageError } from "@/components/ui/page-error";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.capture("error_page_shown", {
      error: error.message,
      digest: error.digest,
    });
  }, [error, posthog]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 py-24">
      <PageError
        title="Une erreur inattendue s'est produite"
        description="Quelque chose s'est mal passé dans cette page. Tu peux réessayer ou revenir au Dashboard."
        onRetry={reset}
      />
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard">Retour au Dashboard</Link>
      </Button>
    </div>
  );
}
