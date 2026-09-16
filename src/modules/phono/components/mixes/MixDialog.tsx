"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DATE_FORMAT_PLACEHOLDER,
  isValidDateFr,
  isoToFr,
  toDisplayDate,
  toIsoDatePickerValue,
} from "@/lib/date-format";
import type {
  AudioAttachment,
  Mix,
  MixFormat,
  MixTracklistItem,
  ReleaseStatus,
} from "@/lib/sidekick-store";
import { audioFormatsHint } from "@/modules/phono/lib/audio-limits";
import { handleDetachedAudio } from "@/modules/phono/lib/audio-cleanup";
import { RELEASE_STATUSES } from "@/modules/phono/lib/release-status";
import { MIX_FORMATS, newMixId } from "@/modules/phono/lib/mix";
import { AudioAttachField, catalogFileBaseName } from "../audio/AudioAttachField";
import { TrackCoverField } from "../tracks/TrackCoverField";
import { TracklistEditor } from "./TracklistEditor";

interface MixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = création. */
  mix: Mix | null;
  onSubmit: (mix: Mix) => void;
}

interface MixFormState {
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
  return {
    title: mix.title ?? "",
    artists: mix.artists ?? "",
    format: mix.format ?? "dj_set",
    isVideo: Boolean(mix.isVideo),
    status: mix.status ?? "en_production",
    releaseDate: mix.releaseDate ?? "",
    publishedOn: mix.publishedOn ?? "",
    cover: mix.cover,
    tracklist: Array.isArray(mix.tracklist) ? mix.tracklist : [],
    audio: {
      audioPath: mix.audioPath,
      audioSource: mix.audioSource,
      audioName: mix.audioName,
      durationMs: mix.durationMs,
      sizeBytes: mix.sizeBytes,
      peaks: mix.peaks,
    },
  };
}

const SECTION_SEPARATOR = "border-t border-[rgba(245,245,245,0.08)] pt-5";

export function MixDialog({ open, onOpenChange, mix, onSubmit }: MixDialogProps) {
  const isEditing = mix !== null;
  const [form, setForm] = useState<MixFormState>(() =>
    mix ? formFromMix(mix) : EMPTY_FORM
  );

  // Réinitialisation en cours de rendu (cf. TrackDialog) : chaque ouverture
  // repart de `mix`, chaque fermeture jette la saisie.
  const session = open ? mix?.id ?? "__new__" : "__closed__";
  const [lastSession, setLastSession] = useState(session);
  if (lastSession !== session) {
    setLastSession(session);
    setForm(mix ? formFromMix(mix) : EMPTY_FORM);
  }

  const patch = (values: Partial<MixFormState>) =>
    setForm((prev) => ({ ...prev, ...values }));

  const [pendingDetach, setPendingDetach] = useState<{
    path: string;
    patch: Partial<AudioAttachment>;
  } | null>(null);
  const [deleteFromDrive, setDeleteFromDrive] = useState(false);

  const displayedDate = toDisplayDate(form.releaseDate);
  const dateInvalid = displayedDate !== "" && !isValidDateFr(displayedDate);
  const canSubmit = form.title.trim() !== "" && !dateInvalid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
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
    // En édition on repart du mix existant : tout champ hors formulaire survit.
    const next: Mix = mix
      ? { ...mix, ...fields }
      : { id: newMixId(), ...fields };
    onSubmit(next);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Modifier le mix" : "Nouveau mix"}</DialogTitle>
            <DialogDescription>
              DJ set, live set, mix ou émission. La tracklist sert aux déclarations
              de droits vers les ayants droit des titres joués.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            {/* ---------- Identité ---------- */}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mix-title">Titre *</Label>
                  <Input
                    id="mix-title"
                    value={form.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    placeholder="Nom du set"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mix-artists">Artistes</Label>
                  <Input
                    id="mix-artists"
                    value={form.artists}
                    onChange={(e) => patch({ artists: e.target.value })}
                    placeholder="Artistes ou DJ"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mix-format">Format</Label>
                  <Select
                    value={form.format}
                    onValueChange={(v) => patch({ format: v as MixFormat })}
                  >
                    <SelectTrigger id="mix-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MIX_FORMATS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mix-status">Statut</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => patch({ status: v as ReleaseStatus })}
                  >
                    <SelectTrigger id="mix-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELEASE_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="mix-video"
                  checked={form.isVideo}
                  onCheckedChange={(checked) => patch({ isVideo: checked === true })}
                />
                <Label htmlFor="mix-video" className="cursor-pointer font-normal">
                  Captation vidéo
                </Label>
              </div>

              <TrackCoverField
                value={form.cover}
                onChange={(cover) => patch({ cover })}
              />

              <div className="space-y-2">
                <Label>Fichier audio</Label>
                <AudioAttachField
                  attachment={form.audio}
                  onChange={(next) => {
                    const clearing = Boolean(form.audio.audioPath) && next.audioPath === undefined;
                    if (clearing && form.audio.audioSource === "upload" && form.audio.audioPath) {
                      setDeleteFromDrive(false);
                      setPendingDetach({ path: form.audio.audioPath, patch: next });
                      return;
                    }
                    patch({ audio: { ...form.audio, ...next } });
                  }}
                  showFormatsMark={false}
                  fileBaseName={catalogFileBaseName(form.artists, form.title)}
                />
                <p className="text-[10px] leading-tight text-[#F5F5F5]/30">
                  {audioFormatsHint()}. Un DJ set d&apos;une heure dépasse
                  largement ce plafond en 320 kbps — encode en 128 ou 192 kbps
                  pour une écoute de travail.
                </p>
              </div>
            </div>

            {/* ---------- Publication ---------- */}
            <div className={SECTION_SEPARATOR + " space-y-4"}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mix-release-date">Date de publication</Label>
                  <DatePicker
                    id="mix-release-date"
                    value={toIsoDatePickerValue(form.releaseDate)}
                    onChange={(iso) => patch({ releaseDate: isoToFr(iso) })}
                    placeholder={DATE_FORMAT_PLACEHOLDER}
                  />
                  {dateInvalid && (
                    <p className="text-xs text-destructive">
                      Date invalide — attendu {DATE_FORMAT_PLACEHOLDER}.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mix-published-on">Plateforme</Label>
                  <Input
                    id="mix-published-on"
                    value={form.publishedOn}
                    onChange={(e) => patch({ publishedOn: e.target.value })}
                    placeholder="Mixcloud, SoundCloud, chaîne, radio…"
                  />
                </div>
              </div>
            </div>

            {/* ---------- Tracklist ---------- */}
            <div className={SECTION_SEPARATOR}>
              <TracklistEditor
                items={form.tracklist}
                onChange={(tracklist) => patch({ tracklist })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isEditing ? "Enregistrer" : "Ajouter au catalogue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              Supprimer aussi le fichier du Drive. Sans cette case, il est
              conservé dans Drive → Phono → depuis-catalogue.
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDetach(null)}>
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
    </>
  );
}
