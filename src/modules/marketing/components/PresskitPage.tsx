"use client";

import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Facebook,
  FileDown,
  Instagram,
  Link2,
  Mail,
  MessageCircle,
  Music2,
  Plus,
  Share2,
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

export function PresskitPage() {
  const mainPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const presskitPreviewRef = useRef<HTMLDivElement | null>(null);
  const [presskit, setPresskit] = useLocalStorage<PresskitProfile>(
    PRESSKIT_STORAGE_KEY,
    DEFAULT_PRESSKIT_PROFILE
  );
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [presskitShareUrl, setPresskitShareUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/presskit/my-slug", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { url?: string | null }) => {
        if (data?.url) setPresskitShareUrl(data.url);
      })
      .catch(() => {});
  }, []);

  const handleCopyShareLink = async () => {
    const copyAndNotify = (url: string) => {
      navigator.clipboard.writeText(url);
      setShareMessage("Lien copié.");
      setTimeout(() => setShareMessage(null), 3000);
    };

    if (presskitShareUrl) {
      copyAndNotify(presskitShareUrl);
      fetch("/api/presskit/shorten", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: presskit })
      })
        .then((res) => res.json())
        .then((data: { url?: string }) => {
          if (data?.url) setPresskitShareUrl(data.url);
        })
        .catch(() => {});
      return;
    }

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
      copyAndNotify(url);
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
      const { jsPDF } = require("jspdf") as typeof import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      await doc.html(el, {
        callback: () => doc.save("presskit.pdf"),
        x: 10,
        y: 10,
        width: 190,
        windowWidth: 800
      });
      setShareMessage("PDF téléchargé.");
      setTimeout(() => setShareMessage(null), 3000);
    } catch {
      setShareMessage("Erreur lors du téléchargement du PDF.");
      setTimeout(() => setShareMessage(null), 3000);
    }
  };

  const updateCover = (
    index: number,
    key: "title" | "imageUrl" | "link",
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

  const resetPresskit = () => setPresskit(DEFAULT_PRESSKIT_PROFILE);

  const handleMainPhotoUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (!value) return;
      setPresskit((prev) => ({ ...prev, mainPhotoUrl: value }));
    };
    reader.readAsDataURL(file);
  };

  const handleCoverUpload = (index: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (!value) return;
      updateCover(index, "imageUrl", value);
    };
    reader.readAsDataURL(file);
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
              <Label htmlFor="artist-title">Titre de l&apos;artiste</Label>
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
              <Label htmlFor="main-photo">Photo principale</Label>
              <div className="flex gap-2">
                <Input
                  id="main-photo"
                  value={presskit.mainPhotoUrl}
                  onChange={(e) =>
                    setPresskit((prev) => ({ ...prev, mainPhotoUrl: e.target.value }))
                  }
                  placeholder="https://... ou importer depuis l'ordinateur"
                />
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
              {presskit.covers.slice(0, 3).map((cover, index) => (
                <div key={cover.id} className="rounded-md border p-3">
                  <p className="mb-2 text-xs text-muted-foreground">Case {index + 1}</p>
                  <div className="space-y-2">
                    <Input
                      value={cover.title}
                      onChange={(e) => updateCover(index, "title", e.target.value)}
                      placeholder="Titre"
                    />
                    <Input
                      value={cover.imageUrl}
                      onChange={(e) => updateCover(index, "imageUrl", e.target.value)}
                      placeholder="URL de cover"
                    />
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => coverInputRefs.current[index]?.click()}
                    >
                      Importer
                    </Button>
                    <Input
                      value={cover.link}
                      onChange={(e) => updateCover(index, "link", e.target.value)}
                      placeholder="Lien vers la réalisation"
                    />
                  </div>
                </div>
              ))}
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
              className="flex flex-col gap-8 rounded-lg border bg-card p-5"
            >
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {presskit.artistTitle || "Titre de l'artiste"}
                </h2>
                <p className="text-lg text-muted-foreground">
                  {presskit.hook || "Phrase d'accroche..."}
                </p>
              </div>

              <div className="overflow-hidden rounded-lg border">
                {presskit.mainPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={presskit.mainPhotoUrl}
                    alt="Photo principale"
                    className="h-64 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center bg-muted text-sm text-muted-foreground">
                    Photo principale
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Bio</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {presskit.bio || "La bio apparaîtra ici..."}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Réseaux sociaux</h3>
                <div className="flex flex-wrap gap-2">
                  {presskit.socials.instagram && (
                    <a
                      href={presskit.socials.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </a>
                  )}
                  {presskit.socials.facebook && (
                    <a
                      href={presskit.socials.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      <Facebook className="h-4 w-4" />
                      Facebook
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Liens d&apos;écoute</h3>
                <div className="flex flex-wrap gap-2">
                  {STREAMING_PLATFORMS.map((platform) => {
                    const url = presskit.streamingLinks?.[platform.key];
                    if (!url) return null;
                    return (
                      <a
                        key={platform.key}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                      >
                        <Music2 className="h-4 w-4" />
                        {platform.label}
                      </a>
                    );
                  })}
                  {(presskit.customStreamingLinks || []).map((item) => {
                    if (!item.url) return null;
                    return (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {item.label || "Lien"}
                      </a>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium">Dernières sorties</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {presskit.covers.slice(0, 3).map((cover) => (
                    <a
                      key={cover.id}
                      href={cover.link || "#"}
                      target={cover.link ? "_blank" : undefined}
                      rel={cover.link ? "noreferrer" : undefined}
                      className="group overflow-hidden rounded-md border"
                    >
                      <div className="aspect-square bg-muted">
                        {cover.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover.imageUrl}
                            alt={cover.title || "Cover"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            Cover
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t px-2 py-2">
                        <span className="truncate text-xs font-medium">
                          {cover.title || "Titre"}
                        </span>
                        {cover.link && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium">Dernières réalisations</h3>
                <div className="space-y-2">
                  {presskit.latest.map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="font-medium">{item.title || "Réalisation"}</p>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Ouvrir
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Contact</h3>
                <div className="flex flex-wrap gap-3">
                  {presskit.contact?.email && (
                    <a
                      href={`mailto:${presskit.contact.email}`}
                      className="inline-flex h-14 w-14 items-center justify-center rounded-full border hover:bg-muted/50"
                      title="Contacter par email"
                    >
                      <Mail className="h-6 w-6" />
                    </a>
                  )}
                  {presskit.contact?.whatsapp && buildWhatsAppLink(presskit.contact.whatsapp) && (
                    <a
                      href={buildWhatsAppLink(presskit.contact.whatsapp)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-14 w-14 items-center justify-center rounded-full border hover:bg-muted/50"
                      title="Contacter sur WhatsApp"
                    >
                      <MessageCircle className="h-6 w-6" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

