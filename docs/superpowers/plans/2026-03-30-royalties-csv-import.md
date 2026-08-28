# Royalties CSV Import & Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refonte complète de RoyaltiesPage — parsers CSV par distributeur, schéma normalisé, dashboard consolidé avec KPIs/charts, et saisie manuelle titre par titre.

**Architecture:** Chaque distributeur a son parser dédié (`parsers/`) qui mappe les colonnes CSV vers `RoyaltyEntry`. `RoyaltiesPage` orchestre deux sources localStorage (imports CSV + entrées manuelles), passe `allEntries` au dashboard consolidé et les données brutes à la section imports. Le dashboard lit uniquement `RoyaltyEntry[]` et ne connaît pas les distributeurs.

**Tech Stack:** Next.js App Router, TypeScript, Recharts (déjà installé), useLocalStorage hook, Radix UI + Tailwind (design system dark existant).

---

## File Map

**Créer :**
- `src/modules/incomes/parsers/royalties-types.ts` — types partagés (`RoyaltyEntry`, `DistributorImport`, `ManualEntry`, `Distributor`)
- `src/modules/incomes/parsers/parse-period.ts` — normalisation de période en "YYYY-MM"
- `src/modules/incomes/parsers/distrokid.ts` — parser DistroKid CSV
- `src/modules/incomes/parsers/tunecore.ts` — parser TuneCore CSV
- `src/modules/incomes/parsers/cdbaby.ts` — parser CD Baby CSV
- `src/modules/incomes/parsers/soundcloud.ts` — parser SoundCloud CSV
- `src/modules/incomes/components/RoyaltiesDashboard.tsx` — KPIs + charts consolidés
- `src/modules/incomes/components/RoyaltiesImports.tsx` — onglets + import CSV + saisie manuelle
- `src/modules/incomes/components/RoyaltiesManualModal.tsx` — modale add/edit entrée manuelle

**Remplacer entièrement :**
- `src/modules/incomes/components/RoyaltiesPage.tsx` — layout principal, orchestration état global

---

## Task 1 : Types partagés

**Files:**
- Create: `src/modules/incomes/parsers/royalties-types.ts`

- [ ] **Créer le fichier des types**

```typescript
// src/modules/incomes/parsers/royalties-types.ts

export type Distributor = "distrokid" | "tunecore" | "cdbaby" | "soundcloud";
export type TabId = Distributor | "manual";

export interface RoyaltyEntry {
  id: string;
  distributor: Distributor | "manual";
  period: string;       // "YYYY-MM"
  store: string;
  country: string;
  trackTitle: string;
  album?: string;
  isrc?: string;
  streams: number;
  revenue: number;
  currency: string;
}

export interface DistributorImport {
  distributor: Distributor;
  fileName: string;
  importedAt: string;
  entries: RoyaltyEntry[];
}

export type ManualEntry = RoyaltyEntry & { distributor: "manual" };

export type ImportsStore = Record<Distributor, DistributorImport | null>;

export const EMPTY_IMPORTS: ImportsStore = {
  distrokid: null,
  tunecore: null,
  cdbaby: null,
  soundcloud: null,
};
```

- [ ] **Vérifier la compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur sur ce fichier.

- [ ] **Commit**

```bash
git add src/modules/incomes/parsers/royalties-types.ts
git commit -m "feat(royalties): add shared types for royalty entries and imports"
```

---

## Task 2 : Utilitaire de normalisation de période

**Files:**
- Create: `src/modules/incomes/parsers/parse-period.ts`

- [ ] **Créer le parser de période**

```typescript
// src/modules/incomes/parsers/parse-period.ts

const MONTH_NAMES: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  janvier: "01", février: "02", mars: "03", avril: "04", mai: "05", juin: "06",
  juillet: "07", août: "08", septembre: "09", octobre: "10", novembre: "11", décembre: "12",
};

/**
 * Normalise une période en "YYYY-MM".
 * Formats supportés :
 *   "Jan 2025", "January 2025", "2025-01-01", "2025-01", "01/2025", "01/01/2025"
 * Retourne "" si le format est inconnu.
 */
export function parsePeriod(raw: string): string {
  if (!raw) return "";
  const s = raw.trim();

  // "YYYY-MM-DD" ou "YYYY-MM"
  const isoMatch = s.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  // "MMM YYYY" ou "MMMM YYYY" ex: "Jan 2025", "January 2025"
  const monthYearMatch = s.match(/^([a-zA-Zéûôîèàâùïü]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const month = MONTH_NAMES[monthYearMatch[1].toLowerCase()];
    if (month) return `${monthYearMatch[2]}-${month}`;
  }

  // "MM/YYYY" ou "MM/DD/YYYY"
  const slashMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) return `${slashMatch[3]}-${slashMatch[1]}`;

  const shortSlashMatch = s.match(/^(\d{2})\/(\d{4})$/);
  if (shortSlashMatch) return `${shortSlashMatch[2]}-${shortSlashMatch[1]}`;

  return "";
}
```

- [ ] **Vérifier la compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur.

- [ ] **Commit**

```bash
git add src/modules/incomes/parsers/parse-period.ts
git commit -m "feat(royalties): add period normalization utility"
```

---

## Task 3 : Parser DistroKid

**Files:**
- Create: `src/modules/incomes/parsers/distrokid.ts`

Colonnes attendues : `Sale Month`, `Store`, `Country`, `Title`, `ISRC`, `Quantity`, `Earnings (USD)`

- [ ] **Créer le parser**

```typescript
// src/modules/incomes/parsers/distrokid.ts
import type { RoyaltyEntry } from "./royalties-types";
import { parsePeriod } from "./parse-period";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const REQUIRED_COLUMNS = ["Sale Month", "Store", "Title", "Quantity", "Earnings (USD)"];

export function parseDistroKid(headers: string[], rows: string[][]): RoyaltyEntry[] {
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`Ce fichier ne ressemble pas à un export DistroKid (colonnes manquantes : ${missing.join(", ")})`);
  }

  const idx = (col: string) => headers.indexOf(col);

  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row): RoyaltyEntry | null => {
      const period = parsePeriod(row[idx("Sale Month")] ?? "");
      const trackTitle = (row[idx("Title")] ?? "").trim();
      const revenue = parseFloat((row[idx("Earnings (USD)")] ?? "0").replace(",", ".")) || 0;
      const streams = parseInt(row[idx("Quantity")] ?? "0", 10) || 0;
      if (!period || !trackTitle) return null;
      return {
        id: generateId(),
        distributor: "distrokid",
        period,
        store: (row[idx("Store")] ?? "").trim(),
        country: (row[idx("Country")] ?? "").trim(),
        trackTitle,
        isrc: (row[idx("ISRC")] ?? "").trim() || undefined,
        streams,
        revenue,
        currency: "USD",
      };
    })
    .filter((e): e is RoyaltyEntry => e !== null);
}
```

- [ ] **Vérifier la compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**

```bash
git add src/modules/incomes/parsers/distrokid.ts
git commit -m "feat(royalties): add DistroKid CSV parser"
```

---

## Task 4 : Parser TuneCore

**Files:**
- Create: `src/modules/incomes/parsers/tunecore.ts`

Colonnes attendues : `Start Date`, `Store Name`, `Country`, `Track Title`, `ISRC`, `Quantity`, `Net Revenue`, `Release Title`

- [ ] **Créer le parser**

```typescript
// src/modules/incomes/parsers/tunecore.ts
import type { RoyaltyEntry } from "./royalties-types";
import { parsePeriod } from "./parse-period";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const REQUIRED_COLUMNS = ["Start Date", "Store Name", "Track Title", "Quantity", "Net Revenue"];

export function parseTuneCore(headers: string[], rows: string[][]): RoyaltyEntry[] {
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`Ce fichier ne ressemble pas à un export TuneCore (colonnes manquantes : ${missing.join(", ")})`);
  }

  const idx = (col: string) => headers.indexOf(col);

  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row): RoyaltyEntry | null => {
      const period = parsePeriod(row[idx("Start Date")] ?? "");
      const trackTitle = (row[idx("Track Title")] ?? "").trim();
      const revenue = parseFloat((row[idx("Net Revenue")] ?? "0").replace(",", ".")) || 0;
      const streams = parseInt(row[idx("Quantity")] ?? "0", 10) || 0;
      if (!period || !trackTitle) return null;
      return {
        id: generateId(),
        distributor: "tunecore",
        period,
        store: (row[idx("Store Name")] ?? "").trim(),
        country: (row[idx("Country")] ?? "").trim(),
        trackTitle,
        album: (row[idx("Release Title")] ?? "").trim() || undefined,
        isrc: (row[idx("ISRC")] ?? "").trim() || undefined,
        streams,
        revenue,
        currency: "USD",
      };
    })
    .filter((e): e is RoyaltyEntry => e !== null);
}
```

- [ ] **Vérifier la compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**

```bash
git add src/modules/incomes/parsers/tunecore.ts
git commit -m "feat(royalties): add TuneCore CSV parser"
```

---

## Task 5 : Parser CD Baby

**Files:**
- Create: `src/modules/incomes/parsers/cdbaby.ts`

Colonnes attendues : `Sale Date`, `Store`, `Territory`, `Track`, `ISRC`, `Units`, `Net Revenue (USD)`, `Release`

- [ ] **Créer le parser**

```typescript
// src/modules/incomes/parsers/cdbaby.ts
import type { RoyaltyEntry } from "./royalties-types";
import { parsePeriod } from "./parse-period";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const REQUIRED_COLUMNS = ["Sale Date", "Store", "Track", "Units", "Net Revenue (USD)"];

export function parseCdBaby(headers: string[], rows: string[][]): RoyaltyEntry[] {
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`Ce fichier ne ressemble pas à un export CD Baby (colonnes manquantes : ${missing.join(", ")})`);
  }

  const idx = (col: string) => headers.indexOf(col);

  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row): RoyaltyEntry | null => {
      const period = parsePeriod(row[idx("Sale Date")] ?? "");
      const trackTitle = (row[idx("Track")] ?? "").trim();
      const revenue = parseFloat((row[idx("Net Revenue (USD)")] ?? "0").replace(",", ".")) || 0;
      const streams = parseInt(row[idx("Units")] ?? "0", 10) || 0;
      if (!period || !trackTitle) return null;
      return {
        id: generateId(),
        distributor: "cdbaby",
        period,
        store: (row[idx("Store")] ?? "").trim(),
        country: (row[idx("Territory")] ?? "").trim(),
        trackTitle,
        album: (row[idx("Release")] ?? "").trim() || undefined,
        isrc: (row[idx("ISRC")] ?? "").trim() || undefined,
        streams,
        revenue,
        currency: "USD",
      };
    })
    .filter((e): e is RoyaltyEntry => e !== null);
}
```

- [ ] **Vérifier la compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**

```bash
git add src/modules/incomes/parsers/cdbaby.ts
git commit -m "feat(royalties): add CD Baby CSV parser"
```

---

## Task 6 : Parser SoundCloud

**Files:**
- Create: `src/modules/incomes/parsers/soundcloud.ts`

Colonnes attendues : `Period`, `Track Title`, `Streams`, `Revenue`

- [ ] **Créer le parser**

```typescript
// src/modules/incomes/parsers/soundcloud.ts
import type { RoyaltyEntry } from "./royalties-types";
import { parsePeriod } from "./parse-period";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const REQUIRED_COLUMNS = ["Period", "Track Title", "Streams", "Revenue"];

export function parseSoundCloud(headers: string[], rows: string[][]): RoyaltyEntry[] {
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`Ce fichier ne ressemble pas à un export SoundCloud (colonnes manquantes : ${missing.join(", ")})`);
  }

  const idx = (col: string) => headers.indexOf(col);

  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row): RoyaltyEntry | null => {
      const period = parsePeriod(row[idx("Period")] ?? "");
      const trackTitle = (row[idx("Track Title")] ?? "").trim();
      const revenue = parseFloat((row[idx("Revenue")] ?? "0").replace(",", ".")) || 0;
      const streams = parseInt(row[idx("Streams")] ?? "0", 10) || 0;
      if (!period || !trackTitle) return null;
      return {
        id: generateId(),
        distributor: "soundcloud",
        period,
        store: "SoundCloud",
        country: "",
        trackTitle,
        streams,
        revenue,
        currency: "USD",
      };
    })
    .filter((e): e is RoyaltyEntry => e !== null);
}
```

- [ ] **Vérifier la compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Commit**

```bash
git add src/modules/incomes/parsers/soundcloud.ts
git commit -m "feat(royalties): add SoundCloud CSV parser"
```

---

## Task 7 : RoyaltiesDashboard

**Files:**
- Create: `src/modules/incomes/components/RoyaltiesDashboard.tsx`

- [ ] **Créer le composant**

```typescript
// src/modules/incomes/components/RoyaltiesDashboard.tsx
"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Music, Zap, DollarSign } from "lucide-react";
import type { RoyaltyEntry } from "../parsers/royalties-types";

interface RoyaltiesDashboardProps {
  entries: RoyaltyEntry[];
}

function formatUSD(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function formatNumber(n: number): string {
  return n.toLocaleString("fr-FR");
}

const DISTRIBUTOR_LABELS: Record<string, string> = {
  distrokid: "DistroKid",
  tunecore: "TuneCore",
  cdbaby: "CD Baby",
  soundcloud: "SoundCloud",
  manual: "Saisie manuelle",
};

export function RoyaltiesDashboard({ entries }: RoyaltiesDashboardProps) {
  const stats = useMemo(() => {
    const totalRevenue = entries.reduce((s, e) => s + e.revenue, 0);
    const totalStreams = entries.reduce((s, e) => s + e.streams, 0);
    const activeTracks = new Set(entries.filter((e) => e.streams > 0).map((e) => e.trackTitle)).size;
    const avgRate = totalStreams > 0 ? totalRevenue / totalStreams : 0;
    return { totalRevenue, totalStreams, activeTracks, avgRate };
  }, [entries]);

  // Bar chart : 12 derniers mois glissants
  const barData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", { month: "short" });
      const revenue = entries
        .filter((e) => e.period === period)
        .reduce((s, e) => s + e.revenue, 0);
      return { name: label, revenus: revenue };
    });
  }, [entries]);

  // Répartition par plateforme
  const byStore = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      const store = e.store || "Autre";
      map.set(store, (map.get(store) ?? 0) + e.revenue);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [entries]);

  // Répartition par distributeur
  const byDistributor = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      map.set(e.distributor, (map.get(e.distributor) ?? 0) + e.revenue);
    });
    const total = entries.reduce((s, e) => s + e.revenue, 0);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([dist, rev]) => ({ dist, rev, pct: total > 0 ? (rev / total) * 100 : 0 }));
  }, [entries]);

  // Top titres
  const topTracks = useMemo(() => {
    const map = new Map<string, { streams: number; revenue: number }>();
    entries.forEach((e) => {
      const existing = map.get(e.trackTitle) ?? { streams: 0, revenue: 0 };
      map.set(e.trackTitle, {
        streams: existing.streams + e.streams,
        revenue: existing.revenue + e.revenue,
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.5)] py-16 text-center">
        <Music className="mb-3 h-8 w-8 text-[#F5F5F5]/30" />
        <p className="text-sm font-medium text-[#F5F5F5]/70">Aucune donnée de royalties</p>
        <p className="mt-1 text-xs text-[#F5F5F5]/40">Importez un CSV ou saisissez des données manuellement ci-dessous.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Revenus totaux</CardTitle>
            <DollarSign className="h-4 w-4 text-[#F0FF00]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatUSD(stats.totalRevenue)}</div>
            <p className="mt-1 text-xs text-[#F5F5F5]/50">tous distributeurs · toutes périodes</p>
          </CardContent>
        </Card>
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Streams totaux</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#F0FF00]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatNumber(stats.totalStreams)}</div>
            <p className="mt-1 text-xs text-[#F5F5F5]/50">tous distributeurs · toutes périodes</p>
          </CardContent>
        </Card>
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Titres actifs</CardTitle>
            <Music className="h-4 w-4 text-[#F0FF00]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.activeTracks}</div>
            <p className="mt-1 text-xs text-[#F5F5F5]/50">avec au moins 1 stream</p>
          </CardContent>
        </Card>
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Taux moyen / stream</CardTitle>
            <Zap className="h-4 w-4 text-[#F0FF00]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">${stats.avgRate.toFixed(4)}</div>
            <p className="mt-1 text-xs text-[#F5F5F5]/50">revenus / streams</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart 1 : bar chart mensuel */}
      <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
            Revenus par mois — 12 derniers mois
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <ResponsiveContainer width="100%" height={220} minWidth={0}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="name" tick={{ fill: "#E5E7EB", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.3)" }} />
              <YAxis tick={{ fill: "#E5E7EB", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.3)" }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(148,163,184,0.4)", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "#F9FAFB" }}
                formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenus"]}
              />
              <Bar dataKey="revenus" fill="#F0FF00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 2 : répartition */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Revenus par plateforme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byStore.length === 0 ? (
              <p className="text-xs text-[#F5F5F5]/40">Aucune donnée</p>
            ) : (
              byStore.map(([store, rev]) => {
                const total = stats.totalRevenue;
                const pct = total > 0 ? (rev / total) * 100 : 0;
                return (
                  <div key={store} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 truncate text-xs text-[#F5F5F5]">{store}</div>
                    <div className="flex-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(245,245,245,0.1)]">
                        <div className="h-full rounded-full bg-[#F0FF00]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="w-20 shrink-0 text-right text-xs font-medium text-[#F5F5F5]">{formatUSD(rev)}</div>
                    <div className="w-10 shrink-0 text-right text-xs text-[#F5F5F5]/50">{pct.toFixed(0)}%</div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Revenus par distributeur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byDistributor.length === 0 ? (
              <p className="text-xs text-[#F5F5F5]/40">Aucune donnée</p>
            ) : (
              byDistributor.map(({ dist, rev, pct }) => (
                <div key={dist} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 truncate text-xs text-[#F5F5F5]">
                    {DISTRIBUTOR_LABELS[dist] ?? dist}
                  </div>
                  <div className="flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(245,245,245,0.1)]">
                      <div className="h-full rounded-full bg-[#F0FF00]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="w-20 shrink-0 text-right text-xs font-medium text-[#F5F5F5]">{formatUSD(rev)}</div>
                  <div className="w-10 shrink-0 text-right text-xs text-[#F5F5F5]/50">{pct.toFixed(0)}%</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart 3 : top titres */}
      <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Top titres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgba(245,245,245,0.08)]">
                  <th className="pb-2 pl-2 pr-4 text-left font-medium text-[#F5F5F5]/50">#</th>
                  <th className="pb-2 pr-4 text-left font-medium text-[#F5F5F5]/50">Titre</th>
                  <th className="pb-2 pr-4 text-right font-medium text-[#F5F5F5]/50">Streams</th>
                  <th className="pb-2 text-right font-medium text-[#F5F5F5]/50">Revenus</th>
                </tr>
              </thead>
              <tbody>
                {topTracks.map(([title, data], i) => (
                  <tr key={title} className="border-b border-[rgba(245,245,245,0.04)] last:border-0">
                    <td className="py-2 pl-2 pr-4 text-[#F5F5F5]/40">{i + 1}</td>
                    <td className="max-w-[200px] truncate py-2 pr-4 font-medium text-[#F5F5F5]">{title}</td>
                    <td className="py-2 pr-4 text-right text-[#F5F5F5]/80">{formatNumber(data.streams)}</td>
                    <td className="py-2 text-right font-semibold text-[#F0FF00]">{formatUSD(data.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Vérifier la compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Commit**

```bash
git add src/modules/incomes/components/RoyaltiesDashboard.tsx
git commit -m "feat(royalties): add consolidated dashboard with KPIs and charts"
```

---

## Task 8 : RoyaltiesManualModal

**Files:**
- Create: `src/modules/incomes/components/RoyaltiesManualModal.tsx`

- [ ] **Créer la modale**

```typescript
// src/modules/incomes/components/RoyaltiesManualModal.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import type { ManualEntry } from "../parsers/royalties-types";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface RoyaltiesManualModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (entry: ManualEntry) => void;
  entry: ManualEntry | null;
}

const MONTHS = [
  { value: "01", label: "Janvier" }, { value: "02", label: "Février" },
  { value: "03", label: "Mars" }, { value: "04", label: "Avril" },
  { value: "05", label: "Mai" }, { value: "06", label: "Juin" },
  { value: "07", label: "Juillet" }, { value: "08", label: "Août" },
  { value: "09", label: "Septembre" }, { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" }, { value: "12", label: "Décembre" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

type FormState = {
  month: string;
  year: string;
  trackTitle: string;
  streams: string;
  revenue: string;
  currency: string;
  album: string;
  isrc: string;
  store: string;
  country: string;
};

const EMPTY_FORM: FormState = {
  month: String(new Date().getMonth() + 1).padStart(2, "0"),
  year: String(currentYear),
  trackTitle: "",
  streams: "",
  revenue: "",
  currency: "USD",
  album: "",
  isrc: "",
  store: "",
  country: "",
};

export function RoyaltiesManualModal({ open, onClose, onSave, entry }: RoyaltiesManualModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      const [year, month] = entry.period.split("-");
      setForm({
        month: month ?? "01",
        year: year ?? String(currentYear),
        trackTitle: entry.trackTitle,
        streams: String(entry.streams),
        revenue: String(entry.revenue),
        currency: entry.currency,
        album: entry.album ?? "",
        isrc: entry.isrc ?? "",
        store: entry.store,
        country: entry.country,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, entry]);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const isValid = form.trackTitle.trim() && form.streams && form.revenue && form.month && form.year;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const saved: ManualEntry = {
      id: entry?.id ?? generateId(),
      distributor: "manual",
      period: `${form.year}-${form.month}`,
      trackTitle: form.trackTitle.trim(),
      streams: parseInt(form.streams, 10) || 0,
      revenue: parseFloat(form.revenue.replace(",", ".")) || 0,
      currency: form.currency,
      store: form.store.trim(),
      country: form.country.trim(),
      album: form.album.trim() || undefined,
      isrc: form.isrc.trim() || undefined,
    };
    onSave(saved);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg border border-[rgba(245,245,245,0.12)] bg-[#101010] text-[#F5F5F5]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {entry ? "Modifier l'entrée" : "Ajouter un titre"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Période */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Mois *</Label>
              <Select value={form.month} onValueChange={(v) => setForm((p) => ({ ...p, month: v }))}>
                <SelectTrigger className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(245,245,245,0.16)] bg-[#101010] text-[#F5F5F5]">
                  {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Année *</Label>
              <Select value={form.year} onValueChange={(v) => setForm((p) => ({ ...p, year: v }))}>
                <SelectTrigger className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(245,245,245,0.16)] bg-[#101010] text-[#F5F5F5]">
                  {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Titre */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Titre *</Label>
            <Input value={form.trackTitle} onChange={set("trackTitle")} placeholder="Nom du titre" required
              className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
          </div>

          {/* Streams + Revenus + Devise */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Streams *</Label>
              <Input type="number" min="0" value={form.streams} onChange={set("streams")} placeholder="0" required
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Revenus *</Label>
              <Input value={form.revenue} onChange={set("revenue")} placeholder="0.00" required
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Devise *</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
                <SelectTrigger className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(245,245,245,0.16)] bg-[#101010] text-[#F5F5F5]">
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Champs optionnels */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Album</Label>
              <Input value={form.album} onChange={set("album")} placeholder="Optionnel"
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">ISRC</Label>
              <Input value={form.isrc} onChange={set("isrc")} placeholder="Optionnel"
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Plateforme</Label>
              <Input value={form.store} onChange={set("store")} placeholder="Ex : Spotify"
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/60">Pays</Label>
              <Input value={form.country} onChange={set("country")} placeholder="Ex : FR"
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]" />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}
              className="border-[rgba(245,245,245,0.3)] bg-transparent text-[#F5F5F5] hover:bg-[rgba(245,245,245,0.08)]">
              Annuler
            </Button>
            <Button type="submit" disabled={!isValid}
              className="bg-[#F0FF00] text-[#101010] hover:bg-[#F0FF00]/90">
              {entry ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Vérifier la compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Commit**

```bash
git add src/modules/incomes/components/RoyaltiesManualModal.tsx
git commit -m "feat(royalties): add manual entry modal"
```

---

## Task 9 : RoyaltiesImports

**Files:**
- Create: `src/modules/incomes/components/RoyaltiesImports.tsx`

Utilitaire CSV (déjà dans RoyaltiesPage.tsx actuel) à réutiliser ici :

```typescript
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === "," && !inQuotes) { values.push(current.trim().replace(/^"|"$/g, "")); current = ""; }
    else { current += c; }
  }
  values.push(current.trim().replace(/^"|"$/g, ""));
  return values;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  return { headers: parseCsvLine(lines[0]), rows: lines.slice(1).map(parseCsvLine) };
}
```

- [ ] **Créer le composant**

```typescript
// src/modules/incomes/components/RoyaltiesImports.tsx
"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Plus, Pencil, Trash2 } from "lucide-react";
import type {
  Distributor, DistributorImport, ImportsStore, ManualEntry, TabId
} from "../parsers/royalties-types";
import { parseDistroKid } from "../parsers/distrokid";
import { parseTuneCore } from "../parsers/tunecore";
import { parseCdBaby } from "../parsers/cdbaby";
import { parseSoundCloud } from "../parsers/soundcloud";
import { RoyaltiesManualModal } from "./RoyaltiesManualModal";

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === "," && !inQuotes) { values.push(current.trim().replace(/^"|"$/g, "")); current = ""; }
    else { current += c; }
  }
  values.push(current.trim().replace(/^"|"$/g, ""));
  return values;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  return { headers: parseCsvLine(lines[0]), rows: lines.slice(1).map(parseCsvLine) };
}

const PARSERS: Record<Distributor, (h: string[], r: string[][]) => ReturnType<typeof parseDistroKid>> = {
  distrokid: parseDistroKid,
  tunecore: parseTuneCore,
  cdbaby: parseCdBaby,
  soundcloud: parseSoundCloud,
};

const TABS: { id: TabId; label: string }[] = [
  { id: "distrokid", label: "DistroKid" },
  { id: "tunecore", label: "TuneCore" },
  { id: "cdbaby", label: "CD Baby" },
  { id: "soundcloud", label: "SoundCloud" },
  { id: "manual", label: "Saisie manuelle" },
];

interface RoyaltiesImportsProps {
  imports: ImportsStore;
  manualEntries: ManualEntry[];
  defaultTab: TabId;
  onImport: (distributor: Distributor, imp: DistributorImport) => void;
  onTabChange: (tab: TabId) => void;
  onAddManual: (entry: ManualEntry) => void;
  onEditManual: (entry: ManualEntry) => void;
  onDeleteManual: (id: string) => void;
}

export function RoyaltiesImports({
  imports,
  manualEntries,
  defaultTab,
  onImport,
  onTabChange,
  onAddManual,
  onEditManual,
  onDeleteManual,
}: RoyaltiesImportsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [errors, setErrors] = useState<Partial<Record<Distributor, string>>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ManualEntry | null>(null);
  const fileRefs = useRef<Partial<Record<Distributor, HTMLInputElement | null>>>({});

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    onTabChange(tab);
  };

  const handleFileChange = (distributor: Distributor, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const { headers, rows } = parseCsv(text);
      try {
        const entries = PARSERS[distributor](headers, rows);
        setErrors((prev) => ({ ...prev, [distributor]: undefined }));
        onImport(distributor, {
          distributor,
          fileName: file.name,
          importedAt: new Date().toISOString(),
          entries,
        });
      } catch (err) {
        setErrors((prev) => ({ ...prev, [distributor]: (err as Error).message }));
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleSaveManual = (entry: ManualEntry) => {
    if (editingEntry) {
      onEditManual(entry);
    } else {
      onAddManual(entry);
    }
    setModalOpen(false);
    setEditingEntry(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-1 text-xl font-semibold tracking-tight text-[#F5F5F5]">Imports & données</h2>
        <p className="text-xs text-[#F5F5F5]/60">Importez vos CSV par distributeur ou saisissez des données manuellement.</p>
      </div>

      {/* Onglets */}
      <div className="inline-flex flex-wrap gap-1 rounded-full border border-[rgba(245,245,245,0.15)] bg-[rgba(44,44,46,0.7)] px-1 py-1 backdrop-blur-xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              activeTab === tab.id
                ? "bg-[#F0FF00] text-[#101010]"
                : "text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.08)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu onglet CSV */}
      {activeTab !== "manual" && (() => {
        const distributor = activeTab as Distributor;
        const imp = imports[distributor];
        const error = errors[distributor];
        const totalRevenue = imp?.entries.reduce((s, e) => s + e.revenue, 0) ?? 0;
        const totalStreams = imp?.entries.reduce((s, e) => s + e.streams, 0) ?? 0;
        const totalTracks = new Set(imp?.entries.map((e) => e.trackTitle) ?? []).size;

        return (
          <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold text-[#F5F5F5]">
                  {TABS.find((t) => t.id === distributor)?.label}
                </CardTitle>
                {imp ? (
                  <p className="mt-0.5 text-xs text-[#F5F5F5]/50">
                    {imp.fileName} — importé le {new Date(imp.importedAt).toLocaleDateString("fr-FR")} — {imp.entries.length} lignes
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-[#F5F5F5]/40">Aucun import</p>
                )}
              </div>
              <div>
                <input
                  ref={(el) => { fileRefs.current[distributor] = el; }}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileChange(distributor, e)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRefs.current[distributor]?.click()}
                  className="flex items-center gap-2 rounded-full border-[rgba(245,245,245,0.3)] bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#F5F5F5] hover:bg-[rgba(245,245,245,0.08)]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Importer CSV
                </Button>
              </div>
            </CardHeader>
            {error && (
              <CardContent className="pt-0">
                <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
              </CardContent>
            )}
            {imp && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-[rgba(15,23,42,0.6)] px-3 py-2">
                    <div className="text-xs text-[#F5F5F5]/50">Revenus</div>
                    <div className="text-base font-semibold text-[#F0FF00]">${totalRevenue.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-[rgba(15,23,42,0.6)] px-3 py-2">
                    <div className="text-xs text-[#F5F5F5]/50">Streams</div>
                    <div className="text-base font-semibold text-[#F5F5F5]">{totalStreams.toLocaleString("fr-FR")}</div>
                  </div>
                  <div className="rounded-lg bg-[rgba(15,23,42,0.6)] px-3 py-2">
                    <div className="text-xs text-[#F5F5F5]/50">Titres</div>
                    <div className="text-base font-semibold text-[#F5F5F5]">{totalTracks}</div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })()}

      {/* Contenu onglet saisie manuelle */}
      {activeTab === "manual" && (
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-[#F5F5F5]">Saisie manuelle</CardTitle>
              <p className="mt-0.5 text-xs text-[#F5F5F5]/50">{manualEntries.length} entrée{manualEntries.length !== 1 ? "s" : ""}</p>
            </div>
            <Button
              type="button"
              onClick={() => { setEditingEntry(null); setModalOpen(true); }}
              className="flex items-center gap-2 rounded-full bg-[#F0FF00] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#101010] hover:bg-[#F0FF00]/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter un titre
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {manualEntries.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#F5F5F5]/40">Aucune entrée. Cliquez sur "Ajouter un titre" pour commencer.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[rgba(245,245,245,0.08)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[rgba(245,245,245,0.08)] bg-[rgba(15,23,42,0.8)]">
                      <th className="px-3 py-2 text-left font-medium text-[#F5F5F5]/60">Période</th>
                      <th className="px-3 py-2 text-left font-medium text-[#F5F5F5]/60">Titre</th>
                      <th className="px-3 py-2 text-right font-medium text-[#F5F5F5]/60">Streams</th>
                      <th className="px-3 py-2 text-right font-medium text-[#F5F5F5]/60">Revenus</th>
                      <th className="px-3 py-2 text-right font-medium text-[#F5F5F5]/60">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-[rgba(245,245,245,0.04)] last:border-0 hover:bg-[rgba(245,245,245,0.03)]">
                        <td className="px-3 py-2 text-[#F5F5F5]/70">{entry.period}</td>
                        <td className="max-w-[180px] truncate px-3 py-2 font-medium text-[#F5F5F5]">{entry.trackTitle}</td>
                        <td className="px-3 py-2 text-right text-[#F5F5F5]/80">{entry.streams.toLocaleString("fr-FR")}</td>
                        <td className="px-3 py-2 text-right font-semibold text-[#F0FF00]">{entry.revenue.toFixed(2)} {entry.currency}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button" variant="outline" size="icon"
                              className="h-7 w-7 rounded-full border-[rgba(245,245,245,0.2)] bg-transparent text-[#F5F5F5] hover:bg-[rgba(245,245,245,0.08)]"
                              onClick={() => { setEditingEntry(entry); setModalOpen(true); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button" variant="outline" size="icon"
                              className="h-7 w-7 rounded-full border-[rgba(248,113,113,0.4)] bg-transparent text-rose-300 hover:bg-[rgba(127,29,29,0.6)]"
                              onClick={() => onDeleteManual(entry.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <RoyaltiesManualModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEntry(null); }}
        onSave={handleSaveManual}
        entry={editingEntry}
      />
    </div>
  );
}
```

- [ ] **Vérifier la compilation**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Commit**

```bash
git add src/modules/incomes/components/RoyaltiesImports.tsx
git commit -m "feat(royalties): add imports section with per-distributor tabs and manual entry"
```

---

## Task 10 : RoyaltiesPage (orchestrateur)

**Files:**
- Modify: `src/modules/incomes/components/RoyaltiesPage.tsx` (remplacer entièrement)

- [ ] **Remplacer RoyaltiesPage.tsx**

```typescript
// src/modules/incomes/components/RoyaltiesPage.tsx
"use client";

import { useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { RoyaltiesDashboard } from "./RoyaltiesDashboard";
import { RoyaltiesImports } from "./RoyaltiesImports";
import type {
  Distributor, DistributorImport, ImportsStore, ManualEntry, RoyaltyEntry, TabId
} from "../parsers/royalties-types";
import { EMPTY_IMPORTS } from "../parsers/royalties-types";

export function RoyaltiesPage() {
  const [imports, setImports] = useLocalStorage<ImportsStore>("royalties:imports", EMPTY_IMPORTS);
  const [manualEntries, setManualEntries] = useLocalStorage<ManualEntry[]>("royalties:manual", []);
  const [lastTab, setLastTab] = useLocalStorage<TabId>("royalties:lastTab", "distrokid");

  const allEntries: RoyaltyEntry[] = useMemo(() => {
    const fromImports = Object.values(imports)
      .filter((imp): imp is DistributorImport => imp !== null)
      .flatMap((imp) => imp.entries);
    return [...fromImports, ...manualEntries];
  }, [imports, manualEntries]);

  const handleImport = (distributor: Distributor, imp: DistributorImport) => {
    setImports((prev) => ({ ...prev, [distributor]: imp }));
  };

  const handleAddManual = (entry: ManualEntry) => {
    setManualEntries((prev) => [entry, ...prev]);
  };

  const handleEditManual = (entry: ManualEntry) => {
    setManualEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
  };

  const handleDeleteManual = (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("Supprimer cette entrée ?")) return;
    setManualEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-8 bg-[#101010] px-2 py-4 text-[#F5F5F5] md:px-4 md:py-6">
      <header>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Royalties</h1>
        <p className="text-sm text-[#F5F5F5]/60">
          Revenus, streams et performances — tous distributeurs confondus.
        </p>
      </header>

      <RoyaltiesDashboard entries={allEntries} />

      <div className="border-t border-[rgba(245,245,245,0.08)]" />

      <RoyaltiesImports
        imports={imports}
        manualEntries={manualEntries}
        defaultTab={lastTab}
        onImport={handleImport}
        onTabChange={setLastTab}
        onAddManual={handleAddManual}
        onEditManual={handleEditManual}
        onDeleteManual={handleDeleteManual}
      />
    </div>
  );
}
```

- [ ] **Vérifier la compilation complète**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npx tsc --noEmit 2>&1
```

Attendu : aucune erreur TypeScript.

- [ ] **Lancer le dev server et vérifier visuellement**

```bash
cd /Users/eliott/Desktop/SIDEKICK && npm run dev
```

Naviguer sur la page Royalties dans l'app et vérifier :
- Le dashboard s'affiche avec l'état vide (message "Aucune donnée de royalties")
- Les onglets sont présents et le dernier onglet actif est mémorisé
- L'onglet "Saisie manuelle" permet d'ajouter/éditer/supprimer des entrées
- Le dashboard se met à jour après ajout d'une entrée manuelle

- [ ] **Commit final**

```bash
git add src/modules/incomes/components/RoyaltiesPage.tsx
git commit -m "feat(royalties): wire up RoyaltiesPage with dashboard and imports"
```
