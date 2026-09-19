"use client";
import { useLiveData } from "@/hooks/useLiveData";
import { useState } from "react";
import { Euro, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIncomesData, type Invoice, type IntermittenceMission } from "@/hooks/useIncomesData";
import { InvoiceEditDialog } from "@/modules/incomes/components/InvoiceEditDialog";
import { MissionEditDialog } from "@/modules/incomes/components/MissionEditDialog";
import { Choice, Panel } from "./LiveUI";
import { money } from "../../lib/live-model";
export function LiveIncomePanel({ invoiceIds, missionIds, onChange, title, date, organiser, projectId, dateId }: {
    invoiceIds: string[];
    missionIds: string[];
    onChange: (invoices: string[], missions: string[]) => void;
    title: string;
    date: string;
    organiser: string;
    projectId?: string;
    dateId: string;
}) {
    const { tourDates } = useLiveData();
    const usedInvoices = new Set(tourDates.filter(d => String(d.id) !== dateId).flatMap(d => d.invoiceIds ?? []));
    const usedMissions = new Set(tourDates.filter(d => String(d.id) !== dateId).flatMap(d => d.missionIds ?? []));
    const { invoices, missions, setInvoices, setMissions, error } = useIncomesData();
    const [invoiceDialog, setInvoiceDialog] = useState<{
        invoice?: Invoice;
    } | null>(null);
    const [missionDialog, setMissionDialog] = useState<{
        mission?: IntermittenceMission;
    } | null>(null);
    const linkedInvoices = invoices.filter(i => invoiceIds.includes(i.id));
    const linkedMissions = missions.filter(m => missionIds.includes(m.id));
    return <Panel title="Rémunération" icon={Euro} color="#34D399">
    <div className="mb-5 grid grid-cols-2 gap-3">
    <div>
    <p className="text-xl font-light">{linkedInvoices.reduce((n, i) => n + money(i.amount), 0).toLocaleString("fr-FR")} €</p>
    <p className="mt-1 text-xs text-[#F5F5F5]/50">factures associées</p>
    </div>
    <div>
    <p className="text-xl font-light">{linkedMissions.reduce((n, m) => n + money(m.netAmount), 0).toLocaleString("fr-FR")} €</p>
    <p className="mt-1 text-xs text-[#F5F5F5]/50">cachets nets</p>
    </div>
    </div>
        {error && <p role="alert" className="mb-3 text-xs text-rose-300">
        {error}
        </p>}
    <div className="space-y-2">
        {linkedInvoices.map(i => <div key={i.id} className="flex items-center gap-2 rounded-md bg-[#101010]/40 p-3">
        <button type="button" className="flex-1 text-left text-xs hover:text-[#F0FF00]" onClick={() => setInvoiceDialog({ invoice: i })}>{i.number} · {i.client} · {i.amount} € <span className="text-[#F5F5F5]/40">
        {i.status === "payee" ? "Payée" : "En attente"}
        </span></button>
        <Button variant="ghost" size="xs" aria-label={`Délier la facture ${i.number}`} onClick={() => onChange(invoiceIds.filter(id => id !== i.id), missionIds)}>
        <X size={12}/>
        </Button>
        </div>)}
        {linkedMissions.map(m => <div key={m.id} className="flex items-center gap-2 rounded-md bg-[#101010]/40 p-3">
        <button type="button" className="flex-1 text-left text-xs hover:text-[#F0FF00]" onClick={() => setMissionDialog({ mission: m })}>{m.employer} · {m.netAmount} € net · {m.hours} h</button>
        <Button variant="ghost" size="xs" aria-label={`Délier le cachet ${m.employer}`} onClick={() => onChange(invoiceIds, missionIds.filter(id => id !== m.id))}>
        <X size={12}/>
        </Button>
        </div>)}
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
    <Choice label="Lier une facture existante" value="" onChange={id => id && onChange([...invoiceIds, id], missionIds)} options={invoices.filter(i => !invoiceIds.includes(i.id) && !usedInvoices.has(i.id)).map(i => ({ value: i.id, label: `${i.number} · ${i.client}` }))}/>
    <Choice label="Lier un cachet existant" value="" onChange={id => id && onChange(invoiceIds, [...missionIds, id])} options={missions.filter(m => !missionIds.includes(m.id) && !usedMissions.has(m.id)).map(m => ({ value: m.id, label: `${m.employer} · ${m.date}` }))}/>
    </div>
    <div className="mt-4 flex gap-2">
    <Button size="sm" variant="secondary" onClick={() => setInvoiceDialog({})}><Plus size={12} className="mr-1"/>Créer une facture</Button>
    <Button size="sm" variant="outline" onClick={() => setMissionDialog({})}><Plus size={12} className="mr-1"/>Créer un cachet</Button>
    </div>
    <p className="mt-3 text-xs text-[#F5F5F5]/45">Enregistre la date pour conserver les liens. Les factures et cachets restent accessibles dans Revenus.</p>
    {invoiceDialog && <InvoiceEditDialog open onOpenChange={open => !open && setInvoiceDialog(null)} invoice={invoiceDialog.invoice} defaults={{ subject: `Représentation ${title} — ${date}`, client: organiser, number: `${new Date().getFullYear()}-${String(Math.max(0, ...invoices.map(i => Number(i.number.match(/-(\d+)$/)?.[1]) || 0)) + 1).padStart(3, "0")}` }} onSave={async invoice => {
        const next = { ...invoiceDialog.invoice, ...invoice, projectId: invoiceDialog.invoice?.projectId ?? projectId };
        const saved = await setInvoices(prev => prev.some(i => i.id === next.id) ? prev.map(i => i.id === next.id ? next : i) : [...prev, next]);
        if (!saved) return false;
        if (!invoiceIds.includes(next.id)) onChange([...invoiceIds, next.id], missionIds);
        return true;
    }}/>}
    {missionDialog && <MissionEditDialog open onOpenChange={open => !open && setMissionDialog(null)} mission={missionDialog.mission} defaults={{ date, employer: organiser }} onSave={async mission => {
        const next = { ...missionDialog.mission, ...mission };
        const saved = await setMissions(prev => prev.some(m => m.id === next.id) ? prev.map(m => m.id === next.id ? next : m) : [...prev, next]);
        if (!saved) return false;
        if (!missionIds.includes(next.id)) onChange(invoiceIds, [...missionIds, next.id]);
        return true;
    }}/>}
    </Panel>;
}
