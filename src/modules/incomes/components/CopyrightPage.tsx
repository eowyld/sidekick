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
