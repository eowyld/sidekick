"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import type { Album } from "@/lib/sidekick-store";
import { cn } from "@/lib/utils";

/** Les trois champs qu'un album peut faire hériter au titre. */
type SharedField = "label" | "editor" | "distribution";

const FIELD_LABELS: Record<SharedField, string> = {
  label: "Label",
  editor: "Éditeur",
  distribution: "Distribution",
};

const SHARED_FIELDS: SharedField[] = ["label", "editor", "distribution"];

type Resolution = "single" | "album" | "both";

interface TrackAlbumFieldProps {
  albums: Album[];
  /** `null` = aucun album/EP rattaché. */
  value: string | null;
  /** Valeurs actuelles du titre pour les trois champs partagés. */
  trackFields: Record<SharedField, string>;
  /**
   * Appelé une fois la liaison décidée : `albumId` à retenir, et le patch à
   * appliquer aux champs partagés (vide si rien ne change).
   */
  onChange: (albumId: string | null, patch: Partial<Record<SharedField, string>>) => void;
  /** Crée l'album dans le catalogue et le renvoie, pour le sélectionner aussitôt. */
  onCreateAlbum: (title: string) => Album;
}

const NONE_VALUE = "__none__";
const CREATE_VALUE = "__create__";

/**
 * Rattache le titre à un album/EP existant, ou en crée un nouveau à la volée.
 *
 * Le rattachement peut faire hériter label, éditeur et distribution de
 * l'album : un champ vide côté titre se remplit en silence, un champ rempli
 * des deux côtés mais différent déclenche une résolution explicite — jamais
 * d'écrasement muet d'une saisie déjà faite.
 */
export function TrackAlbumField({
  albums,
  value,
  trackFields,
  onChange,
  onCreateAlbum,
}: TrackAlbumFieldProps) {
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [pendingAlbum, setPendingAlbum] = useState<Album | null>(null);
  const [resolutions, setResolutions] = useState<Record<SharedField, Resolution>>({
    label: "single",
    editor: "single",
    distribution: "single",
  });

  const current = value ? albums.find((a) => a.id === value) ?? null : null;

  function applyAlbum(album: Album) {
    const conflicts = SHARED_FIELDS.filter((f) => {
      const trackVal = trackFields[f].trim();
      const albumVal = (album[f] ?? "").trim();
      return trackVal !== "" && albumVal !== "" && trackVal !== albumVal;
    });

    if (conflicts.length === 0) {
      // Rien à trancher : un champ vide côté titre hérite en silence de
      // l'album, un champ déjà rempli ne bouge pas.
      const patch: Partial<Record<SharedField, string>> = {};
      for (const f of SHARED_FIELDS) {
        const albumVal = (album[f] ?? "").trim();
        if (trackFields[f].trim() === "" && albumVal !== "") patch[f] = albumVal;
      }
      onChange(album.id, patch);
      return;
    }

    setResolutions({
      label: "single",
      editor: "single",
      distribution: "single",
    });
    setPendingAlbum(album);
  }

  function confirmResolution() {
    if (!pendingAlbum) return;
    const patch: Partial<Record<SharedField, string>> = {};
    for (const f of SHARED_FIELDS) {
      const trackVal = trackFields[f].trim();
      const albumVal = (pendingAlbum[f] ?? "").trim();
      if (trackVal === "" && albumVal !== "") {
        patch[f] = albumVal;
        continue;
      }
      switch (resolutions[f]) {
        case "album":
          patch[f] = albumVal;
          break;
        case "both":
          if (trackVal && albumVal) patch[f] = `${trackVal} / ${albumVal}`;
          break;
        case "single":
        default:
          break;
      }
    }
    onChange(pendingAlbum.id, patch);
    setPendingAlbum(null);
  }

  function handleSelect(v: string) {
    if (v === CREATE_VALUE) {
      setCreating(true);
      return;
    }
    if (v === NONE_VALUE) {
      onChange(null, {});
      return;
    }
    const album = albums.find((a) => a.id === v);
    if (album) applyAlbum(album);
  }

  function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    const album = onCreateAlbum(title);
    setCreating(false);
    setNewTitle("");
    // Un album qui vient de naître n'a ni label, ni éditeur, ni distribution :
    // rien à hériter, jamais de conflit possible.
    onChange(album.id, {});
  }

  const conflicts = pendingAlbum
    ? SHARED_FIELDS.filter((f) => {
        const trackVal = trackFields[f].trim();
        const albumVal = (pendingAlbum[f] ?? "").trim();
        return trackVal !== "" && albumVal !== "" && trackVal !== albumVal;
      })
    : [];

  return (
    <div className="space-y-2">
      <Label htmlFor="track-album">Album ou EP</Label>
      {creating ? (
        <div className="flex items-center gap-2">
          <Input
            id="track-album"
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Titre de l'album ou de l'EP"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
              if (e.key === "Escape") {
                setCreating(false);
                setNewTitle("");
              }
            }}
          />
          <Button type="button" size="sm" onClick={handleCreate} disabled={!newTitle.trim()}>
            Créer
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setCreating(false);
              setNewTitle("");
            }}
          >
            Annuler
          </Button>
        </div>
      ) : (
        <Select value={value ?? NONE_VALUE} onValueChange={handleSelect}>
          <SelectTrigger id="track-album">
            <SelectValue placeholder="Aucun album ni EP" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Aucun album ni EP</SelectItem>
            {albums.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.title || "Sans titre"}
              </SelectItem>
            ))}
            <SelectItem value={CREATE_VALUE}>
              <span className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Nouvel album ou EP
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      )}

      {current && (
        <p className="text-xs text-[#F5F5F5]/45">
          Ce titre fait partie de « {current.title || "Sans titre"} ».
        </p>
      )}

      <Dialog
        open={pendingAlbum !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAlbum(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Le titre et l&apos;album ne disent pas la même chose</DialogTitle>
            <DialogDescription className="text-sm text-[#F5F5F5]/70">
              « {pendingAlbum?.title || "Sans titre"} » a déjà ses propres
              valeurs pour {conflicts.length > 1 ? "ces champs" : "ce champ"}.
              Choisis laquelle garder, ou combine les deux.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {conflicts.map((f) => (
              <div key={f} className="space-y-2">
                <p className="text-xs font-medium text-[#F5F5F5]/80">
                  {FIELD_LABELS[f]}
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setResolutions((r) => ({ ...r, [f]: "single" }))}
                    className={cn(
                      "rounded-md border px-2 py-2 text-left transition-colors",
                      resolutions[f] === "single"
                        ? "border-[#F0FF00]/50 bg-[#F0FF00]/10 text-[#F5F5F5]"
                        : "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/60 hover:bg-[rgba(245,245,245,0.04)]"
                    )}
                  >
                    <span className="block text-[10px] uppercase tracking-wide text-[#F5F5F5]/40">
                      Celui du titre
                    </span>
                    {trackFields[f].trim() || "(vide)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutions((r) => ({ ...r, [f]: "album" }))}
                    className={cn(
                      "rounded-md border px-2 py-2 text-left transition-colors",
                      resolutions[f] === "album"
                        ? "border-[#F0FF00]/50 bg-[#F0FF00]/10 text-[#F5F5F5]"
                        : "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/60 hover:bg-[rgba(245,245,245,0.04)]"
                    )}
                  >
                    <span className="block text-[10px] uppercase tracking-wide text-[#F5F5F5]/40">
                      Celui de l&apos;album
                    </span>
                    {(pendingAlbum?.[f] as string | undefined)?.trim() || "(vide)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutions((r) => ({ ...r, [f]: "both" }))}
                    className={cn(
                      "rounded-md border px-2 py-2 text-left transition-colors",
                      resolutions[f] === "both"
                        ? "border-[#F0FF00]/50 bg-[#F0FF00]/10 text-[#F5F5F5]"
                        : "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/60 hover:bg-[rgba(245,245,245,0.04)]"
                    )}
                  >
                    <span className="block text-[10px] uppercase tracking-wide text-[#F5F5F5]/40">
                      Les deux
                    </span>
                    {trackFields[f].trim()} / {(pendingAlbum?.[f] as string | undefined)?.trim()}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPendingAlbum(null)}>
              Annuler
            </Button>
            <Button type="button" onClick={confirmResolution}>
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
