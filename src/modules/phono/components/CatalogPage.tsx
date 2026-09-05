"use client";

import { useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useSidekickData } from "@/hooks/useSidekickData";
import type {
  Track,
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
import { normalizeTrack } from "@/modules/phono/lib/track";
import { normalizeAlbum } from "@/modules/phono/lib/album";
import { AlbumsTab } from "./albums/AlbumsTab";
import { CatalogHeader, type CatalogFilter } from "./CatalogHeader";
import { PhonoPlayerProvider } from "./audio/PhonoPlayerProvider";
import { AudioPlayerBar } from "./audio/AudioPlayerBar";
import { TracksTab } from "./tracks/TracksTab";
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
import { Copy, ImagePlus, Loader2, Pencil, Plus, Share2, Trash2, X, Mic } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { mutate } from "swr";

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

const RELEASE_STATUSES: { value: ReleaseStatus; label: string }[] = [
  { value: "en_production", label: "En production" },
  { value: "mixe", label: "Mixé" },
  { value: "masterise", label: "Mastérisé" },
  { value: "publie", label: "Publié" },
];

function releaseStatusLabel(s: ReleaseStatus): string {
  return RELEASE_STATUSES.find((r) => r.value === s)?.label ?? s;
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
  const { tracks: tracksRaw, setTracks, albums: albumsRaw, setAlbums, podcasts: podcastsRaw, setPodcasts, loading, error } = usePhonoData();
  const posthog = usePostHog();

  const { data } = useSidekickData();
  const [tab, setTab] = useState<"tracks" | "albums" | "podcasts">("tracks");
  const [filter, setFilter] = useState<CatalogFilter>({ kind: "none" });
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

  if (loading) return <PageLoader />;
  if (error) return (
    <PageError
      title="Impossible de charger ton catalogue"
      description="Vérifie ta connexion ou réessaie dans quelques instants."
      onRetry={() => mutate("user_phono")}
    />
  );

  const tracks = tracksRaw.map(normalizeTrack);
  const albums = albumsRaw
    .map(normalizeAlbum)
    .sort((a, b) => {
      const order = { album: 0, ep: 1, single: 2 };
      return (order[a.type] ?? 2) - (order[b.type] ?? 2);
    });
  const podcasts = podcastsRaw.map(normalizePodcast);

  const isPodcastDraftComplete =
    String(podcastDraft.title ?? "").trim() !== "" &&
    isValidDateFr(String(podcastDraft.releaseDate ?? ""));

  const addPodcastFromDraft = () => {
    if (!isPodcastDraftComplete) return;
    posthog?.capture("podcast_created", { module: "phono" });
    posthog?.capture("item_created", { module: "phono" });
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
    <PhonoPlayerProvider>
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Catalogue
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Gestion de ton catalogue phono : titres, albums, releases.
      </p>

      <div className="mb-6">
        <CatalogHeader
          tracks={tracks}
          albums={albums}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>

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
        <TracksTab
          tracks={tracks}
          setTracks={setTracks}
          filter={filter}
          onFilterChange={setFilter}
          projects={data.projects?.projects ?? []}
          onExportMetadata={(trackId) => {
            setMetadataTrackId(trackId);
            setMetadataFile(null);
          }}
        />
      )}

      {tab === "albums" && (
        <AlbumsTab
          albums={albums}
          tracks={tracks}
          setAlbums={setAlbums}
          setTracks={setTracks}
          onExportMetadata={(albumId) => {
            setAlbumMetadataId(albumId);
            setAlbumMetadataFiles({});
            setAlbumMetadataBuffers({});
            setAlbumMetadataUploading({});
          }}
        />
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
              <EmptyState
                icon={Mic}
                title="Aucun podcast"
                description="DJ sets, mixes, émissions : référence ici les podcasts dans lesquels tu apparais ou que tu produis."
                action={{ label: "Ajouter un podcast", onClick: () => setNewPodcastDialogOpen(true) }}
              />
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
                            // Compat temporaire : isLive est remplacé par `format` en phase 3 du chantier.
                            checked={Boolean(podcast.isLive)}
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    disabled
                                    className="opacity-40 cursor-not-allowed"
                                  >
                                    <Share2 className="mr-1.5 h-3.5 w-3.5" />
                                    Distribuer
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>À venir</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                            {/* Compat temporaire : isLive est remplacé par `format` en phase 3 du chantier. */}
                            {[podcast.isVideo && "Vidéo", Boolean(podcast.isLive) && "En direct"]
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

      <AudioPlayerBar />
    </div>
    </PhonoPlayerProvider>
  );
}
