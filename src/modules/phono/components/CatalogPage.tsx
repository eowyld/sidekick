"use client";

import { useRef, useState } from "react";
import { useSidekickData } from "@/hooks/useSidekickData";
import type {
  Track,
  PhonoRole,
  TrackVersion,
  Album,
  AlbumType,
} from "@/lib/sidekick-store";
import {
  DATE_FORMAT_PLACEHOLDER,
  frToIso,
  isValidDateFr,
  isoToFr,
} from "@/lib/date-format";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";

const ROLES: { value: PhonoRole; label: string }[] = [
  { value: "artiste_principal", label: "Artiste principal" },
  { value: "artiste_secondaire", label: "Artiste secondaire" },
  { value: "musicien_interprete", label: "Musicien interprète" },
  { value: "chanteur_interprete", label: "Chanteur interprète" },
  { value: "directeur_musical", label: "Directeur musical" },
];

/** Draft pour édition de titre (évite l'inférence unknown de Track). */
type TrackDraft = {
  title: string;
  mainArtist: string;
  role: PhonoRole;
  guestArtists: string[];
  isrc: string;
  releaseDate: string;
  selfProduced: boolean;
  label?: string;
  versions: TrackVersion[];
  notes: string;
};

function defaultTrack(): TrackDraft {
  return {
    title: "",
    mainArtist: "",
    role: "artiste_principal",
    guestArtists: [],
    isrc: "",
    releaseDate: "",
    selfProduced: true,
    versions: [],
    notes: "",
  };
}

function normalizeTrack(t: Track): Track {
  const d = defaultTrack();
  return {
    ...d,
    ...t,
    id: t.id,
    guestArtists: Array.isArray(t.guestArtists) ? t.guestArtists : [],
    versions: Array.isArray(t.versions) ? t.versions : [],
    selfProduced: t.selfProduced !== false,
  };
}

function newId(): string {
  return "t-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

/** Affiche une date stockée (ISO ou JJ/MM/AAAA) en JJ/MM/AAAA. */
function displayDate(value: string): string {
  if (!value) return "";
  if (value.includes("/")) return value;
  return isoToFr(value);
}

/** Convertit une date stockée (JJ/MM/AAAA ou ISO) en ISO pour le DatePicker. */
function toIsoForPicker(value: string): string {
  if (!value) return "";
  if (value.includes("/")) return frToIso(value);
  return value;
}

function roleLabel(role: PhonoRole): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

const ALBUM_TYPES: { value: AlbumType; label: string }[] = [
  { value: "album", label: "Album" },
  { value: "ep", label: "EP" },
  { value: "single", label: "Single" },
];

/** Draft pour édition d'album (évite l'inférence unknown de Album). */
type AlbumDraft = {
  title: string;
  type: AlbumType;
  releaseDate: string;
  upcEan: string;
  trackIds: string[];
  notes: string;
  cover?: string;
};

function defaultAlbum(): AlbumDraft {
  return {
    title: "",
    type: "album",
    releaseDate: "",
    upcEan: "",
    trackIds: [],
    notes: "",
    cover: undefined,
  };
}

function normalizeAlbum(a: Album): Album {
  const d = defaultAlbum();
  return {
    ...d,
    ...a,
    id: a.id,
    trackIds: Array.isArray(a.trackIds) ? a.trackIds : [],
  };
}

function newAlbumId(): string {
  return "a-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

function albumTypeLabel(type: AlbumType): string {
  return ALBUM_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function CatalogPage() {
  const { data, setData } = useSidekickData();
  const [tab, setTab] = useState<"tracks" | "albums">("tracks");
  const [draft, setDraft] = useState<TrackDraft>(defaultTrack());
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [newTrackDialogOpen, setNewTrackDialogOpen] = useState(false);
  const [albumDraft, setAlbumDraft] = useState<AlbumDraft>(defaultAlbum());
  const [newAlbumDialogOpen, setNewAlbumDialogOpen] = useState(false);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [albumTrackSearch, setAlbumTrackSearch] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);

  const tracks = (data.phono?.tracks ?? []).map(normalizeTrack);
  const albums = (data.phono?.albums ?? []).map(normalizeAlbum);

  const setTracks = (updater: (prev: Track[]) => Track[]) => {
    setData((prev) => ({
      ...prev,
      phono: {
        ...prev.phono,
        tracks: updater(prev.phono?.tracks ?? []),
      },
    }));
  };

  const isDraftComplete =
    String(draft.title ?? "").trim() !== "" &&
    String(draft.mainArtist ?? "").trim() !== "" &&
    isValidDateFr(String(draft.releaseDate ?? ""));

  const addTrackFromDraft = () => {
    if (!isDraftComplete) return;
    setTracks((prev) => [...prev, { id: newId(), ...draft } as Track]);
    setDraft(defaultTrack());
    setNewTrackDialogOpen(false);
  };

  const updateDraft = (patch: Partial<TrackDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const addDraftGuestArtist = () => {
    setDraft((prev) => ({ ...prev, guestArtists: [...prev.guestArtists, ""] }));
  };

  const updateDraftGuestArtist = (index: number, value: string) => {
    setDraft((prev) => {
      const next = [...prev.guestArtists];
      next[index] = value;
      return { ...prev, guestArtists: next };
    });
  };

  const removeDraftGuestArtist = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      guestArtists: prev.guestArtists.filter((_, i) => i !== index),
    }));
  };

  const addDraftVersion = () => {
    setDraft((prev) => ({
      ...prev,
      versions: [...prev.versions, { id: "v-" + Date.now(), label: "" }],
    }));
  };

  const updateDraftVersion = (versionId: string, label: string) => {
    setDraft((prev) => ({
      ...prev,
      versions: prev.versions.map((v) =>
        v.id === versionId ? { ...v, label } : v
      ),
    }));
  };

  const removeDraftVersion = (versionId: string) => {
    setDraft((prev) => ({
      ...prev,
      versions: prev.versions.filter((v) => v.id !== versionId),
    }));
  };

  const updateTrack = (id: string, patch: Partial<Track>) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...normalizeTrack(t), ...patch } : t))
    );
  };

  const removeTrack = (id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
    if (editingTrackId === id) setEditingTrackId(null);
  };

  const setAlbums = (updater: (prev: Album[]) => Album[]) => {
    setData((prev) => ({
      ...prev,
      phono: {
        ...prev.phono,
        albums: updater(prev.phono?.albums ?? []),
      },
    }));
  };

  const isAlbumDraftComplete =
    String(albumDraft.title ?? "").trim() !== "" &&
    isValidDateFr(String(albumDraft.releaseDate ?? ""));

  const addAlbumFromDraft = () => {
    if (!isAlbumDraftComplete) return;
    setAlbums((prev) => [...prev, { id: newAlbumId(), ...albumDraft } as Album]);
    setAlbumDraft(defaultAlbum());
    setNewAlbumDialogOpen(false);
  };

  const updateAlbum = (id: string, patch: Partial<Album>) => {
    setAlbums((prev) =>
      prev.map((a) => (a.id === id ? { ...normalizeAlbum(a), ...patch } : a))
    );
  };

  const removeAlbum = (id: string) => {
    setAlbums((prev) => prev.filter((a) => a.id !== id));
    if (editingAlbumId === id) setEditingAlbumId(null);
  };

  const toggleAlbumTrack = (
    albumOrDraft: { trackIds: string[] },
    trackId: string,
    isDraft: boolean
  ) => {
    const next = albumOrDraft.trackIds.includes(trackId)
      ? albumOrDraft.trackIds.filter((id) => id !== trackId)
      : [...albumOrDraft.trackIds, trackId];
    if (isDraft) setAlbumDraft((prev) => ({ ...prev, trackIds: next }));
    else if (editingAlbumId)
      updateAlbum(editingAlbumId, { trackIds: next });
  };

  const handleCoverChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isDraft: boolean
  ) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (isDraft) setAlbumDraft((prev) => ({ ...prev, cover: dataUrl }));
      else if (editingAlbumId)
        updateAlbum(editingAlbumId, { cover: dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const filteredTracksForAlbum = tracks.filter((t) => {
    const q = albumTrackSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.mainArtist.toLowerCase().includes(q)
    );
  });

  const addGuestArtist = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? { ...t, guestArtists: [...(t.guestArtists ?? []), ""] }
          : t
      )
    );
  };

  const updateGuestArtist = (
    trackId: string,
    index: number,
    value: string
  ) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const next = [...(t.guestArtists ?? [])];
        next[index] = value;
        return { ...t, guestArtists: next };
      })
    );
  };

  const removeGuestArtist = (trackId: string, index: number) => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...t,
              guestArtists: (t.guestArtists ?? []).filter((_, i) => i !== index),
            }
          : t
      )
    );
  };

  const addVersion = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...t,
              versions: [
                ...(t.versions ?? []),
                { id: "v-" + Date.now(), label: "" },
              ],
            }
          : t
      )
    );
  };

  const updateVersion = (
    trackId: string,
    versionId: string,
    label: string
  ) => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...t,
              versions: (t.versions ?? []).map((v) =>
                v.id === versionId ? { ...v, label } : v
              ),
            }
          : t
      )
    );
  };

  const removeVersion = (trackId: string, versionId: string) => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...t,
              versions: (t.versions ?? []).filter((v) => v.id !== versionId),
            }
          : t
      )
    );
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Catalogue
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Gestion de ton catalogue phono : titres, albums, releases.
      </p>

      {/* Onglets */}
      <div className="mb-6 flex gap-1 rounded-lg border border-input bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setTab("tracks")}
          className={
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
            (tab === "tracks"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          Tous les titres
        </button>
        <button
          type="button"
          onClick={() => setTab("albums")}
          className={
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
            (tab === "albums"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          Albums & EP
        </button>
      </div>

      {tab === "tracks" && (
        <>
          <div className="mb-6 flex justify-end">
            <Button
              type="button"
              onClick={() => setNewTrackDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un titre
            </Button>
          </div>

          <Dialog
            open={newTrackDialogOpen}
            onOpenChange={(open) => {
              setNewTrackDialogOpen(open);
              if (!open) setDraft(defaultTrack());
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Nouveau titre</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Remplis les champs puis clique sur « Ajouter au catalogue ».
                </p>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={draft.title}
                      onChange={(e) =>
                        updateDraft({ title: e.target.value })
                      }
                      placeholder="Titre du morceau"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Artiste principal</Label>
                    <Input
                      value={draft.mainArtist}
                      onChange={(e) =>
                        updateDraft({ mainArtist: e.target.value })
                      }
                      placeholder="Nom de l'artiste"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Votre rôle</Label>
                  <Select
                    value={draft.role}
                    onValueChange={(v) =>
                      updateDraft({ role: v as PhonoRole })
                    }
                  >
                    <SelectTrigger>
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
                  <div className="flex items-center justify-between">
                    <Label>Artistes invités</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={addDraftGuestArtist}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Ajouter
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {draft.guestArtists.map((name, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={name}
                          onChange={(e) =>
                            updateDraftGuestArtist(i, e.target.value)
                          }
                          placeholder="Nom de l'artiste invité"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDraftGuestArtist(i)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>N° ISRC</Label>
                    <Input
                      value={draft.isrc}
                      onChange={(e) =>
                        updateDraft({ isrc: e.target.value })
                      }
                      placeholder="Ex. FR-XXX-00-00000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de sortie</Label>
                    <DatePicker
                      value={toIsoForPicker(draft.releaseDate)}
                      onChange={(iso) =>
                        updateDraft({ releaseDate: isoToFr(iso) })
                      }
                      placeholder={DATE_FORMAT_PLACEHOLDER}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="draft-self-produced"
                    checked={draft.selfProduced}
                    onCheckedChange={(checked) =>
                      updateDraft({ selfProduced: checked === true })
                    }
                  />
                  <Label
                    htmlFor="draft-self-produced"
                    className="cursor-pointer font-normal"
                  >
                    Auto-produit
                  </Label>
                </div>

                {!draft.selfProduced && (
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={draft.label ?? ""}
                      onChange={(e) =>
                        updateDraft({ label: e.target.value })
                      }
                      placeholder="Nom du label"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Versions</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={addDraftVersion}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Ajouter une version
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {draft.versions.map((v) => (
                      <div key={v.id} className="flex gap-2">
                        <Input
                          value={v.label}
                          onChange={(e) =>
                            updateDraftVersion(v.id, e.target.value)
                          }
                          placeholder="Ex. Version radio, Instrumental…"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDraftVersion(v.id)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={draft.notes}
                    onChange={(e) =>
                      updateDraft({ notes: e.target.value })
                    }
                    placeholder="Notes libres…"
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={addTrackFromDraft}
                  disabled={!isDraftComplete}
                >
                  Ajouter au catalogue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="space-y-4">
            {tracks.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <p>Aucun titre dans le catalogue.</p>
                  <p className="mt-1 text-sm">
                    Clique sur « Ajouter un titre » pour commencer.
                  </p>
                </CardContent>
              </Card>
            )}
            {tracks.map((track) => (
              <Card key={track.id} className="overflow-hidden">
                {editingTrackId === track.id ? (
                  <>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        Modifier le titre
                      </span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTrackId(null)}
                        >
                          Terminer
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTrack(track.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Titre</Label>
                          <Input
                            value={track.title}
                            onChange={(e) =>
                              updateTrack(track.id, { title: e.target.value })
                            }
                            placeholder="Titre du morceau"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Artiste principal</Label>
                          <Input
                            value={track.mainArtist}
                            onChange={(e) =>
                              updateTrack(track.id, {
                                mainArtist: e.target.value,
                              })
                            }
                            placeholder="Nom de l'artiste"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Votre rôle</Label>
                        <Select
                          value={track.role}
                          onValueChange={(v) =>
                            updateTrack(track.id, { role: v as PhonoRole })
                          }
                        >
                          <SelectTrigger>
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
                        <div className="flex items-center justify-between">
                          <Label>Artistes invités</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => addGuestArtist(track.id)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Ajouter
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(track.guestArtists ?? []).map((name, i) => (
                            <div key={i} className="flex gap-2">
                              <Input
                                value={name}
                                onChange={(e) =>
                                  updateGuestArtist(
                                    track.id,
                                    i,
                                    e.target.value
                                  )
                                }
                                placeholder="Nom de l'artiste invité"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeGuestArtist(track.id, i)}
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>N° ISRC</Label>
                            <Input
                              value={track.isrc}
                              onChange={(e) =>
                                updateTrack(track.id, { isrc: e.target.value })
                              }
                              placeholder="Ex. FR-XXX-00-00000"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Date de sortie</Label>
                            <DatePicker
                              value={toIsoForPicker(track.releaseDate)}
                              onChange={(iso) =>
                                updateTrack(track.id, {
                                  releaseDate: isoToFr(iso),
                                })
                              }
                              placeholder={DATE_FORMAT_PLACEHOLDER}
                            />
                          </div>
                        </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`self-${track.id}`}
                          checked={track.selfProduced}
                          onCheckedChange={(checked) =>
                            updateTrack(track.id, {
                              selfProduced: checked === true,
                            })
                          }
                        />
                        <Label
                          htmlFor={`self-${track.id}`}
                          className="cursor-pointer font-normal"
                        >
                          Auto-produit
                        </Label>
                      </div>

                      {!track.selfProduced && (
                        <div className="space-y-2">
                          <Label>Label</Label>
                          <Input
                            value={track.label ?? ""}
                            onChange={(e) =>
                              updateTrack(track.id, {
                                label: e.target.value,
                              })
                            }
                            placeholder="Nom du label"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Versions</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => addVersion(track.id)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Ajouter une version
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(track.versions ?? []).map((v: TrackVersion) => (
                            <div key={v.id} className="flex gap-2">
                              <Input
                                value={v.label}
                                onChange={(e) =>
                                  updateVersion(track.id, v.id, e.target.value)
                                }
                                placeholder="Ex. Version radio, Instrumental…"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVersion(track.id, v.id)}
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={track.notes}
                          onChange={(e) =>
                            updateTrack(track.id, { notes: e.target.value })
                          }
                          placeholder="Notes libres…"
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <>
                    <CardHeader className="border-b py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold tracking-tight">
                            {track.title || "Sans titre"}
                          </h3>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {track.mainArtist || "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingTrackId(track.id)}
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Modifier
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTrack(track.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Votre rôle
                          </dt>
                          <dd className="mt-1 text-sm">
                            {roleLabel(track.role)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            N° ISRC
                          </dt>
                          <dd className="mt-1 font-mono text-sm">
                            {track.isrc || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Date de sortie
                          </dt>
                          <dd className="mt-1 text-sm">
                            {displayDate(track.releaseDate) || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Auto-produit
                          </dt>
                          <dd className="mt-1 text-sm">
                            {track.selfProduced ? "Oui" : "Non"}
                            {!track.selfProduced && track.label
                              ? ` · ${track.label}`
                              : ""}
                          </dd>
                        </div>
                      </dl>

                      {(track.guestArtists ?? []).filter(Boolean).length > 0 && (
                        <div className="mt-4 border-t pt-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Artistes invités
                          </p>
                          <p className="mt-1 text-sm">
                            {(track.guestArtists ?? [])
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      )}

                      {(track.versions ?? []).filter((v) => v.label).length >
                        0 && (
                        <div className="mt-4 border-t pt-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Versions
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5 text-sm">
                            {(track.versions ?? [])
                              .filter((v) => v.label)
                              .map((v) => (
                                <span
                                  key={v.id}
                                  className="rounded-md bg-muted/60 px-2 py-0.5"
                                >
                                  {v.label}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      {track.notes?.trim() && (
                        <div className="mt-4 border-t pt-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Notes
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                            {track.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "albums" && (
        <>
          <div className="mb-6 flex justify-end">
            <Button type="button" onClick={() => setNewAlbumDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un album ou EP
            </Button>
          </div>

          <Dialog
            open={newAlbumDialogOpen}
            onOpenChange={(open) => {
              setNewAlbumDialogOpen(open);
              if (!open) setAlbumDraft(defaultAlbum());
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Nouvel album ou EP</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Remplis les champs puis enregistre.
                </p>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input
                    value={albumDraft.title}
                    onChange={(e) =>
                      setAlbumDraft((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Titre de l'album ou EP"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={albumDraft.type}
                    onValueChange={(v) =>
                      setAlbumDraft((prev) => ({
                        ...prev,
                        type: v as AlbumType,
                      }))
                    }
                  >
                    <SelectTrigger>
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Date de sortie</Label>
                    <DatePicker
                      value={toIsoForPicker(albumDraft.releaseDate)}
                      onChange={(iso) =>
                        setAlbumDraft((prev) => ({
                          ...prev,
                          releaseDate: isoToFr(iso),
                        }))
                      }
                      placeholder={DATE_FORMAT_PLACEHOLDER}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>UPC / EAN</Label>
                    <Input
                      value={albumDraft.upcEan}
                      onChange={(e) =>
                        setAlbumDraft((prev) => ({
                          ...prev,
                          upcEan: e.target.value,
                        }))
                      }
                      placeholder="Code barres"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Titres du catalogue</Label>
                  <Input
                    value={albumTrackSearch}
                    onChange={(e) => setAlbumTrackSearch(e.target.value)}
                    placeholder="Rechercher un titre ou artiste…"
                    className="mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-2">
                    {filteredTracksForAlbum.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        {tracks.length === 0
                          ? "Aucun titre dans le catalogue."
                          : "Aucun résultat pour cette recherche."}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {filteredTracksForAlbum.map((t) => (
                          <label
                            key={t.id}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                          >
                            <input
                              type="checkbox"
                              checked={albumDraft.trackIds.includes(t.id)}
                              onChange={() =>
                                toggleAlbumTrack(albumDraft, t.id, true)
                              }
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="truncate">
                              {t.title || "Sans titre"}
                              {t.mainArtist ? ` · ${t.mainArtist}` : ""}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={albumDraft.notes}
                    onChange={(e) =>
                      setAlbumDraft((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Notes additionnelles…"
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cover</Label>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCoverChange(e, true)}
                  />
                  {albumDraft.cover ? (
                    <div className="flex items-start gap-3">
                      <img
                        src={albumDraft.cover}
                        alt="Cover"
                        className="h-24 w-24 shrink-0 rounded-lg object-cover border"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            coverInputRef.current?.click()
                          }
                        >
                          <ImagePlus className="mr-1 h-3.5 w-3.5" />
                          Changer
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setAlbumDraft((prev) => ({ ...prev, cover: undefined }))
                          }
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      Ajouter une image
                    </Button>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={addAlbumFromDraft}
                  disabled={!isAlbumDraftComplete}
                >
                  Ajouter au catalogue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="space-y-4">
            {albums.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <p>Aucun album ou EP dans le catalogue.</p>
                  <p className="mt-1 text-sm">
                    Clique sur « Ajouter un album ou EP » pour commencer.
                  </p>
                </CardContent>
              </Card>
            )}
            {albums.map((album) => {
              const albumTracks = album.trackIds
                .map((id) => tracks.find((t) => t.id === id))
                .filter(Boolean) as Track[];
              return (
                <Card key={album.id} className="overflow-hidden">
                  {editingAlbumId === album.id ? (
                    <>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          Modifier l'album
                        </span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingAlbumId(null)}
                          >
                            Terminer
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAlbum(album.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Titre</Label>
                          <Input
                            value={album.title}
                            onChange={(e) =>
                              updateAlbum(album.id, { title: e.target.value })
                            }
                            placeholder="Titre de l'album ou EP"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={album.type}
                            onValueChange={(v) =>
                              updateAlbum(album.id, { type: v as AlbumType })
                            }
                          >
                            <SelectTrigger>
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
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Date de sortie</Label>
                            <DatePicker
                              value={toIsoForPicker(album.releaseDate)}
                              onChange={(iso) =>
                                updateAlbum(album.id, {
                                  releaseDate: isoToFr(iso),
                                })
                              }
                              placeholder={DATE_FORMAT_PLACEHOLDER}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>UPC / EAN</Label>
                            <Input
                              value={album.upcEan}
                              onChange={(e) =>
                                updateAlbum(album.id, { upcEan: e.target.value })
                              }
                              placeholder="Code barres"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Titres du catalogue</Label>
                          <Input
                            value={albumTrackSearch}
                            onChange={(e) => setAlbumTrackSearch(e.target.value)}
                            placeholder="Rechercher un titre ou artiste…"
                            className="mb-2"
                          />
                          <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-2">
                            {filteredTracksForAlbum.length === 0 ? (
                              <p className="py-4 text-center text-sm text-muted-foreground">
                                Aucun résultat.
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {filteredTracksForAlbum.map((t) => (
                                  <label
                                    key={t.id}
                                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={album.trackIds.includes(t.id)}
                                      onChange={() =>
                                        toggleAlbumTrack(album, t.id, false)
                                      }
                                      className="h-4 w-4 rounded border-input"
                                    />
                                    <span className="truncate">
                                      {t.title || "Sans titre"}
                                      {t.mainArtist ? ` · ${t.mainArtist}` : ""}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={album.notes}
                            onChange={(e) =>
                              updateAlbum(album.id, { notes: e.target.value })
                            }
                            placeholder="Notes additionnelles…"
                            rows={2}
                            className="resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cover</Label>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={`album-cover-${album.id}`}
                            onChange={(e) => handleCoverChange(e, false)}
                          />
                          {album.cover ? (
                            <div className="flex items-start gap-3">
                              <img
                                src={album.cover}
                                alt="Cover"
                                className="h-24 w-24 shrink-0 rounded-lg object-cover border"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    document
                                      .getElementById(`album-cover-${album.id}`)
                                      ?.click()
                                  }
                                >
                                  <ImagePlus className="mr-1 h-3.5 w-3.5" />
                                  Changer
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateAlbum(album.id, { cover: undefined })
                                  }
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                document
                                  .getElementById(`album-cover-${album.id}`)
                                  ?.click()
                              }
                            >
                              <ImagePlus className="mr-2 h-4 w-4" />
                              Ajouter une image
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </>
                  ) : (
                    <>
                      <CardHeader className="border-b py-4">
                        <div className="flex items-start gap-4">
                          {album.cover && (
                            <img
                              src={album.cover}
                              alt=""
                              className="h-20 w-20 shrink-0 rounded-lg object-cover border"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-semibold tracking-tight">
                              {album.title || "Sans titre"}
                            </h3>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {albumTypeLabel(album.type)}
                              {album.releaseDate
                                ? ` · ${displayDate(album.releaseDate)}`
                                : ""}
                            </p>
                            {album.upcEan && (
                              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                {album.upcEan}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingAlbumId(album.id)}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Modifier
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAlbum(album.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        {albumTracks.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Titres
                            </p>
                            <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
                              {albumTracks.map((t) => (
                                <li key={t.id}>
                                  {t.title || "Sans titre"}
                                  {t.mainArtist ? ` · ${t.mainArtist}` : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {album.notes?.trim() && (
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Notes
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                              {album.notes}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
