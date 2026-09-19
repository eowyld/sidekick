"use client";

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
import type {
  Album,
  AlbumGuest,
  AlbumType,
  ReleaseStatus,
  Track,
  TrackVersion,
} from "@/lib/sidekick-store";
import {
  ALBUM_TYPES,
  albumTracks,
  computeAlbumContributors,
} from "@/modules/phono/lib/album";
import {
  RELEASE_STATUSES,
  releaseStatusLabel,
} from "@/modules/phono/lib/release-status";
import { TrackSection } from "../tracks/TrackSection";
import { AlbumContributors, AlbumGuestList } from "./AlbumCreditsFields";
import { TracklistComposer } from "./TracklistComposer";
import type { AlbumFormState } from "./AlbumEditPage";

interface AlbumEditFormProps {
  form: AlbumFormState;
  patch: (values: Partial<AlbumFormState>) => void;
  /** Dérivé de `form.releaseDate` dans la page — la validation reste unique. */
  dateInvalid: boolean;
  /** Tous les titres du catalogue, déjà normalisés. */
  allTracks: Track[];
  /** Titres de la tracklist qui avanceront de statut à l'enregistrement. */
  advancingCount: number;
  /** Versions retenues par titre, repli historique déjà résolu. */
  selectedVersionIds: Record<string, string[]>;
  /**
   * Entrée/sortie/réordonnancement d'un titre. Passe par la page plutôt que
   * par `patch` : la sélection de versions doit suivre le mouvement.
   */
  onTracklistChange: (trackIds: string[]) => void;
  onToggleVersion: (trackId: string, versionId: string, selected: boolean) => void;
  onPatchTrackVersion: (
    trackId: string,
    versionId: string,
    patch: Partial<TrackVersion>
  ) => void;
  onAddTrackVersion: (trackId: string) => void;
  onRemoveTrackVersion: (trackId: string, versionId: string) => void;
  /** Crée un titre dans le catalogue et l'ajoute à la tracklist. */
  onCreateTrack: (title: string) => void;
  onAddGuest: () => void;
  onUpdateGuest: (id: string, values: Partial<AlbumGuest>) => void;
  onRemoveGuest: (id: string) => void;
}

export function AlbumEditForm({
  form,
  patch,
  dateInvalid,
  allTracks,
  advancingCount,
  selectedVersionIds,
  onTracklistChange,
  onToggleVersion,
  onPatchTrackVersion,
  onAddTrackVersion,
  onRemoveTrackVersion,
  onCreateTrack,
  onAddGuest,
  onUpdateGuest,
  onRemoveGuest,
}: AlbumEditFormProps) {
  // Contributeurs calculés en direct : suivent l'ajout ou le retrait d'un titre
  // dans la tracklist, sans attendre l'enregistrement.
  const previewAlbum = {
    id: "__preview__",
    title: form.title,
    artist: form.artist,
    type: form.type,
    status: form.status,
    releaseDate: form.releaseDate,
    upcEan: form.upcEan,
    notes: form.notes,
    guests: form.guests,
    trackIds: form.trackIds,
  } as Album;
  const contributors = computeAlbumContributors(
    previewAlbum,
    albumTracks(previewAlbum, allTracks)
  );

  const publicationFilled =
    form.releaseDate.trim() !== "" ||
    form.upcEan.trim() !== "" ||
    form.genre.trim() !== "" ||
    form.distribution.trim() !== "" ||
    form.label.trim() !== "" ||
    form.editor.trim() !== "";

  const creditsFilled =
    form.guests.some((g) => g.name.trim() !== "") || form.notes.trim() !== "";

  const pieceCount = form.trackIds.reduce(
    (n, id) => n + (selectedVersionIds[id]?.length ?? 0),
    0
  );

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
            <Label htmlFor="album-title">Titre *</Label>
            <Input
              id="album-title"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Titre de l'album ou EP"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-artist">Artiste *</Label>
            <Input
              id="album-artist"
              value={form.artist}
              onChange={(e) => patch({ artist: e.target.value })}
              placeholder="Nom de l'artiste principal"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="album-type">Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => patch({ type: v as AlbumType })}
            >
              <SelectTrigger id="album-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALBUM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-status">Statut</Label>
            <Select
              value={form.status}
              onValueChange={(v) => patch({ status: v as ReleaseStatus })}
            >
              <SelectTrigger id="album-status">
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
            {advancingCount > 0 && (
              <p className="text-xs text-[#F5F5F5]/55">
                En enregistrant, {advancingCount} titre
                {advancingCount > 1 ? "s" : ""} passeront en «{" "}
                {releaseStatusLabel(form.status)} ».
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F0FF00]">
            Tracklist
          </h2>
          {/*
            Deux comptes, parce qu'ils diffèrent : un titre dont le Master et
            le Radio Edit sont cochés occupe deux pistes de la sortie.
          */}
          <span className="text-[11px] tabular-nums text-[#F5F5F5]/40">
            {form.trackIds.length} titre{form.trackIds.length > 1 ? "s" : ""} ·{" "}
            {pieceCount} piste{pieceCount > 1 ? "s" : ""}
          </span>
        </div>
        <p className="mt-1 text-xs text-[#F5F5F5]/55">
          Déplie un titre pour attacher ses fichiers audio et cocher les
          versions qui partent sur cette sortie. L&apos;album les référence, il
          ne les duplique jamais.
        </p>
        <div className="mt-4">
          <TracklistComposer
            trackIds={form.trackIds}
            allTracks={allTracks}
            onChange={onTracklistChange}
            selectedVersionIds={selectedVersionIds}
            onToggleVersion={onToggleVersion}
            onPatchTrackVersion={onPatchTrackVersion}
            onAddTrackVersion={onAddTrackVersion}
            onRemoveTrackVersion={onRemoveTrackVersion}
            onCreateTrack={onCreateTrack}
          />
        </div>
      </section>

      <TrackSection
        title="Publication"
        description="Date, code-barres et distribution. Rien de tout ça n'existe avant la sortie, laisse vide tant que tu ne sais pas."
        defaultOpen={publicationFilled}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="album-release-date">Date de sortie</Label>
            <DatePicker
              id="album-release-date"
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
            <Label htmlFor="album-upc">UPC / EAN</Label>
            <Input
              id="album-upc"
              value={form.upcEan}
              onChange={(e) => patch({ upcEan: e.target.value })}
              placeholder="Code-barres"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="album-genre">Genre</Label>
          <Input
            id="album-genre"
            value={form.genre}
            onChange={(e) => patch({ genre: e.target.value })}
            placeholder="Ex. Pop, Rap, Electro…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="album-distribution">Distribution</Label>
          <Textarea
            id="album-distribution"
            value={form.distribution}
            onChange={(e) => patch({ distribution: e.target.value })}
            placeholder="Nom du distributeur, plateformes, accord, etc."
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="album-label">Label</Label>
            <Input
              id="album-label"
              value={form.label}
              onChange={(e) => patch({ label: e.target.value })}
              placeholder="Nom du label"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-editor">Éditeur</Label>
            <Input
              id="album-editor"
              value={form.editor}
              onChange={(e) => patch({ editor: e.target.value })}
              placeholder="Nom de l'éditeur"
            />
          </div>
        </div>
      </TrackSection>

      <TrackSection
        title="Crédits & notes"
        description="Les contributeurs sont hérités des titres de la tracklist. Ajoute ici ceux qui n'apparaissent sur aucun titre."
        defaultOpen={creditsFilled}
      >
        <AlbumContributors contributors={contributors} />

        <AlbumGuestList
          guests={form.guests}
          onAdd={onAddGuest}
          onUpdate={onUpdateGuest}
          onRemove={onRemoveGuest}
        />

        <div className="space-y-2 pt-1">
          <Label htmlFor="album-notes">Notes</Label>
          <Textarea
            id="album-notes"
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
