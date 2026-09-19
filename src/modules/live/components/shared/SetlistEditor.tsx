"use client";
import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, ListMusic, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePhonoData } from "@/hooks/usePhonoData";
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
    <Input aria-label={`Titre ${index + 1}`} placeholder="Titre du morceau" value={item.title} onChange={e => update({ ...item, title: e.target.value })} className="flex-1"/>
    <Input aria-label={`Durée ${index + 1} en minutes et secondes`} placeholder="3:30" value={item.duration} onChange={e => update({ ...item, duration: e.target.value })} className="w-20"/>
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
    const { tracks, error } = usePhonoData();
    const [source, setSource] = useState("");
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const add = () => { const track = tracks.find(t => t.id === source); onChange([...value, { id: crypto.randomUUID(), title: track?.title ?? "", artist: track?.mainArtist ?? "", duration: "", note: "", ...(track ? { trackId: track.id } : {}) }]); setSource(""); };
    const drag = ({ active, over }: DragEndEvent) => { if (over && active.id !== over.id)
        onChange(arrayMove(value, value.findIndex(t => t.id === active.id), value.findIndex(t => t.id === over.id))); };
    return <Panel title={dj ? "Sélection & ordre du DJ set" : "Setlist"} icon={ListMusic} color={dj ? "#A78BFA" : "#F0FF00"} description={`${value.length} morceau${value.length > 1 ? "x" : ""} · ${setlistDuration(value)} min`}>
    <div className="mb-4 flex items-end gap-2">
    <div className="flex-1">
    <Choice label="Ajouter à la setlist" value={source} onChange={setSource} placeholder="Morceau libre / reprise" options={tracks.map(t => ({ value: t.id, label: `${t.title} — ${t.mainArtist || "Sans artiste"}` }))}/>
    </div>
    <Button size="sm" variant="secondary" onClick={add}><Plus size={14} className="mr-1"/>Ajouter</Button>
    </div>
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
