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
import { Textarea } from "@/components/ui/textarea";
import {
  DATE_FORMAT_PLACEHOLDER,
  isoToFr,
  toIsoDatePickerValue,
} from "@/lib/date-format";
import { Button } from "@/components/ui/button";
import type {
  Album,
  PhonoRole,
  ReleaseStatus,
  Track,
  TrackVersion,
} from "@/lib/sidekick-store";
import { ROLES, suggestedVersionLabel } from "@/modules/phono/lib/track";
import {
  RELEASE_STATUSES,
  releaseStatusLabel,
} from "@/modules/phono/lib/release-status";
import { TrackAlbumField } from "./TrackAlbumField";
import { TrackCreditsField } from "./TrackCreditsField";
import { TrackSection } from "./TrackSection";
import { VersionList } from "./VersionList";
import type { TrackFormState } from "./TrackEditPage";

interface TrackEditFormProps {
  form: TrackFormState;
  patch: (values: Partial<TrackFormState>) => void;
  /** Dérivé de `form.releaseDate` dans la page — la validation reste unique. */
  dateInvalid: boolean;
  /** Le titre tel que `VersionList` doit le voir : état du formulaire, pas la donnée serveur. */
  draftTrack: Track;
  onPatchVersion: (versionId: string, patch: Partial<TrackVersion>) => void;
  onAddVersion: () => void;
  onRemoveVersion: (versionId: string) => void;
  /** Change le statut ET fait suivre les versions encore vierges. */
  onStatusChange: (status: ReleaseStatus) => void;
  albums: Album[];
  /** `null` = aucun album/EP rattaché. */
  albumId: string | null;
  onAlbumChange: (
    albumId: string | null,
    patch: Partial<Pick<TrackFormState, "label" | "editor" | "distribution">>
  ) => void;
  onCreateAlbum: (title: string) => Album;
}

/** Dit pourquoi cette version-là est attendue à cette étape. */
function versionsHint(status: ReleaseStatus): string {
  switch (status) {
    case "en_production":
      return "Un titre en production n'a pas encore de master : on part de la démo.";
    case "mixe":
      return "Le mix est fait, le master non : la version attendue est le pré-mix.";
    case "masterise":
      return "Le master est prêt, c'est lui qui partira en distribution.";
    case "publie":
      return "La version originale est celle que connaissent les plateformes.";
  }
}

export function TrackEditForm({
  form,
  patch,
  dateInvalid,
  draftTrack,
  onPatchVersion,
  onAddVersion,
  onRemoveVersion,
  onStatusChange,
  albums,
  albumId,
  onAlbumChange,
  onCreateAlbum,
}: TrackEditFormProps) {
  const suggested = suggestedVersionLabel(form.status);
  const hasSuggested = form.versions.some(
    (v) => v.label.trim().toLowerCase() === suggested.toLowerCase()
  );

  const publicationFilled =
    form.releaseDate.trim() !== "" ||
    form.isrc.trim() !== "" ||
    form.genre.trim() !== "" ||
    form.distribution.trim() !== "" ||
    form.label.trim() !== "" ||
    form.editor.trim() !== "";

  const creditsFilled =
    form.guestArtists.some((g) => g.name.trim() !== "") ||
    form.notes.trim() !== "";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F0FF00]">
          L&apos;essentiel
        </h2>
        <p className="mt-1 text-xs text-[#F5F5F5]/55">
          De quoi exister dans le catalogue. Le reste peut attendre la sortie.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="track-title">Titre *</Label>
            <Input
              id="track-title"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Titre du morceau"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="track-main-artist">Artiste principal *</Label>
            <Input
              id="track-main-artist"
              value={form.mainArtist}
              onChange={(e) => patch({ mainArtist: e.target.value })}
              placeholder="Nom de l'artiste"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="track-role">Rôle</Label>
            <Select
              value={form.role}
              onValueChange={(v) => patch({ role: v as PhonoRole })}
            >
              <SelectTrigger id="track-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="track-status">Statut</Label>
            <Select
              value={form.status}
              onValueChange={(v) => onStatusChange(v as ReleaseStatus)}
            >
              <SelectTrigger id="track-status">
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
      </section>

      <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F0FF00]">
          Versions & audio
        </h2>
        <p className="mt-1 text-xs text-[#F5F5F5]/55">{versionsHint(form.status)}</p>
        <div className="mt-4">
          <VersionList
            track={draftTrack}
            onPatchVersion={onPatchVersion}
            onAddVersion={onAddVersion}
            onRemoveVersion={onRemoveVersion}
            // L'export de métadonnées vit dans le catalogue, pas ici : il
            // travaille sur un titre déjà enregistré.
            onExportMetadata={() => {}}
          />
        </div>

        {!hasSuggested && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[rgba(56,189,248,0.35)] bg-[rgba(56,189,248,0.08)] px-3 py-2">
            <p className="text-xs text-[#F5F5F5]/80">
              Ce titre est <strong>{releaseStatusLabel(form.status)}</strong>{" "}
              et n&apos;a pas de version « {suggested} ».
            </p>
            <Button type="button" size="xs" onClick={onAddVersion}>
              Ajouter
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F0FF00]">
          Album &amp; EP
        </h2>
        <p className="mt-1 text-xs text-[#F5F5F5]/55">
          Rattacher ce titre à une sortie peut lui faire hériter du label, de
          l&apos;éditeur et de la distribution.
        </p>
        <div className="mt-4">
          <TrackAlbumField
            albums={albums}
            value={albumId}
            trackFields={{
              label: form.label,
              editor: form.editor,
              distribution: form.distribution,
            }}
            onChange={onAlbumChange}
            onCreateAlbum={onCreateAlbum}
          />
        </div>
      </section>

      <TrackSection
        title="Publication"
        description="L'ISRC identifie ton enregistrement chez les plateformes et les sociétés de gestion. Rien de tout ça n'existe avant la sortie, laisse vide tant que tu ne sais pas."
        defaultOpen={publicationFilled}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="track-release-date">Date de sortie</Label>
            <DatePicker
              id="track-release-date"
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
            <Label htmlFor="track-isrc">N° ISRC</Label>
            <Input
              id="track-isrc"
              value={form.isrc}
              onChange={(e) => patch({ isrc: e.target.value })}
              placeholder="Ex. FR-XXX-00-00000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="track-genre">Genre</Label>
          <Input
            id="track-genre"
            value={form.genre}
            onChange={(e) => patch({ genre: e.target.value })}
            placeholder="Ex. Pop, Rap, Electro…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="track-distribution">Distribution</Label>
          <Textarea
            id="track-distribution"
            value={form.distribution}
            onChange={(e) => patch({ distribution: e.target.value })}
            placeholder="Nom du distributeur, plateformes, accord, etc."
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="track-self-produced"
            checked={form.selfProduced}
            onCheckedChange={(checked) =>
              patch({ selfProduced: checked === true })
            }
          />
          <Label htmlFor="track-self-produced" className="cursor-pointer font-normal">
            Auto-produit
          </Label>
        </div>

        {/* Le label relève du master (droits voisins) : il n'a de sens que si
            le titre n'est pas auto-produit. */}
        {!form.selfProduced && (
          <div className="space-y-2">
            <Label htmlFor="track-label">Label</Label>
            <Input
              id="track-label"
              value={form.label}
              onChange={(e) => patch({ label: e.target.value })}
              placeholder="Nom du label"
            />
          </div>
        )}

        {/* L'éditeur relève de l'œuvre (droits d'auteur), pas du master : il
            est donc indépendant d'« Auto-produit » et toujours visible. Un
            artiste auto-produit signé chez un éditeur est courant, et
            `buildMetadataPayload` ne conditionne que `label` à
            `selfProduced`, jamais `editor`. */}
        <div className="space-y-2">
          <Label htmlFor="track-editor">Éditeur</Label>
          <Input
            id="track-editor"
            value={form.editor}
            onChange={(e) => patch({ editor: e.target.value })}
            placeholder="Nom de l'éditeur"
          />
        </div>
      </TrackSection>

      <TrackSection
        title="Crédits & notes"
        description="Featurings, producteurs, musiciens : tout ce qui devra apparaître sur les métadonnées et les déclarations."
        defaultOpen={creditsFilled}
      >
        <TrackCreditsField
          value={form.guestArtists}
          onChange={(guestArtists) => patch({ guestArtists })}
        />

        <div className="space-y-2 pt-1">
          <Label htmlFor="track-notes">Notes</Label>
          <Textarea
            id="track-notes"
            value={form.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Notes libres…"
            rows={2}
            className="resize-none"
          />
        </div>
      </TrackSection>
    </div>
  );
}
