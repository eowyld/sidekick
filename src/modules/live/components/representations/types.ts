import type { Project } from "@/lib/sidekick-store";
import type { TourDate, TourStatus } from "@/modules/live/data/defaultRepresentations";

export type TransportType = "train" | "plane" | "car" | "other";
export type TransportEntry = {
  id: number;
  type: TransportType;
  amount: string;
  paymentMode: "self" | "reimburse" | "covered";
  details: string;
};

export type LodgingType = "hotel" | "airbnb" | "friend" | "other";
export type LodgingEntry = {
  id: number;
  type: LodgingType;
  nights: string;
  amount: string;
  details: string;
  paymentMode: "self" | "reimburse" | "covered";
};

export type DocumentType = "contract" | "tech" | "other";
export type DocumentEntry = { id: number; type: DocumentType; note: string };

export type ViewMode = "chrono" | "tour";
export type DateFilter = "upcoming" | "past" | "all";

/** Une tournée = un projet live, avec ses dates rattachées (déjà filtrées). */
export type TourGroupVM = {
  project: Project | null; // null = bloc « Hors tournée »
  dates: TourDate[];
  status: TourStatus[]; // statuts présents (pour la mini-barre)
};
