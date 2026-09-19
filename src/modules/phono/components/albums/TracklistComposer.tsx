"use client";

import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Track, TrackVersion } from "@/lib/sidekick-store";
import { cn } from "@/lib/utils";
import {
  RELEASE_STATUS_COLOR,
  releaseStatusLabel,
} from "@/modules/phono/lib/release-status";
import { VersionList } from "../tracks/VersionList";

interface TracklistComposerProps {
  trackIds: string[];
  allTracks: Track[];
  /** Reçoit toujours le tableau complet et ordonné. */
  onChange: (trackIds: string[]) => void;
  /**
   * Versions retenues sur l'album, par titre — repli historique déjà résolu
   * par la page. Une case cochée par identifiant présent ici.
   */
  selectedVersionIds: Record<string, string[]>;
  onToggleVersion: (trackId: string, versionId: string, selected: boolean) => void;
  /**
   * Les trois écritures qui portent sur le **titre** et non sur l'album :
   * elles partent en base immédiatement, sans attendre l'enregistrement de
   * l'album (voir `AlbumEditPage`).
   */
  onPatchTrackVersion: (
    trackId: string,
    versionId: string,
    patch: Partial<TrackVersion>
  ) => void;
  onAddTrackVersion: (trackId: string) => void;
  onRemoveTrackVersion: (trackId: string, versionId: string) => void;
  /**
   * Crée un titre dans le catalogue général et l'ajoute en fin de tracklist.
   * Reçoit le libellé saisi, non nettoyé.
   */
  onCreateTrack: (title: string) => void;
}

/** Au-delà, la liste du catalogue noie la page. */
const CATALOG_LIMIT = 20;

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function SortableTrackRow({
  id,
  index,
  track,
  selectedVersionIds,
  expanded,
  onToggleExpand,
  onRemove,
  onToggleVersion,
  onPatchVersion,
  onAddVersion,
  onRemoveVersion,
}: {
  id: string;
  index: number;
  /** `undefined` si le titre a été supprimé du catalogue — la ligne reste
   *  affichée et retirable pour ne pas piéger l'utilisateur. */
  track: Track | undefined;
  selectedVersionIds: string[];
  expanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onToggleVersion: (versionId: string, selected: boolean) => void;
  onPatchVersion: (versionId: string, patch: Partial<TrackVersion>) => void;
  onAddVersion: () => void;
  onRemoveVersion: (versionId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const status = track?.status ?? "en_production";
  const count = selectedVersionIds.length;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)]"
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="w-5 shrink-0 text-right text-xs tabular-nums text-[#F5F5F5]/40">
          {index + 1}
        </span>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab text-[#F5F5F5]/30 transition-colors hover:text-[#F5F5F5]/70 active:cursor-grabbing"
          aria-label="Réordonner"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-[#F5F5F5]">
            {track ? track.title || "Sans titre" : "Titre introuvable"}
          </p>
          <p className="truncate text-xs text-[#F5F5F5]/45">
            {track
              ? track.mainArtist || "—"
              : "Ce titre a été supprimé du catalogue"}
          </p>
        </div>

        {track && (
          <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <span
              aria-hidden
              className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
              style={{
                background: RELEASE_STATUS_COLOR[status],
                boxShadow: `0 0 8px ${RELEASE_STATUS_COLOR[status]}55`,
              }}
            />
            <span className="text-[11px] text-[#F5F5F5]/55">
              {releaseStatusLabel(status)}
            </span>
          </span>
        )}

        {/*
          Ce que ce titre pose réellement sur la sortie. Zéro version retenue
          n'est pas une erreur — l'audio n'est pas toujours prêt — mais ça ne
          doit pas se découvrir en dépliant la ligne.
        */}
        {track && (
          <span
            className="shrink-0 text-[11px] tabular-nums"
            style={{ color: count === 0 ? "#F59E0B" : "rgba(245,245,245,0.55)" }}
          >
            {count === 0
              ? "aucune version"
              : `${count} version${count > 1 ? "s" : ""}`}
          </span>
        )}

        {track && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
            aria-label={
              expanded
                ? `Replier les versions de ${track.title || "ce titre"}`
                : `Voir les versions de ${track.title || "ce titre"}`
            }
            aria-expanded={expanded}
            onClick={onToggleExpand}
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
            />
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-[#F5F5F5]/40 hover:text-red-400"
          aria-label="Retirer de la tracklist"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {track && expanded ? (
        <div className="border-t border-[rgba(245,245,245,0.08)] px-3 py-3">
          <VersionList
            track={track}
            flush
            // L'export de métadonnées travaille sur un album déjà enregistré :
            // il vit sur la carte du catalogue, pas ici.
            showExport={false}
            onExportMetadata={() => {}}
            selectedVersionIds={selectedVersionIds}
            onToggleVersion={onToggleVersion}
            onPatchVersion={onPatchVersion}
            onAddVersion={onAddVersion}
            onRemoveVersion={onRemoveVersion}
          />
        </div>
      ) : null}
    </li>
  );
}

/**
 * Vue de composition d'une tracklist : on ordonne les titres retenus par
 * drag & drop (zone 1) et on en pioche ou en crée d'autres (zone 2). Chaque
 * ligne se déplie sur les versions du titre, où l'on coche celles qui partent
 * sur la sortie et où l'on attache les fichiers audio.
 *
 * Le modèle reste titre-centré : l'album ne fait que référencer des `trackId`
 * et des `versionId`, il ne duplique jamais un titre ni un fichier.
 */
export function TracklistComposer({
  trackIds,
  allTracks,
  onChange,
  selectedVersionIds,
  onToggleVersion,
  onPatchTrackVersion,
  onAddTrackVersion,
  onRemoveTrackVersion,
  onCreateTrack,
}: TracklistComposerProps) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const byId = new Map(allTracks.map((t) => [t.id, t]));
  const inList = new Set(trackIds);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = trackIds.indexOf(active.id as string);
    const to = trackIds.indexOf(over.id as string);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(trackIds, from, to));
  };

  const remove = (id: string) => onChange(trackIds.filter((t) => t !== id));
  const add = (id: string) => onChange([...trackIds, id]);

  const confirmCreate = () => {
    if (newTitle.trim() === "") return;
    onCreateTrack(newTitle);
    setCreating(false);
    setNewTitle("");
  };
  const cancelCreate = () => {
    setCreating(false);
    setNewTitle("");
  };

  const notInList = allTracks.filter((t) => !inList.has(t.id));
  const q = normalize(query.trim());
  const matches = notInList
    .filter(
      (t) =>
        q === "" ||
        normalize(t.title || "").includes(q) ||
        normalize(t.mainArtist || "").includes(q)
    )
    .sort((a, b) =>
      (a.title || "").localeCompare(b.title || "", "fr", { sensitivity: "base" })
    );

  const shown = matches.slice(0, CATALOG_LIMIT);
  const overflow = matches.length - shown.length;

  return (
    <div className="space-y-5">
      {/* Zone 1 — la tracklist */}
      <div>
        {trackIds.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[rgba(245,245,245,0.12)] px-3 py-6 text-center text-sm text-[#F5F5F5]/45">
            Aucun titre. Ajoute-les depuis le catalogue ci-dessous.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={trackIds}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-1.5">
                {trackIds.map((id, index) => (
                  <SortableTrackRow
                    key={id}
                    id={id}
                    index={index}
                    track={byId.get(id)}
                    selectedVersionIds={selectedVersionIds[id] ?? []}
                    expanded={expandedId === id}
                    onToggleExpand={() =>
                      setExpandedId((cur) => (cur === id ? null : id))
                    }
                    onRemove={() => remove(id)}
                    onToggleVersion={(versionId, selected) =>
                      onToggleVersion(id, versionId, selected)
                    }
                    onPatchVersion={(versionId, patch) =>
                      onPatchTrackVersion(id, versionId, patch)
                    }
                    onAddVersion={() => onAddTrackVersion(id)}
                    onRemoveVersion={(versionId) =>
                      onRemoveTrackVersion(id, versionId)
                    }
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Zone 2 — le catalogue */}
      <div className="space-y-2 border-t border-[rgba(245,245,245,0.08)] pt-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5F5F5]/30"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un titre du catalogue…"
            className="pl-9"
          />
        </div>

        {creating ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titre du nouveau morceau"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmCreate();
                }
                if (e.key === "Escape") cancelCreate();
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={confirmCreate}
              disabled={newTitle.trim() === ""}
            >
              Créer
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancelCreate}>
              Annuler
            </Button>
          </div>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2 border-dashed border-[rgba(240,255,0,0.4)] text-[#F5F5F5] hover:bg-[rgba(240,255,0,0.08)]"
                  onClick={() => setCreating(true)}
                >
                  <Plus className="h-4 w-4 shrink-0 text-[#F0FF00]" aria-hidden />
                  Créer un titre
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Crée un titre pour l&apos;ajouter directement à l&apos;album.
                Il rejoint aussitôt le catalogue général des titres, où tu peux
                le modifier indépendamment.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {notInList.length === 0 ? (
          <p className="px-1 py-4 text-center text-sm text-[#F5F5F5]/45">
            Tous les titres du catalogue sont déjà dans la tracklist.
          </p>
        ) : shown.length === 0 ? (
          <p className="px-1 py-4 text-center text-sm text-[#F5F5F5]/45">
            Aucun titre ne correspond à « {query} ».
          </p>
        ) : (
          <ul className="space-y-1">
            {shown.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-[rgba(245,245,245,0.04)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#F5F5F5]">
                    {t.title || "Sans titre"}
                  </p>
                  <p className="truncate text-xs text-[#F5F5F5]/45">
                    {t.mainArtist || "—"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-[#F5F5F5]/40 hover:text-[#F0FF00]"
                  aria-label={`Ajouter ${t.title || "ce titre"} à la tracklist`}
                  onClick={() => add(t.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {overflow > 0 ? (
          <p className="px-1 text-xs text-[#F5F5F5]/40">
            et {overflow} autre{overflow > 1 ? "s" : ""} — affine ta recherche
          </p>
        ) : null}
      </div>
    </div>
  );
}
