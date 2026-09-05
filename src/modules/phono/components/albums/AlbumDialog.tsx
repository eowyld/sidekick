"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  isValidDateFr,
  isoToFr,
  toDisplayDate,
  toIsoDatePickerValue,
} from "@/lib/date-format";
import type {
  Album,
  AlbumGuest,
  AlbumType,
  ReleaseStatus,
  Track,
} from "@/lib/sidekick-store";
import {
  ALBUM_TYPES,
  albumTracks,
  computeAlbumContributors,
  newAlbumId,
  normalizeAlbum,
} from "@/modules/phono/lib/album";
import { RELEASE_STATUSES } from "@/modules/phono/lib/release-status";
import { AlbumContributors, AlbumGuestList } from "./AlbumCreditsFields";
import { TrackCoverField } from "../tracks/TrackCoverField";
import { TracklistComposer } from "./TracklistComposer";

interface AlbumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = création. */
  album: Album | null;
  allTracks: Track[];
  onSubmit: (album: Album, statusChanged: boolean) => void;
}

/** Champs pilotés par le formulaire. */
interface AlbumFormState {
  title: string;
  type: AlbumType;
  artist: string;
  status: ReleaseStatus;
  releaseDate: string;
  upcEan: string;
  label: string;
  editor: string;
  distribution: string;
  genre: string;
  cover?: string;
  notes: string;
  guests: AlbumGuest[];
  trackIds: string[];
}

const EMPTY_FORM: AlbumFormState = {
  title: "",
  type: "album",
  artist: "",
  status: "en_production",
  releaseDate: "",
  upcEan: "",
  label: "",
  editor: "",
  distribution: "",
  genre: "",
  cover: undefined,
  notes: "",
  guests: [],
  trackIds: [],
};

function formFromAlbum(album: Album): AlbumFormState {
  const a = normalizeAlbum(album);
  return {
    title: a.title,
    type: a.type,
    artist: a.artist,
    status: a.status,
    releaseDate: a.releaseDate,
    upcEan: a.upcEan,
    label: a.label ?? "",
    editor: a.editor ?? "",
    distribution: a.distribution ?? "",
    genre: a.genre ?? "",
    cover: a.cover,
    notes: a.notes ?? "",
    guests: a.guests ?? [],
    trackIds: a.trackIds,
  };
}

function newGuestId(): string {
  return "ag-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
}

export function AlbumDialog({
  open,
  onOpenChange,
  album,
  allTracks,
  onSubmit,
}: AlbumDialogProps) {
  const isEditing = album !== null;
  const [form, setForm] = useState<AlbumFormState>(() =>
    album ? formFromAlbum(album) : EMPTY_FORM
  );
  // Réinitialisation en cours de rendu : chaque ouverture repart de `album`,
  // chaque fermeture jette la saisie — rouvrir en création ne doit jamais
  // retrouver la précédente.
  const session = open ? album?.id ?? "__new__" : "__closed__";
  const [lastSession, setLastSession] = useState(session);
  if (lastSession !== session) {
    setLastSession(session);
    setForm(album ? formFromAlbum(album) : EMPTY_FORM);
  }

  const patch = (values: Partial<AlbumFormState>) =>
    setForm((prev) => ({ ...prev, ...values }));

  const displayedDate = toDisplayDate(form.releaseDate);
  const dateInvalid = displayedDate !== "" && !isValidDateFr(displayedDate);
  const canSubmit =
    form.title.trim() !== "" && form.artist.trim() !== "" && !dateInvalid;

  // Contributeurs calculés en direct : suivent l'ajout/retrait d'un titre dans
  // la tracklist sans qu'on rouvre le dialog.
  const previewAlbum = {
    ...(album ?? {}),
    id: album?.id ?? "__preview__",
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

  const addGuest = () =>
    patch({
      guests: [
        ...form.guests,
        { id: newGuestId(), name: "", role: "artiste_secondaire" },
      ],
    });
  const updateGuest = (id: string, values: Partial<AlbumGuest>) =>
    patch({
      guests: form.guests.map((g) => (g.id === id ? { ...g, ...values } : g)),
    });
  const removeGuest = (id: string) =>
    patch({ guests: form.guests.filter((g) => g.id !== id) });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const fields = {
      title: form.title.trim(),
      type: form.type,
      artist: form.artist.trim(),
      status: form.status,
      releaseDate: form.releaseDate,
      upcEan: form.upcEan.trim(),
      label: form.label,
      editor: form.editor,
      distribution: form.distribution,
      genre: form.genre,
      cover: form.cover,
      notes: form.notes,
      guests: form.guests.filter((g) => g.name.trim() !== ""),
      trackIds: form.trackIds,
    };
    // En édition on repart de l'album existant : tout champ hors formulaire doit
    // survivre. En création on génère l'id.
    const next: Album = album
      ? { ...album, ...fields }
      : { id: newAlbumId(), ...fields };
    const statusChanged =
      album !== null && (album.status ?? "en_production") !== form.status;
    onSubmit(next, statusChanged);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'album" : "Nouvel album ou EP"}
          </DialogTitle>
          <DialogDescription>
            Un album référence des titres du catalogue : compose sa tracklist à
            droite, sans jamais dupliquer un titre.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6 py-2 md:grid-cols-2">
          {/* ---------- Colonne gauche : métadonnées release ---------- */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="album-title">Titre *</Label>
              <Input
                id="album-title"
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Titre de l'album ou EP"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
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
                  <p className="text-xs" style={{ color: "#F59E0B" }}>
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

            <div className="space-y-2">
              <Label htmlFor="album-genre">Genre</Label>
              <Input
                id="album-genre"
                value={form.genre}
                onChange={(e) => patch({ genre: e.target.value })}
                placeholder="Ex. Pop, Rap, Electro…"
              />
            </div>

            <TrackCoverField
              value={form.cover}
              onChange={(cover) => patch({ cover })}
            />

            <div className="space-y-2">
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

            <AlbumContributors contributors={contributors} />

            <AlbumGuestList
              guests={form.guests}
              onAdd={addGuest}
              onUpdate={updateGuest}
              onRemove={removeGuest}
            />
          </div>

          {/* ---------- Colonne droite : tracklist ---------- */}
          <div className="space-y-2">
            <Label>Tracklist</Label>
            <TracklistComposer
              trackIds={form.trackIds}
              allTracks={allTracks}
              onChange={(trackIds) => patch({ trackIds })}
            />
          </div>

          <DialogFooter className="md:col-span-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isEditing ? "Enregistrer" : "Ajouter au catalogue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
