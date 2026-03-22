"use client";

import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Facebook,
  FileDown,
  Eye,
  Instagram,
  Link2,
  Mail,
  Music2,
  Plus,
  Share2,
  X,
  Trash2
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_PRESSKIT_PROFILE,
  PRESSKIT_STORAGE_KEY,
  type PresskitProfile,
  type StreamingPlatformKey
} from "@/modules/marketing/data/presskit";
import { PresskitViewClient } from "../../../../app/presskit/view/PresskitViewClient";

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const STREAMING_PLATFORMS: Array<{ key: StreamingPlatformKey; label: string }> = [
  { key: "spotify", label: "Spotify" },
  { key: "deezer", label: "Deezer" },
  { key: "appleMusic", label: "Apple Music" },
  { key: "tidal", label: "Tidal" },
  { key: "qobuz", label: "Qobuz" },
  { key: "soundcloud", label: "SoundCloud" }
];

const EMPTY_STREAMING_LINKS: Record<StreamingPlatformKey, string> = {
  spotify: "",
  deezer: "",
  appleMusic: "",
  tidal: "",
  qobuz: "",
  soundcloud: ""
};

function buildWhatsAppLink(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits.replace(/^\+/, "")}`;
}


function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      resolve(value);
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function compressImageFile(
  file: File,
  options: { maxDimension: number; quality: number }
): Promise<string> {
  const { maxDimension, quality } = options;
  if (typeof window === "undefined") return "";

  // Keep a fast fallback if canvas APIs are unavailable.
  if (typeof document === "undefined" || !document.createElement) {
    return fileToDataUrl(file);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Image load failed"));
      i.src = objectUrl;
    });

    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return fileToDataUrl(file);

    const scale = Math.min(1, maxDimension / Math.max(w, h));
    const targetW = Math.max(1, Math.round(w * scale));
    const targetH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return fileToDataUrl(file);

    ctx.drawImage(img, 0, 0, targetW, targetH);
    // Convert to JPEG to significantly reduce payload size.
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return fileToDataUrl(file);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function PresskitPage() {
  const mainPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const artistLogoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const presskitPreviewRef = useRef<HTMLDivElement | null>(null);
  const [presskit, setPresskit] = useLocalStorage<PresskitProfile>(
    PRESSKIT_STORAGE_KEY,
    DEFAULT_PRESSKIT_PROFILE
  );
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [presskitShareUrl, setPresskitShareUrl] = useState<string | null>(null);
  const [artistLogoFileName, setArtistLogoFileName] = useState<string>("");
  const [mainPhotoFileName, setMainPhotoFileName] = useState<string>("");
  const [coverFileNames, setCoverFileNames] = useState<Record<string, string>>({});
  const lastAutoSyncModeRef = useRef<string | null>(null);
  const autoSyncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/presskit/my-slug", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { url?: string | null }) => {
        if (data?.url) setPresskitShareUrl(data.url);
      })
      .catch(() => {});
  }, []);

  // Auto-sync du payload quand on change le mode d'affichage (NOM vs LOGO)
  // pour que la page partagée soit à jour sans avoir à recoller le lien.
  useEffect(() => {
    if (!presskitShareUrl) return;

    const mode = presskit.artistDisplayMode ?? "name";
    if (lastAutoSyncModeRef.current === mode) return;

    if (autoSyncTimerRef.current) {
      window.clearTimeout(autoSyncTimerRef.current);
    }

    autoSyncTimerRef.current = window.setTimeout(async () => {
      try {
        await fetch("/api/presskit/shorten", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: presskit })
        });
        lastAutoSyncModeRef.current = mode;
      } catch {
        // Silencieux : la copie de lien reste l'option fiable.
      }
    }, 350);

    return () => {
      if (autoSyncTimerRef.current) window.clearTimeout(autoSyncTimerRef.current);
    };
  }, [presskit.artistDisplayMode, presskitShareUrl]);

  const handleCopyShareLink = async () => {
    const copyAndNotify = async (url: string) => {
      // Le navigateur peut refuser l'accès clipboard (permissions / contexte HTTPS).
      // On await pour bien capturer les erreurs.
      await navigator.clipboard.writeText(url);
      setShareMessage("Lien copié.");
      setTimeout(() => setShareMessage(null), 3000);
    };

    setShareMessage("Génération du lien...");
    try {
      const res = await fetch("/api/presskit/shorten", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: presskit })
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || res.statusText);
      const url = data.url;
      if (!url) throw new Error("Réponse invalide");
      setPresskitShareUrl(url);
      try {
        await copyAndNotify(url);
      } catch (e) {
        // Fallback très simple si l'API clipboard échoue.
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setShareMessage("Lien copié.");
        setTimeout(() => setShareMessage(null), 3000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Impossible de créer le lien. Réessaie.";
      setShareMessage(msg);
      setTimeout(() => setShareMessage(null), 5000);
    }
  };

  const handleDownloadPdf = async () => {
    const el = document.getElementById("presskit-preview");
    if (!el) return;

    try {
      const { jsPDF } = (await import("jspdf/dist/jspdf.umd.min.js")) as unknown as typeof import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pdfWidthMm = 210;
      const pdfHeightMm = 297;

      const rect = el.getBoundingClientRect();
      const widthPx = Math.max(1, rect.width);
      const heightPx = Math.max(1, rect.height);

      // Estimation mm générés si on rend avec width A4.
      const currentHeightMm = (heightPx * pdfWidthMm) / widthPx;
      const scaleFactor = Math.min(1, pdfHeightMm / currentHeightMm);

      // Scale temporaire pour tenir sur une page A4 (export visuel).
      // Note : doc.html + html2canvas produit une image ; les liens cliquables dans le PDF
      // ne sont pas fiables sans un moteur PDF dédié — les liens restent actifs sur la page web.
      const prevTransform = el.style.transform;
      const prevTransformOrigin = el.style.transformOrigin;
      const prevWidth = (el as HTMLElement).style.width;

      el.style.transform = `scale(${scaleFactor})`;
      el.style.transformOrigin = "top left";
      el.style.width = `${widthPx}px`;

      try {
        await doc.html(el, {
          callback: () => {
            doc.save("presskit.pdf");
            setShareMessage("PDF téléchargé.");
            setTimeout(() => setShareMessage(null), 3000);
          },
          x: 0,
          y: 0,
          width: pdfWidthMm,
          windowWidth: Math.round(widthPx * scaleFactor),
          margin: [0, 0, 0, 0],
          autoPaging: false,
          html2canvas: {
            useCORS: true,
            allowTaint: true,
            foreignObjectRendering: false
          }
        });
      } finally {
        el.style.transform = prevTransform;
        el.style.transformOrigin = prevTransformOrigin;
        el.style.width = prevWidth;
      }
    } catch {
      try {
        const { jsPDF } = (await import("jspdf/dist/jspdf.umd.min.js")) as unknown as typeof import("jspdf");
        const doc2 = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const rect2 = el.getBoundingClientRect();
        const widthPx2 = Math.max(1, rect2.width);

        await doc2.html(el, {
          x: 0,
          y: 0,
          width: 210,
          windowWidth: Math.round(widthPx2),
          margin: [0, 0, 0, 0],
          autoPaging: "text",
          html2canvas: {
            useCORS: true,
            allowTaint: true,
            foreignObjectRendering: false
          },
          callback: () => {
            doc2.save("presskit.pdf");
          }
        });
        setShareMessage("PDF téléchargé (secours).");
        setTimeout(() => setShareMessage(null), 3000);
      } catch {
        setShareMessage("Erreur lors du téléchargement du PDF.");
        setTimeout(() => setShareMessage(null), 3000);
      }
    }
  };

  const updateCover = (
    index: number,
    key: "title" | "imageUrl" | "imageFileName" | "link",
    value: string
  ) => {
    setPresskit((prev) => {
      const covers = [...prev.covers];
      const current = covers[index];
      if (!current) return prev;
      covers[index] = { ...current, [key]: value };
      return { ...prev, covers };
    });
  };

  const updateRealisation = (
    id: string,
    key: "title" | "description" | "link",
    value: string
  ) => {
    setPresskit((prev) => ({
      ...prev,
      latest: prev.latest.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
  };

  const addRealisation = () => {
    setPresskit((prev) => ({
      ...prev,
      latest: [
        ...prev.latest,
        { id: makeId(), title: "", description: "", link: "" }
      ]
    }));
  };

  const removeRealisation = (id: string) => {
    setPresskit((prev) => ({
      ...prev,
      latest:
        prev.latest.length > 1
          ? prev.latest.filter((item) => item.id !== id)
          : prev.latest
    }));
  };

  const resetPresskit = () => {
    setPresskit(DEFAULT_PRESSKIT_PROFILE);
    setArtistLogoFileName("");
    setMainPhotoFileName("");
    setCoverFileNames({});
  };

  const handleMainPhotoUpload = async (file: File | null) => {
    if (!file) return;
    setMainPhotoFileName(file.name);

    const value = await compressImageFile(file, { maxDimension: 1200, quality: 0.72 });
    if (!value) return;
    setPresskit((prev) => ({ ...prev, mainPhotoUrl: value, mainPhotoFileName: file.name }));
  };

  const handleArtistLogoUpload = async (file: File | null) => {
    if (!file) return;
    setArtistLogoFileName(file.name);

    const value = await compressImageFile(file, { maxDimension: 600, quality: 0.72 });
    if (!value) return;
    setPresskit((prev) => ({ ...prev, artistLogoUrl: value, artistLogoFileName: file.name }));
  };

  const handleCoverUpload = async (index: number, file: File | null) => {
    if (!file) return;
    const coverId = presskit.covers[index]?.id;
    if (coverId) {
      setCoverFileNames((prev) => ({ ...prev, [coverId]: file.name }));
    }

    const value = await compressImageFile(file, { maxDimension: 900, quality: 0.72 });
    if (!value) return;
    updateCover(index, "imageUrl", value);
    updateCover(index, "imageFileName", file.name);
  };

  const removeMainPhoto = () => {
    setPresskit((prev) => ({ ...prev, mainPhotoUrl: "", mainPhotoFileName: "" }));
    setMainPhotoFileName("");
  };

  const removeArtistLogo = () => {
    setPresskit((prev) => ({
      ...prev,
      artistLogoUrl: "",
      artistDisplayMode: "name",
      artistLogoFileName: ""
    }));
    setArtistLogoFileName("");
  };

  const removeCoverImage = (index: number) => {
    const coverId = presskit.covers[index]?.id;
    updateCover(index, "imageUrl", "");
    updateCover(index, "imageFileName", "");
    if (coverId) {
      setCoverFileNames((prev) => ({ ...prev, [coverId]: "" }));
    }
  };

  const generateStreamingLinks = async () => {
    const artistName = presskit.streamingArtistName?.trim() || "";
    if (!artistName) {
      setStreamingMessage("Renseigne d'abord le nom d'artiste.");
      return;
    }

    setPresskit((prev) => ({
      ...prev,
      streamingLinks: { ...EMPTY_STREAMING_LINKS }
    }));
    setStreamingMessage("Recherche du premier résultat en cours...");

    try {
      const res = await fetch(
        `/api/presskit/resolve-streaming-links?artist=${encodeURIComponent(artistName)}`,
        { method: "GET" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const payload = (await res.json()) as {
        links?: Record<StreamingPlatformKey, string>;
      };

      const hasResolvedLinks = Boolean(
        payload.links && Object.values(payload.links).some((value) => Boolean(value?.trim()))
      );
      const resolvedCount = payload.links
        ? Object.values(payload.links).filter((value) => Boolean(value?.trim())).length
        : 0;

      setPresskit((prev) => {
        const resolved = payload.links || ({} as Record<StreamingPlatformKey, string>);
        const nextLinks: Record<StreamingPlatformKey, string> = { ...EMPTY_STREAMING_LINKS };
        for (const platform of STREAMING_PLATFORMS) {
          nextLinks[platform.key] = resolved[platform.key]?.trim() || "";
        }
        return { ...prev, streamingLinks: nextLinks };
      });

      setStreamingMessage(
        hasResolvedLinks
          ? `${resolvedCount}/6 pages artistes trouvées et ajoutées. Tu peux les modifier.`
          : "Aucune page artiste exacte trouvée automatiquement."
      );
    } catch {
      setStreamingMessage("Impossible de récupérer les pages artistes pour le moment.");
    }
  };

  const updateStreamingLink = (key: StreamingPlatformKey, value: string) => {
    setPresskit((prev) => ({
      ...prev,
      streamingLinks: { ...prev.streamingLinks, [key]: value }
    }));
  };

  const addCustomStreamingLink = () => {
    setPresskit((prev) => ({
      ...prev,
      customStreamingLinks: [
        ...(prev.customStreamingLinks || []),
        { id: makeId(), label: "", url: "" }
      ]
    }));
  };

  const updateCustomStreamingLink = (id: string, key: "label" | "url", value: string) => {
    setPresskit((prev) => ({
      ...prev,
      customStreamingLinks: (prev.customStreamingLinks || []).map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
  };

  const removeCustomStreamingLink = (id: string) => {
    setPresskit((prev) => ({
      ...prev,
      customStreamingLinks: (prev.customStreamingLinks || []).filter((item) => item.id !== id)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Presskit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crée ta page promo personnalisée pour candidatures et promos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {shareMessage && (
            <span className="text-xs text-muted-foreground">{shareMessage}</span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="default">
                <Share2 className="mr-2 h-4 w-4" />
                Partager
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadPdf}>
                <FileDown className="mr-2 h-4 w-4" />
                Télécharger l&apos;aperçu en PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyShareLink}>
                <Link2 className="mr-2 h-4 w-4" />
                Copier le lien de la page presskit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="outline" onClick={resetPresskit}>
            Réinitialiser
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Édition du presskit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="artist-title">Nom d&apos;artiste</Label>
              <Input
                id="artist-title"
                value={presskit.artistTitle}
                onChange={(e) =>
                  setPresskit((prev) => ({ ...prev, artistTitle: e.target.value }))
                }
                placeholder="Ex: SANDRA LEE"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="artist-hook">Phrase d&apos;accroche</Label>
              <Input
                id="artist-hook"
                value={presskit.hook}
                onChange={(e) =>
                  setPresskit((prev) => ({ ...prev, hook: e.target.value }))
                }
                placeholder="Ex: Pop urbaine, mélodies percutantes"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="artist-logo">Logo artiste</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="artist-logo"
                  className="flex-1"
                  value={
                    artistLogoFileName || presskit.artistLogoFileName
                      ? artistLogoFileName || presskit.artistLogoFileName || ""
                      : presskit.artistLogoUrl?.startsWith("data:")
                        ? "Fichier importé"
                        : presskit.artistLogoUrl
                          ? presskit.artistLogoUrl
                          : ""
                  }
                  readOnly={
                    Boolean(
                      artistLogoFileName ||
                        presskit.artistLogoFileName ||
                        presskit.artistLogoUrl?.startsWith("data:")
                    )
                  }
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    if (
                      artistLogoFileName ||
                      presskit.artistLogoFileName ||
                      presskit.artistLogoUrl?.startsWith("data:")
                    )
                      return;
                    setPresskit((prev) => ({
                      ...prev,
                      artistLogoUrl: nextValue,
                      artistLogoFileName: ""
                    }));
                    setArtistLogoFileName("");
                  }}
                  placeholder="Colle le lien du logo (URL) ou importe un fichier"
                />
                {presskit.artistLogoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeArtistLogo}
                    title="Supprimer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <input
                  ref={artistLogoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleArtistLogoUpload(e.target.files?.[0] ?? null);
                    e.currentTarget.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => artistLogoInputRef.current?.click()}
                >
                  Importer
                </Button>
              </div>

              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPresskit((prev) => {
                      const current = prev.artistDisplayMode ?? "name";
                      const hasLogo = Boolean(prev.artistLogoUrl);

                      // Cycle: Nom -> Nom+Logo -> Logo -> Nom
                      let next: "name" | "logo" | "both" = current as "name" | "logo" | "both";
                      if (current === "name") next = hasLogo ? "both" : "name";
                      else if (current === "both") next = hasLogo ? "logo" : "name";
                      else if (current === "logo") next = "name";

                      if ((next === "logo" || next === "both") && !hasLogo) return prev;
                      return { ...prev, artistDisplayMode: next };
                    });
                  }}
                  disabled={
                    (presskit.artistDisplayMode ?? "name") === "name" && !presskit.artistLogoUrl
                  }
                  className="gap-2"
                >
                  <Eye
                    className={`h-4 w-4 ${
                      (presskit.artistDisplayMode ?? "name") === "name"
                        ? "opacity-60"
                        : "text-primary"
                    }`}
                  />
                  {(() => {
                    const mode = presskit.artistDisplayMode ?? "name";
                    if (mode === "name") return "Afficher : Nom";
                    if (mode === "both") return "Afficher : Nom + logo";
                    return "Afficher : Logo";
                  })()}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="main-photo">Photo principale</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="main-photo"
                  className="flex-1"
                  value={
                    mainPhotoFileName || presskit.mainPhotoFileName
                      ? mainPhotoFileName || presskit.mainPhotoFileName || ""
                      : presskit.mainPhotoUrl?.startsWith("data:")
                        ? "Fichier importé"
                        : presskit.mainPhotoUrl
                  }
                  readOnly={
                    Boolean(mainPhotoFileName || presskit.mainPhotoFileName) ||
                    presskit.mainPhotoUrl?.startsWith("data:")
                  }
                  onChange={(e) => {
                    const isImported =
                      Boolean(mainPhotoFileName || presskit.mainPhotoFileName) ||
                      presskit.mainPhotoUrl?.startsWith("data:");
                    if (isImported) return;
                    const nextValue = e.target.value;
                    setMainPhotoFileName("");
                    setPresskit((prev) => ({
                      ...prev,
                      mainPhotoUrl: nextValue,
                      mainPhotoFileName: ""
                    }));
                  }}
                  placeholder="Colle le lien de l'image (URL) ou importe un fichier"
                />
                {presskit.mainPhotoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeMainPhoto}
                    title="Supprimer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <input
                  ref={mainPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleMainPhotoUpload(e.target.files?.[0] ?? null);
                    e.currentTarget.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => mainPhotoInputRef.current?.click()}
                >
                  Importer
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="artist-bio">Bio</Label>
              <Textarea
                id="artist-bio"
                value={presskit.bio}
                onChange={(e) =>
                  setPresskit((prev) => ({ ...prev, bio: e.target.value }))
                }
                placeholder="Ta bio artiste..."
                rows={5}
              />
            </div>

            <div className="space-y-3">
              <Label>Réseaux sociaux</Label>
              <div className="grid gap-2">
                <Input
                  value={presskit.socials.instagram}
                  onChange={(e) =>
                    setPresskit((prev) => ({
                      ...prev,
                      socials: { ...prev.socials, instagram: e.target.value }
                    }))
                  }
                  placeholder="Lien Instagram"
                />
                <Input
                  value={presskit.socials.facebook}
                  onChange={(e) =>
                    setPresskit((prev) => ({
                      ...prev,
                      socials: { ...prev.socials, facebook: e.target.value }
                    }))
                  }
                  placeholder="Lien Facebook"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Liens d&apos;écoute (plateformes streaming)</Label>
                <Button type="button" variant="outline" size="sm" onClick={generateStreamingLinks}>
                  Générer automatiquement
                </Button>
              </div>
              <div className="space-y-2">
                <Input
                  value={presskit.streamingArtistName || ""}
                  onChange={(e) =>
                    setPresskit((prev) => ({ ...prev, streamingArtistName: e.target.value }))
                  }
                  placeholder="Nom d'artiste affiché sur les plateformes"
                />
                {streamingMessage && (
                  <p className="text-xs text-muted-foreground">{streamingMessage}</p>
                )}
              </div>

              <div className="grid gap-2">
                {STREAMING_PLATFORMS.map((platform) => (
                  <div key={platform.key} className="grid grid-cols-[110px_1fr_auto] items-center gap-2">
                    <span className="text-sm text-muted-foreground">{platform.label}</span>
                    <Input
                      value={presskit.streamingLinks?.[platform.key] || ""}
                      onChange={(e) => updateStreamingLink(platform.key, e.target.value)}
                      placeholder={`Lien ${platform.label}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const url = presskit.streamingLinks?.[platform.key] || "";
                        if (!url) return;
                        window.open(url, "_blank", "noopener,noreferrer");
                      }}
                      title="Ouvrir le lien"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Liens personnalisés</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addCustomStreamingLink}>
                    <Plus className="mr-1 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
                <div className="space-y-2">
                  {(presskit.customStreamingLinks || []).map((item) => (
                    <div key={item.id} className="rounded-md border p-2">
                      <div className="mb-2 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeCustomStreamingLink(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        <Input
                          value={item.label}
                          onChange={(e) => updateCustomStreamingLink(item.id, "label", e.target.value)}
                          placeholder="Nom du lien"
                        />
                        <Input
                          value={item.url}
                          onChange={(e) => updateCustomStreamingLink(item.id, "url", e.target.value)}
                          placeholder="URL du lien"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>3 covers (titre + lien)</Label>
              {presskit.covers.slice(0, 3).map((cover, index) => {
                const coverId = cover.id;
                const fileName = coverFileNames[coverId] || cover.imageFileName || "";
                const coverIsDataUrl = Boolean(
                  cover.imageUrl && cover.imageUrl.startsWith("data:")
                );
                const coverDisplay = fileName
                  ? fileName
                  : coverIsDataUrl
                    ? "Fichier importé"
                    : cover.imageUrl;
                const isFileImported = Boolean(fileName || coverIsDataUrl);

                return (
                  <div key={cover.id} className="rounded-md border p-3">
                    <p className="mb-2 text-xs text-muted-foreground">Case {index + 1}</p>
                    <div className="space-y-2">
                      <Input
                        value={cover.title}
                        onChange={(e) => updateCover(index, "title", e.target.value)}
                        placeholder="Titre"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          className="flex-1"
                          value={coverDisplay}
                          readOnly={isFileImported}
                          onChange={(e) => {
                            if (isFileImported) return;
                            updateCover(index, "imageUrl", e.target.value);
                            updateCover(index, "imageFileName", "");
                            setCoverFileNames((prev) => ({ ...prev, [coverId]: "" }));
                          }}
                          placeholder="URL de cover (ou importer)"
                        />
                        {cover.imageUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCoverImage(index)}
                            title="Supprimer"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <input
                        ref={(el) => {
                          coverInputRefs.current[index] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleCoverUpload(index, e.target.files?.[0] ?? null);
                          e.currentTarget.value = "";
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => coverInputRefs.current[index]?.click()}
                        >
                          Importer
                        </Button>
                      </div>
                      <Input
                        value={cover.link}
                        onChange={(e) => updateCover(index, "link", e.target.value)}
                        placeholder="Lien vers la réalisation"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Section dernières réalisations</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRealisation}>
                  <Plus className="mr-1 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
              <div className="space-y-3">
                {presskit.latest.map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeRealisation(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={item.title}
                        onChange={(e) =>
                          updateRealisation(item.id, "title", e.target.value)
                        }
                        placeholder="Titre de la réalisation"
                      />
                      <Input
                        value={item.link}
                        onChange={(e) =>
                          updateRealisation(item.id, "link", e.target.value)
                        }
                        placeholder="Lien"
                      />
                      <Textarea
                        value={item.description}
                        onChange={(e) =>
                          updateRealisation(item.id, "description", e.target.value)
                        }
                        placeholder="Description"
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <Label>Contact</Label>
              <div className="grid gap-2">
                <Input
                  value={presskit.contact?.email || ""}
                  onChange={(e) =>
                    setPresskit((prev) => ({
                      ...prev,
                      contact: { ...(prev.contact || { email: "", whatsapp: "" }), email: e.target.value }
                    }))
                  }
                  placeholder="Adresse e-mail"
                />
                <Input
                  value={presskit.contact?.whatsapp || ""}
                  onChange={(e) =>
                    setPresskit((prev) => ({
                      ...prev,
                      contact: {
                        ...(prev.contact || { email: "", whatsapp: "" }),
                        whatsapp: e.target.value
                      }
                    }))
                  }
                  placeholder="Numéro WhatsApp ou lien (ex: +336...)"
                />
              </div>
              <p className="text-xs text-amber-700">
                Fais attention à qui tu envoies ces informations sensibles !
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aperçu de la page presskit</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              id="presskit-preview"
              ref={presskitPreviewRef}
          className="p-0 m-0 bg-background"
        >
          <PresskitViewClient payloadDirect={presskit} />
        </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

