"use client";

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
  isoToFr,
  toIsoDatePickerValue,
} from "@/lib/date-format";
import type {
  AudioAttachment,
  MixFormat,
  ReleaseStatus,
} from "@/lib/sidekick-store";
import { audioFormatsHint } from "@/modules/phono/lib/audio-limits";
import { useDriveAudioUsage } from "@/modules/phono/lib/audio-usage";
import { MIX_FORMATS } from "@/modules/phono/lib/mix";
import { RELEASE_STATUSES } from "@/modules/phono/lib/release-status";
import { AudioAttachField, catalogFileBaseName } from "../audio/AudioAttachField";
import { TrackSection } from "../tracks/TrackSection";
import { TracklistEditor } from "./TracklistEditor";
import type { MixFormState } from "./MixEditPage";

interface MixEditFormProps {
  form: MixFormState;
  patch: (values: Partial<MixFormState>) => void;
  /** Dérivé de `form.releaseDate` dans la page — la validation reste unique. */
  dateInvalid: boolean;
  /** Dernière seconde atteignable du fichier rattaché, `null` sans fichier. */
  maxSeconds: number | null;
  /**
   * Rattacher, remplacer ou détacher le fichier. Passe par la page : détacher
   * un fichier téléversé demande une confirmation, et l'éventuelle suppression
   * dans le Drive.
   */
  onAudioChange: (patch: Partial<AudioAttachment>) => void;
}

export function MixEditForm({
  form,
  patch,
  dateInvalid,
  maxSeconds,
  onAudioChange,
}: MixEditFormProps) {
  // Pas de brouillon à surcharger : un mix n'a qu'un fichier, et celui en
  // place est déjà retiré du relevé par `AudioAttachField`.
  const audioUsage = useDriveAudioUsage();
  const publicationFilled =
    form.releaseDate.trim() !== "" || form.publishedOn.trim() !== "";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F0FF00]">
          L&apos;essentiel
        </h2>
        <p className="mt-1 text-xs text-[#F5F5F5]/55">
          De quoi exister dans le catalogue. Le reste peut attendre la
          publication.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mix-format">Catégorie</Label>
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

        <div className="mt-4 flex items-center gap-2">
          <Checkbox
            id="mix-video"
            checked={form.isVideo}
            onCheckedChange={(checked) => patch({ isVideo: checked === true })}
          />
          <Label htmlFor="mix-video" className="cursor-pointer font-normal">
            Captation vidéo
          </Label>
        </div>
      </section>

      <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F0FF00]">
          Fichier audio
        </h2>
        <p className="mt-1 text-xs text-[#F5F5F5]/55">
          Un seul fichier par mix, écoutable depuis le catalogue. Il reste rangé
          dans Drive → Phono → Catalogue.
        </p>
        <div className="mt-4 space-y-2">
          <AudioAttachField
            attachment={form.audio}
            onChange={onAudioChange}
            showFormatsMark={false}
            fileBaseName={catalogFileBaseName(form.artists, form.title)}
            usage={audioUsage}
          />
          <p className="text-[10px] leading-tight text-[#F5F5F5]/30">
            {audioFormatsHint()}. Un DJ set d&apos;une heure dépasse largement ce
            plafond en 320 kbps — encode en 128 ou 192 kbps pour une écoute de
            travail.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F0FF00]">
          Tracklist
        </h2>
        <p className="mt-1 text-xs text-[#F5F5F5]/55">
          Indicative : de quoi te souvenir du set, le recoller sur Mixcloud ou
          Resident Advisor, et sauter d&apos;un titre à l&apos;autre depuis le
          catalogue.
        </p>
        <div className="mt-4">
          <TracklistEditor
            items={form.tracklist}
            onChange={(tracklist) => patch({ tracklist })}
            maxSeconds={maxSeconds}
          />
        </div>
      </section>

      <TrackSection
        title="Publication"
        description="Date et plateforme de mise en ligne. Laisse vide tant que le set n'est pas sorti."
        defaultOpen={publicationFilled}
      >
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
      </TrackSection>
    </div>
  );
}
