"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Mic2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useLiveData, type RehearsalItem } from "@/hooks/useLiveData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { dateFR, emptyTechnical, type LiveProduction } from "../../lib/live-model";
import { cloneTechnical } from "../../lib/live-equipment";
import { byDate } from "../../lib/live-links";
import { Choice, Panel } from "../shared/LiveUI";
import { EventLine } from "./TourSections";

/**
 * Les répétitions d'un spectacle ou d'une tournée : les lister, en créer une
 * en deux clics, rattacher une répétition existante ou la détacher. Le détail
 * se gère dans le module Répétitions.
 */
export function RehearsalsPanel({ owner, title = "Répétitions", description, notice }: {
    owner: LiveProduction;
    title?: string;
    description?: string;
    notice?: ReactNode;
}) {
    const { productions, rehearsals, setRehearsals } = useLiveData();
    const [creating, setCreating] = useState(false);
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [label, setLabel] = useState("");
    const tour = owner.kind === "tour";
    const showId = tour ? owner.productionId : owner.id;
    const show = productions.find(p => p.id === showId);
    const linked = byDate(rehearsals.filter(r => tour ? r.details?.tourId === owner.id : r.details?.productionId === owner.id));
    // Rattachables sans contredire un autre lien : sans spectacle, ou déjà du bon spectacle pour une tournée.
    const candidates = byDate(rehearsals.filter(r => tour ? !r.details?.tourId && (!r.details?.productionId || r.details.productionId === showId) : !r.details?.productionId && !r.details?.tourId));
    const manage = `/live/repetitions?${tour ? `tourId=${owner.id}` : `productionId=${owner.id}`}`;
    const link = (id: string) => void setRehearsals(prev => prev.map(r => String(r.id) !== id ? r : { ...r, details: { ...r.details, productionId: showId, ...(tour ? { tourId: owner.id } : {}) } }));
    const unlink = (r: RehearsalItem) => void setRehearsals(prev => prev.map(x => x.id !== r.id ? x : { ...x, details: { ...x.details, ...(tour ? { tourId: undefined } : { productionId: undefined, tourId: undefined }) } }));
    const create = async () => {
        if (!date) {
            toast.error("Choisis la date de la répétition.");
            return;
        }
        const next: RehearsalItem = { id: crypto.randomUUID(), label: label.trim() || "Répétition", date: dateFR(date), time, location: "", remunerations: [], equipments: [], details: { productionId: showId, ...(tour ? { tourId: owner.id } : {}), setlist: show?.setlist.map(t => ({ ...t })) ?? [], technical: show ? cloneTechnical(show.technical) : emptyTechnical(), equipmentListIds: [...new Set([...(show?.equipmentListIds ?? []), ...(tour ? owner.equipmentListIds : [])])] } };
        if (await setRehearsals(prev => [...prev, next])) {
            setDate("");
            setTime("");
            setLabel("");
            setCreating(false);
            toast.success("Répétition ajoutée");
        }
    };
    return <Panel title={title} icon={Mic2} color="#38BDF8" description={description} action={<Button asChild size="xs" variant="secondary"><Link href={manage}>Gérer<ArrowUpRight size={12} className="ml-1"/></Link></Button>}>
    <div className="space-y-2">
    {notice}
    {linked.map(r => <div key={r.id} className="flex items-center gap-1">
        <div className="min-w-0 flex-1"><EventLine href={`/live/repetitions/${r.id}`} title={[r.label || "Répétition", r.location || r.city].filter(Boolean).join(" · ")} date={r.date}/></div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => unlink(r)} aria-label={`Détacher « ${r.label || "Répétition"} » ${tour ? "de la tournée" : "du live"}`}><X size={13}/></Button>
        </div>)}
    {!linked.length && <p className="text-sm text-[#F5F5F5]/50">Aucune répétition pour l’instant.</p>}
    {creating
        ? <div className="space-y-3 rounded-lg border border-[#F5F5F5]/[.09] p-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
        <DatePicker id={`rehearsal-date-${owner.id}`} value={date} onChange={setDate}/>
        <Input type="time" aria-label="Heure de début" value={time} onChange={e => setTime(e.target.value)}/>
        </div>
        <Input aria-label="Nom de la répétition" placeholder="Filage, résidence, raccord…" value={label} onChange={e => setLabel(e.target.value)}/>
        <div className="flex justify-end gap-2">
        <Button type="button" size="xs" variant="ghost" onClick={() => setCreating(false)}>Annuler</Button>
        <Button type="button" size="xs" onClick={() => void create()}>Ajouter</Button>
        </div>
        </div>
        : <div className="flex flex-wrap items-end gap-3 pt-1">
        <Button type="button" size="xs" variant="secondary" onClick={() => setCreating(true)}><Plus size={12} className="mr-1"/>Nouvelle répétition</Button>
        {candidates.length > 0 && <div className="min-w-0 flex-1 sm:max-w-64"><Choice label="Rattacher une répétition existante" value="" placeholder="Choisir une répétition" onChange={id => id && link(id)} options={candidates.map(r => ({ value: String(r.id), label: `${r.label || "Répétition"} · ${r.date}` }))}/></div>}
        </div>}
    </div>
    </Panel>;
}
