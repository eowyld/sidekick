"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, CalendarDays, CheckCircle2, MapPin, Plus, Route } from "lucide-react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { EmptyState } from "@/components/ui/empty-state";
import { useLiveData } from "@/hooks/useLiveData";
import { DATE_STEPS, dateISO, todayISO, progress, KIND_META } from "../lib/live-model";
import { STATUS_META } from "../data/statusMeta";
import { showsOf, tourOptions } from "../lib/live-links";
import { LiveHeader, ProgressBar, Segments, Choice, WriteError } from "./shared/LiveUI";
export function TourDatesPage() {
    const { tourDates: dates, productions, loading, error, sliceError } = useLiveData();
    const params = useSearchParams();
    const [period, setPeriod] = useState(params.get("period") === "past" ? "past" : "upcoming");
    const [search, setSearch] = useState("");
    // `tourId=hors` : les dates jouées hors tournée (lien « Hors tournée » d'une carte).
    const [tour, setTour] = useState(params.get("tourId") ?? "");
    const [show, setShow] = useState(params.get("productionId") ?? "");
    const [status, setStatus] = useState(params.get("status") || "");
    if (loading)
        return <PageLoader />;
    const loadError = sliceError("tourDates");
    if (loadError)
        return <PageError title="Impossible de charger tes dates" description={loadError} onRetry={() => mutate("user_live")}/>;
    const upcoming = dates.filter(d => dateISO(d.date) >= todayISO()).sort((a, b) => dateISO(a.date).localeCompare(dateISO(b.date)));
    const next = upcoming[0];
    const remaining = upcoming.filter(d => progress(DATE_STEPS, d.details?.preparation).percent < 100).length;
    const shown = dates.filter(d => (period === "past" ? dateISO(d.date) < todayISO() : dateISO(d.date) >= todayISO()) && (!show || d.details?.productionId === show) && (!tour || (tour === "hors" ? !d.details?.tourId : d.details?.tourId === tour)) && (!status || d.status === status) && `${d.venue} ${d.city} ${d.organisateur}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => period === "past" ? dateISO(b.date).localeCompare(dateISO(a.date)) : dateISO(a.date).localeCompare(dateISO(b.date)));
    const create = `/live/representations/nouvelle${params.get("projectId") ? `?projectId=${encodeURIComponent(params.get("projectId")!)}` : ""}`;
    return <div>
    <LiveHeader title="Représentations" description="La prochaine scène en ligne de mire. Chaque détail à sa place." actions={<><Button asChild variant="outline">
        <Link href="/live"><Route size={14} className="mr-2"/>Spectacles & tournées</Link>
        </Button><Button asChild>
        <Link href={create}><Plus size={14} className="mr-2"/>Nouvelle date</Link>
        </Button></>}/>
    <WriteError message={error}/>
    <div className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {next ? <Link href={`/live/representations/${next.id}`} className="group relative overflow-hidden rounded-xl border border-[#F0FF00]/20 p-6" style={{ background: "radial-gradient(ellipse at top right,rgba(240,255,0,.13),transparent 65%),rgba(44,44,46,.5)" }}>
        <div className="mb-5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#F0FF00]">Prochaine scène</span>
        <ArrowUpRight size={18} className="text-[#F0FF00] transition-transform group-hover:-translate-y-0.5"/>
        </div>
        <div className="flex items-end justify-between gap-5">
        <div>
        <h2 className="text-2xl font-semibold tracking-tight">
        {next.venue || next.city}
        </h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-[#F5F5F5]/55"><MapPin size={13}/>{next.city} · {next.date}</p>
        </div>
        <span className="rounded-md px-2 py-1 text-xs" style={{ color: STATUS_META[next.status].color, background: `${STATUS_META[next.status].color.startsWith("#") ? STATUS_META[next.status].color : "#888888"}15` }}>
        {next.status}
        </span>
        </div>
        <div className="mt-5">
        <ProgressBar percent={progress(DATE_STEPS, next.details?.preparation).percent}/>
        <p className="mt-2 text-xs text-[#F5F5F5]/55">
        {progress(DATE_STEPS, next.details?.preparation).next ? `À préparer · ${progress(DATE_STEPS, next.details?.preparation).next}` : "Tout est prêt. Place à la scène."}
        </p>
        </div>
        </Link> : <div className="rounded-xl border border-dashed border-[#F0FF00]/20 p-6">
        <CalendarDays className="mb-4 text-[#F0FF00]"/>
        <h2 className="text-lg font-semibold">Une nouvelle scène t’attend</h2>
        <p className="mt-2 text-sm text-[#F5F5F5]/50">Ajoute ta prochaine date, même encore en option.</p>
        </div>}
    <div className="grid grid-cols-2 gap-3">
    <div className="flex flex-col justify-between rounded-xl border border-[#F5F5F5]/10 bg-[rgba(44,44,46,.45)] p-5">
    <CalendarDays size={18} className="text-sky-400"/>
    <div>
    <p className="mt-4 text-4xl font-light tabular-nums">
    {upcoming.length}
    </p>
    <p className="mt-1 text-xs text-[#F5F5F5]/50">dates à venir</p>
    </div>
    </div>
    <div className="flex flex-col justify-between rounded-xl border border-amber-400/15 bg-amber-400/[.04] p-5">
    <CheckCircle2 size={18} className="text-amber-300"/>
    <div>
    <p className="mt-4 text-4xl font-light tabular-nums text-amber-200">
    {remaining}
    </p>
    <p className="mt-1 text-xs text-[#F5F5F5]/50">dates à préparer</p>
    </div>
    </div>
    </div>
    </div>
    <Segments value={period} onChange={setPeriod} items={[{ id: "upcoming", label: "À venir", count: upcoming.length }, { id: "past", label: "Passées", count: dates.length - upcoming.length }]}/>
    <div className="my-5 grid items-end gap-3 md:grid-cols-[1fr_200px_220px_160px]">
    <Input aria-label="Rechercher une date" placeholder="Rechercher un lieu, une ville…" value={search} onChange={e => setSearch(e.target.value)}/>
    <Choice label="Spectacle" optional noneLabel="Tous" value={show} onChange={v => { setShow(v); setTour(""); }} options={showsOf(productions).map(p => ({ value: p.id, label: p.title }))}/>
    <Choice label="Tournée" optional noneLabel="Toutes" value={tour} onChange={setTour} options={[{ value: "hors", label: "Hors tournée" }, ...tourOptions(productions, show || undefined)]}/>
    <Choice label="Statut" optional noneLabel="Tous" value={status} onChange={setStatus} options={Object.keys(STATUS_META).map(value => ({ value, label: value }))}/>
    </div>
    <div className="space-y-2">
        {shown.map(d => {
            const p = progress(DATE_STEPS, d.details?.preparation);
            const production = productions.find(x => x.id === d.details?.productionId);
            const parent = productions.find(x => x.id === d.details?.tourId);
            const day = new Date(`${dateISO(d.date)}T12:00:00`);
            return <Link key={d.id} href={`/live/representations/${d.id}`} className="group flex items-center gap-5 rounded-xl border border-[#F5F5F5]/[.08] bg-[rgba(44,44,46,.4)] px-5 py-4 transition-colors hover:border-[#F5F5F5]/20 hover:bg-[rgba(44,44,46,.7)]">
            <div className="w-12 shrink-0 text-center">
            <p className="text-[10px] uppercase text-[#F5F5F5]/50">
            {Number.isNaN(day.getTime()) ? "—" : day.toLocaleDateString("fr-FR", { month: "short" })}
            </p>
            <p className="text-2xl font-light tabular-nums">
            {Number.isNaN(day.getTime()) ? "—" : day.getDate()}
            </p>
            <p className="text-[10px] text-[#F5F5F5]/35">
            {Number.isNaN(day.getTime()) ? "" : day.getFullYear()}
            </p>
            </div>
            <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold">
            {d.venue || "Lieu à préciser"}
            </h2>
            <span className="text-[10px]" style={{ color: STATUS_META[d.status].color }}>
            {d.status}
            </span>
            </div>
            <p className="mt-1 text-xs text-[#F5F5F5]/50">
            {d.city}
            {production ? ` · ${production.title}` : ""}
            {parent ? ` · ${parent.title}` : ""}
            </p>
                {production && <p className="mt-2 text-[10px]" style={{ color: KIND_META[production.kind].color }}>
                {KIND_META[production.kind].label}
                </p>}
            </div>
            <div className="w-48 shrink-0">
            <div className="mb-2 flex justify-between text-[10px] text-[#F5F5F5]/50">
            <span>
            {p.next || "Prête pour la scène"}
            </span>
            <span>{p.done}/{p.total}</span>
            </div>
            <ProgressBar percent={p.percent} color={p.percent === 100 ? "#34D399" : "#F0FF00"}/>
            </div>
            <ArrowUpRight size={16} className="text-[#F5F5F5]/30 group-hover:text-[#F0FF00]"/>
            </Link>;
        })}
    </div>
    {!shown.length && <EmptyState icon={CalendarDays} title="Aucune date à afficher" description="Ajoute une représentation ou ajuste les filtres pour retrouver tes dates."/>}
    </div>;
}
