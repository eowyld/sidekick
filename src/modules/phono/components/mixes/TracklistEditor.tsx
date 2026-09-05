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
import { Check, ClipboardPaste, Copy, GripVertical, ListMusic, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MixTracklistItem } from "@/lib/sidekick-store";
import {
  formatTracklistForCopy,
  parseTracklist,
  tracklistDuration,
} from "@/modules/phono/lib/mix";

interface TracklistEditorProps {
  items: MixTracklistItem[];
  onChange: (items: MixTracklistItem[]) => void;
}

const PASTE_PLACEHOLDER = `0:00 Floating Points – Last Bloom [Ninja Tune]
4:12 Four Tet - Baby (Rework)
1. 08:40 Jamie xx – Gosh (Lone Remix) [Young]`;

function SortableRow({
  item,
  index,
  onPatch,
  onRemove,
}: {
  item: MixTracklistItem;
  index: number;
  onPatch: (patch: Partial<MixTracklistItem>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] px-2 py-1.5"
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
      <Input
        value={item.time}
        onChange={(e) => onPatch({ time: e.target.value })}
        placeholder="0:00"
        aria-label={`Timecode du titre ${index + 1}`}
        className="w-24 shrink-0 text-center font-mono text-xs tabular-nums"
      />
      <Input
        value={item.artist}
        onChange={(e) => onPatch({ artist: e.target.value })}
        placeholder="Artiste — Titre"
        aria-label={`Artiste et titre du titre ${index + 1}`}
        className="min-w-0 flex-1 text-sm"
      />
      <Input
        value={item.label}
        onChange={(e) => onPatch({ label: e.target.value })}
        placeholder="Label"
        aria-label={`Label du titre ${index + 1}`}
        className="w-40 shrink-0 text-sm"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-[#F5F5F5]/40 hover:text-red-400"
        aria-label={`Retirer le titre ${index + 1}`}
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}

/**
 * Éditeur de tracklist — le cœur de l'onglet Mixes : c'est la tracklist qui
 * détermine la répartition des droits vers les ayants droit des titres joués.
 * La saisie ligne par ligne décourageant au-delà de quinze titres, l'entrée
 * principale est le collage d'un tracklisting existant.
 */
export function TracklistEditor({ items, onChange }: TracklistEditorProps) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [copied, setCopied] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const preview = pasteText.trim() ? parseTracklist(pasteText) : [];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(items, from, to));
  };

  const patch = (id: string, values: Partial<MixTracklistItem>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...values } : i)));

  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));

  const addBlankRow = () =>
    onChange([
      ...items,
      {
        id: "mt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9),
        artist: "",
        label: "",
        time: "0:00",
      },
    ]);

  const closePaste = () => {
    setPasteOpen(false);
    setPasteText("");
  };

  const applyPaste = (mode: "replace" | "append") => {
    if (preview.length === 0) return;
    onChange(mode === "replace" ? preview : [...items, ...preview]);
    closePaste();
  };

  const copyTracklist = () => {
    void navigator.clipboard.writeText(formatTracklistForCopy(items));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const count = items.length;
  const duration = tracklistDuration(items);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-[#F5F5F5]">Tracklist</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPasteOpen(true)}
          >
            <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
            Coller une tracklist
          </Button>
          {count > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyTracklist}
            >
              {copied ? (
                <Check className="mr-1.5 h-3.5 w-3.5 text-[#F0FF00]" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              {copied ? "Copié" : "Copier"}
            </Button>
          )}
        </div>
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[rgba(245,245,245,0.12)] px-4 py-10 text-center">
          <ListMusic className="h-8 w-8 text-[#F5F5F5]/30" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#F5F5F5]/90">
              Aucun titre dans la tracklist
            </p>
            <p className="mx-auto max-w-sm text-sm text-[#F5F5F5]/60">
              Colle le tracklisting du set d&apos;un coup — une ligne par titre,
              avec le timecode, l&apos;artiste et le label si tu l&apos;as.
            </p>
          </div>
          <Button type="button" size="sm" onClick={() => setPasteOpen(true)}>
            <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
            Coller une tracklist
          </Button>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-1.5">
                {items.map((item, index) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    index={index}
                    onPatch={(values) => patch(item.id, values)}
                    onRemove={() => remove(item.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[#F5F5F5]/60 hover:text-[#F5F5F5]"
              onClick={addBlankRow}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Ajouter une ligne
            </Button>
            <span className="text-xs tabular-nums text-[#F5F5F5]/45">
              {count} titre{count > 1 ? "s" : ""}
              {duration ? ` · ${duration}` : ""}
            </span>
          </div>
        </>
      )}

      <Dialog
        open={pasteOpen}
        onOpenChange={(open) => (open ? setPasteOpen(true) : closePaste())}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Coller une tracklist</DialogTitle>
            <DialogDescription className="text-[#F5F5F5]/70">
              Une ligne par titre. Les timecodes, la numérotation et les labels
              entre crochets ou parenthèses sont reconnus ; une ligne non
              reconnue reste importée pour être corrigée à la main.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={PASTE_PLACEHOLDER}
              rows={7}
              className="resize-none font-mono text-xs"
              aria-label="Tracklist à coller"
            />

            {preview.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wider text-[#F5F5F5]/50">
                  Aperçu — {preview.length} titre{preview.length > 1 ? "s" : ""}
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-2">
                  {preview.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 text-xs text-[#F5F5F5]/80"
                    >
                      <span className="w-12 shrink-0 font-mono tabular-nums text-[#F5F5F5]/45">
                        {item.time}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {item.artist || "—"}
                      </span>
                      {item.label && (
                        <span className="shrink-0 text-[#F5F5F5]/45">
                          [{item.label}]
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={closePaste}>
              Annuler
            </Button>
            {items.length > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={preview.length === 0}
                onClick={() => applyPaste("append")}
              >
                Ajouter à la suite
              </Button>
            )}
            <Button
              type="button"
              disabled={preview.length === 0}
              onClick={() => applyPaste(items.length > 0 ? "replace" : "append")}
            >
              {items.length > 0 ? "Remplacer" : "Importer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
