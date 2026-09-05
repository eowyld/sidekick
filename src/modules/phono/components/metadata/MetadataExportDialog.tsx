"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Album, Track } from "@/lib/sidekick-store";
import {
  METADATA_FIELD_LABELS,
  safeFileName,
  type MetadataPayload,
} from "@/modules/phono/lib/metadata-payload";
import {
  buildItems,
  downloadBlob,
  extOf,
  type ExportItem,
  type MetadataExportTarget,
} from "@/modules/phono/lib/metadata-export";
import { MetadataSourceList } from "./MetadataSourceList";

export type { MetadataExportTarget } from "@/modules/phono/lib/metadata-export";

interface MetadataExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: MetadataExportTarget | null;
  tracks: Track[];
  albums: Album[];
}

const MUTED = "rgba(245,245,245,0.7)";
const LINE = "rgba(245,245,245,0.12)";

export function MetadataExportDialog({
  open,
  onOpenChange,
  target,
  tracks,
  albums,
}: MetadataExportDialogProps) {
  const { items, scope, release } = useMemo(
    () =>
      target
        ? buildItems(target, tracks, albums)
        : { items: [] as ExportItem[], scope: "", release: undefined },
    [target, tracks, albums]
  );

  // Réinitialisation en cours de rendu (pattern React « ajuster l'état pendant
  // le rendu ») : `react-hooks/set-state-in-effect` interdit useEffect(setState).
  const sessionKey = open && target ? JSON.stringify(target) : "__closed__";
  const [lastSession, setLastSession] = useState(sessionKey);
  const [overrides, setOverrides] = useState<Record<string, File>>({});
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const [failures, setFailures] = useState<string[]>([]);
  const [disabledNotice, setDisabledNotice] = useState(false);
  if (lastSession !== sessionKey) {
    setLastSession(sessionKey);
    setOverrides({});
    setProcessing(false);
    setProgress(null);
    setFailures([]);
    setDisabledNotice(false);
  }

  const sourceFor = (
    it: ExportItem
  ):
    | { kind: "file"; file: File }
    | { kind: "hosted"; path: string; name: string }
    | null => {
    const ov = overrides[it.key];
    if (ov) return { kind: "file", file: ov };
    if (it.hosted)
      return { kind: "hosted", path: it.hosted.path, name: it.hosted.name };
    return null;
  };

  const included = items.filter((it) => sourceFor(it) !== null);
  const skipped = items.length - included.length;
  const isZip = target?.kind === "album" || included.length > 1;
  const previewPayload = items[0]?.payload;

  const setOverride = (key: string, file: File | null) =>
    setOverrides((prev) => {
      const next = { ...prev };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });

  async function coverBlobFor(it: ExportItem): Promise<Blob | null> {
    // Album d'abord, sinon titre — l'ordre de l'ancien export d'album.
    const src = it.album?.cover || it.track.cover;
    if (!src || !src.startsWith("data:")) return null;
    try {
      const res = await fetch(src);
      return await res.blob();
    } catch {
      return null;
    }
  }

  async function runExport() {
    if (included.length === 0 || processing) return;
    setProcessing(true);
    setFailures([]);
    setDisabledNotice(false);
    setProgress({ done: 0, total: included.length });

    const zipEntries: { name: string; blob: Blob }[] = [];
    const failed: string[] = [];
    let featureDisabled = false;

    for (let i = 0; i < included.length; i++) {
      const it = included[i];
      const src = sourceFor(it)!;
      const label = it.payload.title || it.track.title || "sans titre";

      const fd = new FormData();
      if (src.kind === "file") fd.append("file", src.file, src.file.name);
      else fd.append("audioPath", src.path);
      fd.append("metadata", JSON.stringify(it.payload));
      const cover = await coverBlobFor(it);
      if (cover) fd.append("cover", cover, "cover.jpg");

      let res: Response;
      try {
        res = await fetch("/api/phono/apply-metadata", { method: "POST", body: fd });
      } catch {
        failed.push(label);
        setProgress({ done: i + 1, total: included.length });
        continue;
      }

      if (res.status === 503) {
        let body: { error?: string } = {};
        try {
          body = await res.json();
        } catch {
          /* corps non JSON */
        }
        if (body.error === "feature_disabled") {
          // Inutile d'enchaîner douze appels voués au même 503.
          featureDisabled = true;
          break;
        }
        failed.push(label);
        setProgress({ done: i + 1, total: included.length });
        continue;
      }

      if (!res.ok) {
        failed.push(label);
        setProgress({ done: i + 1, total: included.length });
        continue;
      }

      const outBlob = await res.blob();
      const ext = extOf(src.kind === "file" ? src.file.name : src.name);

      if (isZip) {
        const prefix = String(
          target?.kind === "album" ? it.trackNumber ?? i + 1 : i + 1
        ).padStart(2, "0");
        // Album : nommage fidèle à l'ancien export (titre de piste brut).
        const base =
          target?.kind === "album"
            ? safeFileName(it.track.title, "audio")
            : safeFileName(it.payload.title, "audio");
        zipEntries.push({ name: `${prefix} - ${base}${ext}`, blob: outBlob });
      } else {
        downloadBlob(outBlob, `${safeFileName(it.payload.title, "audio")}${ext}`);
      }
      setProgress({ done: i + 1, total: included.length });
    }

    if (featureDisabled) {
      setDisabledNotice(true);
      setProcessing(false);
      setProgress(null);
      return;
    }

    if (isZip && zipEntries.length > 0) {
      const zip = new JSZip();
      if (target?.kind === "album") {
        const folderName = safeFileName(release?.title ?? "", "album");
        const folder = zip.folder(folderName)!;
        for (const e of zipEntries) folder.file(e.name, e.blob);
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(blob, `${folderName}.zip`);
      } else {
        for (const e of zipEntries) zip.file(e.name, e.blob);
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(
          blob,
          `${safeFileName(items[0]?.track.title ?? "", "export")}.zip`
        );
      }
    }

    setProcessing(false);
    setProgress(null);
    setFailures(failed);

    if (failed.length === 0) {
      toast.success(
        included.length > 1
          ? `${included.length} fichiers exportés.`
          : "Fichier exporté."
      );
      onOpenChange(false);
    }
  }

  const previewFields = previewPayload
    ? (Object.keys(METADATA_FIELD_LABELS) as (keyof MetadataPayload)[])
        .map((k) => [k, previewPayload[k]] as const)
        .filter(
          ([, v]) =>
            v !== undefined &&
            v !== "" &&
            !(typeof v === "number" && Number.isNaN(v))
        )
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exporter les métadonnées</DialogTitle>
          <DialogDescription>
            {scope || "Aucun élément à exporter."}
          </DialogDescription>
        </DialogHeader>

        {items.length > 0 && (
          <div className="space-y-5 py-2">
            {/* ---------- Sources ---------- */}
            <MetadataSourceList
              items={items}
              overrides={overrides}
              skipped={skipped}
              includedCount={included.length}
              onSetOverride={setOverride}
            />

            {/* ---------- Aperçu des tags ---------- */}
            {previewPayload && (
              <div className="rounded-md border" style={{ borderColor: LINE }}>
                <div
                  className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide"
                  style={{ borderColor: LINE, color: MUTED }}
                >
                  Aperçu des tags
                  {target?.kind === "album"
                    ? ` — Aperçu de la piste 1 sur ${items.length}`
                    : ""}
                </div>
                <dl>
                  {previewFields.map(([k, v], idx) => (
                    <div
                      key={k}
                      className="flex gap-3 px-3 py-1.5 text-sm"
                      style={{
                        borderTop: idx === 0 ? undefined : `1px solid ${LINE}`,
                      }}
                    >
                      <dt className="w-44 shrink-0" style={{ color: MUTED }}>
                        {METADATA_FIELD_LABELS[k]}
                      </dt>
                      <dd className="min-w-0 flex-1 break-words">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          {disabledNotice ? (
            <p
              className="flex items-center gap-2 text-sm sm:mr-auto"
              style={{ color: "#F59E0B" }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              L&apos;écriture des métadonnées n&apos;est pas disponible sur cet
              environnement.
            </p>
          ) : failures.length > 0 ? (
            <p className="text-sm sm:mr-auto" style={{ color: "#ff6b6b" }}>
              {failures.length} fichier{failures.length > 1 ? "s" : ""} n&apos;ont
              pas pu être traités : {failures.join(", ")}.
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            {failures.length > 0 || disabledNotice ? "Fermer" : "Annuler"}
          </Button>
          <Button
            type="button"
            onClick={runExport}
            disabled={included.length === 0 || processing}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {progress
                  ? `Traitement ${progress.done}/${progress.total}`
                  : "Traitement…"}
              </>
            ) : (
              `Exporter${included.length > 0 ? ` (${included.length})` : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
