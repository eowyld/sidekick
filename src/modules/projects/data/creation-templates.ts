import type { CreationSector } from "@/lib/sidekick-store";

export const CREATION_TEMPLATES: Record<Exclude<CreationSector, "general">, string[]> = {
  phono: [
    "Écriture",
    "Composition",
    "Première maquette",
    "Pré-prod",
    "Session studio",
    "Premières versions",
    "Mixage",
    "Mastering",
  ],
  edition: [
    "Dépôt des textes",
    "Composition / arrangement",
    "Finalisation",
    "Dépôt SACEM",
  ],
  live: [
    "Création du set",
    "Répétitions",
    "Résidence",
    "Entraînement scène",
    "Filage",
  ],
};

export const SECTOR_LABELS: Record<CreationSector, string> = {
  phono: "Phono",
  edition: "Édition",
  live: "Live",
  general: "Général",
};
