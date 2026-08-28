import type { ReactNode } from "react";
import type { TourGroupVM } from "./types";
import { STATUS_META } from "@/modules/live/data/statusMeta";
import { formatDateShort } from "./dateHelpers";

export function TourGroup({
  group,
  renderRow,
}: {
  group: TourGroupVM;
  renderRow: (dateId: number) => ReactNode;
}) {
  const { project, dates, status } = group;
  const first = dates[0]?.date;
  const last = dates[dates.length - 1]?.date;
  const period = first && last && first !== last ? `${formatDateShort(first)} → ${formatDateShort(last)}` : first ? formatDateShort(first) : "";

  return (
    <div className="overflow-hidden rounded-xl border border-[rgba(245,245,245,0.08)]">
      <div className="flex items-center justify-between bg-[rgba(44,44,46,0.7)] px-4 py-3">
        <div className="min-w-0">
          <h3
            className="truncate text-sm font-semibold"
            style={{ color: project ? "#A78BFA" : "rgba(245,245,245,0.6)" }}
          >
            {project ? project.title || "Tournée" : "Hors tournée"}
          </h3>
          <p className="text-xs text-[#F5F5F5]/45">
            {period && `${period} · `}
            {dates.length} date{dates.length > 1 ? "s" : ""}
          </p>
        </div>
        {status.length > 0 && (
          <div className="flex h-1.5 w-24 gap-0.5 overflow-hidden rounded-full">
            {status.map((s) => (
              <span key={s} className="h-full flex-1" style={{ background: STATUS_META[s].color }} />
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2 p-2">{dates.map((d) => renderRow(d.id))}</div>
    </div>
  );
}
