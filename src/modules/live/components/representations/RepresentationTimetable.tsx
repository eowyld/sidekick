import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  normalizeTimetableStructure,
  type TimetableItem,
} from "@/modules/live/data/defaultRepresentations";

export function RepresentationTimetable({
  items,
  onManage,
}: {
  items: TimetableItem[];
  onManage: () => void;
}) {
  const slots = normalizeTimetableStructure(items);
  const lastIndex = slots.length - 1;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#F5F5F5]/45">
          Timetable
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px]"
          onClick={onManage}
        >
          <Clock className="mr-1 h-3 w-3" />
          Gérer
        </Button>
      </div>
      <div className="rounded-lg border border-[rgba(245,245,245,0.06)] bg-[rgba(16,16,16,0.4)] px-3">
        {slots.map((slot, i) => {
          const isEdge = i === 0 || i === lastIndex;
          return (
            <div
              key={`slot-${i}`}
              className="flex items-center gap-3 border-b border-[rgba(245,245,245,0.06)] py-2 last:border-none"
            >
              <span
                className={`min-w-[48px] text-sm font-semibold tabular-nums ${
                  isEdge ? "text-[#F0FF00]" : "text-[#F5F5F5]/85"
                }`}
              >
                {slot.time || "—"}
              </span>
              <span className="flex-1 text-xs text-[#F5F5F5]/70">{slot.activity}</span>
              {isEdge && (
                <span className="rounded-md bg-[rgba(240,255,0,0.12)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[#F0FF00]">
                  {i === 0 ? "Début" : "Fin"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
