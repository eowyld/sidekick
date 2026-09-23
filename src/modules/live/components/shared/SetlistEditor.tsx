"use client";
import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, ListMusic, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePhonoData } from "@/hooks/usePhonoData";
import { toast } from "sonner";
import type { Track } from "@/lib/sidekick-store";
import { Choice, Panel } from "./LiveUI";
import { setlistDuration, type SetlistTrack } from "../../lib/live-model";
function TrackRow({ item, index, count, update, remove, move }: {
    item: SetlistTrack;
    index: number;
    count: number;
    update: (v: SetlistTrack) => void;
    remove: () => void;
    move: (to: number) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .5 : 1 }} className="group rounded-lg border border-[#F5F5F5]/[.08] bg-[#101010]/40 p-3 focus-within:border-[#F0FF00]/30">
    <div className="flex items-center gap-2">
    <button type="button" {...attributes} {...listeners} aria-label={`Déplacer ${item.title || `le morceau ${index + 1}`}`} className="touch-none text-[#F5F5F5]/35 hover:text-[#F0FF00]">
    <GripVertical size={16}/>
    </button>
    <span className="w-5 text-xs tabular-nums text-[#F0FF00]">
    {String(index + 1).padStart(2, "0")}
    </span>
    {/* La largeur est portée par le conteneur, pas par l'Input : `cn()` ne
        fusionne pas les classes Tailwind, donc un `w-20` posé sur l'Input
        s'ajoute à son `w-full` de base au lieu de le remplacer. */}
    <div className="min-w-0 flex-1">
    <Input aria-label={`Titre ${index + 1}`} placeholder="Titre du morceau" value={item.title} onChange={e => update({ ...item, title: e.target.value })}/>
    </div>
    <div className="w-20 shrink-0">
    <Input aria-label={`Durée ${index + 1} en minutes et secondes`} placeholder="3:30" value={item.duration} onChange={e => update({ ...item, duration: e.target.value })}/>
    </div>
    <Button variant="ghost" size="icon" aria-label={`Supprimer le morceau ${index + 1}`} onClick={remove}>
    <Trash2 size={14}/>
    </Button>
    </div>
    <div className="mt-2 grid gap-2 pl-9 md:grid-cols-2">
    <Input aria-label={`Artiste ${index + 1}`} placeholder="Artiste / interprète" value={item.artist} onChange={e => update({ ...item, artist: e.target.value })}/>
    <Input aria-label={`Notes ${index + 1}`} placeholder="Transition, tonalité, repère…" value={item.note} onChange={e => update({ ...item, note: e.target.value })}/>
    </div>
    <div className="mt-1 flex justify-end">
    <Button variant="ghost" size="xs" disabled={!index} aria-label={`Monter le morceau ${index + 1}`} onClick={() => move(index - 1)}>
    <ArrowUp size={12}/>
    </Button>
    <Button variant="ghost" size="xs" disabled={index === count - 1} aria-label={`Descendre le morceau ${index + 1}`} onClick={() => move(index + 1)}>
    <ArrowDown size={12}/>
    </Button>
    </div>
    </div>;
}
export function SetlistEditor({ value, onChange, dj = false }: {
    value: SetlistTrack[];
    onChange: (v: SetlistTrack[]) => void;
    dj?: boolean;
}) {
    const { tracks, albums, error } = usePhonoData();
    const [source, setSource] = useState("");
    const [albumId, setAlbumId] = useState("");
    const albumOptions = albums.filter(a => a.type === "album" || a.type === "ep").map(a => ({ value: a.id, label: `${a.title} · ${a.type === "ep" ? "EP" : "Album"}` }));
    const addAlbum = () => {
        const album = albums.find(a => a.id === albumId);
        if (!album)
            return;
        const present = new Set(value.map(t => t.trackId).filter(Boolean));
        const found = album.trackIds.map(id => tracks.find(t => t.id === id)).filter((t): t is Track => !!t);
        if (!found.length) {
            toast.error("Cet album ne contient encore aucun titre.");
            return;
        }
        const fresh = found.filter(t => !present.has(t.id));
        onChange([...value, ...fresh.map(t => ({ id: crypto.randomUUID(), title: t.title, artist: t.mainArtist, duration: "", note: "", trackId: t.id }))]);
        setAlbumId("");
        const skipped = found.length - fresh.length;
        toast.success(`${fresh.length} titre${fresh.length > 1 ? "s" : ""} ajouté${fresh.length > 1 ? "s" : ""}${skipped ? `, ${skipped} déjà présent${skipped > 1 ? "s" : ""}` : ""}`);
    };
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const add = () => { const track = tracks.find(t => t.id === source); onChange([...value, { id: crypto.randomUUID(), title: track?.title ?? "", artist: track?.mainArtist ?? "", duration: "", note: "", ...(track ? { trackId: track.id } : {}) }]); setSource(""); };
    const drag = ({ active, over }: DragEndEvent) => { if (over && active.id !== over.id)
        onChange(arrayMove(value, value.findIndex(t => t.id === active.id), value.findIndex(t => t.id === over.id))); };
    return <Panel title={dj ? "Sélection & ordre du DJ set" : "Setlist"} icon={ListMusic} color={dj ? "#A78BFA" : "#F0FF00"} description={`${value.length} morceau${value.length > 1 ? "x" : ""} · ${setlistDuration(value)} min`}>
    <div className="mb-4 flex items-end gap-2">
    <div className="flex-1">
    <Choice label="Ajouter à la setlist" value={source} onChange={setSource} placeholder="Morceau libre / nouveau titre" options={tracks.map(t => ({ value: t.id, label: `${t.title} — ${t.mainArtist || "Sans artiste"}` }))}/>
    </div>
    <Button size="sm" variant="secondary" onClick={add}><Plus size={14} className="mr-1"/>Ajouter</Button>
    </div>
    {albumOptions.length > 0 && <div className="mb-4 flex items-end gap-2">
    <div className="flex-1">
    <Choice label="Ajouter un album ou un EP" value={albumId} onChange={setAlbumId} placeholder="Choisir un album ou un EP" options={albumOptions}/>
    </div>
    <Button size="sm" variant="secondary" disabled={!albumId} onClick={addAlbum}><Plus size={14} className="mr-1"/>Ajouter l’album</Button>
    </div>}
    {error && <p className="mb-3 text-xs text-amber-300">Le catalogue est indisponible. Tu peux saisir tes morceaux librement.</p>}
    {!value.length && <p className="rounded-lg border border-dashed border-[#F5F5F5]/15 px-6 py-10 text-center text-sm text-[#F5F5F5]/50">Commence par un titre du catalogue ou un morceau libre.<br /><span className="text-xs">Réorganise ensuite les morceaux et prépare tes transitions.</span></p>}
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={drag}>
    <SortableContext items={value.map(t => t.id)} strategy={verticalListSortingStrategy}>
    <div className="space-y-2">
    {value.map((item, index) => <TrackRow key={item.id} item={item} index={index} count={value.length} update={next => onChange(value.map(t => t.id === item.id ? next : t))} remove={() => onChange(value.filter(t => t.id !== item.id))} move={to => onChange(arrayMove(value, index, to))}/>)}
    </div>
    </SortableContext>
    </DndContext>
    </Panel>;
}
