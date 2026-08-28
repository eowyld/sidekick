# Droits d'auteur (SACEM) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le stub `CopyrightPage` par un dashboard complet affichant les reversements SACEM (DRM & DEP) avec filtre période, graphiques, tableaux et historique des relevés.

**Architecture:** `CopyrightPage` (orchestrateur) gère l'état des relevés et le filtre période, et délègue l'affichage à deux composants purs : `CopyrightDashboard` (charts + tables) et `CopyrightHistorique` (liste des relevés avec suppression). Les données sont mockées pour l'instant — swapper vers localStorage ne nécessitera qu'une modification dans `CopyrightPage`.

**Tech Stack:** Next.js 16 App Router, React hooks, TypeScript, Tailwind CSS, Radix UI (`Card`, `Button`), Lucide React, SVG natif pour les donuts (pas de lib externe). Aucun test suite — vérification via `npx tsc --noEmit`.

**Note:** Ce projet n'a pas de suite de tests. Les étapes de vérification utilisent `npx tsc --noEmit` plutôt que des tests automatisés.

---

## Fichiers

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/modules/incomes/parsers/copyright-types.ts` | Créer | Types TS, maps de labels/couleurs, générateur de mock data, `MOCK_RELEVES`, `formatEUR` |
| `src/modules/incomes/components/CopyrightDashboard.tsx` | Créer | Composant pur : top 3, 3 donuts SVG, 2 tableaux, état vide |
| `src/modules/incomes/components/CopyrightHistorique.tsx` | Créer | Composant pur : tableau des relevés avec suppression |
| `src/modules/incomes/components/CopyrightPage.tsx` | Modifier | Orchestrateur : state releves + filtre période, renders dashboard + historique |

---

## Task 1: Types, mock data et helpers (`copyright-types.ts`)

**Files:**
- Create: `src/modules/incomes/parsers/copyright-types.ts`

- [ ] **Écrire le fichier complet**

```ts
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
```

- [ ] **Vérifier TypeScript**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Commit**

```bash
git add src/modules/incomes/parsers/copyright-types.ts
git commit -m "feat(incomes): add SACEM copyright types, helpers, and mock data"
```

---

## Task 2: Dashboard de visualisation (`CopyrightDashboard.tsx`)

**Files:**
- Create: `src/modules/incomes/components/CopyrightDashboard.tsx`

- [ ] **Écrire le fichier complet**

```tsx
// src/modules/incomes/components/CopyrightDashboard.tsx
"use client"

import { useMemo } from "react"
import { Music } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type CopyrightEntry,
  type TypeUtilisation,
  type TypeDroit,
  UTILISATION_LABELS,
  UTILISATION_COLORS,
  DROIT_COLORS,
  formatEUR,
  getPaysLabel,
} from "../parsers/copyright-types"

interface CopyrightDashboardProps {
  entries: CopyrightEntry[]
}

// Palette pour les pays (couleurs dynamiques, pas liées à un type fixe)
const PAYS_COLOR_PALETTE = [
  "#F0FF00", "#60a5fa", "#f472b6", "#34d399", "#fb923c", "#a78bfa",
  "rgba(245,245,245,0.25)",
]

// ─── Donut chart SVG ──────────────────────────────────────────────────────────

interface DonutSegment {
  label: string
  value: number
  color: string
}

function DonutChart({
  segments,
  size = "lg",
}: {
  segments: DonutSegment[]
  size?: "lg" | "sm"
}) {
  const r = size === "lg" ? 35 : 22
  const sw = size === "lg" ? 18 : 12
  const dim = size === "lg" ? 100 : 64
  const half = dim / 2
  const circumference = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + seg.value, 0)

  let offset = 0
  const computed = segments.map(seg => {
    const length = total > 0 ? (seg.value / total) * circumference : 0
    const o = offset
    offset += length
    return { ...seg, length, offset: o }
  })

  return (
    <svg
      width={dim}
      height={dim}
      viewBox={`0 0 ${dim} ${dim}`}
      style={{ flexShrink: 0 }}
    >
      <circle
        cx={half} cy={half} r={r}
        fill="none"
        stroke="rgba(245,245,245,0.06)"
        strokeWidth={sw}
      />
      {total > 0 &&
        computed.map((seg, i) => (
          <circle
            key={i}
            cx={half} cy={half} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={sw}
            strokeDasharray={`${seg.length} ${circumference - seg.length}`}
            strokeDashoffset={-seg.offset}
            transform={`rotate(-90 ${half} ${half})`}
          />
        ))}
      {size === "lg" && total > 0 && (
        <>
          <text
            x={half} y={half - 3}
            textAnchor="middle"
            fill="rgba(245,245,245,0.4)"
            fontSize={7}
            fontFamily="system-ui,sans-serif"
          >
            Total
          </text>
          <text
            x={half} y={half + 8}
            textAnchor="middle"
            fill="#f5f5f5"
            fontSize={9}
            fontWeight="600"
            fontFamily="system-ui,sans-serif"
          >
            {formatEUR(total)}
          </text>
        </>
      )}
    </svg>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({
  segments,
  total,
  columns = 1,
}: {
  segments: DonutSegment[]
  total: number
  columns?: 1 | 2
}) {
  return (
    <div
      className={`grid gap-x-4 gap-y-1.5 ${columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}
    >
      {segments.map(seg => {
        const pct = total > 0 ? ((seg.value / total) * 100).toFixed(0) : "0"
        return (
          <div key={seg.label} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: seg.color }}
            />
            <span className="flex-1 truncate text-[10px] text-[rgba(245,245,245,0.7)]">
              {seg.label}
            </span>
            <span className="text-[9px] text-[rgba(245,245,245,0.4)]">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CopyrightDashboard({ entries }: CopyrightDashboardProps) {
  const totalMontant = useMemo(
    () => entries.reduce((s, e) => s + e.montant, 0),
    [entries],
  )

  const topOeuvres = useMemo(() => {
    const map = new Map<string, { iswc: string; total: number }>()
    entries.forEach(e => {
      const existing = map.get(e.titre) ?? { iswc: e.iswc, total: 0 }
      map.set(e.titre, { ...existing, total: existing.total + e.montant })
    })
    return Array.from(map.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 3)
  }, [entries])

  const utilSegments = useMemo((): DonutSegment[] => {
    const map = new Map<TypeUtilisation, number>()
    entries.forEach(e =>
      map.set(e.typeUtilisation, (map.get(e.typeUtilisation) ?? 0) + e.montant),
    )
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([util, val]) => ({
        label: UTILISATION_LABELS[util],
        value: val,
        color: UTILISATION_COLORS[util],
      }))
  }, [entries])

  const paysSegments = useMemo((): DonutSegment[] => {
    const map = new Map<string, number>()
    entries.forEach(e => map.set(e.pays, (map.get(e.pays) ?? 0) + e.montant))
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    const top5 = sorted.slice(0, 5)
    const autresTotal = sorted.slice(5).reduce((s, [, v]) => s + v, 0)
    const segs: DonutSegment[] = top5.map(([pays, val], i) => ({
      label: getPaysLabel(pays),
      value: val,
      color: PAYS_COLOR_PALETTE[i],
    }))
    if (autresTotal > 0)
      segs.push({ label: "Autres", value: autresTotal, color: PAYS_COLOR_PALETTE[6] })
    return segs
  }, [entries])

  const droitSegments = useMemo((): DonutSegment[] => {
    const map = new Map<TypeDroit, number>()
    entries.forEach(e =>
      map.set(e.typeDroit, (map.get(e.typeDroit) ?? 0) + e.montant),
    )
    return (["DRM", "DEP"] as TypeDroit[])
      .filter(d => map.has(d))
      .map(d => ({ label: d, value: map.get(d)!, color: DROIT_COLORS[d] }))
  }, [entries])

  const tableByTitre = useMemo(() => {
    const map = new Map<string, { iswc: string; drm: number; dep: number }>()
    entries.forEach(e => {
      const existing = map.get(e.titre) ?? { iswc: e.iswc, drm: 0, dep: 0 }
      map.set(e.titre, {
        ...existing,
        drm: existing.drm + (e.typeDroit === "DRM" ? e.montant : 0),
        dep: existing.dep + (e.typeDroit === "DEP" ? e.montant : 0),
      })
    })
    return Array.from(map.entries())
      .map(([titre, { iswc, drm, dep }]) => ({ titre, iswc, drm, dep, total: drm + dep }))
      .sort((a, b) => b.total - a.total)
  }, [entries])

  const tableByUtil = useMemo(() => {
    const map = new Map<TypeUtilisation, { drm: number; dep: number }>()
    entries.forEach(e => {
      const existing = map.get(e.typeUtilisation) ?? { drm: 0, dep: 0 }
      map.set(e.typeUtilisation, {
        drm: existing.drm + (e.typeDroit === "DRM" ? e.montant : 0),
        dep: existing.dep + (e.typeDroit === "DEP" ? e.montant : 0),
      })
    })
    return Array.from(map.entries())
      .map(([util, { drm, dep }]) => ({
        util,
        label: UTILISATION_LABELS[util],
        drm,
        dep,
        total: drm + dep,
      }))
      .sort((a, b) => b.total - a.total)
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.5)] py-16 text-center">
        <Music className="mb-3 h-8 w-8 text-[rgba(245,245,245,0.3)]" />
        <p className="text-sm font-medium text-[rgba(245,245,245,0.7)]">
          Aucun relevé SACEM importé
        </p>
        <p className="mt-1 text-xs text-[rgba(245,245,245,0.4)]">
          Les données apparaîtront ici une fois un relevé importé.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top 3 oeuvres */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(245,245,245,0.4)]">
        Top 3 oeuvres
      </p>
      <div className="grid grid-cols-3 gap-3">
        {topOeuvres.map(([titre, { iswc, total }], i) => (
          <Card
            key={titre}
            className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.72)] text-[#f5f5f5] backdrop-blur-xl"
          >
            <CardContent className="p-4">
              <div
                className={`mb-1 text-[10px] font-bold ${
                  i === 0 ? "text-[#F0FF00]" : "text-[rgba(245,245,245,0.3)]"
                }`}
              >
                #{i + 1}
              </div>
              <div className="truncate text-sm font-semibold">{titre}</div>
              <div className="mt-0.5 font-mono text-[10px] text-[rgba(245,245,245,0.4)]">
                {iswc}
              </div>
              <div className="mt-2 text-lg font-bold text-[#F0FF00]">
                {formatEUR(total)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Répartitions */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(245,245,245,0.4)]">
        Répartitions
      </p>
      <div className="grid grid-cols-3 gap-3">
        {/* Grand donut : utilisation */}
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.72)] text-[#f5f5f5] backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.5)]">
              Répartition par utilisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <DonutChart segments={utilSegments} size="lg" />
              <Legend segments={utilSegments} total={totalMontant} columns={2} />
            </div>
          </CardContent>
        </Card>

        {/* Petit donut : pays */}
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.72)] text-[#f5f5f5] backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.5)]">
              Répartition par pays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <DonutChart segments={paysSegments} size="sm" />
              <Legend segments={paysSegments} total={totalMontant} />
            </div>
          </CardContent>
        </Card>

        {/* Petit donut : DRM/DEP */}
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.72)] text-[#f5f5f5] backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.5)]">
              Répartition DEP / DRM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <DonutChart segments={droitSegments} size="sm" />
              <div className="flex flex-col gap-2">
                <Legend segments={droitSegments} total={totalMontant} />
                <p className="mt-1 text-[9px] text-[rgba(245,245,245,0.35)]">
                  DRM = Représentation
                  <br />
                  DEP = Édition &amp; Publication
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Séparateur */}
      <div className="border-t border-[rgba(245,245,245,0.08)]" />

      {/* Tableaux */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(245,245,245,0.4)]">
        Détails
      </p>
      <div className="grid grid-cols-2 gap-4">
        {/* Tableau par titre */}
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.72)] text-[#f5f5f5] backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.5)]">
              Droits par titre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[rgba(245,245,245,0.08)]">
                    <th className="pb-2 pr-3 text-left text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                      Oeuvre
                    </th>
                    <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                      DRM
                    </th>
                    <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                      DEP
                    </th>
                    <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableByTitre.map(row => (
                    <tr
                      key={row.titre}
                      className="border-b border-[rgba(245,245,245,0.04)] last:border-0"
                    >
                      <td className="py-2 pr-3">
                        <div className="font-medium text-[#f5f5f5]">{row.titre}</div>
                        <div className="font-mono text-[9px] text-[rgba(245,245,245,0.35)]">
                          {row.iswc}
                        </div>
                      </td>
                      <td className="py-2 text-right text-[rgba(245,245,245,0.55)]">
                        {formatEUR(row.drm)}
                      </td>
                      <td className="py-2 text-right text-[rgba(245,245,245,0.55)]">
                        {formatEUR(row.dep)}
                      </td>
                      <td className="py-2 text-right font-semibold text-[#F0FF00]">
                        {formatEUR(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tableau par utilisation */}
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.72)] text-[#f5f5f5] backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.5)]">
              Droits par utilisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[rgba(245,245,245,0.08)]">
                    <th className="pb-2 pr-3 text-left text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                      Utilisation
                    </th>
                    <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                      DRM
                    </th>
                    <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                      DEP
                    </th>
                    <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableByUtil.map(row => (
                    <tr
                      key={row.util}
                      className="border-b border-[rgba(245,245,245,0.04)] last:border-0"
                    >
                      <td className="py-2 pr-3 text-[#f5f5f5]">{row.label}</td>
                      <td className="py-2 text-right text-[rgba(245,245,245,0.55)]">
                        {formatEUR(row.drm)}
                      </td>
                      <td className="py-2 text-right text-[rgba(245,245,245,0.55)]">
                        {formatEUR(row.dep)}
                      </td>
                      <td className="py-2 text-right font-semibold text-[#F0FF00]">
                        {formatEUR(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Vérifier TypeScript**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Commit**

```bash
git add src/modules/incomes/components/CopyrightDashboard.tsx
git commit -m "feat(incomes): add CopyrightDashboard with donuts, top 3, and detail tables"
```

---

## Task 3: Historique des relevés (`CopyrightHistorique.tsx`)

**Files:**
- Create: `src/modules/incomes/components/CopyrightHistorique.tsx`

- [ ] **Écrire le fichier complet**

```tsx
// src/modules/incomes/components/CopyrightHistorique.tsx
"use client"

import { Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { CopyrightReleve } from "../parsers/copyright-types"
import { formatEUR } from "../parsers/copyright-types"

interface CopyrightHistoriqueProps {
  releves: CopyrightReleve[]
  onDelete: (id: string) => void
}

export function CopyrightHistorique({ releves, onDelete }: CopyrightHistoriqueProps) {
  return (
    <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.72)] text-[#f5f5f5] backdrop-blur-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.5)]">
          Historique des relevés
        </CardTitle>
      </CardHeader>
      <CardContent>
        {releves.length === 0 ? (
          <div className="py-8 text-center text-sm text-[rgba(245,245,245,0.4)]">
            Aucun relevé importé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgba(245,245,245,0.08)]">
                  <th className="pb-2 pr-4 text-left text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                    Fichier
                  </th>
                  <th className="pb-2 pr-4 text-left text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                    Période
                  </th>
                  <th className="pb-2 pr-4 text-left text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                    Importé le
                  </th>
                  <th className="pb-2 pr-4 text-right text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                    Entrées
                  </th>
                  <th className="pb-2 pr-4 text-right text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                    Total
                  </th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {releves.map(releve => {
                  const total = releve.entries.reduce((s, e) => s + e.montant, 0)
                  const importedAt = new Date(releve.importedAt).toLocaleDateString(
                    "fr-FR",
                    { day: "numeric", month: "long", year: "numeric" },
                  )
                  return (
                    <tr
                      key={releve.id}
                      className="border-b border-[rgba(245,245,245,0.04)] last:border-0"
                    >
                      <td className="py-2.5 pr-4 font-mono text-[rgba(245,245,245,0.7)]">
                        {releve.filename}
                      </td>
                      <td className="py-2.5 pr-4 text-[#f5f5f5]">{releve.periodeLabel}</td>
                      <td className="py-2.5 pr-4 text-[rgba(245,245,245,0.5)]">{importedAt}</td>
                      <td className="py-2.5 pr-4 text-right text-[rgba(245,245,245,0.5)]">
                        {releve.entries.length}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-[#F0FF00]">
                        {formatEUR(total)}
                      </td>
                      <td className="py-2.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[rgba(245,245,245,0.4)] hover:text-red-400"
                          onClick={() => onDelete(releve.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Vérifier TypeScript**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Commit**

```bash
git add src/modules/incomes/components/CopyrightHistorique.tsx
git commit -m "feat(incomes): add CopyrightHistorique with relevés list and delete"
```

---

## Task 4: Orchestrateur (`CopyrightPage.tsx`)

**Files:**
- Modify: `src/modules/incomes/components/CopyrightPage.tsx`

- [ ] **Remplacer le contenu du fichier**

```tsx
// src/modules/incomes/components/CopyrightPage.tsx
"use client"

import { useMemo, useState } from "react"
import {
  MOCK_RELEVES,
  type CopyrightReleve,
  type PeriodFilter,
} from "../parsers/copyright-types"
import { CopyrightDashboard } from "./CopyrightDashboard"
import { CopyrightHistorique } from "./CopyrightHistorique"

export function CopyrightPage() {
  const [releves, setReleves] = useState<CopyrightReleve[]>(MOCK_RELEVES)
  const [filter, setFilter] = useState<PeriodFilter>({ mode: "global" })

  // State séparé pour les dates custom (pour conserver les valeurs quand on change de mode)
  const [customFrom, setCustomFrom] = useState(
    () => `${new Date().getFullYear()}-01-01`,
  )
  const [customTo, setCustomTo] = useState(
    () => new Date().toISOString().split("T")[0],
  )

  // Années disponibles dérivées des relevés actifs
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    releves.forEach(r =>
      r.entries.forEach(e => years.add(parseInt(e.date.slice(0, 4)))),
    )
    return Array.from(years).sort((a, b) => b - a)
  }, [releves])

  // Entrées filtrées par période
  const filteredEntries = useMemo(() => {
    const all = releves.flatMap(r => r.entries)
    if (filter.mode === "global") return all
    if (filter.mode === "year")
      return all.filter(e => e.date.startsWith(String(filter.year)))
    return all.filter(e => e.date >= filter.from && e.date <= filter.to)
  }, [releves, filter])

  const filterValue =
    filter.mode === "global"
      ? "global"
      : filter.mode === "year"
        ? String(filter.year)
        : "custom"

  const handleFilterChange = (value: string) => {
    if (value === "global") {
      setFilter({ mode: "global" })
    } else if (value === "custom") {
      setFilter({ mode: "custom", from: customFrom, to: customTo })
    } else {
      setFilter({ mode: "year", year: parseInt(value) })
    }
  }

  const handleCustomFrom = (val: string) => {
    setCustomFrom(val)
    setFilter({ mode: "custom", from: val, to: customTo })
  }

  const handleCustomTo = (val: string) => {
    setCustomTo(val)
    setFilter({ mode: "custom", from: customFrom, to: val })
  }

  const handleDeleteReleve = (id: string) => {
    if (
      !window.confirm(
        "Supprimer ce relevé ? Les données ne seront plus prises en compte dans le dashboard.",
      )
    )
      return
    setReleves(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-6 bg-[#101010] px-2 py-4 text-[#f5f5f5] md:px-4 md:py-6">
      {/* Header + filtre */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">
            Droits d&apos;auteur
          </h1>
          <p className="text-sm text-[rgba(245,245,245,0.6)]">
            Reversements SACEM — DRM &amp; DEP
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[rgba(245,245,245,0.4)]">Période</span>
            <select
              value={filterValue}
              onChange={e => handleFilterChange(e.target.value)}
              className="appearance-none rounded-lg border border-[rgba(245,245,245,0.15)] bg-[rgba(44,44,46,0.9)] px-3 py-1.5 pr-7 text-xs text-[#f5f5f5] outline-none focus:border-[#F0FF00]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(245,245,245,0.5)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
              }}
            >
              <option value="global">Global</option>
              {availableYears.map(y => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
              <option value="custom">Période personnalisée…</option>
            </select>
          </div>
          {filter.mode === "custom" && (
            <div className="flex items-center gap-2 text-xs text-[rgba(245,245,245,0.4)]">
              <span>Du</span>
              <input
                type="date"
                value={customFrom}
                onChange={e => handleCustomFrom(e.target.value)}
                className="rounded-lg border border-[rgba(245,245,245,0.15)] bg-[rgba(44,44,46,0.9)] px-2.5 py-1.5 text-xs text-[#f5f5f5] outline-none focus:border-[#F0FF00]"
              />
              <span>→</span>
              <input
                type="date"
                value={customTo}
                onChange={e => handleCustomTo(e.target.value)}
                className="rounded-lg border border-[rgba(245,245,245,0.15)] bg-[rgba(44,44,46,0.9)] px-2.5 py-1.5 text-xs text-[#f5f5f5] outline-none focus:border-[#F0FF00]"
              />
            </div>
          )}
        </div>
      </div>

      <CopyrightDashboard entries={filteredEntries} />

      <div className="border-t border-[rgba(245,245,245,0.08)]" />

      <CopyrightHistorique releves={releves} onDelete={handleDeleteReleve} />
    </div>
  )
}
```

- [ ] **Vérifier TypeScript**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Commit**

```bash
git add src/modules/incomes/components/CopyrightPage.tsx
git commit -m "feat(incomes): implement CopyrightPage orchestrator with period filter and relevés management"
```

---

## Task 5: Vérification finale en navigateur

- [ ] **Lancer le serveur de dev**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npm run dev
```

- [ ] **Ouvrir** `http://localhost:3000/incomes/droits-auteur` et vérifier :
  - Les 3 relevés apparaissent dans l'historique en bas
  - Le dashboard affiche le top 3, les 3 donuts, et les 2 tableaux
  - Le filtre "2024" n'affiche que les données de 2024
  - Le filtre "Période personnalisée" fait apparaître les deux date pickers
  - Supprimer un relevé recalcule immédiatement le dashboard
  - Supprimer tous les relevés affiche l'état vide dans le dashboard et "Aucun relevé importé" dans l'historique

- [ ] **Commit final si des ajustements mineurs ont été faits**

```bash
git add -p
git commit -m "fix(incomes): droits-auteur visual adjustments"
```
