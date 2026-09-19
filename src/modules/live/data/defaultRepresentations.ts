import type { LiveDetails } from "@/modules/live/lib/live-model";

/** Début / fin de la représentation (calendrier global) ; étapes optionnelles entre les deux. */
export type TimetableSlotKind =
  | "representation_start"
  | "representation_end"
  | "step";

export type TimetableItem = {
  time: string;
  activity: string;
  kind?: TimetableSlotKind;
};

export function createDefaultRepresentationTimetable(): TimetableItem[] {
  return [
    {
      time: "20:00",
      activity: "Début de la représentation",
      kind: "representation_start"
    },
    {
      time: "23:00",
      activity: "Fin de la représentation",
      kind: "representation_end"
    }
  ];
}

function assignKindsByPosition(items: TimetableItem[]): TimetableItem[] {
  if (items.length === 0) return createDefaultRepresentationTimetable();
  if (items.length === 1) {
    return [
      { ...items[0], kind: "representation_start" },
      {
        time: "",
        activity: "Fin de la représentation",
        kind: "representation_end"
      }
    ];
  }
  return items.map((item, i) => {
    if (i === 0) return { ...item, kind: "representation_start" as const };
    if (i === items.length - 1)
      return { ...item, kind: "representation_end" as const };
    return { ...item, kind: "step" as const };
  });
}

/** Affichage / édition : garantit début + fin ; migre l’ancien format sans `kind`. */
export function normalizeTimetableStructure(items: TimetableItem[]): TimetableItem[] {
  if (!items.length) return createDefaultRepresentationTimetable();
  const stripped = items.map(({ time, activity }) => ({ time, activity }));
  return assignKindsByPosition(stripped);
}

/** Persistance : retire les étapes vides, conserve toujours début et fin. */
export function finalizeTimetableForPersist(items: TimetableItem[]): TimetableItem[] {
  const normalized = normalizeTimetableStructure(items);
  if (normalized.length < 2) return createDefaultRepresentationTimetable();
  const start = normalized[0];
  const end = normalized[normalized.length - 1];
  const middle = normalized
    .slice(1, -1)
    .filter((s) => s.time.trim() || s.activity.trim());
  return assignKindsByPosition([start, ...middle, end]);
}

/** Heures utilisées par le calendrier global (créneau représentation). */
export function getRepresentationScheduleTimes(
  items: TimetableItem[]
): { start?: string; end?: string } {
  const t = finalizeTimetableForPersist(items);
  const startSlot = t[0];
  const endSlot = t[t.length - 1];
  return {
    start: startSlot?.time?.trim() || undefined,
    end: endSlot?.time?.trim() || undefined
  };
}

export type TourStatus =
  | "Finalisée"
  | "Passée"
  | "Signée"
  | "Confirmée"
  | "En option";

export type TourDate = {
  details?: LiveDetails;
  id: number;
  city: string;
  venue: string;
  date: string;
  status: TourStatus;
  address: string;
  organisateur?: string;
  timetable: TimetableItem[];
  transport: boolean;
  lodging: boolean;
  remuneration: boolean;
  equipment: boolean;
  note?: string;
  invoiceIds?: string[];
  missionIds?: string[];
};

export const defaultRepresentations: TourDate[] = [
  {
    id: 1,
    city: "Paris",
    venue: "La Cigale",
    date: "15/02/2025",
    status: "Finalisée",
    address: "120 Boulevard de Rochechouart, 75018 Paris",
    timetable: [
      { time: "16:30", activity: "Arrivée & déchargement" },
      { time: "18:00", activity: "Ouverture des portes" },
      { time: "20:30", activity: "Show" }
    ],
    transport: true,
    lodging: true,
    remuneration: true,
    equipment: false,
    organisateur: "",
    note: "Super accueil, penser à revenir avec ingé son."
  },
  {
    id: 2,
    city: "Lyon",
    venue: "Le Transbordeur",
    date: "08/02/2025",
    status: "Passée",
    address: "3 Boulevard de Stalingrad, 69100 Lyon",
    timetable: [
      { time: "17:00", activity: "Balance" },
      { time: "20:00", activity: "Ouverture des portes" },
      { time: "21:00", activity: "Show" }
    ],
    transport: true,
    lodging: false,
    remuneration: true,
    equipment: true,
    organisateur: "",
    note: "Backline partagé avec autre groupe."
  },
  {
    id: 3,
    city: "Marseille",
    venue: "Le Dôme",
    date: "01/02/2025",
    status: "Passée",
    address: "48 Avenue de Saint-Just, 13004 Marseille",
    timetable: [
      { time: "16:00", activity: "Arrivée équipe" },
      { time: "18:30", activity: "Balance" },
      { time: "20:00", activity: "Show" }
    ],
    transport: false,
    lodging: true,
    remuneration: true,
    equipment: true,
    organisateur: "",
    note: "Prévoir temps de chargement plus long."
  },
  {
    id: 4,
    city: "Paris",
    venue: "La Cigale",
    date: "14/03/2025",
    status: "Confirmée",
    address: "120 Boulevard de Rochechouart, 75018 Paris",
    timetable: [
      { time: "17:00", activity: "Balance" },
      { time: "19:00", activity: "Dîner" },
      { time: "20:30", activity: "Show" }
    ],
    transport: true,
    lodging: true,
    remuneration: true,
    equipment: true,
    organisateur: "",
    note: "Prévoir captation vidéo."
  },
  {
    id: 5,
    city: "Lyon",
    venue: "Le Transbordeur",
    date: "22/03/2025",
    status: "En option",
    address: "3 Boulevard de Stalingrad, 69100 Lyon",
    timetable: [{ time: "Option", activity: "Hold jusqu'au 01/03" }],
    transport: false,
    lodging: false,
    remuneration: false,
    equipment: false,
    organisateur: "",
    note: "En attente de réponse programmateur."
  },
  {
    id: 6,
    city: "Bordeaux",
    venue: "Le Rocher de Palmer",
    date: "05/04/2025",
    status: "Signée",
    address: "1 Rue Aristide Briand, 33152 Cenon",
    timetable: [
      { time: "15:00", activity: "Arrivée & installation" },
      { time: "17:30", activity: "Balance" },
      { time: "20:00", activity: "Show" }
    ],
    transport: true,
    lodging: true,
    remuneration: true,
    equipment: true,
    organisateur: "",
    note: "Prévoir merch supplémentaire (grosse jauge)."
  }
];
