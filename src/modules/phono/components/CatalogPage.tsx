"use client";

import { useRef, useState } from "react";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useSidekickData } from "@/hooks/useSidekickData";
import type { Track } from "@/lib/sidekick-store";
import { isoToFr } from "@/lib/date-format";
import { normalizeTrack } from "@/modules/phono/lib/track";
import { normalizeAlbum } from "@/modules/phono/lib/album";
import { AlbumsTab } from "./albums/AlbumsTab";
import { MixesTab } from "./mixes/MixesTab";
import { CatalogHeader, type CatalogFilter } from "./CatalogHeader";
import { PhonoPlayerProvider } from "./audio/PhonoPlayerProvider";
import { AudioPlayerBar } from "./audio/AudioPlayerBar";
import { TracksTab } from "./tracks/TracksTab";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import JSZip from "jszip";
import { Loader2, X } from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";

/** Affiche une date stockée (ISO ou JJ/MM/AAAA) en JJ/MM/AAAA. */
function displayDate(value: string): string {
  if (!value) return "";
  if (value.includes("/")) return value;
  return isoToFr(value);
}

export function CatalogPage() {
  const { tracks: tracksRaw, setTracks, albums: albumsRaw, setAlbums, mixes, setMixes, loading, error } = usePhonoData();

  const { data } = useSidekickData();
  const [tab, setTab] = useState<"tracks" | "albums" | "mixes">("tracks");
  const [filter, setFilter] = useState<CatalogFilter>({ kind: "none" });

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
          onClick={() => setTab("mixes")}
          className={
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
            (tab === "mixes"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          Mixes
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

      {tab === "mixes" && <MixesTab mixes={mixes} setMixes={setMixes} />}
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
