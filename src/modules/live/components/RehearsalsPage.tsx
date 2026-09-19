"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Clock3, ListMusic, Mic2, Plus } from "lucide-react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { useLiveData } from "@/hooks/useLiveData";
import { dateISO, todayISO, setlistDuration } from "../lib/live-model";
import { LiveHeader, Segments } from "./shared/LiveUI";
export function RehearsalsPage() {
    const { rehearsals, productions, loading, error } = useLiveData();
    const [period, setPeriod] = useState("upcoming");
    const [search, setSearch] = useState("");
    const params = useSearchParams();
    if (loading)
        return <PageLoader />;
    if (error)
        return <PageError title="Impossible de charger tes répétitions" description={error} onRetry={() => mutate("user_live")}/>;
    const upcoming = rehearsals.filter(r => dateISO(r.date) >= todayISO());
    const shown = rehearsals.filter(r => (period === "past" ? dateISO(r.date) < todayISO() : dateISO(r.date) >= todayISO()) && `${r.label} ${r.location} ${r.city}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => period === "past" ? dateISO(b.date).localeCompare(dateISO(a.date)) : dateISO(a.date).localeCompare(dateISO(b.date)));
    return <div>
    <LiveHeader title="Répétitions" description="Du premier filage au dernier réglage. Fais avancer ton live, séance après séance." actions={<Button asChild>
        <Link href={`/live/repetitions/nouvelle${params.get("projectId") ? `?projectId=${encodeURIComponent(params.get("projectId")!)}` : ""}`}><Plus size={14} className="mr-2"/>Planifier une répétition</Link>
        </Button>}/>
    <div className="mb-6 flex items-center gap-6 rounded-xl border border-sky-400/20 bg-gradient-to-r from-sky-400/[.09] to-transparent p-6">
    <Mic2 size={32} className="text-sky-400"/>
    <div>
    <p className="text-3xl font-light">
    {upcoming.length}
    <span className="ml-3 text-sm text-[#F5F5F5]/60">répétition{upcoming.length > 1 ? "s" : ""} à venir</span>
    </p>
    <p className="mt-2 text-xs text-[#F5F5F5]/50">Une setlist, des objectifs et tout le nécessaire pour travailler.</p>
    </div>
    <Button asChild variant="ghost" className="ml-auto">
    <Link href="/live/spectacles">Mes spectacles <ArrowUpRight size={13} className="ml-2"/></Link>
    </Button>
    </div>
    <div className="mb-5 flex items-center justify-between gap-4">
    <Segments value={period} onChange={setPeriod} items={[{ id: "upcoming", label: "À venir", count: upcoming.length }, { id: "past", label: "Passées", count: rehearsals.length - upcoming.length }]}/>
    <Input aria-label="Rechercher une répétition" className="max-w-60" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}/>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
        {shown.map(r => {
            const show = productions.find(p => p.id === r.details?.productionId);
            const list = r.details?.setlist ?? show?.setlist ?? [];
            return <Link key={r.id} href={`/live/repetitions/${r.id}`} className="group rounded-xl border border-[#F5F5F5]/10 bg-[rgba(44,44,46,.45)] p-5 transition-colors hover:border-sky-400/30">
            <div className="mb-4 flex justify-between text-xs">
            <span className="text-sky-300">{r.date} · {r.time}{r.details?.endTime ? ` — ${r.details.endTime}` : ""}</span>
            <ArrowUpRight size={15} className="text-[#F5F5F5]/30 group-hover:text-sky-300"/>
            </div>
            <h2 className="text-base font-semibold">
            {r.label || "Répétition"}
            </h2>
            <p className="mt-1 text-xs text-[#F5F5F5]/50">
            {r.location}
            {r.city ? ` · ${r.city}` : ""}
            {show ? ` · ${show.title}` : ""}
            </p>
                {r.details?.goals && <p className="mt-4 line-clamp-2 text-sm text-[#F5F5F5]/65">
                {r.details.goals}
                </p>}
            <div className="mt-5 flex gap-4 border-t border-[#F5F5F5]/[.06] pt-3 text-xs text-[#F5F5F5]/50">
            <span className="flex items-center gap-1.5"><ListMusic size={13}/>{list.length} morceaux</span>
            <span className="flex items-center gap-1.5"><Clock3 size={13}/>{setlistDuration(list)} min</span>
            </div>
            </Link>;
        })}
    </div>
    {!shown.length && <EmptyState icon={Mic2} title="Prêt pour la prochaine répétition ?" description="Planifie une séance, choisis la setlist à travailler et note tes objectifs."/>}
    </div>;
}
