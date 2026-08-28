import type { BadgeVariant } from "@/components/ui/badge";
import type { TourStatus } from "@/modules/live/data/defaultRepresentations";

/** Ordre du tunnel de conversion : option → confirmée → signée → finalisée. */
export const PIPELINE_ORDER: TourStatus[] = ["En option", "Confirmée", "Signée", "Finalisée"];

export const STATUS_META: Record<TourStatus, { color: string; badge: BadgeVariant }> = {
  "En option": { color: "#FB923C", badge: "pending" },
  Confirmée: { color: "#38BDF8", badge: "mixed" },
  Signée: { color: "#34D399", badge: "published" },
  Finalisée: { color: "#A78BFA", badge: "mastered" },
  Passée: { color: "rgba(245,245,245,0.3)", badge: "secondary" },
};

export const CONCERT_COLOR = "#F0FF00";
export const REHEARSAL_COLOR = "#38BDF8";
