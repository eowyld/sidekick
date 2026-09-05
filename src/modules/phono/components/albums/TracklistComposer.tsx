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
import { GripVertical, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Track } from "@/lib/sidekick-store";

interface TracklistComposerProps {
  trackIds: string[];
  allTracks: Track[];
  /** Reçoit toujours le tableau complet et ordonné. */
  onChange: (trackIds: string[]) => void;
}

/** Au-delà, la liste du catalogue noie le dialog. */
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
  onRemove,
}: {
  id: string;
  index: number;
  /** `undefined` si le titre a été supprimé du catalogue — la ligne reste
   *  affichée et retirable pour ne pas piéger l'utilisateur. */
  track: Track | undefined;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] px-2.5 py-2"
    >
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
    </li>
  );
}

/**
 * Vue de composition d'une tracklist : on ordonne les titres déjà retenus par
 * drag & drop (zone 1) et on en pioche d'autres dans le catalogue (zone 2).
 * Le modèle est titre-centré — l'album ne fait que référencer des `trackId`.
 */
export function TracklistComposer({
  trackIds,
  allTracks,
  onChange,
}: TracklistComposerProps) {
  const [query, setQuery] = useState("");

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
                    onRemove={() => remove(id)}
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
