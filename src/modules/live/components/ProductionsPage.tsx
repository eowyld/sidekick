"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Disc3, Mic2, Plus, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { EmptyState } from "@/components/ui/empty-state";
import { mutate } from "swr";
import { useLiveData } from "@/hooks/useLiveData";
import { KIND_META, productionSteps, progress, setlistDuration } from "../lib/live-model";
import { LiveHeader, ProgressBar, Segments } from "./shared/LiveUI";
export function ProductionsPage() {
    const { productions, tourDates, loading, error } = useLiveData();
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    if (loading)
        return <PageLoader />;
    if (error)
        return <PageError title="Impossible de charger tes spectacles" description={error} onRetry={() => mutate("user_live")}/>;
    const shown = productions.filter(p => (filter === "all" || p.kind === filter) && p.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    return <div>
    <LiveHeader title="Spectacles & tournées" description="Construis ton show, prépare ton set et emmène-les sur scène."/>
    <div className="mb-6 grid gap-3 lg:grid-cols-3">
        {Object.entries(KIND_META).map(([kind, m]) => {
            const Icon = kind === "dj" ? Disc3 : kind === "tour" ? Route : Mic2;
            return <Link key={kind} href={`/live/spectacles/nouveau?kind=${kind}`} className="group relative overflow-hidden rounded-xl border border-[#F5F5F5]/10 p-5 transition-all hover:-translate-y-0.5 hover:border-[#F5F5F5]/25" style={{ background: `linear-gradient(125deg, ${m.color}14, rgba(44,44,46,.4) 75%)` }}>
            <div className="mb-7 flex justify-between">
            <Icon size={24} style={{ color: m.color }}/>
            <Plus size={18} className="text-[#F5F5F5]/40 group-hover:text-[#F5F5F5]"/>
            </div>
            <h2 className="text-base font-semibold">
            {m.label}
            </h2>
            <p className="mt-1 text-xs text-[#F5F5F5]/50">
            {m.hint}
            </p>
            </Link>;
        })}
    </div>
    <div className="mb-4 flex items-center justify-between gap-4">
    <Segments value={filter} onChange={setFilter} items={[{ id: "all", label: "Tout", count: productions.length }, ...Object.entries(KIND_META).map(([id, m]) => ({ id, label: m.plural, count: productions.filter(p => p.kind === id).length }))]}/>
    <Input aria-label="Rechercher un spectacle ou une tournée" placeholder="Rechercher…" className="max-w-52" value={search} onChange={e => setSearch(e.target.value)}/>
    </div>
        {!shown.length ? <EmptyState icon={Mic2} title={productions.length ? "Aucun résultat" : "Ton prochain live commence ici"} description={productions.length ? "Essaie un autre nom ou un autre filtre." : "Choisis un spectacle, un DJ set ou une tournée pour préparer ta prochaine scène."}/> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map(p => {
                const m = KIND_META[p.kind];
                const pr = progress(productionSteps(p.kind), p.preparation);
                const dates = tourDates.filter(d => d.details?.productionId === p.id || d.details?.tourId === p.id);
                return <Link key={p.id} href={`/live/spectacles/${p.id}`} className="group rounded-xl border border-[#F5F5F5]/10 bg-[rgba(44,44,46,.45)] p-5 transition-colors hover:border-[#F5F5F5]/25">
                <div className="flex justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: m.color }}>
                {m.label}
                </span>
                <ArrowUpRight size={16} className="text-[#F5F5F5]/30 group-hover:text-[#F5F5F5]"/>
                </div>
                <h2 className="mt-5 truncate text-lg font-semibold">
                {p.title}
                </h2>
                <p className="mt-1 line-clamp-2 min-h-9 text-xs text-[#F5F5F5]/50">
                {p.description || "Prépare les prochaines étapes de ton live."}
                </p>
                <div className="my-5 flex gap-4 text-xs text-[#F5F5F5]/60">
                <span>{dates.length} date{dates.length > 1 ? "s" : ""}</span>
                {p.kind !== "tour" && <span>{p.setlist.length} morceaux · {setlistDuration(p.setlist)} min</span>}
                </div>
                <ProgressBar percent={pr.percent} color={m.color}/>
                <p className="mt-2 text-xs text-[#F5F5F5]/50">
                {pr.next || "Tout est prêt pour la scène"}
                <span className="float-right" style={{ color: m.color }}>{pr.percent}%</span>
                </p>
                </Link>;
            })}
        </div>}
    <div className="mt-6">
    <Button asChild variant="ghost">
    <Link href="/live/representations">Voir toutes les représentations <ArrowUpRight size={14} className="ml-2"/></Link>
    </Button>
    </div>
    </div>;
}
