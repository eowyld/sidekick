import Link from "next/link";
import { ArrowUpRight, CalendarDays, Disc3, FileText, ListMusic, Mic2, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KIND_META, setlistDuration, type LiveProduction } from "../../lib/live-model";
import { isUpcoming, looseDatesOf, nextUp, plural, relativeDay, toursOf } from "../../lib/live-links";
import { productionProgress, type ProgressContext } from "../../lib/live-progress";
import { ProgressBar } from "../shared/LiveUI";
import { TourRow } from "./TourRow";

/** Un spectacle ou un DJ set, avec l'état de l'objet et tout ce qui en découle. */
export function ShowCard({ show, productions, ctx }: { show: LiveProduction; productions: LiveProduction[]; ctx: ProgressContext }) {
    const meta = KIND_META[show.kind];
    const Icon = show.kind === "dj" ? Disc3 : Mic2;
    const pr = productionProgress(show, ctx);
    const tours = toursOf(show.id, productions);
    const loose = looseDatesOf(show.id, ctx.tourDates);
    const looseUpcoming = loose.filter(d => isUpcoming(d.date, ctx.today)).length;
    const next = nextUp(ctx.tourDates.filter(d => d.details?.productionId === show.id), ctx.rehearsals.filter(r => r.details?.productionId === show.id), ctx.today);
    const technicalReady = pr.steps.find(s => s.id === "technical")?.computed;
    return <article className="flex flex-col rounded-xl border border-[#F5F5F5]/10 p-5" style={{ background: `linear-gradient(160deg, ${meta.color}10, rgba(44,44,46,.45) 45%)` }}>
    <div className="flex items-center justify-between">
    <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: meta.color }}><Icon size={13}/>{meta.label}</span>
    <span className="text-xs tabular-nums" style={{ color: meta.color }}>{pr.percent}%</span>
    </div>
    <Link href={`/live/spectacles/${show.id}`} className="group mt-4 flex items-center gap-2">
    <h2 className="truncate text-lg font-semibold group-hover:text-[#F0FF00]">{show.title || "Sans titre"}</h2>
    <ArrowUpRight size={15} className="shrink-0 text-[#F5F5F5]/30 group-hover:text-[#F0FF00]"/>
    </Link>
    <div className="mt-3">
    <ProgressBar percent={pr.percent} color={meta.color}/>
    <p className="mt-1.5 text-xs text-[#F5F5F5]/50">{pr.next ? `Prochaine étape · ${pr.next}` : "Prêt pour la scène"}</p>
    </div>
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#F5F5F5]/60">
    <span className="flex items-center gap-1.5"><ListMusic size={13}/>{plural(show.setlist.length, "morceau", "morceaux")} · {setlistDuration(show.setlist)} min</span>
    <span className="flex items-center gap-1.5"><FileText size={13}/>{technicalReady ? "Fiche technique prête" : "Fiche technique à compléter"}</span>
    <span className="flex items-center gap-1.5"><Package size={13}/>{[show.equipmentListIds.length > 0 && plural(show.equipmentListIds.length, "liste de matériel", "listes de matériel"), show.technical.brought.length > 0 && plural(show.technical.brought.length, "ajout")].filter(Boolean).join(" · ") || "Aucun matériel apporté"}</span>
    </div>
    <div className="mt-5 flex-1 space-y-2">
    <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#F5F5F5]/40">Sur la route</p>
    {tours.map(t => <TourRow key={t.id} tour={t} ctx={ctx}/>)}
    {loose.length > 0 && <Link href={`/live/representations?productionId=${show.id}&tourId=hors${looseUpcoming ? "" : "&period=past"}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#F5F5F5]/[.07] bg-[#101010]/40 p-3 text-sm transition-colors hover:border-[#F5F5F5]/25">
        <span className="flex items-center gap-2"><CalendarDays size={14} className="text-[#F5F5F5]/50"/>Hors tournée</span>
        <span className="text-[11px] text-[#F5F5F5]/50">{plural(loose.length, "date")}{looseUpcoming ? `, ${looseUpcoming} à venir` : ""}</span>
        </Link>}
    {!tours.length && !loose.length && <p className="text-xs text-[#F5F5F5]/45">Pas encore de date. Monte une tournée ou ajoute une date isolée.</p>}
    </div>
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#F5F5F5]/[.06] pt-3">
    <span className="min-w-0 truncate text-xs text-[#F5F5F5]/55">
    {next ? <Link href={next.href} className="hover:text-[#F0FF00]">{next.kind === "rehearsal" ? "Répétition" : "Date"} · {next.title} · {relativeDay(next.date, ctx.today)}</Link> : "Rien de prévu"}
    </span>
    <Button asChild size="xs" variant="secondary">
    <Link href={`/live/spectacles/nouveau?kind=tour&productionId=${show.id}`}><Plus size={12} className="mr-1"/>Monter une tournée</Link>
    </Button>
    </div>
    </article>;
}
