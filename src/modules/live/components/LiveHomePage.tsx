"use client";
import { useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { CalendarClock, Disc3, Mic2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageError } from "@/components/ui/page-error";
import { PageLoader } from "@/components/ui/page-loader";
import { useLiveData } from "@/hooks/useLiveData";
import { STATUS_META } from "../data/statusMeta";
import { KIND_META, todayISO } from "../lib/live-model";
import { isUpcoming, linkIssues, nextUp, relativeDay, showsOf } from "../lib/live-links";
import type { ProgressContext } from "../lib/live-progress";
import { Jump, LiveHeader, Segments, WriteError } from "./shared/LiveUI";
import { OrphanZone } from "./spectacles/OrphanZone";
import { ShowCard } from "./spectacles/ShowCard";

/** Tour de contrôle Live : chaque spectacle / DJ set, ses tournées, ce qui arrive. */
export function LiveHomePage() {
    const live = useLiveData();
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    if (live.loading)
        return <PageLoader />;
    // Les cartes croisent les quatre tranches : sans l'une d'elles, elles
    // afficheraient une progression fausse plutôt qu'une absence.
    const loadError = live.sliceError("productions", "tourDates", "rehearsals", "prospection");
    if (loadError)
        return <PageError title="Impossible de charger tes spectacles" description={loadError} onRetry={() => mutate("user_live")}/>;
    const today = todayISO();
    const ctx: ProgressContext = { tourDates: live.tourDates, rehearsals: live.rehearsals, prospection: live.prospection, today };
    const shows = showsOf(live.productions);
    const shown = shows.filter(p => (filter === "all" || p.kind === filter) && p.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    const upcomingDates = live.tourDates.filter(d => isUpcoming(d.date, today));
    const pending = upcomingDates.filter(d => d.status === "En option").length;
    const next = nextUp(live.tourDates, live.rehearsals, today);
    return <div>
    <LiveHeader title="Spectacles & tournées" description="Tes lives, les tournées qui les emmènent, et tout ce qui les fait avancer." actions={<>
        <Button asChild variant="outline"><Link href="/live/spectacles/nouveau?kind=dj"><Disc3 size={14} className="mr-2"/>DJ set</Link></Button>
        <Button asChild><Link href="/live/spectacles/nouveau?kind=show"><Plus size={14} className="mr-2"/>Spectacle</Link></Button>
        </>}/>
    <WriteError message={live.error}/>
    <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-[#F5F5F5]/[.08] bg-[rgba(44,44,46,.45)] px-5 py-4">
    <div className="flex min-w-0 items-center gap-3">
    <CalendarClock size={18} className="shrink-0 text-[#F0FF00]"/>
        {next ? <Link href={next.href} className="min-w-0 hover:text-[#F0FF00]">
        <p className="text-[10px] uppercase tracking-[.14em] text-[#F5F5F5]/45">Prochaine échéance · {relativeDay(next.date, today)}</p>
        <p className="truncate text-sm font-medium">{next.kind === "rehearsal" ? "Répétition" : "Date"} · {next.title}</p>
        </Link> : <p className="text-sm text-[#F5F5F5]/55">Rien de prévu pour le moment</p>}
    </div>
    <div className="ml-auto flex flex-wrap gap-6 text-xs text-[#F5F5F5]/55">
    <Link href="/live/representations" className="hover:text-[#F5F5F5]"><span className="mr-1.5 text-lg font-light tabular-nums text-[#F5F5F5]">{upcomingDates.length}</span>{upcomingDates.length > 1 ? "dates à venir" : "date à venir"}</Link>
        {pending > 0 && <Link href={`/live/representations?status=${encodeURIComponent("En option")}`} className="hover:text-[#F5F5F5]"><span className="mr-1.5 text-lg font-light tabular-nums" style={{ color: STATUS_META["En option"].color }}>{pending}</span>encore en option</Link>}
    </div>
    </div>
    <OrphanZone issues={linkIssues(live.productions, live.tourDates, live.rehearsals, today)}/>
        {!shows.length ? <div>
        <EmptyState icon={Mic2} title="Ton prochain live commence ici" description="Crée un spectacle ou un DJ set. Tu pourras ensuite l’emmener en tournée, planifier ses répétitions et démarcher des lieux."/>
        <div className="flex justify-center"><Jump href="/live/representations/nouvelle">Ajouter une date</Jump><Jump href="/live/repetitions/nouvelle">Planifier une répétition</Jump></div>
        </div> : <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <Segments value={filter} onChange={setFilter} items={[{ id: "all", label: "Tout", count: shows.length }, { id: "show", label: KIND_META.show.plural, count: shows.filter(p => p.kind === "show").length }, { id: "dj", label: KIND_META.dj.plural, count: shows.filter(p => p.kind === "dj").length }]}/>
        <div className="w-full max-w-52">
        <Input aria-label="Rechercher un spectacle ou un DJ set" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        </div>
            {shown.length ? <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {shown.map(show => <ShowCard key={show.id} show={show} productions={live.productions} ctx={ctx}/>)}
            </div> : <EmptyState icon={Mic2} title="Aucun résultat" description="Essaie un autre nom ou un autre filtre."/>}
        </>}
    </div>;
}
