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
import {
  AlertTriangle,
  Check,
  ClipboardPaste,
  Copy,
  GripVertical,
  ListMusic,
  Plus,
  X,
} from "lucide-react";

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
import { cn } from "@/lib/utils";
import {
  clampTracklistToDuration,
  formatTracklistForCopy,
  itemsBeyondDuration,
  joinTimecode,
  parseTracklist,
  splitTimecode,
  timecodeToSeconds,
  tracklistDuration,
} from "@/modules/phono/lib/mix";

interface TracklistEditorProps {
  items: MixTracklistItem[];
  onChange: (items: MixTracklistItem[]) => void;
  /**
   * Dernière seconde atteignable du fichier rattaché, `null` s'il n'y en a pas
   * ou si sa durée est inconnue. Borne la saisie des timecodes : au-delà, le
   * lecteur saute dans le vide.
   */
  maxSeconds: number | null;
}

const PASTE_PLACEHOLDER = `0:00 Floating Points – Last Bloom [Ninja Tune]
4:12 Four Tet - Baby (Rework)
1. 08:40 Jamie xx – Gosh (Lone Remix) [Young]`;

/**
 * Champ sans cadre : la tracklist se lit comme une liste, pas comme un
 * formulaire de cent cases. Le contour n'apparaît qu'au survol de la ligne et à
 * la saisie — seule façon de garder lisible un set de quarante titres.
 *
 * Pas de `font-mono` : le chiffre d'Archivo est déjà tabulaire (`tabular-nums`),
 * les colonnes s'alignent donc sans importer une seconde famille, et le
 * Courier du navigateur jurait avec le reste du produit.
 *
 * ⚠️ Aucune largeur ici : `cn()` concatène sans arbitrer les conflits Tailwind,
 * et le `w-full` de `Input` l'emporterait. La largeur se pose sur le conteneur,
 * que le champ remplit.
 */
const CELL =
  "h-8 rounded border-transparent bg-transparent px-2 shadow-none " +
  "group-hover/line:border-[rgba(245,245,245,0.1)] focus-visible:border-[#F0FF00]/40";

/** Largeurs de colonnes, partagées par l'en-tête et les lignes. */
const TIME_COL = "w-[104px] shrink-0";

/** Retrait des deux champs de temps, imposé en ligne (voir `TimeFields`). */
const TIGHT = { paddingLeft: 6, paddingRight: 6 };
// Trois colonnes de texte à parts égales, et non un label à largeur fixe :
// fixe, il restait étroit dès que la fenêtre s'élargissait, alors que les deux
// autres s'étiraient. « Ed Banger Records » ou « Because Music » demandent
// autant de place qu'un nom d'artiste.
const ARTIST_COL = "min-w-0 flex-1";
const TITLE_COL = "min-w-0 flex-1";
const LABEL_COL = "hidden min-w-0 flex-1 md:block";

/** Deux champs plutôt qu'un timecode à formater soi-même. */
function TimeFields({
  time,
  index,
  maxSeconds,
  beyond,
  onChange,
}: {
  time: string;
  index: number;
  maxSeconds: number | null;
  /** Timecode hérité d'avant le fichier, et désormais hors du morceau. */
  beyond: boolean;
  onChange: (time: string) => void;
}) {
  const { minutes, seconds } = splitTimecode(time);
  // Couleur posée en ligne, comme le retrait : une classe de texte
  // supplémentaire ne l'emporterait pas sur le `text-[#F5F5F5]` d'`Input`,
  // faute d'arbitrage dans `cn()`.
  const tone = beyond ? { ...TIGHT, color: "#F59E0B" } : TIGHT;

  return (
    <div className={cn(TIME_COL, "flex items-center")}>
      <div className="w-10">
        <Input
          value={minutes}
          onChange={(e) =>
            onChange(
              joinTimecode(e.target.value.replace(/\D/g, ""), seconds, maxSeconds)
            )
          }
          inputMode="numeric"
          maxLength={3}
          placeholder="00"
          aria-label={`Minutes du titre ${index + 1}`}
          // Minutes calées à droite, secondes à gauche : les deux-points
          // restent à la même place d'une ligne à l'autre, qu'il y ait « 4 » ou
          // « 78 ». Le retrait passe par `style` et non par une classe : `cn()`
          // n'arbitre pas les conflits Tailwind, le `px-3` d'`Input`
          // l'emporterait et rognerait les deux chiffres.
          style={tone}
          className={cn(CELL, "text-right text-[13px] tabular-nums")}
        />
      </div>
      <span aria-hidden className="px-1 text-[13px] text-[#F5F5F5]/25">
        :
      </span>
      <div className="w-10">
        <Input
          value={seconds}
          onChange={(e) =>
            onChange(
              joinTimecode(minutes, e.target.value.replace(/\D/g, ""), maxSeconds)
            )
          }
          inputMode="numeric"
          maxLength={2}
          placeholder="00"
          aria-label={`Secondes du titre ${index + 1}`}
          style={tone}
          className={cn(CELL, "text-left text-[13px] tabular-nums")}
        />
      </div>
    </div>
  );
}

function SortableRow({
  item,
  index,
  maxSeconds,
  onPatch,
  onRemove,
}: {
  item: MixTracklistItem;
  index: number;
  maxSeconds: number | null;
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

  // Seule la saisie est bornée : une ligne déjà enregistrée peut dépasser si le
  // fichier est arrivé après elle, ou a été remplacé par plus court.
  const at = timecodeToSeconds(item.time);
  const beyond = maxSeconds !== null && at !== null && at > maxSeconds;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/line flex items-center gap-1.5 rounded-lg py-0.5 transition-colors",
        "hover:bg-[rgba(245,245,245,0.03)]",
        isDragging && "bg-[rgba(245,245,245,0.05)]"
      )}
    >
      {/*
        Une seule gouttière pour deux rôles : le rang se lit au repos, la
        poignée le remplace au survol. Les deux côte à côte alourdissaient
        chaque ligne d'une colonne qui ne sert qu'une fois sur vingt.
      */}
      <div className="relative h-7 w-7 shrink-0">
        <span className="absolute inset-0 flex items-center justify-center text-[11px] tabular-nums text-[#F5F5F5]/25 transition-opacity group-hover/line:opacity-0">
          {index + 1}
        </span>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute inset-0 flex cursor-grab items-center justify-center text-[#F5F5F5]/40 opacity-0 transition-opacity hover:text-[#F5F5F5]/80 focus-visible:opacity-100 group-hover/line:opacity-100 active:cursor-grabbing"
          aria-label={`Réordonner le titre ${index + 1}`}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      <TimeFields
        time={item.time}
        index={index}
        maxSeconds={maxSeconds}
        beyond={beyond}
        onChange={(time) => onPatch({ time })}
      />

      <div className={ARTIST_COL}>
        <Input
          value={item.artist}
          onChange={(e) => onPatch({ artist: e.target.value })}
          placeholder="Artiste"
          aria-label={`Artiste du titre ${index + 1}`}
          className={cn(CELL, "text-[13px]")}
        />
      </div>
      <div className={TITLE_COL}>
        <Input
          value={item.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder="Titre"
          aria-label={`Titre du morceau ${index + 1}`}
          className={cn(CELL, "text-[13px]")}
        />
      </div>
      <div className={LABEL_COL}>
        <Input
          value={item.label}
          onChange={(e) => onPatch({ label: e.target.value })}
          placeholder="Label"
          aria-label={`Label du titre ${index + 1}`}
          className={cn(CELL, "text-[13px] text-[#F5F5F5]/60")}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-[#F5F5F5]/0 transition-colors group-hover/line:text-[#F5F5F5]/40 hover:text-red-400"
        aria-label={`Retirer le titre ${index + 1}`}
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

/**
 * Éditeur de tracklist — **indicatif**.
 *
 * Il sert à se souvenir de ce qui a été joué, à le recoller sur Mixcloud ou
 * Resident Advisor, et à naviguer dans le mix depuis le catalogue (les
 * timecodes y sont cliquables). Rien n'y est obligatoire, rien n'y est vérifié :
 * la saisie ligne par ligne décourageant au-delà de quinze titres, l'entrée
 * principale reste le collage d'un tracklisting existant.
 */
export function TracklistEditor({
  items,
  onChange,
  maxSeconds,
}: TracklistEditorProps) {
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
        title: "",
        label: "",
        time: "",
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

  /**
   * Lignes hors du morceau.
   *
   * Ne peut pas venir de la saisie, qui est bornée : ce sont des timecodes
   * écrits avant que le fichier existe, ou rendus caducs par un fichier plus
   * court. La page refuse d'enregistrer tant qu'il en reste, d'où le bouton qui
   * les ramène d'un coup — sans jamais le faire tout seul.
   */
  const beyond = itemsBeyondDuration(items, maxSeconds);
  const limit =
    maxSeconds === null
      ? ""
      : `${Math.floor(maxSeconds / 60)}:${String(maxSeconds % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] tabular-nums text-[#F5F5F5]/40">
          {count > 0
            ? `${count} titre${count > 1 ? "s" : ""}${duration ? ` · ${duration}` : ""}`
            : "Rien d'obligatoire ici"}
        </span>
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
            <Button type="button" variant="outline" size="sm" onClick={copyTracklist}>
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

      {beyond.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2">
          <p className="flex items-center gap-2 text-xs text-[#F59E0B]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {beyond.length} timecode{beyond.length > 1 ? "s" : ""} dépasse
            {beyond.length > 1 ? "nt" : ""} la fin du fichier ({limit}) — le
            lecteur n&apos;a rien à y jouer.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(clampTracklistToDuration(items, maxSeconds))}
          >
            Ramener à {limit}
          </Button>
        </div>
      )}

      {count === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[rgba(245,245,245,0.12)] px-4 py-8 text-center">
          <ListMusic className="h-7 w-7 text-[#F5F5F5]/25" aria-hidden />
          <p className="mx-auto max-w-sm text-xs text-[#F5F5F5]/55">
            Colle le tracklisting du set d&apos;un coup — une ligne par titre,
            avec le timecode si tu l&apos;as. Les timecodes rendent le mix
            navigable depuis le catalogue.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={() => setPasteOpen(true)}>
              <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
              Coller une tracklist
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={addBlankRow}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Saisir à la main
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {/* En-têtes : quatre colonnes muettes valent mieux que quatre
              placeholders qui disparaissent à la première frappe. */}
          <div className="flex items-center gap-1.5 px-1 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/25">
            <span className="w-7 shrink-0" />
            <span className={cn(TIME_COL, "text-center")}>Temps</span>
            <span className={cn(ARTIST_COL, "px-2")}>Artiste</span>
            <span className={cn(TITLE_COL, "px-2")}>Titre</span>
            <span className={cn(LABEL_COL, "px-2")}>Label</span>
            <span className="w-9 shrink-0" />
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-0.5 border-t border-[rgba(245,245,245,0.06)] pt-1">
                {items.map((item, index) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    index={index}
                    maxSeconds={maxSeconds}
                    onPatch={(values) => patch(item.id, values)}
                    onRemove={() => remove(item.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 text-[#F5F5F5]/50 hover:text-[#F5F5F5]"
            onClick={addBlankRow}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Ajouter une ligne
          </Button>
        </div>
      )}

      <Dialog
        open={pasteOpen}
        onOpenChange={(open) => (open ? setPasteOpen(true) : closePaste())}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Coller une tracklist</DialogTitle>
            <DialogDescription className="text-[#F5F5F5]/70">
              Une ligne par titre. Les timecodes, la numérotation, le tiret entre
              l&apos;artiste et le titre et les labels entre crochets ou
              parenthèses sont reconnus ; une ligne non reconnue reste importée
              pour être corrigée à la main.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={PASTE_PLACEHOLDER}
              rows={7}
              className="resize-none text-xs"
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
                      <span className="w-12 shrink-0 tabular-nums text-[#F5F5F5]/45">
                        {item.time || "—"}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {item.artist || "—"}
                        {item.title ? (
                          <span className="text-[#F5F5F5]/50"> · {item.title}</span>
                        ) : null}
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
