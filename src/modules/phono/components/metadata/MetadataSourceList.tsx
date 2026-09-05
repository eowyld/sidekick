"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/modules/phono/lib/audio-limits";
import type { ExportItem } from "@/modules/phono/lib/metadata-export";

const MUTED = "rgba(245,245,245,0.7)";
const FAINT = "rgba(245,245,245,0.4)";
const LINE = "rgba(245,245,245,0.12)";

interface MetadataSourceListProps {
  items: ExportItem[];
  overrides: Record<string, File>;
  /** Nombre d'éléments exclus faute de fichier. */
  skipped: number;
  /** Nombre d'éléments effectivement inclus dans l'export. */
  includedCount: number;
  /** Remonte le fichier choisi (ou `null` pour le retirer) pour la clé donnée. */
  onSetOverride: (key: string, file: File | null) => void;
}

/** Bouton ouvrant un sélecteur de fichier ponctuel. */
function FilePickButton({
  onPick,
  label,
}: {
  onPick: (file: File) => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/*,.mp3,.wav,.flac,.aac,.m4a,.ogg";
        input.onchange = () => {
          const f = input.files?.[0];
          if (f) onPick(f);
        };
        input.click();
      }}
    >
      {label}
    </Button>
  );
}

export function MetadataSourceList({
  items,
  overrides,
  skipped,
  includedCount,
  onSetOverride,
}: MetadataSourceListProps) {
  return (
    <div className="space-y-2">
      <p
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: MUTED }}
      >
        Fichiers source
      </p>
      {items.map((it) => {
        const ov = overrides[it.key];
        const name = it.version?.label
          ? `${it.track.title || "Titre"} — ${it.version.label}`
          : it.track.title || "Titre";
        return (
          <div
            key={it.key}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: LINE }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 flex-1 truncate">
                {it.trackNumber ? (
                  <span style={{ color: FAINT }}>
                    {String(it.trackNumber).padStart(2, "0")} ·{" "}
                  </span>
                ) : null}
                {name}
              </span>
              {ov ? (
                <span className="flex shrink-0 items-center gap-1">
                  <span
                    className="max-w-[180px] truncate text-xs"
                    style={{ color: MUTED }}
                  >
                    {ov.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label="Retirer le fichier"
                    onClick={() => onSetOverride(it.key, null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </span>
              ) : it.hosted ? (
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  <span style={{ color: "#F0FF00" }}>✓</span>
                  <span
                    className="max-w-[150px] truncate"
                    style={{ color: MUTED }}
                  >
                    {it.hosted.name}
                  </span>
                  {it.hosted.size ? (
                    <span style={{ color: FAINT }}>
                      · {formatBytes(it.hosted.size)}
                    </span>
                  ) : null}
                  <FilePickButton
                    label="Utiliser un autre fichier"
                    onPick={(f) => onSetOverride(it.key, f)}
                  />
                </span>
              ) : (
                <FilePickButton
                  label="Choisir un fichier"
                  onPick={(f) => onSetOverride(it.key, f)}
                />
              )}
            </div>
            {!ov && !it.hosted ? (
              <p className="mt-1 text-xs" style={{ color: FAINT }}>
                ignoré, aucun fichier
              </p>
            ) : null}
          </div>
        );
      })}
      {skipped > 0 && (
        <p className="text-xs" style={{ color: FAINT }}>
          {skipped} élément{skipped > 1 ? "s" : ""} ignoré
          {skipped > 1 ? "s" : ""}, sans fichier — l&apos;export porte sur
          les {includedCount} restant{includedCount > 1 ? "s" : ""}.
        </p>
      )}
    </div>
  );
}
