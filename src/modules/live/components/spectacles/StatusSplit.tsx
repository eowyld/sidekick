import type { TourDate } from "@/hooks/useLiveData";
import { STATUS_META } from "../../data/statusMeta";
import { statusCounts } from "../../lib/live-links";

/** Répartition des dates par statut commercial, en une barre segmentée. */
export function StatusSplit({ dates }: { dates: TourDate[] }) {
    const counts = statusCounts(dates);
    if (!counts.length)
        return null;
    return <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={counts.map(c => `${c.count} ${c.status}`).join(", ")}>
        {counts.map(c => <div key={c.status} className="h-full rounded-full" style={{ flexGrow: c.count, minWidth: 8, background: STATUS_META[c.status].color }} title={`${c.status} : ${c.count}`}/>)}
    </div>;
}
