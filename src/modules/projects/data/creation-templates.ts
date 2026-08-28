import type { CreationSector, CreationPhase } from "@/lib/sidekick-store";

export interface CreationTemplateStep {
  phase: CreationPhase;
  label: string;
}

export const CREATION_TEMPLATES: Record<Exclude<CreationSector, "general">, CreationTemplateStep[]> = {
  phono: [
    { phase: "creation",   label: "Première maquette" },
    { phase: "production", label: "Session studio" },
    { phase: "production", label: "Mixage" },
    { phase: "production", label: "Mastering" },
    { phase: "sortie",     label: "Distribution" },
  ],
  edition: [
    { phase: "creation",   label: "Écriture / Composition" },
    { phase: "production", label: "Texte et partitions" },
    { phase: "sortie",     label: "Répartition des droits" },
    { phase: "sortie",     label: "Dépôt SACEM" },
  ],
  live: [
    { phase: "creation",   label: "Conception du set" },
    { phase: "production", label: "Répétitions" },
    { phase: "production", label: "Résidence" },
    { phase: "sortie",     label: "Stratégie de tournée" },
  ],
};

export const SECTOR_LABELS: Record<CreationSector, string> = {
  phono: "Phono",
  edition: "Édition",
  live: "Live",
  general: "Général",
};
