// src/modules/incomes/parsers/copyright-types.ts

export type TypeUtilisation =
  | "internet" | "tv" | "radio" | "cinema"
  | "sonorisation" | "spectacles" | "etranger"
  | "supports_enregistres" | "copie_privee" | "autres"

export type TypeDroit = "DRM" | "DEP"

export interface CopyrightEntry {
  id: string
  titre: string
  iswc: string        // format T-XXX.XXX.XXX-X
  typeDroit: TypeDroit
  typeUtilisation: TypeUtilisation
  pays: string        // code ISO 2 lettres, ex: "FR"
  montant: number     // EUR
  date: string        // "YYYY-MM-DD"
}

export interface CopyrightReleve {
  id: string
  filename: string
  importedAt: string  // "YYYY-MM-DD"
  periodeLabel: string
  entries: CopyrightEntry[]
}

export type PeriodFilter =
  | { mode: "global" }
  | { mode: "year"; year: number }
  | { mode: "custom"; from: string; to: string }

export const UTILISATION_LABELS: Record<TypeUtilisation, string> = {
  internet:             "Internet",
  tv:                   "Télévision",
  radio:                "Radio",
  cinema:               "Cinéma",
  sonorisation:         "Sonorisation",
  spectacles:           "Spectacles vivants",
  etranger:             "Étranger",
  supports_enregistres: "Supports enregistrés",
  copie_privee:         "Copie privée",
  autres:               "Autres",
}

export const UTILISATION_COLORS: Record<TypeUtilisation, string> = {
  internet:             "#F0FF00",
  radio:                "#60a5fa",
  spectacles:           "#f472b6",
  tv:                   "#34d399",
  etranger:             "#fb923c",
  supports_enregistres: "#a78bfa",
  copie_privee:         "#38bdf8",
  cinema:               "#f59e0b",
  sonorisation:         "#6ee7b7",
  autres:               "rgba(245,245,245,0.3)",
}

export const DROIT_COLORS: Record<TypeDroit, string> = {
  DRM: "#F0FF00",
  DEP: "#60a5fa",
}

export const PAYS_LABELS: Record<string, string> = {
  FR: "France", US: "États-Unis", DE: "Allemagne", GB: "Royaume-Uni",
  ES: "Espagne", IT: "Italie", BE: "Belgique", CH: "Suisse",
  CA: "Canada", JP: "Japon",
}

export function getPaysLabel(code: string): string {
  return PAYS_LABELS[code] ?? code
}

export function formatEUR(n: number): string {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  })
}
