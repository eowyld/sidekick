"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Info, Loader2, Pencil, Tag, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
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

/** Champs numériques du payload : convertis en nombre à la sauvegarde. */
const NUMERIC_FIELDS = new Set<keyof MetadataPayload>([
  "trackNumber",
  "trackTotal",
  "year",
]);

type Draft = Partial<Record<keyof MetadataPayload, string>>;

function payloadToDraft(payload: MetadataPayload): Draft {
  const draft: Draft = {};
  (Object.keys(METADATA_FIELD_LABELS) as (keyof MetadataPayload)[]).forEach(
    (k) => {
      const v = payload[k];
      draft[k] = v === undefined ? "" : String(v);
    }
  );
  return draft;
}

function draftToOverride(draft: Draft): Partial<MetadataPayload> {
  const override: Partial<MetadataPayload> = {};
  (Object.keys(draft) as (keyof MetadataPayload)[]).forEach((k) => {
    const raw = (draft[k] ?? "").trim();
    if (NUMERIC_FIELDS.has(k)) {
      const n = raw ? Number(raw) : NaN;
      (override[k] as number | undefined) = Number.isFinite(n) ? n : undefined;
    } else {
      (override[k] as string | undefined) = raw || undefined;
    }
  });
  return override;
}

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
  /** Versions décochées : exclues de l'export même si un fichier est prêt. */
  const [deselected, setDeselected] = useState<Record<string, true>>({});
  const [previewKey, setPreviewKey] = useState<string | null>(
    items[0]?.key ?? null
  );
  /**
   * Tags modifiés à la main, par version — ne touche jamais la fiche du
   * titre dans le catalogue, uniquement ce qui est écrit dans le fichier
   * exporté.
   */
  const [payloadOverrides, setPayloadOverrides] = useState<
    Record<string, Partial<MetadataPayload>>
  >({});
  /**
   * Édition active ou non, indépendamment de l'onglet affiché — on peut
   * changer de version en cours d'édition pour enchaîner les corrections.
   * `drafts` garde un brouillon par version, initialisé à la première visite
   * de chacune, pour ne rien perdre en allant-venant entre les onglets.
   */
  const [editMode, setEditMode] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const [failures, setFailures] = useState<string[]>([]);
  const [disabledNotice, setDisabledNotice] = useState(false);
  if (lastSession !== sessionKey) {
    setLastSession(sessionKey);
    setOverrides({});
    setDeselected({});
    setPreviewKey(items[0]?.key ?? null);
    setPayloadOverrides({});
    setEditMode(false);
    setDrafts({});
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

  const isChecked = (key: string) => deselected[key] !== true;
  const toggleSelected = (key: string, checked: boolean) =>
    setDeselected((prev) => {
      const next = { ...prev };
      if (checked) delete next[key];
      else next[key] = true;
      return next;
    });

  const included = items.filter(
    (it) => isChecked(it.key) && sourceFor(it) !== null
  );
  const skipped = items.length - included.length;
  const isZip = target?.kind === "album" || included.length > 1;
  // L'aperçu ne porte que sur ce qui sera réellement exporté — une version
  // décochée ou sans fichier n'a pas de tags à écrire, donc rien à montrer.
  const previewItem =
    included.find((it) => it.key === previewKey) ?? included[0];

  const effectivePayload = (it: ExportItem): MetadataPayload => ({
    ...it.payload,
    ...(payloadOverrides[it.key] ?? {}),
  });

  const previewPayload = previewItem && effectivePayload(previewItem);

  /** Brouillon de la version affichée — initialisé au vol si elle n'en a pas encore. */
  const currentDraft: Draft =
    (previewItem && drafts[previewItem.key]) ?? {};

  const ensureDraft = (it: ExportItem) =>
    setDrafts((prev) =>
      prev[it.key] ? prev : { ...prev, [it.key]: payloadToDraft(effectivePayload(it)) }
    );

  const switchPreview = (key: string) => {
    setPreviewKey(key);
    if (editMode) {
      const it = included.find((x) => x.key === key);
      if (it) ensureDraft(it);
    }
  };

  const setField = (k: keyof MetadataPayload, value: string) => {
    if (!previewItem) return;
    setDrafts((prev) => ({
      ...prev,
      [previewItem.key]: { ...(prev[previewItem.key] ?? {}), [k]: value },
    }));
  };

  const startEdit = () => {
    if (!previewItem) return;
    ensureDraft(previewItem);
    setEditMode(true);
  };
  const cancelEdit = () => {
    setEditMode(false);
    setDrafts({});
  };
  const saveEdit = () => {
    setPayloadOverrides((prev) => {
      const next = { ...prev };
      for (const [key, d] of Object.entries(drafts)) next[key] = draftToOverride(d);
      return next;
    });
    setEditMode(false);
    setDrafts({});
  };

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
      const payload = effectivePayload(it);
      const src = sourceFor(it)!;
      const label = payload.title || it.track.title || "sans titre";

      const fd = new FormData();
      if (src.kind === "file") fd.append("file", src.file, src.file.name);
      else fd.append("audioPath", src.path);
      fd.append("metadata", JSON.stringify(payload));
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
            : safeFileName(payload.title, "audio");
        zipEntries.push({ name: `${prefix} - ${base}${ext}`, blob: outBlob });
      } else {
        downloadBlob(outBlob, `${safeFileName(payload.title, "audio")}${ext}`);
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

  // Tous les champs sont montrés, y compris ceux qui ne sont pas renseignés —
  // c'est justement ce qui reste à compléter avant d'écrire le fichier.
  const previewFields = previewPayload
    ? (Object.keys(METADATA_FIELD_LABELS) as (keyof MetadataPayload)[]).map(
        (k) => [k, previewPayload[k]] as const
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

        <div className="flex gap-2.5 rounded-lg border border-[#F0FF00]/[0.16] bg-[#F0FF00]/[0.05] px-3 py-2.5 text-[13px] leading-snug text-[#F5F5F5]/80">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#F0FF00]" />
          <p>
            Écrit le titre, l&apos;artiste, l&apos;ISRC et le reste des infos
            du catalogue directement dans le fichier audio (tags ID3), afin
            d&apos;optimiser ton référencement sur les plateformes de
            streaming.
          </p>
        </div>

        {items.length > 0 && (
          <div className="space-y-5 py-2">
            {/* ---------- Sources ---------- */}
            <MetadataSourceList
              items={items}
              overrides={overrides}
              isChecked={isChecked}
              onToggleSelected={toggleSelected}
              skipped={skipped}
              includedCount={included.length}
              onSetOverride={setOverride}
            />

            {/* ---------- Aperçu des tags ---------- */}
            {previewPayload && (
              <div
                className="overflow-hidden rounded-lg border"
                style={{ borderColor: LINE }}
              >
                <div
                  className="flex items-center justify-between gap-2 border-b px-3 py-2"
                  style={{ borderColor: LINE }}
                >
                  <span
                    className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide"
                    style={{ color: MUTED }}
                  >
                    <Tag className="h-3.5 w-3.5 shrink-0" />
                    Aperçu des tags
                  </span>
                  {editMode ? (
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="gap-1.5 text-[#F5F5F5]/60"
                        onClick={cancelEdit}
                      >
                        <X className="h-3 w-3" />
                        Annuler
                      </Button>
                      <Button type="button" size="xs" onClick={saveEdit}>
                        Enregistrer
                      </Button>
                    </div>
                  ) : (
                    previewItem && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="gap-1.5 text-[#F5F5F5]/60 hover:text-[#F0FF00]"
                        onClick={startEdit}
                      >
                        <Pencil className="h-3 w-3" />
                        Modifier
                      </Button>
                    )
                  )}
                </div>

                {/*
                  Un onglet par élément : le titre et l'ISRC diffèrent d'une
                  version à l'autre, un aperçu figé sur le premier élément
                  cachait cette différence. Restent actifs en édition : on
                  enchaîne les versions à corriger sans quitter le mode
                  édition, chacune garde son propre brouillon.
                */}
                {included.length > 1 && (
                  <div
                    className="flex flex-wrap gap-1.5 border-b px-3 py-2"
                    style={{ borderColor: LINE }}
                  >
                    {included.map((it) => {
                      const active = it.key === previewItem?.key;
                      const label =
                        it.version?.label ||
                        (it.trackNumber
                          ? `${String(it.trackNumber).padStart(2, "0")} · ${
                              it.track.title || "Titre"
                            }`
                          : it.track.title || "Titre");
                      return (
                        <button
                          key={it.key}
                          type="button"
                          onClick={() => switchPreview(it.key)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs transition-colors",
                            active
                              ? "border-[#F0FF00]/50 bg-[#F0FF00]/10 text-[#F0FF00]"
                              : "border-[rgba(245,245,245,0.14)] text-[#F5F5F5]/55 hover:border-[rgba(245,245,245,0.28)] hover:text-[#F5F5F5]"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/*
                  Même structure qu'en lecture (dt/dd, mêmes dimensions) — en
                  édition, seule la valeur devient un champ, pour ne pas
                  réorganiser toute la carte autour d'un formulaire différent.
                */}
                <dl>
                  {previewFields.map(([k, v], idx) => {
                    const empty =
                      v === undefined ||
                      v === "" ||
                      (typeof v === "number" && Number.isNaN(v));
                    return (
                      <div
                        key={k}
                        className="flex items-center gap-3 px-3 py-2 text-sm"
                        style={{
                          borderTop: idx === 0 ? undefined : `1px solid ${LINE}`,
                          background:
                            idx % 2 === 1 ? "rgba(245,245,245,0.02)" : undefined,
                        }}
                      >
                        <dt className="w-44 shrink-0" style={{ color: MUTED }}>
                          {METADATA_FIELD_LABELS[k]}
                        </dt>
                        <dd className="min-w-0 flex-1 font-mono text-[13px]">
                          {editMode ? (
                            <input
                              value={currentDraft[k] ?? ""}
                              onChange={(e) => setField(k, e.target.value)}
                              inputMode={NUMERIC_FIELDS.has(k) ? "numeric" : undefined}
                              placeholder="—"
                              className="w-full min-w-0 border-b border-transparent bg-transparent text-[#F5F5F5] outline-none placeholder:text-[#F5F5F5]/25 focus:border-[#F0FF00]/40"
                            />
                          ) : (
                            <span
                              className="break-words"
                              style={empty ? { color: "rgba(245,245,245,0.3)" } : undefined}
                            >
                              {empty ? "—" : String(v)}
                            </span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
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
