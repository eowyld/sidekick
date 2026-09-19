"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { ArrowLeft } from "lucide-react";
import { usePhonoData } from "@/hooks/usePhonoData";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/hooks/useUnsavedChangesGuard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageError } from "@/components/ui/page-error";
import { PageLoader } from "@/components/ui/page-loader";
import type {
  AudioAttachment,
  Mix,
  MixFormat,
  MixTracklistItem,
  ReleaseStatus,
} from "@/lib/sidekick-store";
import { isValidDateFr, toDisplayDate } from "@/lib/date-format";
import { handleDetachedAudio } from "@/modules/phono/lib/audio-cleanup";
import {
  itemsBeyondDuration,
  lastPlayableSecond,
  mixFormat,
  newMixId,
  normalizeMix,
} from "@/modules/phono/lib/mix";
import { cn, focusRing } from "@/lib/utils";
import { MixEditAside } from "./MixEditAside";
import { MixEditForm } from "./MixEditForm";

interface MixEditPageProps {
  /** `null` = création. */
  mixId: string | null;
}

/** Champs pilotés par le formulaire. Reprend l'ancien `MixDialog`. */
export interface MixFormState {
  title: string;
  artists: string;
  format: MixFormat;
  isVideo: boolean;
  status: ReleaseStatus;
  releaseDate: string;
  publishedOn: string;
  cover?: string;
  tracklist: MixTracklistItem[];
  /** Fichier rattaché. Un mix est un enregistrement au même titre qu'un master. */
  audio: AudioAttachment;
}

const EMPTY_FORM: MixFormState = {
  title: "",
  artists: "",
  format: "dj_set",
  isVideo: false,
  status: "en_production",
  releaseDate: "",
  publishedOn: "",
  cover: undefined,
  tracklist: [],
  audio: {},
};

function formFromMix(mix: Mix): MixFormState {
  const m = normalizeMix(mix);
  return {
    title: m.title,
    artists: m.artists,
    format: mixFormat(m.format),
    isVideo: m.isVideo,
    status: m.status,
    releaseDate: m.releaseDate,
    publishedOn: m.publishedOn,
    cover: m.cover,
    tracklist: m.tracklist,
    audio: {
      audioPath: m.audioPath,
      audioSource: m.audioSource,
      audioName: m.audioName,
      durationMs: m.durationMs,
      sizeBytes: m.sizeBytes,
      peaks: m.peaks,
    },
  };
}

/** Le catalogue, ouvert sur l'onglet d'où l'on vient. */
const BACK_URL = "/phono/catalogue?tab=mixes";

export function MixEditPage({ mixId }: MixEditPageProps) {
  const router = useRouter();
  const posthog = usePostHog();
  const { mixes, setMixes, loading, error } = usePhonoData();

  const existing = mixId ? mixes.find((m) => m.id === mixId) : undefined;
  const mix = existing ? normalizeMix(existing) : null;

  const [form, setForm] = useState<MixFormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<MixFormState>(EMPTY_FORM);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Le mix arrive après le premier rendu (SWR) : on remplit le formulaire dès
  // qu'il est là, une seule fois, sans écraser une saisie en cours. Ajustement
  // d'état en cours de rendu, comme `AlbumEditPage` : pas de useEffect, pour
  // que la première peinture montre déjà les bonnes valeurs.
  const readyId = mix ? mix.id : mixId === null ? "__new__" : null;
  if (readyId !== null && loadedId !== readyId) {
    setLoadedId(readyId);
    const initial = mix ? formFromMix(mix) : EMPTY_FORM;
    setForm(initial);
    setInitialForm(initial);
  }

  const patch = (values: Partial<MixFormState>) =>
    setForm((prev) => ({ ...prev, ...values }));

  /**
   * Détachement d'un fichier téléversé, à confirmer.
   *
   * Même mécanique qu'au catalogue et sur la page titre : la case « supprimer
   * aussi du Drive » est le seul endroit d'où un fichier peut quitter le Drive,
   * jamais un effet de bord silencieux d'une modification de mix.
   */
  const [pendingDetach, setPendingDetach] = useState<{
    path: string;
    patch: Partial<AudioAttachment>;
  } | null>(null);
  const [deleteFromDrive, setDeleteFromDrive] = useState(false);

  const handleAudioChange = (next: Partial<AudioAttachment>) => {
    const clearing = Boolean(form.audio.audioPath) && next.audioPath === undefined;
    if (clearing && form.audio.audioSource === "upload" && form.audio.audioPath) {
      setDeleteFromDrive(false);
      setPendingDetach({ path: form.audio.audioPath, patch: next });
      return;
    }
    patch({ audio: { ...form.audio, ...next } });
  };

  const displayedDate = toDisplayDate(form.releaseDate);
  const dateInvalid = displayedDate !== "" && !isValidDateFr(displayedDate);

  /**
   * Timecodes hors du morceau.
   *
   * La saisie est déjà bornée quand un fichier est rattaché, mais la tracklist
   * peut avoir été écrite avant lui — ou le fichier remplacé par un plus court.
   * Ces lignes-là feraient sauter le lecteur au-delà de la fin : on refuse de
   * les enregistrer, et la section Tracklist propose de les ramener d'un clic.
   */
  const maxSeconds = lastPlayableSecond(form.audio.durationMs);
  const beyondCount = itemsBeyondDuration(form.tracklist, maxSeconds).length;

  const canSubmit =
    form.title.trim() !== "" && !dateInvalid && beyondCount === 0;
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  // Quitter avec une saisie non enregistrée, c'est perdre le travail :
  // fermeture de l'onglet comme clic sur un lien de la sidebar.
  useUnsavedChangesGuard(dirty);

  const handleSubmit = () => {
    if (!canSubmit || saving) return;
    setSaving(true);

    const fields = {
      title: form.title.trim(),
      artists: form.artists.trim(),
      format: form.format,
      isVideo: form.isVideo,
      status: form.status,
      releaseDate: form.releaseDate,
      publishedOn: form.publishedOn.trim(),
      cover: form.cover,
      tracklist: form.tracklist,
      ...form.audio,
    };

    // En édition on repart du mix existant : tout champ hors formulaire doit
    // survivre. En création on génère l'id.
    const next: Mix = mix ? { ...mix, ...fields } : { id: newMixId(), ...fields };

    setMixes((prev) =>
      mix ? prev.map((m) => (m.id === next.id ? next : m)) : [next, ...prev]
    );

    if (!mix) posthog?.capture("item_created", { module: "phono" });

    router.push(BACK_URL);
  };

  const handleCancel = () => {
    if (dirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    router.push(BACK_URL);
  };

  if (loading) return <PageLoader />;
  if (error)
    return (
      <PageError
        title="Impossible de charger ce mix"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
        onRetry={() => router.refresh()}
      />
    );

  if (mixId && !existing)
    return (
      <PageError
        title="Ce mix n'existe plus"
        description="Il a peut-être été supprimé depuis un autre onglet."
        onRetry={() => router.push(BACK_URL)}
      />
    );

  return (
    <div>
      <button
        type="button"
        // Même chemin que le bouton « Annuler » du pied de page : confirmation
        // si des modifications sont en attente.
        onClick={handleCancel}
        className={cn(
          "mb-4 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-xs text-[#F5F5F5]/70 transition-colors hover:text-[#F5F5F5]",
          focusRing
        )}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour au catalogue
      </button>

      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40">
        Phono · Catalogue
      </p>
      <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">
        {mix ? mix.title || "Mix sans nom" : "Nouveau mix"}
      </h1>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <MixEditForm
          form={form}
          patch={patch}
          dateInvalid={dateInvalid}
          maxSeconds={maxSeconds}
          onAudioChange={handleAudioChange}
        />
        <MixEditAside
          form={form}
          patch={patch}
          canSubmit={canSubmit}
          blocking={
            beyondCount > 0
              ? `${beyondCount} timecode${beyondCount > 1 ? "s" : ""} de la tracklist ${beyondCount > 1 ? "dépassent" : "dépasse"} la fin du fichier.`
              : null
          }
          saving={saving}
          dirty={dirty}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>

      <Dialog
        open={pendingDetach !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDetach(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détacher l&apos;audio de ce mix ?</DialogTitle>
            <DialogDescription className="text-sm text-[#F5F5F5]/70">
              Le fichier ne sera plus rattaché à ce mix.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-md border border-[rgba(245,245,245,0.12)] p-3">
            <Checkbox
              id="mix-detach-from-drive"
              checked={deleteFromDrive}
              onCheckedChange={(checked) => setDeleteFromDrive(checked === true)}
            />
            <Label
              htmlFor="mix-detach-from-drive"
              className="cursor-pointer text-xs font-normal text-[#F5F5F5]/70"
            >
              Supprimer aussi le fichier du Drive. Sans cette case, il reste
              dans Drive → Phono → Catalogue.
            </Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDetach(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!pendingDetach) return;
                patch({ audio: { ...form.audio, ...pendingDetach.patch } });
                void handleDetachedAudio([pendingDetach.path], deleteFromDrive);
                setPendingDetach(null);
              }}
            >
              Détacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
