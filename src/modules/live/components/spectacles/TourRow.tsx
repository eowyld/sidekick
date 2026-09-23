import Link from "next/link";
import { Route } from "lucide-react";
import type { LiveProduction } from "../../lib/live-model";
import { byDate, inTour, isUpcoming, plural, prospectsOf } from "../../lib/live-links";
import { productionProgress, type ProgressContext } from "../../lib/live-progress";
import { ProgressBar } from "../shared/LiveUI";
import { StatusSplit } from "./StatusSplit";

export const TOUR_COLOR = "#38BDF8";

/** Une tournée, résumée en une ligne cliquable : dans une carte de spectacle ou sa fiche. */
export function TourRow({ tour, ctx }: { tour: LiveProduction; ctx: ProgressContext }) {
    const dates = byDate(inTour(tour.id, ctx.tourDates));
    const rehearsals = inTour(tour.id, ctx.rehearsals);
    const prospects = prospectsOf(tour.id, ctx.prospection);
    const pr = productionProgress(tour, ctx);
    const period = !dates.length ? "Pas encore de date" : dates.length === 1 ? dates[0].date : `${dates[0].date} → ${dates[dates.length - 1].date}`;
    return <Link href={`/live/spectacles/${tour.id}`} className="group block rounded-lg border border-[#F5F5F5]/[.07] bg-[#101010]/40 p-3 transition-colors hover:border-[#38BDF8]/40">
    <div className="flex items-center justify-between gap-3">
    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
    <Route size={14} className="shrink-0" style={{ color: TOUR_COLOR }}/>
    <span className="truncate group-hover:text-[#38BDF8]">{tour.title || "Tournée sans titre"}</span>
    </span>
    <span className="shrink-0 text-[11px] text-[#F5F5F5]/45">{period}</span>
    </div>
    <p className="mt-1.5 text-[11px] text-[#F5F5F5]/50">
    {plural(dates.length, "date")} · {plural(rehearsals.length, "répétition")} · {plural(prospects.length, "lieu démarché", "lieux démarchés")}
    </p>
    <div className="mt-2.5 space-y-1.5">
    <StatusSplit dates={dates.filter(d => isUpcoming(d.date, ctx.today))}/>
    <ProgressBar percent={pr.percent} color={TOUR_COLOR}/>
    </div>
    <p className="mt-1.5 flex justify-between gap-3 text-[11px] text-[#F5F5F5]/45">
    <span className="truncate">{pr.finished ? "Tournée terminée" : pr.next ? `Prochaine étape · ${pr.next}` : "Tournée prête"}</span>
    <span style={{ color: TOUR_COLOR }}>{pr.percent}%</span>
    </p>
    </Link>;
}
