import { useState } from "react";
import { ChevronRight, MapPin, Trash2, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/sidekick-store";
import type { TourDate, TimetableItem } from "@/modules/live/data/defaultRepresentations";
import { STATUS_META } from "@/modules/live/data/statusMeta";
import { formatDateShort, relativeLabel } from "./dateHelpers";
import { RepresentationTimetable } from "./RepresentationTimetable";
import { TourSelect } from "./TourSelect";
import { Tag } from "./Tag";

export type RepresentationRowCallbacks = {
  onOpenTransport: (id: number) => void;
  onOpenLodging: (id: number) => void;
  onOpenRemuneration: (id: number) => void;
  onOpenEquipment: (id: number) => void;
  onOpenDocuments: (id: number) => void;
  onManageTimetable: (id: number) => void;
  onEdit: (date: TourDate) => void;
  onDelete: (id: number) => void;
};

export function RepresentationRow({
  date,
  project,
  showTourBadge,
  timetable,
  transportCount,
  lodgingCount,
  remunerationCount,
  hasEquipment,
  projects,
  setProjects,
  callbacks,
}: {
  date: TourDate;
  project: Project | null;
  showTourBadge: boolean;
  timetable: TimetableItem[];
  transportCount: number;
  lodgingCount: number;
  remunerationCount: number;
  hasEquipment: boolean;
  projects: Project[];
  setProjects: (fn: (prev: Project[]) => Project[]) => void;
  callbacks: RepresentationRowCallbacks;
}) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[date.status];
  const title = [date.venue, date.organisateur].filter(Boolean).join(" – ") || date.city || "Représentation";

  return (
    <div className="overflow-hidden rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgba(44,44,46,0.8)]"
      >
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}66` }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#F5F5F5]">{title}</p>
          {date.city && <p className="truncate text-xs text-[#F5F5F5]/50">{date.city}</p>}
        </div>
        {showTourBadge && (
          <span
            className="shrink-0 rounded-full border px-2 py-0.5 text-[10px]"
            style={
              project
                ? { borderColor: "#A78BFA", color: "#A78BFA" }
                : { borderColor: "rgba(245,245,245,0.2)", color: "rgba(245,245,245,0.5)" }
            }
          >
            {project ? project.title || "Tournée" : "Hors tournée"}
          </span>
        )}
        <div className="shrink-0 text-right">
          <p className="text-sm tabular-nums text-[#F5F5F5]/80">{formatDateShort(date.date)}</p>
          <p className="text-[11px] text-[#F5F5F5]/40">{relativeLabel(date.date)}</p>
        </div>
        <ChevronRight
          size={16}
          className={`shrink-0 text-[#F5F5F5]/40 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-[rgba(245,245,245,0.08)] px-4 py-4">
          <RepresentationTimetable items={timetable} onManage={() => callbacks.onManageTimetable(date.id)} />

          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[#F5F5F5]/45">
              Logistique
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => callbacks.onOpenTransport(date.id)}>
                <Tag label="Transport" active={transportCount > 0} count={transportCount} />
              </button>
              <button type="button" onClick={() => callbacks.onOpenLodging(date.id)}>
                <Tag label="Logement" active={lodgingCount > 0} count={lodgingCount} />
              </button>
              <button type="button" onClick={() => callbacks.onOpenRemuneration(date.id)}>
                <Tag
                  label="Rémunération"
                  active={remunerationCount > 0}
                  count={remunerationCount > 0 ? remunerationCount : undefined}
                />
              </button>
              <button type="button" onClick={() => callbacks.onOpenEquipment(date.id)}>
                <Tag label="Matériel" active={hasEquipment} />
              </button>
            </div>
          </div>

          <TourSelect
            dateId={date.id}
            currentProjectId={project?.id ?? null}
            projects={projects}
            setProjects={setProjects}
          />

          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#F5F5F5]/45">
              Adresse
            </p>
            {date.address ? (
              <p className="flex items-center gap-1 text-xs text-[#F5F5F5]/70">
                <span className="truncate">{date.address}</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(date.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F5F5F5]/50 hover:text-[#F5F5F5]"
                  title="Voir sur Google Maps"
                >
                  <MapPin className="h-3.5 w-3.5" />
                </a>
              </p>
            ) : (
              <p className="text-xs text-[#F5F5F5]/40">—</p>
            )}
          </div>

          {date.note && (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#F5F5F5]/45">
                Note
              </p>
              <p className="text-xs text-[#F5F5F5]/70">{date.note}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-[#F5F5F5]/60"
              onClick={() => callbacks.onOpenDocuments(date.id)}
            >
              <FilePlus2 className="mr-1 h-4 w-4" />
              Documents
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => callbacks.onEdit(date)}>
                Modifier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => callbacks.onDelete(date.id)}
              >
                <Trash2 className="h-3 w-3" />
                <span className="sr-only">Supprimer</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
