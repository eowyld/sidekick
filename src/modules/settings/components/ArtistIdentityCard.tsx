"use client";

import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IdentityChoice } from "@/components/onboarding/IdentityChoice";
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import { useEditionData } from "@/hooks/useEditionData";
import { usePhonoData } from "@/hooks/usePhonoData";
import type { IdentityMode } from "@/lib/artist-identity";

function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}

/**
 * Identité de l'artiste dans Réglages. Changer de nom ne réécrit pas le
 * catalogue : une sortie publiée garde le nom sous lequel elle est sortie.
 * Seuls les champs artiste vides peuvent être remplis, et sur demande.
 */
export function ArtistIdentityCard() {
  const posthog = usePostHog();
  const { identityMode, artistName, legal, setArtistIdentity } = useArtistIdentity();
  const { tracks, setTracks, albums, setAlbums, mixes, setMixes } = usePhonoData();
  const { works, setWorks } = useEditionData();

  const [mode, setMode] = useState<IdentityMode | null>(identityMode);
  const [artistDraft, setArtistDraft] = useState<string | null>(null);
  const [legalDraft, setLegalDraft] = useState<string | null>(null);

  // Brouillons dérivés des valeurs chargées tant que rien n'a été tapé.
  const effectiveMode = mode ?? identityMode;
  const artistValue = artistDraft ?? (identityMode === "artist" ? artistName : "");
  const legalValue = legalDraft ?? (identityMode === "legal" ? artistName : legal.full);
  const name = effectiveMode === "artist" ? artistValue : effectiveMode === "legal" ? legalValue : "";
  const dirty =
    effectiveMode !== identityMode || name.trim() !== artistName.trim();

  const save = () => {
    if (!effectiveMode || !name.trim()) return;
    setArtistIdentity(effectiveMode, name);
    posthog?.capture("artist_identity_updated", { mode: effectiveMode, module: "settings" });
    toast.success("Identité enregistrée.");
  };

  // Remplissage des champs vides : nom affiché pour les sorties, nom civil
  // pour les œuvres. Jamais un champ déjà renseigné.
  const emptyTracks = tracks.filter((t) => !(t.mainArtist ?? "").trim()).length;
  const emptyAlbums = albums.filter((a) => !(a.artist ?? "").trim()).length;
  const emptyMixes = mixes.filter((m) => !(m.artists ?? "").trim()).length;
  const emptyWorks = legal.full
    ? works.filter((w) => !(w.artistName ?? "").trim()).length
    : 0;
  const canFillReleases = artistName.trim() !== "";
  const releaseCount = canFillReleases ? emptyTracks + emptyAlbums + emptyMixes : 0;
  const total = releaseCount + emptyWorks;

  const summary = [
    canFillReleases && emptyTracks > 0 && plural(emptyTracks, "titre", "titres"),
    canFillReleases && emptyAlbums > 0 && plural(emptyAlbums, "album", "albums"),
    canFillReleases && emptyMixes > 0 && plural(emptyMixes, "mix", "mixes"),
    emptyWorks > 0 && plural(emptyWorks, "œuvre", "œuvres"),
  ]
    .filter(Boolean)
    .join(", ");

  const fillEmpty = () => {
    const releaseName = artistName.trim();
    if (releaseName) {
      if (emptyTracks) setTracks((prev) => prev.map((t) => ((t.mainArtist ?? "").trim() ? t : { ...t, mainArtist: releaseName })));
      if (emptyAlbums) setAlbums((prev) => prev.map((a) => ((a.artist ?? "").trim() ? a : { ...a, artist: releaseName })));
      if (emptyMixes) setMixes((prev) => prev.map((m) => ((m.artists ?? "").trim() ? m : { ...m, artists: releaseName })));
    }
    if (emptyWorks) setWorks((prev) => prev.map((w) => ((w.artistName ?? "").trim() ? w : { ...w, artistName: legal.full })));
    posthog?.capture("artist_identity_backfilled", { count: total, module: "settings" });
    toast.success("Champs artiste complétés.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identité artistique</CardTitle>
        <CardDescription>
          Le nom qui signe tes liens d&apos;écoute et remplit tes nouveaux titres,
          albums et mixes. Tes sorties existantes gardent leur nom. Tes œuvres
          sont toujours déclarées à ton nom civil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <IdentityChoice
          mode={effectiveMode}
          artistDraft={artistValue}
          legalDraft={legalValue}
          onModeChange={setMode}
          onArtistDraftChange={setArtistDraft}
          onLegalDraftChange={setLegalDraft}
        />
        <Button onClick={save} disabled={!dirty || !effectiveMode || !name.trim()}>
          Enregistrer l&apos;identité
        </Button>

        {!dirty && total > 0 && (
          <div className="flex flex-col gap-3 rounded-sm border border-[rgba(245,245,245,0.12)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#f5f5f5]/70">
              Champs artiste vides : {summary}.
            </p>
            <Button variant="outline" size="sm" onClick={fillEmpty}>
              Les remplir avec mon nom
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
