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

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_OEUVRES = [
  { titre: "Les Eaux Profondes", iswc: "T-123.456.789-0" },
  { titre: "Soleil Noir",        iswc: "T-234.567.890-1" },
  { titre: "Nuit Blanche",       iswc: "T-345.678.901-2" },
  { titre: "Horizon",            iswc: "T-456.789.012-3" },
]

const ALL_UTILISATIONS: TypeUtilisation[] = [
  "internet", "radio", "tv", "spectacles", "etranger",
  "supports_enregistres", "copie_privee", "cinema", "sonorisation", "autres",
]

const MOCK_PAYS = ["FR", "US", "DE", "GB"]

const MONTANT_BASE: Record<TypeUtilisation, number> = {
  internet: 180, radio: 95, tv: 75, spectacles: 60,
  etranger: 45, supports_enregistres: 35, copie_privee: 30,
  cinema: 20, sonorisation: 25, autres: 15,
}

const PAYS_WEIGHT: Record<string, number> = { FR: 0.55, US: 0.18, DE: 0.15, GB: 0.12 }
const OEUVRE_MULT = [1.0, 0.65, 0.42, 0.28]

function generateEntries(
  releveId: string,
  datePrefix: string,
  globalMult: number,
): CopyrightEntry[] {
  const entries: CopyrightEntry[] = []
  MOCK_OEUVRES.forEach((oeuvre, oi) => {
    ALL_UTILISATIONS.forEach(util => {
      MOCK_PAYS.forEach(pays => {
        (["DRM", "DEP"] as TypeDroit[]).forEach(typeDroit => {
          const base = MONTANT_BASE[util]
          const weight = PAYS_WEIGHT[pays] ?? 0.1
          const droitMult = typeDroit === "DRM" ? 0.63 : 0.37
          const amount = base * OEUVRE_MULT[oi] * weight * droitMult * globalMult
          entries.push({
            id: `${releveId}-${oeuvre.iswc}-${util}-${pays}-${typeDroit}`,
            titre: oeuvre.titre,
            iswc: oeuvre.iswc,
            typeDroit,
            typeUtilisation: util,
            pays,
            montant: Math.round(amount * 100) / 100,
            date: `${datePrefix}-01`,
          })
        })
      })
    })
  })
  return entries
}

export const MOCK_RELEVES: CopyrightReleve[] = [
  {
    id: "releve-2024",
    filename: "Relevé_SACEM_2024.pdf",
    importedAt: "2025-03-15",
    periodeLabel: "Année 2024",
    entries: generateEntries("2024", "2024-06", 1.0),
  },
  {
    id: "releve-s1-2025",
    filename: "Relevé_SACEM_S1_2025.pdf",
    importedAt: "2025-09-10",
    periodeLabel: "S1 2025",
    entries: generateEntries("s1-2025", "2025-03", 0.7),
  },
  {
    id: "releve-s2-2025",
    filename: "Relevé_SACEM_S2_2025.pdf",
    importedAt: "2026-03-20",
    periodeLabel: "S2 2025",
    entries: generateEntries("s2-2025", "2025-09", 0.55),
  },
]
