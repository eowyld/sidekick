"use client";
import { Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveData } from "@/hooks/useLiveData";
import type { LiveDetails } from "../../lib/live-model";
import { showsOf, type LinkIssue } from "../../lib/live-links";
import { Choice } from "../shared/LiveUI";

type Mismatch = Extract<LinkIssue, { type: "mismatch" }>;

/** Ce qui contredit « une tournée = un spectacle ». Disparaît une fois vide. */
export function OrphanZone({ issues }: { issues: LinkIssue[] }) {
    const live = useLiveData();
    if (!issues.length)
        return null;
    const shows = showsOf(live.productions).map(p => ({ value: p.id, label: p.title }));
    const titleOf = (id: string) => live.productions.find(p => p.id === id)?.title ?? "un autre live";
    const fix = (issue: Mismatch, patch: Partial<LiveDetails>) => issue.event === "date"
        ? void live.setTourDates(prev => prev.map(d => String(d.id) === issue.id ? { ...d, details: { ...d.details, ...patch } } : d))
        : void live.setRehearsals(prev => prev.map(r => String(r.id) === issue.id ? { ...r, details: { ...r.details, ...patch } } : r));
    return <section className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/[.05] p-5">
    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
    <h2 className="flex items-center gap-2 text-sm font-semibold"><Unlink size={15} className="text-amber-300"/>À rattacher</h2>
    <p className="text-xs text-[#F5F5F5]/50">Une tournée part toujours avec un spectacle ou un DJ set, et chaque date dit quel live elle joue.</p>
    </div>
    <ul className="space-y-2">
        {issues.map(issue => {
            if (issue.type === "tour-without-show")
                return <li key={`tour-${issue.tour.id}`} className="grid items-end gap-3 rounded-lg bg-[#101010]/40 p-3 md:grid-cols-[1fr_260px]">
                <p className="text-sm">Tournée « {issue.tour.title || "sans titre"} » : quel live emmène-t-elle ?</p>
                <Choice label="Spectacle ou DJ set" value="" placeholder="Choisir" onChange={productionId => { if (productionId) void live.setProductions(prev => prev.map(p => p.id === issue.tour.id ? { ...p, productionId } : p)); }} options={shows}/>
                </li>;
            if (issue.type === "date-without-show")
                return <li key={`date-${issue.date.id}`} className="grid items-end gap-3 rounded-lg bg-[#101010]/40 p-3 md:grid-cols-[1fr_260px]">
                <p className="text-sm">Date « {issue.date.venue || issue.date.city || "sans lieu"} » du {issue.date.date} : quel live y est joué ?</p>
                <Choice label="Spectacle ou DJ set" value="" placeholder="Choisir" onChange={productionId => { if (productionId) void live.setTourDates(prev => prev.map(d => d.id === issue.date.id ? { ...d, details: { ...d.details, productionId } } : d)); }} options={shows}/>
                </li>;
            return <li key={`${issue.event}-${issue.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#101010]/40 p-3">
            <p className="min-w-0 text-sm">{issue.event === "date" ? "La date" : "La répétition"} « {issue.title} » du {issue.date} joue « {titleOf(issue.productionId)} », mais sa tournée « {issue.tour.title} » emmène « {titleOf(issue.tour.productionId ?? "")} ».</p>
            <div className="flex shrink-0 gap-2">
            <Button size="xs" variant="secondary" onClick={() => fix(issue, { productionId: issue.tour.productionId })}>Aligner sur la tournée</Button>
            <Button size="xs" variant="ghost" onClick={() => fix(issue, { tourId: undefined })}>Sortir de la tournée</Button>
            </div>
            </li>;
        })}
    </ul>
    </section>;
}
