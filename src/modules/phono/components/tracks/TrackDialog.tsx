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
import { TrackCoverField } from "./TrackCoverField";
import { TrackCreditsField } from "./TrackCreditsField";
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
  isValidDateFr,
  isoToFr,
  toDisplayDate,
  toIsoDatePickerValue,
} from "@/lib/date-format";
import type {
  PhonoRole,
  ReleaseStatus,
  Track,
  TrackGuest,
} from "@/lib/sidekick-store";
import {
  ROLES,
  defaultVersion,
  newTrackId,
  normalizePhonoRole,
  normalizeTrackGuests,
} from "@/modules/phono/lib/track";
import { RELEASE_STATUSES } from "@/modules/phono/lib/release-status";

interface TrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = création. */
  track: Track | null;
  onSubmit: (track: Track) => void;
}

/** Champs pilotés par le formulaire. Les versions vivent dans `VersionList`. */
interface TrackFormState {
  title: string;
  mainArtist: string;
  role: PhonoRole;
  status: ReleaseStatus;
  cover?: string;
  releaseDate: string;
  isrc: string;
  genre: string;
  distribution: string;
  selfProduced: boolean;
  label: string;
  editor: string;
  guestArtists: TrackGuest[];
  notes: string;
}

const EMPTY_FORM: TrackFormState = {
  title: "",
  mainArtist: "",
  role: "artiste_principal",
  status: "en_production",
  cover: undefined,
  releaseDate: "",
  isrc: "",
  genre: "",
  distribution: "",
  selfProduced: true,
  label: "",
  editor: "",
  guestArtists: [],
  notes: "",
};

function formFromTrack(track: Track): TrackFormState {
  return {
    title: track.title ?? "",
    mainArtist: track.mainArtist ?? "",
    role: normalizePhonoRole((track.role as PhonoRole) ?? "artiste_principal"),
    status: track.status ?? "en_production",
    cover: track.cover,
    releaseDate: track.releaseDate ?? "",
    isrc: track.isrc ?? "",
    genre: track.genre ?? "",
    distribution: track.distribution ?? "",
    selfProduced: track.selfProduced !== false,
    label: track.label ?? "",
    editor: track.editor ?? "",
    guestArtists: normalizeTrackGuests(track.guestArtists),
    notes: track.notes ?? "",
  };
}

const SECTION_SEPARATOR = "border-t border-[rgba(245,245,245,0.08)] pt-5";

export function TrackDialog({
  open,
  onOpenChange,
  track,
  onSubmit,
}: TrackDialogProps) {
  const isEditing = track !== null;
  const [form, setForm] = useState<TrackFormState>(() =>
    track ? formFromTrack(track) : EMPTY_FORM
  );
  // Réinitialisation en cours de rendu (pattern React « ajuster l'état pendant
  // le rendu ») : chaque ouverture repart de `track`, chaque fermeture jette la
  // saisie — rouvrir en création ne doit jamais retrouver la précédente.
  const session = open ? track?.id ?? "__new__" : "__closed__";
  const [lastSession, setLastSession] = useState(session);
  if (lastSession !== session) {
    setLastSession(session);
    setForm(track ? formFromTrack(track) : EMPTY_FORM);
  }

  const patch = (values: Partial<TrackFormState>) =>
    setForm((prev) => ({ ...prev, ...values }));

  const displayedDate = toDisplayDate(form.releaseDate);
  const dateInvalid = displayedDate !== "" && !isValidDateFr(displayedDate);
  const canSubmit =
    form.title.trim() !== "" && form.mainArtist.trim() !== "" && !dateInvalid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const fields = {
      title: form.title.trim(),
      mainArtist: form.mainArtist.trim(),
      role: form.role,
      status: form.status,
      cover: form.cover,
      releaseDate: form.releaseDate,
      isrc: form.isrc,
      genre: form.genre,
      distribution: form.distribution,
      selfProduced: form.selfProduced,
      // Conservé même en auto-produit : `buildMetadataPayload` ignore déjà le
      // label dans ce cas, l'effacer ferait perdre la saisie au décochage.
      label: form.label,
      editor: form.editor,
      guestArtists: form.guestArtists.filter((g) => g.name.trim() !== ""),
      notes: form.notes,
    };
    // En édition on repart du titre existant : `versions`, `linkedWorkId` et
    // tout champ hors formulaire doivent survivre — perdre `versions`
    // détacherait les fichiers audio du titre.
    const next: Track = track
      ? { ...track, ...fields }
      : { id: newTrackId(), ...fields, versions: [defaultVersion("Original")] };
    onSubmit(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le titre" : "Nouveau titre"}
          </DialogTitle>
          <DialogDescription>
            Les versions et leurs fichiers audio se gèrent depuis la fiche du
            titre.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* ---------- Identité ---------- */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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

            <div className="grid gap-4 sm:grid-cols-2">
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
                  onValueChange={(v) => patch({ status: v as ReleaseStatus })}
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

            <TrackCoverField
              value={form.cover}
              onChange={(cover) => patch({ cover })}
            />
          </div>

          {/* ---------- Publication ---------- */}
          <div className={SECTION_SEPARATOR + " space-y-4"}>
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
              <Label
                htmlFor="track-self-produced"
                className="cursor-pointer font-normal"
              >
                Auto-produit
              </Label>
            </div>

            {/* Le label relève du master (droits voisins) : il n'a de sens que
                si le titre n'est pas auto-produit. */}
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

            {/* L'éditeur relève de l'œuvre (droits d'auteur), pas du master :
                il est donc indépendant d'« Auto-produit » et toujours visible.
                Un artiste auto-produit signé chez un éditeur est courant, et
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
          </div>

          {/* ---------- Crédits ---------- */}
          <div className={SECTION_SEPARATOR + " space-y-3"}>
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
          </div>

          <DialogFooter>
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
