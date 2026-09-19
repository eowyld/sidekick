"use client";
import { BedDouble, Plus, TrainFront, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Choice, Panel, TextField } from "./LiveUI";
import type { LogisticsEntry } from "../../lib/live-model";
export function LogisticsEditor({ value, onChange, lodging = false }: {
    value: LogisticsEntry[];
    onChange: (v: LogisticsEntry[]) => void;
    lodging?: boolean;
}) {
    const update = (id: string | number, patch: Partial<LogisticsEntry>) => onChange(value.map(v => v.id === id ? { ...v, ...patch } : v));
    return <Panel title={lodging ? "Logement" : "Transport"} icon={lodging ? BedDouble : TrainFront} color="#38BDF8" action={<Button size="xs" variant="secondary" onClick={() => onChange([...value, { id: crypto.randomUUID(), type: lodging ? "hotel" : "train", amount: "", paymentMode: "self", details: "", ...(lodging ? { nights: "1" } : {}) }])}><Plus size={12} className="mr-1"/>Ajouter</Button>}>
    <div className="space-y-4">
        {value.map((entry, i) => <div key={entry.id} className="space-y-3 rounded-lg border border-[#F5F5F5]/10 p-4">
        <div className="flex items-center justify-between">
        <span className="text-xs text-[#F5F5F5]/50">
        {lodging ? "Hébergement" : "Trajet"}
 
        {i + 1}
        </span>
        <Button variant="ghost" size="xs" aria-label={`Supprimer ${lodging ? "l’hébergement" : "le trajet"} ${i + 1}`} onClick={() => onChange(value.filter(v => v.id !== entry.id))}>
        <Trash2 size={13}/>
        </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
        <Choice label="Type" value={entry.type} onChange={type => update(entry.id, { type })} options={(lodging ? [["hotel", "Hôtel"], ["airbnb", "Location"], ["friend", "Chez des proches"], ["other", "Autre"]] : [["train", "Train"], ["plane", "Avion"], ["car", "Voiture"], ["other", "Autre"]]).map(([value, label]) => ({ value, label }))}/>
        <Choice label="Prise en charge" value={entry.paymentMode} onChange={paymentMode => update(entry.id, { paymentMode: paymentMode as LogisticsEntry["paymentMode"] })} options={[{ value: "self", label: "À ma charge" }, { value: "reimburse", label: "À rembourser" }, { value: "covered", label: "Pris en charge par le lieu" }]}/>
        <TextField label="Montant total (€)" value={entry.amount} type="number" min="0" onChange={amount => update(entry.id, { amount })}/>
        {lodging && <TextField label="Nombre de nuits" value={entry.nights ?? "1"} type="number" min="1" onChange={nights => update(entry.id, { nights })}/>}
        </div>
        <TextField label={lodging ? "Adresse, réservation & consignes" : "Itinéraire, horaires & réservation"} area value={entry.details} onChange={details => update(entry.id, { details })}/>
        </div>)}
        {!value.length && <p className="text-sm text-[#F5F5F5]/50">
        {lodging ? "Ajoute les hébergements nécessaires pour cette date." : "Rassemble tes trajets, horaires et réservations."}
        </p>}
    </div>
    </Panel>;
}
