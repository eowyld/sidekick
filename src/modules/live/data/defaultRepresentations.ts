export type TimetableItem = {
  time: string;
  activity: string;
};

export type TourStatus =
  | "Finalisée"
  | "Passée"
  | "Signée"
  | "Confirmée"
  | "En option";

export type TourDate = {
  id: number;
  city: string;
  venue: string;
  date: string;
  status: TourStatus;
  address: string;
  timetable: TimetableItem[];
  transport: boolean;
  lodging: boolean;
  remuneration: boolean;
  equipment: boolean;
  note?: string;
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
    note: "Prévoir merch supplémentaire (grosse jauge)."
  }
];
