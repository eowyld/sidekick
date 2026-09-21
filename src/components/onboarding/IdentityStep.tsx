"use client";

import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import { Button } from "@/components/ui/button";
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import type { IdentityMode } from "@/lib/artist-identity";
import { IdentityChoice } from "./IdentityChoice";

/**
 * Étape « Tu sors ta musique sous… ». Première étape de l'onboarding, et
 * seule étape montrée aux comptes créés avant son apparition.
 *
 * L'identité est enregistrée dès « Continuer », sans attendre la fin de
 * l'onboarding : un parcours abandonné en route la garde.
 */
export function IdentityStep({
  eyebrow,
  onContinue,
}: {
  eyebrow: string;
  onContinue: () => void;
}) {
  const posthog = usePostHog();
  const { identityMode, artistName, legal, setArtistIdentity } = useArtistIdentity();

  const [mode, setMode] = useState<IdentityMode | null>(identityMode);
  const [artistDraft, setArtistDraft] = useState(
    identityMode === "artist" ? artistName : ""
  );
  // Le nom civil arrive par SWR : tant que l'utilisateur n'a rien tapé, le
  // brouillon suit la valeur chargée.
  const [legalDraft, setLegalDraft] = useState<string | null>(null);
  const legalValue = legalDraft ?? (identityMode === "legal" ? artistName : legal.full);

  const name = mode === "artist" ? artistDraft : mode === "legal" ? legalValue : "";
  const canContinue = mode !== null && name.trim() !== "";

  const submit = () => {
    if (!mode || !canContinue) return;
    setArtistIdentity(mode, name);
    posthog?.capture("onboarding_identity_set", { mode });
    onContinue();
  };

  return (
    <>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
        {eyebrow}
      </p>
      <h1 className="font-display mt-3 text-3xl sm:text-4xl">
        Tu sors ta musique sous…
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#f5f5f5]/60">
        Ce nom signe tes liens d&apos;écoute et remplit d&apos;office tes
        nouveaux titres et albums. Tes œuvres restent déclarées à ton nom
        civil. Tu peux le changer quand tu veux depuis les réglages.
      </p>

      <div className="mt-8">
        <IdentityChoice
          mode={mode}
          artistDraft={artistDraft}
          legalDraft={legalValue}
          onModeChange={setMode}
          onArtistDraftChange={setArtistDraft}
          onLegalDraftChange={setLegalDraft}
        />
      </div>

      <div className="mt-8 flex justify-end">
        <Button size="lg" className="btn-glow gap-2" disabled={!canContinue} onClick={submit}>
          Continuer
        </Button>
      </div>
    </>
  );
}
