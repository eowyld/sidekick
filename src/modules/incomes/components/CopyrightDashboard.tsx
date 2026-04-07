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
