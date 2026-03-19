"use client";

import { useRef, useState } from "react";
import { useSidekickData } from "@/hooks/useSidekickData";
import type {
  Track,
  PhonoRole,
  TrackVersion,
  Album,
  AlbumGuest,
  AlbumType,
  Podcast,
  PodcastTracklistItem,
  ReleaseStatus,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import JSZip from "jszip";
import { Copy, Download, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

const ROLES: { value: PhonoRole; label: string }[] = [
  { value: "artiste_principal", label: "Artiste principal" },
  { value: "artiste_secondaire", label: "Artiste secondaire" },
  { value: "musicien_interprete", label: "Musicien interprète" },
  { value: "chanteur_interprete", label: "Chanteur interprète" },
  { value: "beatmaker", label: "Beatmaker" },
  { value: "directeur_musical", label: "Directeur artistique" },
  { value: "realisateur", label: "Réalisateur" },
  { value: "compositeur", label: "Compositeur" },
  { value: "ingenieur_mixage", label: "Ingé Mixage" },
  { value: "ingenieur_mastering", label: "Ingé Mastering" },
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
  editor?: string;
  versions: TrackVersion[];
  genre: string;
  distribution: string;
  notes: string;
  status: ReleaseStatus;
  cover?: string;
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
    editor: "",
    genre: "",
    distribution: "",
    notes: "",
    status: "en_production",
    cover: undefined,
  };
}

function normalizeTrack(t: Track): Track {
  const d = defaultTrack();
  return {
    ...d,
    ...t,
    id: t.id,
    role: normalizePhonoRole((t.role as PhonoRole) ?? d.role),
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
  const normalized = normalizePhonoRole(role);
  return ROLES.find((r) => r.value === normalized)?.label ?? normalized;
}

function normalizePhonoRole(role: PhonoRole): PhonoRole {
  if (role === "ingenieur_du_son") return "ingenieur_mixage";
  return role;
}

const ALBUM_TYPES: { value: AlbumType; label: string }[] = [
  { value: "album", label: "Album" },
  { value: "ep", label: "EP" },
  { value: "single", label: "Single" },
];

const RELEASE_STATUSES: { value: ReleaseStatus; label: string }[] = [
  { value: "en_production", label: "En production" },
  { value: "mixe", label: "Mixé" },
  { value: "masterise", label: "Mastérisé" },
  { value: "publie", label: "Publié" },
];

function releaseStatusLabel(s: ReleaseStatus): string {
  return RELEASE_STATUSES.find((r) => r.value === s)?.label ?? s;
}

/** Ordre chronologique : Production < Mixé < Mastérisé < Publié. */
const RELEASE_STATUS_ORDER: Record<ReleaseStatus, number> = {
  en_production: 0,
  mixe: 1,
  masterise: 2,
  publie: 3,
};

/** Retourne true si newStatus est une étape strictement plus avancée que currentStatus. */
function isStatusMoreAdvanced(
  newStatus: ReleaseStatus,
  currentStatus: ReleaseStatus | undefined
): boolean {
  const current = currentStatus ? RELEASE_STATUS_ORDER[currentStatus] ?? -1 : -1;
  const next = RELEASE_STATUS_ORDER[newStatus] ?? 0;
  return next > current;
}

/** Classes pour l’étiquette de statut (couleur selon avancement). */
function releaseStatusBadgeClass(s: ReleaseStatus): string {
  const base = "ml-3 inline-flex items-center rounded-md px-2.5 py-1 text-lg font-semibold tracking-tight shrink-0";
  switch (s) {
    case "en_production":
      return `${base} bg-amber-400 text-amber-950 dark:bg-amber-500 dark:text-white`;
    case "mixe":
      return `${base} bg-blue-600 text-white`;
    case "masterise":
      return `${base} bg-violet-600 text-white`;
    case "publie":
      return `${base} bg-emerald-600 text-white`;
    default:
      return `${base} bg-muted text-muted-foreground`;
  }
}

/** Draft pour édition d'album (évite l'inférence unknown de Album). */
type AlbumDraft = {
  title: string;
  type: AlbumType;
  status: ReleaseStatus;
  artist: string;
  releaseDate: string;
  upcEan: string;
  trackIds: string[];
  label: string;
  genre: string;
  editor: string;
  distribution: string;
  notes: string;
  cover?: string;
  guests: AlbumGuest[];
};

function defaultAlbum(): AlbumDraft {
  return {
    title: "",
    type: "album",
    status: "en_production",
    artist: "",
    releaseDate: "",
    upcEan: "",
    trackIds: [],
    label: "",
    genre: "",
    editor: "",
    distribution: "",
    notes: "",
    cover: undefined,
    guests: [],
  };
}

function normalizeAlbum(a: Album): Album {
  const d = defaultAlbum();
  return {
    ...d,
    ...a,
    id: a.id,
    status: a.status ?? "en_production",
    trackIds: Array.isArray(a.trackIds) ? a.trackIds : [],
    guests: Array.isArray(a.guests)
      ? a.guests.map((g) => ({
          ...g,
          role: normalizePhonoRole(g.role),
        }))
      : [],
  };
}

function newAlbumId(): string {
  return "a-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

function albumTypeLabel(type: AlbumType): string {
  return ALBUM_TYPES.find((t) => t.value === type)?.label ?? type;
}

function parseTrackGuest(raw: string): { name: string; role?: string } {
  const value = String(raw ?? "").trim();
  if (!value) return { name: "" };
  const [name = "", role = ""] = value.split(" – ");
  return { name: name.trim(), role: role.trim() || undefined };
}

function computeAlbumContributors(
  album: Album,
  albumTracks: Track[]
): Array<{ name: string; roles: string[] }> {
  const byName = new Map<string, { name: string; roles: Set<string> }>();
  const push = (name: string, role?: string) => {
    const cleanName = String(name ?? "").trim();
    if (!cleanName) return;
    const key = cleanName.toLowerCase();
    const roleLabel = String(role ?? "").trim();
    const entry = byName.get(key) ?? { name: cleanName, roles: new Set<string>() };
    if (roleLabel) entry.roles.add(roleLabel);
    byName.set(key, entry);
  };

  push(album.artist, "Artiste principal");
  (album.guests ?? []).forEach((g) => push(g.name, roleLabel(g.role)));
  albumTracks.forEach((t) => {
    push(t.mainArtist, roleLabel(t.role));
    (t.guestArtists ?? []).forEach((raw) => {
      const guest = parseTrackGuest(raw);
      push(guest.name, guest.role);
    });
  });

  return Array.from(byName.values()).map((v) => ({
    name: v.name,
    roles: Array.from(v.roles),
  }));
}

function defaultPodcast(): Omit<Podcast, "id"> {
  return {
    title: "",
    artists: "",
    publishedOn: "",
    isVideo: false,
    isLive: false,
    status: "en_production",
    releaseDate: "",
    tracklist: [],
    cover: undefined,
  };
}

function normalizePodcast(p: Podcast): Podcast {
  const d = defaultPodcast();
  const rawList = Array.isArray(p.tracklist) ? p.tracklist : [];
  const tracklist = rawList.map((item) => ({
    id: item.id,
    artist: item.artist ?? "",
    label: item.label ?? "",
    time: item.time ?? "0:00",
  }));
  return {
    ...d,
    ...p,
    id: p.id,
    status: p.status ?? "en_production",
    tracklist,
  };
}

function newPodcastId(): string {
  return "p-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

function formatTracklistForCopy(items: PodcastTracklistItem[]): string {
  return items
    .map((item) => {
      const time = (item.time || "0:00").trim();
      const artist = (item.artist || "").trim();
      const label = (item.label || "").trim();
      const part = [artist, label].filter(Boolean).join(" – ");
      return part ? `${time} - ${part}` : time;
    })
    .join("\n");
}

export function CatalogPage() {
  const { data, setData } = useSidekickData();
  const [tab, setTab] = useState<"tracks" | "albums" | "podcasts">("albums");
  const [draft, setDraft] = useState<TrackDraft>(defaultTrack());
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [newTrackDialogOpen, setNewTrackDialogOpen] = useState(false);
  const [albumDraft, setAlbumDraft] = useState<AlbumDraft>(defaultAlbum());
  const [newAlbumDialogOpen, setNewAlbumDialogOpen] = useState(false);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [albumTrackSearch, setAlbumTrackSearch] = useState("");
  const trackCoverInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const podcastCoverInputRef = useRef<HTMLInputElement>(null);

  const [podcastDraft, setPodcastDraft] = useState<Omit<Podcast, "id">>(defaultPodcast());
  const [newPodcastDialogOpen, setNewPodcastDialogOpen] = useState(false);
  const [editingPodcastId, setEditingPodcastId] = useState<string | null>(null);

  const [metadataTrackId, setMetadataTrackId] = useState<string | null>(null);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [metadataProcessing, setMetadataProcessing] = useState(false);
  const [metadataUploading, setMetadataUploading] = useState(false);
  const [metadataBuffer, setMetadataBuffer] = useState<ArrayBuffer | null>(null);
  const metadataInputRef = useRef<HTMLInputElement>(null);

  const [albumMetadataId, setAlbumMetadataId] = useState<string | null>(null);
  const [albumMetadataFiles, setAlbumMetadataFiles] = useState<Record<string, File | null>>({});
  const [albumMetadataBuffers, setAlbumMetadataBuffers] = useState<Record<string, ArrayBuffer | null>>({});
  const [albumMetadataUploading, setAlbumMetadataUploading] = useState<Record<string, boolean>>({});
  const [albumMetadataProcessing, setAlbumMetadataProcessing] = useState(false);

  const tracks = (data.phono?.tracks ?? []).map(normalizeTrack);
  const albums = (data.phono?.albums ?? [])
    .map(normalizeAlbum)
    .sort((a, b) => {
      const order = { album: 0, ep: 1, single: 2 };
      return (order[a.type] ?? 2) - (order[b.type] ?? 2);
    });
  const podcasts = (data.phono?.podcasts ?? []).map(normalizePodcast);

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

  const isAlbumDraftComplete =
    String(albumDraft.title ?? "").trim() !== "" &&
    isValidDateFr(String(albumDraft.releaseDate ?? ""));

  const addAlbumFromDraft = () => {
    if (!isAlbumDraftComplete) return;
    setData((prev) => {
      const prevAlbums = prev.phono?.albums ?? [];
      const nextAlbum: Album = {
        id: newAlbumId(),
        ...(albumDraft as AlbumDraft),
      } as Album;
      return {
        ...prev,
        phono: {
          ...prev.phono,
          albums: [...prevAlbums, nextAlbum],
        },
      };
    });
    setAlbumDraft(defaultAlbum());
    setNewAlbumDialogOpen(false);
  };

  const updateAlbum = (id: string, patch: Partial<Album>) => {
    setData((prev) => {
      const prevAlbums = prev.phono?.albums ?? [];
      const prevTracks = prev.phono?.tracks ?? [];
      const updatedAlbums = prevAlbums.map((a) =>
        a.id === id ? { ...normalizeAlbum(a), ...patch } : a
      );

      let updatedTracks = prevTracks;
      if (patch.status) {
        const album = updatedAlbums.find((a) => a.id === id);
        const newAlbumStatus = patch.status as ReleaseStatus;
        if (album) {
          updatedTracks = prevTracks.map((t) => {
            if (!(album.trackIds ?? []).includes(t.id)) return t;
            const currentTrackStatus = (normalizeTrack(t).status ?? "en_production") as ReleaseStatus;
            if (!isStatusMoreAdvanced(newAlbumStatus, currentTrackStatus)) return t;
            return {
              ...normalizeTrack(t),
              status: newAlbumStatus,
            };
          });
        }
      }

      return {
        ...prev,
        phono: {
          ...prev.phono,
          albums: updatedAlbums,
          tracks: updatedTracks,
        },
      };
    });
  };

  const removeAlbum = (id: string) => {
    setData((prev) => ({
      ...prev,
      phono: {
        ...prev.phono,
        albums: (prev.phono?.albums ?? []).filter((a) => a.id !== id),
      },
    }));
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

  const moveAlbumTrack = (
    albumOrDraft: { trackIds: string[] },
    trackId: string,
    direction: "up" | "down",
    isDraft: boolean
  ) => {
    const current = albumOrDraft.trackIds;
    const index = current.indexOf(trackId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const next = [...current];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    if (isDraft) {
      setAlbumDraft((prev) => ({ ...prev, trackIds: next }));
    } else if (editingAlbumId) {
      updateAlbum(editingAlbumId, { trackIds: next });
    }
  };

  const addAlbumGuestDraft = () => {
    setAlbumDraft((prev) => ({
      ...prev,
      guests: [
        ...(prev.guests ?? []),
        {
          id: "ag-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          name: "",
          role: "artiste_secondaire",
        },
      ],
    }));
  };

  const updateAlbumGuestDraft = (
    guestId: string,
    patch: Partial<AlbumGuest>
  ) => {
    setAlbumDraft((prev) => ({
      ...prev,
      guests: (prev.guests ?? []).map((g) =>
        g.id === guestId ? { ...g, ...patch } : g
      ),
    }));
  };

  const removeAlbumGuestDraft = (guestId: string) => {
    setAlbumDraft((prev) => ({
      ...prev,
      guests: (prev.guests ?? []).filter((g) => g.id !== guestId),
    }));
  };

  const addAlbumGuest = (albumId: string) => {
    const album = albums.find((a) => a.id === albumId);
    const nextGuests = [
      ...(album?.guests ?? []),
      {
        id: "ag-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        name: "",
        role: "artiste_secondaire" as PhonoRole,
      },
    ];
    updateAlbum(albumId, { guests: nextGuests });
  };

  const updateAlbumGuest = (
    albumId: string,
    guestId: string,
    patch: Partial<AlbumGuest>
  ) => {
    const album = albums.find((a) => a.id === albumId);
    if (!album) return;
    updateAlbum(albumId, {
      guests: (album.guests ?? []).map((g) =>
        g.id === guestId ? { ...g, ...patch } : g
      ),
    });
  };

  const removeAlbumGuest = (albumId: string, guestId: string) => {
    const album = albums.find((a) => a.id === albumId);
    if (!album) return;
    updateAlbum(albumId, {
      guests: (album.guests ?? []).filter((g) => g.id !== guestId),
    });
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

  const setPodcasts = (updater: (prev: Podcast[]) => Podcast[]) => {
    setData((prev) => ({
      ...prev,
      phono: {
        ...prev.phono,
        podcasts: updater(prev.phono?.podcasts ?? []),
      },
    }));
  };

  const isPodcastDraftComplete =
    String(podcastDraft.title ?? "").trim() !== "" &&
    isValidDateFr(String(podcastDraft.releaseDate ?? ""));

  const addPodcastFromDraft = () => {
    if (!isPodcastDraftComplete) return;
    setPodcasts((prev) => [
      ...prev,
      { id: newPodcastId(), ...podcastDraft } as Podcast,
    ]);
    setPodcastDraft(defaultPodcast());
    setNewPodcastDialogOpen(false);
  };

  const updatePodcast = (id: string, patch: Partial<Podcast>) => {
    setPodcasts((prev) =>
      prev.map((p) => (p.id === id ? { ...normalizePodcast(p), ...patch } : p))
    );
  };

  const removePodcast = (id: string) => {
    setPodcasts((prev) => prev.filter((p) => p.id !== id));
    if (editingPodcastId === id) setEditingPodcastId(null);
  };

  const handlePodcastCoverChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    podcastId: string | null
  ) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (podcastId == null) setPodcastDraft((prev) => ({ ...prev, cover: dataUrl }));
      else updatePodcast(podcastId, { cover: dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const addPodcastTracklistItem = (podcastId: string) => {
    setPodcasts((prev) =>
      prev.map((p) =>
        p.id === podcastId
          ? {
              ...p,
              tracklist: [
                ...p.tracklist,
                { id: "tl-" + Date.now(), artist: "", label: "", time: "0:00" },
              ],
            }
          : p
      )
    );
  };

  const updatePodcastTracklistItem = (
    podcastId: string,
    itemId: string,
    patch: Partial<PodcastTracklistItem>
  ) => {
    setPodcasts((prev) =>
      prev.map((p) =>
        p.id === podcastId
          ? {
              ...p,
              tracklist: p.tracklist.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item
              ),
            }
          : p
      )
    );
  };

  const removePodcastTracklistItem = (podcastId: string, itemId: string) => {
    setPodcasts((prev) =>
      prev.map((p) =>
        p.id === podcastId
          ? {
              ...p,
              tracklist: p.tracklist.filter((item) => item.id !== itemId),
            }
          : p
      )
    );
  };

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

  const handleDraftTrackCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({ ...prev, cover: reader.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleTrackCoverChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    trackId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateTrack(trackId, { cover: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const metadataTrack = metadataTrackId
    ? tracks.find((t) => t.id === metadataTrackId) ?? null
    : null;

  const metadataAlbum = metadataTrack
    ? albums.find((a) => a.trackIds.includes(metadataTrack.id)) ?? null
    : null;

  const albumForMetadata = albumMetadataId
    ? albums.find((a) => a.id === albumMetadataId) ?? null
    : null;

  const handleAlbumMetadataFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    trackId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file || !albumMetadataId) return;
    e.target.value = "";
    setAlbumMetadataUploading((prev) => ({ ...prev, [trackId]: true }));
    try {
      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });
      setAlbumMetadataFiles((prev) => ({ ...prev, [trackId]: file }));
      setAlbumMetadataBuffers((prev) => ({ ...prev, [trackId]: buffer }));
    } catch {
      // ignore
    } finally {
      setAlbumMetadataUploading((prev) => ({ ...prev, [trackId]: false }));
    }
  };

  const processMetadata = async () => {
    if (!metadataFile || !metadataTrack || !metadataBuffer || metadataUploading) return;
    setMetadataProcessing(true);
    try {
      // Artistes (principal + secondaires)
      const secondaryArtists = (metadataTrack.guestArtists ?? [])
        .map((g) => {
          const raw = String(g);
          const [name = "", role = ""] = raw.split(" – ");
          return { name: name.trim(), role: role.trim() };
        })
        .filter(
          (g) =>
            g.name &&
            (g.role === "Artiste secondaire" || g.role === "Artiste principal")
        )
        .map((g) => g.name);

      const allArtists = [metadataTrack.mainArtist, ...secondaryArtists].filter(Boolean);

      // Date
      const rawDate = metadataTrack.releaseDate || "";
      const yearMatch = rawDate.match(/(\d{4})/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

      // Genre
      const genreSource =
        (metadataTrack.genre && metadataTrack.genre.trim()) ||
        (metadataAlbum?.genre && metadataAlbum.genre.trim()) ||
        "";

      // Compositeurs + Beatmakers
      const composerNames = new Set<string>();
      if (
        metadataTrack.mainArtist &&
        (metadataTrack.role === "compositeur" || metadataTrack.role === "beatmaker")
      ) {
        composerNames.add(metadataTrack.mainArtist.trim());
      }
      (metadataTrack.guestArtists ?? []).forEach((g) => {
        const raw = String(g);
        const [name = "", roleLabel = ""] = raw.split(" – ");
        const cleanName = name.trim();
        const cleanRole = roleLabel.trim();
        if (
          cleanName &&
          (cleanRole === "Compositeur" || cleanRole === "Beatmaker")
        ) {
          composerNames.add(cleanName);
        }
      });
      const composersString =
        composerNames.size > 0 ? Array.from(composerNames).join(", ") : "";

      // Numéro de piste dans l'album
      const trackNumber = metadataAlbum
        ? metadataAlbum.trackIds.indexOf(metadataTrack.id) + 1 || undefined
        : undefined;
      const trackTotal = metadataAlbum?.trackIds.length ?? undefined;

      // Copyright & Label (pour métadonnées)
      const mainArtistName = metadataTrack.mainArtist?.trim() || "";
      const editorName =
        metadataTrack.editor?.trim() ||
        metadataAlbum?.editor?.trim() ||
        "";
      const labelName =
        !metadataTrack.selfProduced && metadataTrack.label?.trim()
          ? metadataTrack.label.trim()
          : mainArtistName;

      const copyrightValue = editorName || mainArtistName || undefined;
      const labelValue = labelName || undefined;

      const metadataPayload = {
        title: metadataTrack.title,
        artist: allArtists.join(", ") || metadataTrack.mainArtist || "",
        album: metadataAlbum?.title ?? "",
        albumArtist: metadataAlbum?.artist ?? metadataTrack.mainArtist ?? "",
        trackNumber,
        trackTotal,
        genre: genreSource || undefined,
        label: labelValue,
        copyright: copyrightValue,
        year,
        fullDate: rawDate || undefined,
        composers: composersString || undefined,
        isrc: metadataTrack.isrc || undefined,
        comment: metadataTrack.notes?.trim() || undefined,
      };

      const formData = new FormData();
      formData.append(
        "file",
        new Blob([metadataBuffer], { type: metadataFile.type || "audio/*" }),
        metadataFile.name
      );
      formData.append("metadata", JSON.stringify(metadataPayload));

      const coverSrc = metadataTrack.cover || metadataAlbum?.cover;
      if (coverSrc && coverSrc.startsWith("data:")) {
        try {
          const coverRes = await fetch(coverSrc);
          const coverBlob = await coverRes.blob();
          formData.append("cover", coverBlob, "cover.jpg");
        } catch {}
      }

      const res = await fetch("/api/phono/apply-metadata", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const sanitized = (metadataTrack.title || "audio")
        .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæ\s_-]/gi, "")
        .trim();
      const ext = metadataFile.name?.match(/\.[^.]+$/)?.[0] ?? ".audio";
      a.href = url;
      a.download = `${sanitized || "audio"}${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMetadataTrackId(null);
      setMetadataFile(null);
      setMetadataBuffer(null);
      setMetadataUploading(false);
    } catch (err) {
      console.error("Erreur écriture métadonnées (API ffmpeg):", err);
      alert("Erreur lors de l'écriture des métadonnées. Réessaie avec un autre fichier.");
    } finally {
      setMetadataProcessing(false);
    }
  };

  const processAlbumMetadata = async () => {
    if (!albumForMetadata) return;
    const albumTracks = albumForMetadata.trackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter(Boolean) as Track[];
    if (albumTracks.length === 0) return;
    setAlbumMetadataProcessing(true);
    try {
      const filesToZip: { blob: Blob; filename: string }[] = [];

      for (let index = 0; index < albumTracks.length; index++) {
        const track = albumTracks[index];
        const file = albumMetadataFiles[track.id];
        const buffer = albumMetadataBuffers[track.id];
        if (!file || !buffer) continue;

        const secondaryArtists = (track.guestArtists ?? [])
          .map((g) => {
            const raw = String(g);
            const [name = "", role = ""] = raw.split(" – ");
            return { name: name.trim(), role: role.trim() };
          })
          .filter(
            (g) =>
              g.name &&
              (g.role === "Artiste secondaire" || g.role === "Artiste principal")
          )
          .map((g) => g.name);

        const allArtists = [track.mainArtist, ...secondaryArtists].filter(Boolean);

        const rawDate = albumForMetadata.releaseDate || track.releaseDate || "";
        const yearMatch = rawDate.match(/(\d{4})/);
        const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

        const genreSource =
          (track.genre && track.genre.trim()) ||
          (albumForMetadata.genre && albumForMetadata.genre.trim()) ||
          "";

        const composerNames = new Set<string>();
        if (
          track.mainArtist &&
          (track.role === "compositeur" || track.role === "beatmaker")
        ) {
          composerNames.add(track.mainArtist.trim());
        }
        (track.guestArtists ?? []).forEach((g) => {
          const raw = String(g);
          const [name = "", roleLabel = ""] = raw.split(" – ");
          const cleanName = name.trim();
          const cleanRole = roleLabel.trim();
          if (
            cleanName &&
            (cleanRole === "Compositeur" || cleanRole === "Beatmaker")
          ) {
            composerNames.add(cleanName);
          }
        });
        const composersString =
          composerNames.size > 0 ? Array.from(composerNames).join(", ") : "";

        const trackNumber = index + 1;
        const trackTotal = albumTracks.length;

        const mainArtistName = track.mainArtist?.trim() || albumForMetadata.artist || "";
        const editorName =
          albumForMetadata.editor?.trim() ||
          track.editor?.trim() ||
          mainArtistName;
        const labelFromAlbum = albumForMetadata.label?.trim() || "";
        const labelFromTrack =
          !track.selfProduced && track.label?.trim()
            ? track.label.trim()
            : mainArtistName;
        const labelName = labelFromAlbum || labelFromTrack;

        const copyrightValue = editorName || mainArtistName || undefined;
        const labelValue = labelName || undefined;

        const metadataPayload = {
          title: track.title,
          artist: allArtists.join(", ") || track.mainArtist || "",
          album: albumForMetadata.title ?? "",
          albumArtist: albumForMetadata.artist ?? track.mainArtist ?? "",
          trackNumber,
          trackTotal,
          genre: genreSource || undefined,
          label: labelValue,
          copyright: copyrightValue,
          year,
          fullDate: rawDate || undefined,
          composers: composersString || undefined,
          isrc: track.isrc || undefined,
          comment: track.notes?.trim() || undefined,
        };

        const formData = new FormData();
        formData.append(
          "file",
          new Blob([buffer], { type: file.type || "audio/*" }),
          file.name
        );
        formData.append("metadata", JSON.stringify(metadataPayload));

        const coverSrc = albumForMetadata.cover || track.cover;
        if (coverSrc && coverSrc.startsWith("data:")) {
          try {
            const coverRes = await fetch(coverSrc);
            const coverBlob = await coverRes.blob();
            formData.append("cover", coverBlob, "cover.jpg");
          } catch {
            // ignore
          }
        }

        const res = await fetch("/api/phono/apply-metadata", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          // eslint-disable-next-line no-console
          console.error("Album metadata error for track", track.id, res.status);
          continue;
        }

        const outBlob = await res.blob();
        const sanitized = (track.title || "audio")
          .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæ\s_-]/gi, "")
          .trim();
        const ext = file.name?.match(/\.[^.]+$/)?.[0] ?? ".audio";
        const trackNumberPrefix = String(trackNumber).padStart(2, "0");
        const filename = `${trackNumberPrefix} - ${sanitized || "audio"}${ext}`;
        filesToZip.push({ blob: outBlob, filename });
      }

      if (filesToZip.length > 0) {
        const zip = new JSZip();
        const folderName = (albumForMetadata.title || "album")
          .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæ\s_-]/gi, "")
          .trim() || "album";
        const folder = zip.folder(folderName)!;
        for (const { blob, filename } of filesToZip) {
          folder.file(filename, blob);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${folderName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setAlbumMetadataId(null);
      setAlbumMetadataFiles({});
      setAlbumMetadataBuffers({});
      setAlbumMetadataUploading({});
    } finally {
      setAlbumMetadataProcessing(false);
    }
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
          onClick={() => setTab("podcasts")}
          className={
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
            (tab === "podcasts"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          Podcasts
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
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
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
                  <Label>Statut</Label>
                  <Select
                    value={draft.status}
                    onValueChange={(v) =>
                      updateDraft({ status: v as ReleaseStatus })
                    }
                  >
                    <SelectTrigger>
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

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Personnes impliquées</Label>
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
                    {draft.guestArtists.map((value, i) => {
                      const [guestName = "", guestRole = ""] = String(value).split(
                        " – "
                      );
                      return (
                        <div key={i} className="flex w-full items-center gap-2">
                          <div className="basis-2/3 min-w-0">
                            <Input
                              value={guestName}
                              onChange={(e) => {
                                const next = [e.target.value, guestRole || ""]
                                  .filter(Boolean)
                                  .join(" – ");
                                updateDraftGuestArtist(i, next);
                              }}
                              placeholder="Nom"
                              className="h-8 w-full text-xs sm:text-sm"
                            />
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            -
                          </span>
                          <div className="basis-1/3 min-w-0">
                            <Select
                              value={guestRole}
                              onValueChange={(v) => {
                                const next = [guestName || "", v]
                                  .filter(Boolean)
                                  .join(" – ");
                                updateDraftGuestArtist(i, next);
                              }}
                            >
                              <SelectTrigger className="h-8 w-full text-[10px] sm:text-xs">
                                <SelectValue placeholder="Rôle" />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((r) => (
                                  <SelectItem key={r.value} value={r.label}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDraftGuestArtist(i)}
                            className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                            title="Supprimer"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      );
                    })}
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

                <div className="space-y-2">
                  <Label>Genre</Label>
                  <Input
                    value={draft.genre}
                    onChange={(e) =>
                      updateDraft({ genre: e.target.value })
                    }
                    placeholder="Ex. Pop, Rap, Electro…"
                  />
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

                <div className="grid gap-4 sm:grid-cols-2">
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
                    <Label>Editeur</Label>
                    <Input
                      value={draft.editor ?? ""}
                      onChange={(e) =>
                        updateDraft({ editor: e.target.value })
                      }
                      placeholder="Nom de l'éditeur"
                    />
                  </div>
                </div>

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
                  <Label>Distribution</Label>
                  <Textarea
                    value={draft.distribution}
                    onChange={(e) =>
                      updateDraft({ distribution: e.target.value })
                    }
                    placeholder="Nom du distributeur, plateformes, accord, etc."
                    rows={2}
                    className="resize-none"
                  />
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

                <div className="space-y-2">
                  <Label>Cover</Label>
                  <input
                    ref={trackCoverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleDraftTrackCoverChange}
                  />
                  <div className="pt-2">
                    {draft.cover ? (
                      <div className="flex flex-col items-start">
                        <img
                          src={draft.cover}
                          alt="Cover titre"
                          className="h-24 w-24 shrink-0 rounded-lg object-cover border"
                        />
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => trackCoverInputRef.current?.click()}
                          >
                            <ImagePlus className="mr-1 h-3.5 w-3.5" />
                            Changer
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDraft((prev) => ({ ...prev, cover: undefined }))
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
                        onClick={() => trackCoverInputRef.current?.click()}
                      >
                        <ImagePlus className="mr-2 h-4 w-4" />
                        Ajouter une image
                      </Button>
                    )}
                  </div>
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

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Statut</Label>
                          <Select
                            value={track.status ?? "en_production"}
                            onValueChange={(v) =>
                              updateTrack(track.id, {
                                status: v as ReleaseStatus,
                              })
                            }
                          >
                            <SelectTrigger>
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
                        <div className="flex items-center justify-between">
                          <Label>Personnes impliquées</Label>
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
                      {(track.guestArtists ?? []).map((value, i) => {
                        const [guestName = "", guestRole = ""] = String(value).split(
                          " – "
                        );
                        return (
                          <div key={i} className="flex w-full items-center gap-2">
                            <div className="basis-2/3 min-w-0">
                              <Input
                                value={guestName}
                                onChange={(e) =>
                                  updateGuestArtist(
                                    track.id,
                                    i,
                                    [e.target.value, guestRole || ""]
                                      .filter(Boolean)
                                      .join(" – ")
                                  )
                                }
                                placeholder="Nom"
                                className="h-8 w-full text-xs sm:text-sm"
                              />
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              -
                            </span>
                            <div className="basis-1/3 min-w-0">
                              <Select
                                value={guestRole}
                                onValueChange={(v) =>
                                  updateGuestArtist(
                                    track.id,
                                    i,
                                    [guestName || "", v]
                                      .filter(Boolean)
                                      .join(" – ")
                                  )
                                }
                              >
                                <SelectTrigger className="h-8 w-full text-[10px] sm:text-xs">
                                  <SelectValue placeholder="Rôle" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLES.map((r) => (
                                    <SelectItem key={r.value} value={r.label}>
                                      {r.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeGuestArtist(track.id, i)}
                              className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                              title="Supprimer"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        );
                      })}
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

                        <div className="space-y-2">
                          <Label>Genre</Label>
                          <Input
                            value={track.genre ?? ""}
                            onChange={(e) =>
                              updateTrack(track.id, { genre: e.target.value })
                            }
                            placeholder="Ex. Pop, Rap, Electro…"
                          />
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

                      <div className="grid gap-4 sm:grid-cols-2">
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
                          <Label>Editeur</Label>
                          <Input
                            value={track.editor ?? ""}
                            onChange={(e) =>
                              updateTrack(track.id, {
                                editor: e.target.value,
                              })
                            }
                            placeholder="Nom de l'éditeur"
                          />
                        </div>
                      </div>

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
                        <Label>Distribution</Label>
                        <Textarea
                          value={track.distribution ?? ""}
                          onChange={(e) =>
                            updateTrack(track.id, {
                              distribution: e.target.value,
                            })
                          }
                          placeholder="Nom du distributeur, plateformes, accord, etc."
                          rows={2}
                          className="resize-none"
                        />
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

                      <div className="space-y-2">
                        <Label>Cover</Label>
                        <input
                          id={`track-cover-${track.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleTrackCoverChange(e, track.id)}
                        />
                        <div className="pt-2">
                          {track.cover ? (
                            <div className="flex flex-col items-start">
                              <img
                                src={track.cover}
                                alt={`Cover ${track.title || "titre"}`}
                                className="h-24 w-24 shrink-0 rounded-lg object-cover border"
                              />
                              <div className="mt-2 flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    document
                                      .getElementById(`track-cover-${track.id}`)
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
                                    updateTrack(track.id, { cover: undefined })
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
                                  .getElementById(`track-cover-${track.id}`)
                                  ?.click()
                              }
                            >
                              <ImagePlus className="mr-2 h-4 w-4" />
                              Ajouter une image
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <>
                    <CardHeader className="border-b py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {track.cover && (
                            <img
                              src={track.cover}
                              alt={`Cover ${track.title || "titre"}`}
                              className="h-14 w-14 rounded-md object-cover border"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-semibold tracking-tight">
                                {track.title || "Sans titre"}
                              </h3>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className={releaseStatusBadgeClass(
                                      (track.status as ReleaseStatus) ?? "en_production"
                                    ) + " cursor-pointer hover:opacity-90 transition-opacity border-0"}
                                  >
                                    {releaseStatusLabel(
                                      (track.status as ReleaseStatus) ?? "en_production"
                                    )}
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {RELEASE_STATUSES.map((s) => (
                                    <DropdownMenuItem
                                      key={s.value}
                                      onSelect={() =>
                                        updateTrack(track.id, { status: s.value })
                                      }
                                    >
                                      {s.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {track.mainArtist || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setMetadataTrackId(track.id);
                              setMetadataFile(null);
                            }}
                            title="Appliquer les métadonnées à un fichier audio"
                          >
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Métadonnées
                          </Button>
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
                            Statut
                          </dt>
                          <dd className="mt-1 text-sm">
                            {releaseStatusLabel(
                              (track.status as ReleaseStatus) ?? "en_production"
                            )}
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
                            Genre
                          </dt>
                          <dd className="mt-1 text-sm">
                            {track.genre?.trim() || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Label
                          </dt>
                          <dd className="mt-1 text-sm">
                            {track.selfProduced
                              ? "Auto-produit"
                              : track.label || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Editeur
                          </dt>
                          <dd className="mt-1 text-sm">
                            {track.editor?.trim() || "—"}
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
                            Distribution
                          </dt>
                          <dd className="mt-1 whitespace-pre-wrap text-sm">
                            {track.distribution?.trim() || "—"}
                          </dd>
                        </div>
                      </dl>

                      {(track.guestArtists ?? []).filter(Boolean).length > 0 && (
                        <div className="mt-4 border-t pt-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Personnes impliquées
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
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
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
                  <Label>Artiste principal</Label>
                  <Input
                    value={albumDraft.artist}
                    onChange={(e) =>
                      setAlbumDraft((prev) => ({ ...prev, artist: e.target.value }))
                    }
                    placeholder="Nom de l'artiste principal"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select
                      value={albumDraft.status}
                      onValueChange={(v) =>
                        setAlbumDraft((prev) => ({
                          ...prev,
                          status: v as ReleaseStatus,
                        }))
                      }
                    >
                      <SelectTrigger>
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={albumDraft.label}
                      onChange={(e) =>
                        setAlbumDraft((prev) => ({
                          ...prev,
                          label: e.target.value,
                        }))
                      }
                      placeholder="Nom du label"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Editeur</Label>
                    <Input
                      value={albumDraft.editor}
                      onChange={(e) =>
                        setAlbumDraft((prev) => ({
                          ...prev,
                          editor: e.target.value,
                        }))
                      }
                      placeholder="Nom de l'éditeur"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Genre</Label>
                  <Input
                    value={albumDraft.genre}
                    onChange={(e) =>
                      setAlbumDraft((prev) => ({
                        ...prev,
                        genre: e.target.value,
                      }))
                    }
                    placeholder="Ex. Pop, Rap, Electro…"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Distribution</Label>
                  <Textarea
                    value={albumDraft.distribution}
                    onChange={(e) =>
                      setAlbumDraft((prev) => ({
                        ...prev,
                        distribution: e.target.value,
                      }))
                    }
                    placeholder="Nom du distributeur, plateformes, accord, etc."
                    rows={2}
                    className="resize-none"
                  />
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
                  {albumDraft.trackIds.length > 0 && (
                    <div className="mt-2 rounded-md border bg-muted/10 p-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Tracklist (ordre)
                      </p>
                      <ul className="mt-1 space-y-1 text-xs sm:text-sm">
                        {albumDraft.trackIds.map((id, index) => {
                          const t = tracks.find((tr) => tr.id === id);
                          if (!t) return null;
                          return (
                            <li
                              key={id}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="truncate">
                                <span className="mr-1 font-mono text-[11px] sm:text-xs">
                                  {index + 1}.
                                </span>
                                {t.title || "Sans titre"}
                                {t.mainArtist ? ` · ${t.mainArtist}` : ""}
                              </span>
                              <span className="flex shrink-0 gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 px-0 text-xs"
                                  disabled={index === 0}
                                  onClick={() =>
                                    moveAlbumTrack(albumDraft, id, "up", true)
                                  }
                                >
                                  ↑
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 px-0 text-xs"
                                  disabled={index === albumDraft.trackIds.length - 1}
                                  onClick={() =>
                                    moveAlbumTrack(albumDraft, id, "down", true)
                                  }
                                >
                                  ↓
                                </Button>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Personnes impliquées</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={addAlbumGuestDraft}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Ajouter
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(albumDraft.guests ?? []).map((g) => (
                      <div key={g.id} className="flex w-full items-center gap-2">
                        <div className="basis-1/2 min-w-0">
                          <Input
                            value={g.name}
                            onChange={(e) =>
                              updateAlbumGuestDraft(g.id, { name: e.target.value })
                            }
                            placeholder="Nom"
                            className="h-8 w-full text-xs sm:text-sm"
                          />
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">-</span>
                        <div className="basis-1/2 min-w-0">
                          <Select
                            value={g.role}
                            onValueChange={(v) =>
                              updateAlbumGuestDraft(g.id, {
                                role: v as PhonoRole,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 w-full text-[10px] sm:text-xs">
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeAlbumGuestDraft(g.id)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
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
                  <div className="pt-2">
                  {albumDraft.cover ? (
                    <div className="flex flex-col items-start">
                      <img
                        src={albumDraft.cover}
                        alt="Cover"
                        className="h-24 w-24 shrink-0 rounded-lg object-cover border"
                      />
                      <div className="mt-2 flex gap-2">
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
              const albumGuests = (album.guests ?? []).filter((g) =>
                String(g.name ?? "").trim()
              );
              const albumContributors = computeAlbumContributors(album, albumTracks);
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
                          <Label>Artiste principal</Label>
                          <Input
                            value={album.artist ?? ""}
                            onChange={(e) =>
                              updateAlbum(album.id, { artist: e.target.value })
                            }
                            placeholder="Nom de l'artiste principal"
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
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
                          <div className="space-y-2">
                            <Label>Statut</Label>
                            <Select
                              value={album.status ?? "en_production"}
                              onValueChange={(v) =>
                                updateAlbum(album.id, { status: v as ReleaseStatus })
                              }
                            >
                              <SelectTrigger>
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
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                              value={album.label ?? ""}
                              onChange={(e) =>
                                updateAlbum(album.id, { label: e.target.value })
                              }
                              placeholder="Nom du label"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Editeur</Label>
                            <Input
                              value={album.editor ?? ""}
                              onChange={(e) =>
                                updateAlbum(album.id, { editor: e.target.value })
                              }
                              placeholder="Nom de l'éditeur"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Genre</Label>
                          <Input
                            value={album.genre ?? ""}
                            onChange={(e) =>
                              updateAlbum(album.id, { genre: e.target.value })
                            }
                            placeholder="Ex. Pop, Rap, Electro…"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Distribution</Label>
                          <Textarea
                            value={album.distribution ?? ""}
                            onChange={(e) =>
                              updateAlbum(album.id, {
                                distribution: e.target.value,
                              })
                            }
                            placeholder="Nom du distributeur, plateformes, accord, etc."
                            rows={2}
                            className="resize-none"
                          />
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
                  {album.trackIds.length > 0 && (
                    <div className="mt-2 rounded-md border bg-muted/10 p-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Tracklist (ordre)
                      </p>
                      <ul className="mt-1 space-y-1 text-xs sm:text-sm">
                        {album.trackIds.map((id, index) => {
                          const t = tracks.find((tr) => tr.id === id);
                          if (!t) return null;
                          return (
                            <li
                              key={id}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="truncate">
                                <span className="mr-1 font-mono text-[11px] sm:text-xs">
                                  {index + 1}.
                                </span>
                                {t.title || "Sans titre"}
                                {t.mainArtist ? ` · ${t.mainArtist}` : ""}
                              </span>
                              <span className="flex shrink-0 gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 px-0 text-xs"
                                  disabled={index === 0}
                                  onClick={() =>
                                    moveAlbumTrack(album, id, "up", false)
                                  }
                                >
                                  ↑
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 px-0 text-xs"
                                  disabled={index === album.trackIds.length - 1}
                                  onClick={() =>
                                    moveAlbumTrack(album, id, "down", false)
                                  }
                                >
                                  ↓
                                </Button>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Personnes impliquées</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => addAlbumGuest(album.id)}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Ajouter
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {(album.guests ?? []).map((g) => (
                              <div key={g.id} className="flex w-full items-center gap-2">
                                <div className="basis-1/2 min-w-0">
                                  <Input
                                    value={g.name}
                                    onChange={(e) =>
                                      updateAlbumGuest(album.id, g.id, {
                                        name: e.target.value,
                                      })
                                    }
                                    placeholder="Nom"
                                    className="h-8 w-full text-xs sm:text-sm"
                                  />
                                </div>
                                <span className="shrink-0 text-xs text-muted-foreground">-</span>
                                <div className="basis-1/2 min-w-0">
                                  <Select
                                    value={g.role}
                                    onValueChange={(v) =>
                                      updateAlbumGuest(album.id, g.id, {
                                        role: v as PhonoRole,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 w-full text-[10px] sm:text-xs">
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
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeAlbumGuest(album.id, g.id)}
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </div>
                            ))}
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
                          <div className="pt-2">
                          {album.cover ? (
                            <div className="flex flex-col items-start">
                              <img
                                src={album.cover}
                                alt="Cover"
                                className="h-24 w-24 shrink-0 rounded-lg object-cover border"
                              />
                              <div className="mt-2 flex gap-2">
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-semibold tracking-tight">
                                {album.title || "Sans titre"}
                              </h3>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className={releaseStatusBadgeClass(
                                      album.status ?? "en_production"
                                    ) + " cursor-pointer hover:opacity-90 transition-opacity border-0"}
                                  >
                                    {releaseStatusLabel(album.status ?? "en_production")}
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {RELEASE_STATUSES.map((s) => (
                                    <DropdownMenuItem
                                      key={s.value}
                                      onSelect={() =>
                                        updateAlbum(album.id, { status: s.value })
                                      }
                                    >
                                      {s.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {album.artist || "—"}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {albumTracks.length > 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAlbumMetadataId(album.id);
                                  setAlbumMetadataFiles({});
                                  setAlbumMetadataBuffers({});
                                  setAlbumMetadataUploading({});
                                }}
                                title="Appliquer les métadonnées à tous les titres de l'album"
                              >
                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                Métadonnées
                              </Button>
                            )}
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
                        <dl className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Statut
                            </dt>
                            <dd className="mt-1 text-sm">
                              {releaseStatusLabel(album.status ?? "en_production")}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Date de sortie
                            </dt>
                            <dd className="mt-1 text-sm">
                              {displayDate(album.releaseDate) || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Genre
                            </dt>
                            <dd className="mt-1 text-sm">
                              {album.genre?.trim() || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Label
                            </dt>
                            <dd className="mt-1 text-sm">
                              {album.label?.trim() || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Editeur
                            </dt>
                            <dd className="mt-1 text-sm">
                              {album.editor?.trim() || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Type
                            </dt>
                            <dd className="mt-1 text-sm">{albumTypeLabel(album.type)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              UPC / EAN
                            </dt>
                            <dd className="mt-1 font-mono text-sm">{album.upcEan || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Titres liés
                            </dt>
                            <dd className="mt-1 text-sm">{albumTracks.length}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Distribution
                            </dt>
                            <dd className="mt-1 whitespace-pre-wrap text-sm">
                              {album.distribution?.trim() || "—"}
                            </dd>
                          </div>
                        </dl>

                        {albumGuests.length > 0 && (
                          <div className="mt-4 border-t pt-4">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Personnes impliquées
                            </p>
                            <ul className="mt-1 space-y-0.5 text-sm">
                              {albumGuests.map((g) => (
                                <li key={g.id}>
                                  {g.name} · {roleLabel(g.role)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {albumContributors.length > 0 && (
                          <div className="mt-4 border-t pt-4">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Personnes impliquées
                            </p>
                            <ul className="mt-1 space-y-0.5 text-sm">
                              {albumContributors.map((person) => (
                                <li key={person.name}>
                                  {person.name}
                                  {person.roles.length > 0
                                    ? ` · ${person.roles.join(", ")}`
                                    : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {albumTracks.length > 0 && (
                          <div className="mt-4 border-t pt-4">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Titres
                            </p>
                            <ul className="mt-1 list-inside list-decimal space-y-0.5 text-sm">
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
                          <div className="mt-4 border-t pt-4">
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

      {tab === "podcasts" && (
        <>
          <div className="mb-6 flex justify-end">
            <Button
              type="button"
              onClick={() => setNewPodcastDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un podcast
            </Button>
          </div>

          <Dialog
            open={newPodcastDialogOpen}
            onOpenChange={(open) => {
              setNewPodcastDialogOpen(open);
              if (!open) setPodcastDraft(defaultPodcast());
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Nouveau podcast</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Remplis les champs puis enregistre.
                </p>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input
                    value={String(podcastDraft.title ?? "")}
                    onChange={(e) =>
                      setPodcastDraft((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Titre du podcast"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Artistes</Label>
                  <Input
                    value={String(podcastDraft.artists ?? "")}
                    onChange={(e) =>
                      setPodcastDraft((prev) => ({ ...prev, artists: e.target.value }))
                    }
                    placeholder="Artistes ou DJ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Publié sur</Label>
                  <Input
                    value={String(podcastDraft.publishedOn ?? "")}
                    onChange={(e) =>
                      setPodcastDraft((prev) => ({ ...prev, publishedOn: e.target.value }))
                    }
                    placeholder="Chaîne, page, radio…"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="draft-podcast-video"
                      checked={Boolean(podcastDraft.isVideo)}
                      onCheckedChange={(checked) =>
                        setPodcastDraft((prev) => ({ ...prev, isVideo: checked === true }))
                      }
                    />
                    <Label
                      htmlFor="draft-podcast-video"
                      className="cursor-pointer font-normal"
                    >
                      Vidéo
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="draft-podcast-live"
                      checked={Boolean(podcastDraft.isLive)}
                      onCheckedChange={(checked) =>
                        setPodcastDraft((prev) => ({ ...prev, isLive: checked === true }))
                      }
                    />
                    <Label
                      htmlFor="draft-podcast-live"
                      className="cursor-pointer font-normal"
                    >
                      En direct
                    </Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select
                    value={String(podcastDraft.status ?? "")}
                    onValueChange={(v) =>
                      setPodcastDraft((prev) => ({
                        ...prev,
                        status: v as ReleaseStatus,
                      }))
                    }
                  >
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label>Date de sortie</Label>
                  <DatePicker
                    value={toIsoForPicker(String(podcastDraft.releaseDate ?? ""))}
                    onChange={(iso) =>
                      setPodcastDraft((prev) => ({
                        ...prev,
                        releaseDate: isoToFr(iso),
                      }))
                    }
                    placeholder={DATE_FORMAT_PLACEHOLDER}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cover</Label>
                  <input
                    ref={podcastCoverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePodcastCoverChange(e, null)}
                  />
                  <div className="pt-2">
                    {podcastDraft.cover ? (
                      <div className="flex flex-col items-start">
                        <img
                          src={String(podcastDraft.cover)}
                          alt="Cover"
                          className="h-24 w-24 shrink-0 rounded-lg object-cover border"
                        />
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => podcastCoverInputRef.current?.click()}
                          >
                            <ImagePlus className="mr-1 h-3.5 w-3.5" />
                            Changer
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setPodcastDraft((prev) => ({ ...prev, cover: undefined }))
                            }
                            className="text-muted-foreground hover:text-destructive"
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => podcastCoverInputRef.current?.click()}
                      >
                        <ImagePlus className="mr-2 h-4 w-4" />
                        Ajouter une image
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tracklist</Label>
                  <p className="text-xs text-muted-foreground">
                    Une ligne = un titre. Timer – Artiste – Titre (facile à copier-coller).
                  </p>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border bg-muted/20 p-2">
                    {(Array.isArray(podcastDraft.tracklist) ? podcastDraft.tracklist : []).length === 0 ? (
                      <p className="py-2 text-center text-sm text-muted-foreground">
                        Aucune track
                      </p>
                    ) : (
                      (Array.isArray(podcastDraft.tracklist) ? podcastDraft.tracklist : []).map((item: { id: string; time?: string; artist?: string; label?: string }) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-1.5 rounded border border-transparent bg-background/60 py-1 px-2 hover:border-input"
                        >
                          <div className="w-[5rem] shrink-0">
                            <Input
                              value={item.time}
                              onChange={(e) =>
                                setPodcastDraft((prev) => ({
                                  ...prev,
                                  tracklist: (Array.isArray(prev.tracklist) ? prev.tracklist : []).map((i: { id: string; time?: string; artist?: string; label?: string }) =>
                                    i.id === item.id ? { ...i, time: e.target.value } : i
                                  ),
                                }))
                              }
                              placeholder="0:00"
                              className="h-6 w-full min-w-0 font-mono text-[10px]"
                            />
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground">–</span>
                          <div className="w-[18.2rem] shrink-0">
                            <Input
                              value={item.artist ?? ""}
                              onChange={(e) =>
                                setPodcastDraft((prev) => ({
                                  ...prev,
                                  tracklist: (Array.isArray(prev.tracklist) ? prev.tracklist : []).map((i: { id: string; time?: string; artist?: string; label?: string }) =>
                                    i.id === item.id ? { ...i, artist: e.target.value } : i
                                  ),
                                }))
                              }
                              placeholder="Artiste"
                              className="h-6 w-full min-w-0 text-[10px]"
                            />
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">–</span>
                          <Input
                            value={item.label}
                            onChange={(e) =>
                              setPodcastDraft((prev) => ({
                                ...prev,
                                tracklist: (Array.isArray(prev.tracklist) ? prev.tracklist : []).map((i: { id: string; time?: string; artist?: string; label?: string }) =>
                                  i.id === item.id ? { ...i, label: e.target.value } : i
                                ),
                              }))
                            }
                            placeholder="Titre"
                            className="h-7 min-w-0 flex-1 text-xs"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setPodcastDraft((prev) => ({
                                ...prev,
                                tracklist: (Array.isArray(prev.tracklist) ? prev.tracklist : []).filter((i: { id: string }) => i.id !== item.id),
                              }))
                            }
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-center border-dashed"
                    onClick={() =>
                      setPodcastDraft((prev) => ({
                        ...prev,
                        tracklist: [
                          ...(Array.isArray(prev.tracklist) ? prev.tracklist : []),
                          { id: "tl-" + Date.now(), artist: "", label: "", time: "0:00" },
                        ],
                      }))
                    }
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Ajouter un titre
                  </Button>
                  {(Array.isArray(podcastDraft.tracklist) ? podcastDraft.tracklist : []).length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const text = formatTracklistForCopy(Array.isArray(podcastDraft.tracklist) ? podcastDraft.tracklist : []);
                        void navigator.clipboard.writeText(text);
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copier la tracklist
                    </Button>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={addPodcastFromDraft}
                  disabled={!isPodcastDraftComplete}
                >
                  Ajouter au catalogue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="space-y-4">
            {podcasts.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <p>Aucun podcast dans le catalogue.</p>
                  <p className="mt-1 text-sm">
                    Clique sur « Ajouter un podcast » pour commencer.
                  </p>
                </CardContent>
              </Card>
            )}
            {podcasts.map((podcast) => (
              <Card key={podcast.id} className="overflow-hidden">
                {editingPodcastId === podcast.id ? (
                  <>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        Modifier le podcast
                      </span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPodcastId(null)}
                        >
                          Terminer
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePodcast(podcast.id)}
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
                          value={podcast.title}
                          onChange={(e) =>
                            updatePodcast(podcast.id, { title: e.target.value })
                          }
                          placeholder="Titre du podcast"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Artistes</Label>
                        <Input
                          value={podcast.artists}
                          onChange={(e) =>
                            updatePodcast(podcast.id, { artists: e.target.value })
                          }
                          placeholder="Artistes ou DJ"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Publié sur</Label>
                        <Input
                          value={podcast.publishedOn}
                          onChange={(e) =>
                            updatePodcast(podcast.id, { publishedOn: e.target.value })
                          }
                          placeholder="Chaîne, page, radio…"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`podcast-video-${podcast.id}`}
                            checked={podcast.isVideo}
                            onCheckedChange={(checked) =>
                              updatePodcast(podcast.id, { isVideo: checked === true })
                            }
                          />
                          <Label
                            htmlFor={`podcast-video-${podcast.id}`}
                            className="cursor-pointer font-normal"
                          >
                            Vidéo
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`podcast-live-${podcast.id}`}
                            checked={podcast.isLive}
                            onCheckedChange={(checked) =>
                              updatePodcast(podcast.id, { isLive: checked === true })
                            }
                          />
                          <Label
                            htmlFor={`podcast-live-${podcast.id}`}
                            className="cursor-pointer font-normal"
                          >
                            En direct
                          </Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Statut</Label>
                        <Select
                          value={podcast.status ?? "en_production"}
                          onValueChange={(v) =>
                            updatePodcast(podcast.id, { status: v as ReleaseStatus })
                          }
                        >
                          <SelectTrigger>
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
                      <div className="space-y-2">
                        <Label>Date de sortie</Label>
                        <DatePicker
                          value={toIsoForPicker(podcast.releaseDate)}
                          onChange={(iso) =>
                            updatePodcast(podcast.id, {
                              releaseDate: isoToFr(iso),
                            })
                          }
                          placeholder={DATE_FORMAT_PLACEHOLDER}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cover</Label>
                        <input
                          id={`podcast-cover-input-${podcast.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePodcastCoverChange(e, podcast.id)}
                        />
                        <div className="pt-2">
                          {podcast.cover ? (
                            <div className="flex flex-col items-start">
                              <img
                                src={podcast.cover}
                                alt="Cover"
                                className="h-24 w-24 shrink-0 rounded-lg object-cover border"
                              />
                              <div className="mt-2 flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    document.getElementById(`podcast-cover-input-${podcast.id}`)?.click()
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
                                    updatePodcast(podcast.id, { cover: undefined })
                                  }
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  Supprimer
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                document.getElementById(`podcast-cover-input-${podcast.id}`)?.click()
                              }
                            >
                              <ImagePlus className="mr-2 h-4 w-4" />
                              Ajouter une image
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Tracklist</Label>
                        <p className="text-xs text-muted-foreground">
                          Une ligne = un titre. Timer – Artiste – Titre.
                        </p>
                        <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border bg-muted/20 p-2">
                          {podcast.tracklist.length === 0 ? (
                            <p className="py-2 text-center text-sm text-muted-foreground">
                              Aucune track
                            </p>
                          ) : (
                            podcast.tracklist.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-1.5 rounded border border-transparent bg-background/60 py-1 px-2 hover:border-input"
                              >
                                <div className="w-[5rem] shrink-0">
                                  <Input
                                    value={item.time}
                                    onChange={(e) =>
                                      updatePodcastTracklistItem(podcast.id, item.id, {
                                        time: e.target.value,
                                      })
                                    }
                                    placeholder="0:00"
                                    className="h-6 w-full min-w-0 font-mono text-[10px]"
                                  />
                                </div>
                                <span className="shrink-0 text-[10px] text-muted-foreground">–</span>
                                <div className="w-[18.2rem] shrink-0">
                                  <Input
                                    value={item.artist ?? ""}
                                    onChange={(e) =>
                                      updatePodcastTracklistItem(podcast.id, item.id, {
                                        artist: e.target.value,
                                      })
                                    }
                                    placeholder="Artiste"
                                    className="h-6 w-full min-w-0 text-[10px]"
                                  />
                                </div>
                                <span className="shrink-0 text-xs text-muted-foreground">–</span>
                                <Input
                                  value={item.label}
                                  onChange={(e) =>
                                    updatePodcastTracklistItem(podcast.id, item.id, {
                                      label: e.target.value,
                                    })
                                  }
                                  placeholder="Titre"
                                  className="h-7 min-w-0 flex-1 text-xs"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
size="sm"
                                className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  removePodcastTracklistItem(podcast.id, item.id)
                                }
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-center border-dashed"
                          onClick={() => addPodcastTracklistItem(podcast.id)}
                        >
                          <Plus className="mr-2 h-3.5 w-3.5" />
                          Ajouter un titre
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const text = formatTracklistForCopy(podcast.tracklist);
                            void navigator.clipboard.writeText(text);
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copier la tracklist
                        </Button>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <>
                    <CardHeader className="border-b py-4">
                      <div className="flex items-start gap-4">
                        {podcast.cover && (
                          <img
                            src={podcast.cover}
                            alt=""
                            className="h-20 w-20 shrink-0 rounded-lg object-cover border"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold tracking-tight">
                              {podcast.title || "Sans titre"}
                            </h3>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={releaseStatusBadgeClass(
                                  (podcast.status as ReleaseStatus) ?? "en_production"
                                ) + " cursor-pointer hover:opacity-90 transition-opacity border-0"}
                              >
                                {releaseStatusLabel(
                                  (podcast.status as ReleaseStatus) ?? "en_production"
                                )}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {RELEASE_STATUSES.map((s) => (
                                <DropdownMenuItem
                                  key={s.value}
                                  onSelect={() =>
                                    updatePodcast(podcast.id, { status: s.value })
                                  }
                                >
                                  {s.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {podcast.artists || "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPodcastId(podcast.id)}
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Modifier
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePodcast(podcast.id)}
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
                            Statut
                          </dt>
                          <dd className="mt-1 text-sm">
                            {podcast.status
                              ? releaseStatusLabel(podcast.status)
                              : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Date de sortie
                          </dt>
                          <dd className="mt-1 text-sm">
                            {displayDate(podcast.releaseDate) || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Publié sur
                          </dt>
                          <dd className="mt-1 text-sm">
                            {podcast.publishedOn?.trim() || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Vidéo / En direct
                          </dt>
                          <dd className="mt-1 text-sm">
                            {[podcast.isVideo && "Vidéo", podcast.isLive && "En direct"]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </dd>
                        </div>
                      </dl>

                      {podcast.tracklist.length > 0 && (
                        <div className="mt-4 border-t pt-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Tracklist
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const text = formatTracklistForCopy(podcast.tracklist);
                                void navigator.clipboard.writeText(text);
                              }}
                            >
                              <Copy className="mr-2 h-3.5 w-3.5" />
                              Copier
                            </Button>
                          </div>
                          <ul className="mt-2 space-y-1 rounded-md border bg-muted/20 p-2">
                            {podcast.tracklist.map((item) => (
                              <li
                                key={item.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                                  {item.time || "0:00"}
                                </span>
                                <span className="shrink-0 text-muted-foreground">–</span>
                                <span className="truncate">
                                  {[item.artist, item.label].filter(Boolean).join(" – ") || "—"}
                                </span>
                              </li>
                            ))}
                          </ul>
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
      <Dialog
        open={metadataTrackId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMetadataTrackId(null);
            setMetadataFile(null);
            setMetadataBuffer(null);
            setMetadataUploading(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Appliquer les métadonnées</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Upload un fichier audio, les métadonnées du titre seront intégrées
              puis le fichier sera téléchargé.
            </p>
          </DialogHeader>

          {metadataTrack && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Métadonnées qui seront appliquées
                </p>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Titre</dt>
                    <dd className="font-medium">{metadataTrack.title || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Artiste</dt>
                    <dd className="font-medium">{metadataTrack.mainArtist || "—"}</dd>
                  </div>
                  {metadataAlbum && (
                    <>
                      <div>
                        <dt className="text-muted-foreground">Album</dt>
                        <dd className="font-medium">{metadataAlbum.title}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Piste</dt>
                        <dd className="font-medium">
                          {metadataAlbum.trackIds.indexOf(metadataTrack.id) + 1} / {metadataAlbum.trackIds.length}
                        </dd>
                      </div>
                    </>
                  )}
                  {metadataTrack.isrc && (
                    <div>
                      <dt className="text-muted-foreground">ISRC</dt>
                      <dd className="font-mono font-medium">{metadataTrack.isrc}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Genre</dt>
                    <dd className="font-medium">
                      {(metadataTrack.genre && metadataTrack.genre.trim()) ||
                        (metadataAlbum?.genre && metadataAlbum.genre.trim()) ||
                        "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Date</dt>
                    <dd className="font-medium">
                      {displayDate(metadataTrack.releaseDate) || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Label</dt>
                    <dd className="font-medium">
                      {metadataTrack.selfProduced
                        ? "Auto-produit"
                        : metadataTrack.label || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Editeur</dt>
                    <dd className="font-medium">
                      {metadataTrack.editor || "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Compositeurs</dt>
                    <dd className="font-medium">
                      {(() => {
                        const names = new Set<string>();

                        if (
                          metadataTrack.mainArtist &&
                          (metadataTrack.role === "compositeur" ||
                            metadataTrack.role === "beatmaker")
                        ) {
                          names.add(metadataTrack.mainArtist.trim());
                        }

                        (metadataTrack.guestArtists ?? []).forEach((g) => {
                          const raw = String(g);
                          const [name = "", roleLabel = ""] = raw.split(" – ");
                          const cleanName = name.trim();
                          const cleanRole = roleLabel.trim();
                          if (
                            cleanName &&
                            (cleanRole === "Compositeur" ||
                              cleanRole === "Beatmaker")
                          ) {
                            names.add(cleanName);
                          }
                        });

                        const str = Array.from(names).join(", ");
                        return str || "—";
                      })()}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="pt-2">
                <input
                  ref={metadataInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.flac,.aac,.m4a"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setMetadataFile(f);
                    setMetadataUploading(true);
                    setMetadataBuffer(null);
                    const startTime = Date.now();
                    const reader = new FileReader();
                    reader.onload = () => {
                      const elapsed = Date.now() - startTime;
                      const minDelay = 500;
                      const remaining = Math.max(0, minDelay - elapsed);
                      setTimeout(() => {
                        setMetadataBuffer(reader.result as ArrayBuffer);
                        setMetadataUploading(false);
                      }, remaining);
                    };
                    reader.onerror = () => {
                      setMetadataFile(null);
                      setMetadataBuffer(null);
                      setMetadataUploading(false);
                      alert(
                        "Erreur lors du chargement du fichier audio. Réessaie avec un autre fichier."
                      );
                    };
                    reader.readAsArrayBuffer(f);
                  }}
                />
                {metadataFile ? (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                    {metadataUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="flex-1 truncate">
                          Chargement… {metadataFile.name}
                        </span>
                      </>
                    ) : (
                      <span className="flex-1 truncate">{metadataFile.name}</span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setMetadataFile(null);
                        setMetadataBuffer(null);
                        setMetadataUploading(false);
                      }}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => metadataInputRef.current?.click()}
                  >
                    Choisir un fichier audio
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMetadataTrackId(null);
                setMetadataFile(null);
                setMetadataBuffer(null);
                setMetadataUploading(false);
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={
                !metadataFile || metadataUploading || !metadataBuffer || metadataProcessing
              }
              onClick={processMetadata}
            >
              {metadataProcessing ? "Traitement…" : "Appliquer et télécharger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={albumMetadataId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAlbumMetadataId(null);
            setAlbumMetadataFiles({});
            setAlbumMetadataBuffers({});
            setAlbumMetadataUploading({});
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Appliquer les métadonnées à l'album</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Choisis un fichier audio pour chaque titre de l'album, les métadonnées
              de chaque track + album seront appliquées puis les fichiers seront
              téléchargés.
            </p>
          </DialogHeader>

          {albumForMetadata && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Métadonnées de l'album
                </p>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Album</dt>
                    <dd className="font-medium">{albumForMetadata.title || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Artiste</dt>
                    <dd className="font-medium">{albumForMetadata.artist || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Date de sortie</dt>
                    <dd className="font-medium">
                      {displayDate(albumForMetadata.releaseDate) || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">UPC / EAN</dt>
                    <dd className="font-mono font-medium">
                      {albumForMetadata.upcEan || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Genre</dt>
                    <dd className="font-medium">
                      {albumForMetadata.genre?.trim() || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Label</dt>
                    <dd className="font-medium">
                      {albumForMetadata.label?.trim() || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Editeur</dt>
                    <dd className="font-medium">
                      {albumForMetadata.editor?.trim() || "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Compositeur(s)</dt>
                    <dd className="font-medium">
                      {(() => {
                        const composerNames = new Set<string>();
                        albumForMetadata.trackIds.forEach((trackId) => {
                          const t = tracks.find((tr) => tr.id === trackId);
                          if (!t) return;
                          if (
                            t.mainArtist &&
                            (t.role === "compositeur" || t.role === "beatmaker")
                          ) {
                            composerNames.add(t.mainArtist.trim());
                          }
                          (t.guestArtists ?? []).forEach((g) => {
                            const raw = String(g);
                            const [name = "", roleLabel = ""] = raw.split(" – ");
                            const cleanName = name.trim();
                            const cleanRole = roleLabel.trim();
                            if (
                              cleanName &&
                              (cleanRole === "Compositeur" || cleanRole === "Beatmaker")
                            ) {
                              composerNames.add(cleanName);
                            }
                          });
                        });
                        return composerNames.size > 0
                          ? Array.from(composerNames).join(", ")
                          : "—";
                      })()}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fichiers audio par track
                </p>
                <div className="space-y-2">
                  {albumForMetadata.trackIds.map((id, index) => {
                    const t = tracks.find((tr) => tr.id === id);
                    if (!t) return null;
                    const file = albumMetadataFiles[id];
                    const uploading = albumMetadataUploading[id];
                    return (
                      <div
                        key={id}
                        className="flex flex-col gap-1 rounded-md border bg-muted/10 p-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate">
                            <span className="mr-1 font-mono text-[11px] sm:text-xs">
                              {index + 1}.
                            </span>
                            {t.title || "Sans titre"}
                            {t.mainArtist ? ` · ${t.mainArtist}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!file ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs sm:h-8 sm:px-3 sm:text-xs"
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "audio/*,.mp3,.wav,.flac,.aac,.m4a";
                                input.onchange = (ev: Event) =>
                                  handleAlbumMetadataFileChange(
                                    ev as unknown as React.ChangeEvent<HTMLInputElement>,
                                    id
                                  );
                                input.click();
                              }}
                            >
                              Choisir un fichier audio
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1">
                              {uploading ? (
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                              ) : null}
                              <span className="max-w-[160px] truncate text-[11px] sm:max-w-xs sm:text-xs">
                                {file.name}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  setAlbumMetadataFiles((prev) => ({
                                    ...prev,
                                    [id]: null,
                                  }));
                                  setAlbumMetadataBuffers((prev) => ({
                                    ...prev,
                                    [id]: null,
                                  }));
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAlbumMetadataId(null);
                    setAlbumMetadataFiles({});
                    setAlbumMetadataBuffers({});
                    setAlbumMetadataUploading({});
                  }}
                  disabled={albumMetadataProcessing}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={processAlbumMetadata}
                  disabled={
                    albumMetadataProcessing ||
                    Object.values(albumMetadataUploading).some(Boolean) ||
                    !Object.values(albumMetadataFiles).some((f) => f)
                  }
                >
                  {albumMetadataProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Application…
                    </>
                  ) : (
                    "Appliquer et télécharger"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
