import Link from "next/link";
import { CalendarDays, Map as MapIcon, Plus, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUS_META } from "../../data/statusMeta";
import { dateISO, type LiveProduction } from "../../lib/live-model";
import { byDate, inTour, isUpcoming, plural, prospectsOf } from "../../lib/live-links";
import type { ProgressContext } from "../../lib/live-progress";
import { Panel } from "../shared/LiveUI";
import { StatusSplit } from "./StatusSplit";
import { TourMap } from "./TourMap";
import { RehearsalsPanel } from "./RehearsalsPanel";

export function EventLine({ href, title, date, tag, tagColor }: { href: string; title: string; date: string; tag?: string; tagColor?: string }) {
    return <Link href={href} className="flex items-center justify-between gap-3 rounded-lg bg-[#101010]/40 p-3 text-sm hover:text-[#F0FF00]">
    <span className="min-w-0 truncate">{title}</span>
    <span className="flex shrink-0 items-center gap-3 text-xs text-[#F5F5F5]/50">
    {tag && <span style={{ color: tagColor }}>{tag}</span>}
    {date}
    </span>
    </Link>;
}

/** Le corps d'une fiche de tournée : la campagne lue en entier. */
export function TourSections({ tour, ctx }: { tour: LiveProduction; ctx: ProgressContext }) {
    const dates = byDate(inTour(tour.id, ctx.tourDates));
    const rehearsals = byDate(inTour(tour.id, ctx.rehearsals));
    const prospects = prospectsOf(tour.id, ctx.prospection);
    const firstUpcoming = dates.find(d => isUpcoming(d.date, ctx.today));
    const warmup = firstUpcoming ? rehearsals.filter(r => isUpcoming(r.date, ctx.today) && dateISO(r.date) <= dateISO(firstUpcoming.date)) : [];
    const byStatus = Object.entries(prospects.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }), {}));
    const query = `productionId=${tour.productionId ?? ""}&tourId=${tour.id}`;
    const add = (href: string, label: string) => <Button asChild size="xs" variant="secondary"><Link href={href}><Plus size={12} className="mr-1"/>{label}</Link></Button>;
    return <>
    <Panel title="Dates" icon={CalendarDays} description={dates.length ? plural(dates.length, "date") : undefined} action={add(`/live/representations/nouvelle?${query}`, "Ajouter une date")}>
    <div className="space-y-2">
    <StatusSplit dates={dates.filter(d => isUpcoming(d.date, ctx.today))}/>
    {dates.map(d => <EventLine key={d.id} href={`/live/representations/${d.id}`} title={[d.venue || "Lieu à préciser", d.city].filter(Boolean).join(" · ")} date={d.date} tag={d.status} tagColor={STATUS_META[d.status].color}/>)}
    {!dates.length && <p className="text-sm text-[#F5F5F5]/50">Aucune date pour l’instant.</p>}
    </div>
    </Panel>
    <RehearsalsPanel owner={tour} title="Répétitions de la tournée" description="Résidence, filage avant le départ, raccords." notice={firstUpcoming && (warmup.length
        ? <p className="text-xs text-[#F5F5F5]/55">{plural(warmup.length, "répétition prévue", "répétitions prévues")} avant la première date.</p>
        : <p className="rounded-lg border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-xs text-amber-200">Aucune répétition prévue avant la première date ({firstUpcoming.date}).</p>)}/>
    <Panel title="Prospection" icon={Radar} color="#FB923C" description={prospects.length ? plural(prospects.length, "lieu démarché", "lieux démarchés") : undefined} action={add(`/live/prospection?tourId=${tour.id}`, "Démarcher un lieu")}>
    <div className="space-y-3">
    {byStatus.length > 0 && <div className="flex flex-wrap gap-2 text-xs">
        {byStatus.map(([status, count]) => <span key={status} className="rounded-md bg-[#F5F5F5]/[.06] px-2 py-1"><span className="tabular-nums text-[#F5F5F5]">{count}</span> <span className="text-[#F5F5F5]/55">{status}</span></span>)}
    </div>}
    {prospects.map(p => <Link key={p.id} href={`/live/prospection?tourId=${tour.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-[#101010]/40 p-3 text-sm hover:text-[#F0FF00]">
        <span className="min-w-0 truncate">{[p.venueName, p.city].filter(Boolean).join(" · ")}</span>
        <span className="shrink-0 text-xs text-[#F5F5F5]/50">{p.status}</span>
        </Link>)}
    {!prospects.length && <p className="text-sm text-[#F5F5F5]/50">Aucun lieu démarché pour cette tournée.</p>}
    </div>
    </Panel>
    <Panel title="Itinéraire" icon={MapIcon} color="#38BDF8">
    <TourMap dates={dates} rehearsals={rehearsals}/>
    </Panel>
    </>;
}
