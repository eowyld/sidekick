# Rémunération dans TourDates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un système de rémunération (factures + cachets intermittence) directement dans le dialog des représentations, synchronisé avec les modules Revenus existants.

**Architecture:** Deux nouveaux champs `invoiceIds` et `missionIds` sont ajoutés au type `TourDate` et persistés dans `user_tour_dates` (colonnes JSONB). Le dialog "Rémunération" charge `useIncomesData` et réutilise les mêmes setters (`setInvoices`, `setMissions`) — aucune duplication de logique. Un sous-dialog d'édition facture/mission est extrait de `InvoicesPage` / `IntermittencePage` en composant partagé.

**Tech Stack:** Next.js App Router, React, Supabase, SWR, Tailwind, Lucide, Radix UI

---

## File Map

| Action | Fichier | Responsabilité |
|---|---|---|
| Modify | `supabase/migrations/20260424000000_tour_dates_remuneration.sql` | Ajouter colonnes `invoice_ids` et `mission_ids` |
| Modify | `src/modules/live/data/defaultRepresentations.ts` | Ajouter `invoiceIds` et `missionIds` à `TourDate` |
| Modify | `src/hooks/useLiveData.ts` | Mapper les nouvelles colonnes dans `tourDateToRow` / `rowToTourDate` |
| Create | `src/modules/incomes/components/InvoiceEditDialog.tsx` | Formulaire d'édition facture réutilisable (extrait de `InvoicesPage`) |
| Create | `src/modules/incomes/components/MissionEditDialog.tsx` | Formulaire d'édition mission réutilisable (extrait de `IntermittencePage`) |
| Modify | `src/modules/live/components/TourDatesPage.tsx` | Implémenter le dialog Rémunération complet |

---

## Task 1 : Migration Supabase — colonnes `invoice_ids` et `mission_ids`

**Files:**
- Create: `supabase/migrations/20260424000000_tour_dates_remuneration.sql`

- [ ] **Step 1 : Créer le fichier de migration**

```sql
-- supabase/migrations/20260424000000_tour_dates_remuneration.sql
ALTER TABLE user_tour_dates
  ADD COLUMN IF NOT EXISTS invoice_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mission_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
```

- [ ] **Step 2 : Appliquer la migration**

```bash
npx supabase db push
```

Expected: `Applied 1 migration` (ou confirmation Supabase cloud). Si erreur de connexion, vérifier `.env.local`.

---

## Task 2 : Mettre à jour le type `TourDate` et les mappers

**Files:**
- Modify: `src/modules/live/data/defaultRepresentations.ts`
- Modify: `src/hooks/useLiveData.ts`

- [ ] **Step 1 : Ajouter les champs au type `TourDate`**

Dans `src/modules/live/data/defaultRepresentations.ts`, modifier le type :

```ts
export type TourDate = {
  id: number;
  city: string;
  venue: string;
  date: string;
  status: TourStatus;
  address: string;
  organisateur?: string;
  timetable: TimetableItem[];
  transport: boolean;
  lodging: boolean;
  remuneration: boolean;
  equipment: boolean;
  note?: string;
  invoiceIds?: string[];
  missionIds?: string[];
};
```

- [ ] **Step 2 : Mettre à jour `tourDateToRow` dans `useLiveData.ts`**

Remplacer la fonction `tourDateToRow` (ligne ~70) :

```ts
function tourDateToRow(d: TourDate, userId: string): Record<string, unknown> {
  return {
    id: String(d.id),
    user_id: userId,
    city: d.city,
    venue: d.venue,
    date: d.date,
    status: d.status,
    address: d.address ?? "",
    organisateur: d.organisateur ?? null,
    note: d.note ?? null,
    transport: d.transport,
    lodging: d.lodging,
    remuneration: d.remuneration,
    equipment: d.equipment,
    timetable: d.timetable ?? [],
    invoice_ids: d.invoiceIds ?? [],
    mission_ids: d.missionIds ?? [],
  };
}
```

- [ ] **Step 3 : Mettre à jour `rowToTourDate` dans `useLiveData.ts`**

Remplacer la fonction `rowToTourDate` (ligne ~89) :

```ts
function rowToTourDate(row: Record<string, unknown>): TourDate {
  return {
    id: row.id as number,
    city: row.city as string,
    venue: row.venue as string,
    date: row.date as string,
    status: row.status as TourDate["status"],
    address: row.address as string,
    organisateur: (row.organisateur as string) ?? undefined,
    note: (row.note as string) ?? undefined,
    transport: row.transport as boolean,
    lodging: row.lodging as boolean,
    remuneration: row.remuneration as boolean,
    equipment: row.equipment as boolean,
    timetable: (row.timetable as TimetableItem[]) ?? [],
    invoiceIds: (row.invoice_ids as string[]) ?? [],
    missionIds: (row.mission_ids as string[]) ?? [],
  };
}
```

- [ ] **Step 4 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Expected: 0 erreurs.

---

## Task 3 : Créer `InvoiceEditDialog` — formulaire facture réutilisable

**Files:**
- Create: `src/modules/incomes/components/InvoiceEditDialog.tsx`

Ce composant encapsule le formulaire complet de création/édition de facture, utilisable depuis TourDates ou InvoicesPage.

- [ ] **Step 1 : Créer le fichier**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import type { Invoice, InvoiceStatus, IncomeType, InvoiceLine } from "@/hooks/useIncomesData";

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseAmount(s: string): number {
  const raw = (s || "0").replace(",", ".").trim();
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function computeTotals(lines: InvoiceLine[]): { totalHT: number; totalTTC: number } {
  let totalHT = 0;
  let totalTTC = 0;
  for (const l of lines) {
    const qty = parseAmount(l.quantity) || 1;
    const unit = parseAmount(l.unitPrice);
    const vat = parseAmount(l.vatPercent) / 100;
    const ht = qty * unit;
    totalHT += ht;
    totalTTC += ht * (1 + vat);
  }
  return { totalHT, totalTTC };
}

function formatMoney(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function isoToFr(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${String(Number(d)).padStart(2, "0")}/${String(Number(m)).padStart(2, "0")}/${y}`;
}

function frToIso(fr: string): string {
  const parts = fr.split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  return `${y}-${String(Number(m)).padStart(2, "0")}-${String(Number(d)).padStart(2, "0")}`;
}

const INCOME_TYPES = ["Live", "Phono", "Edition", "Merchandising", "Autre"] as const;
const LINE_TYPES = ["service", "vente de marchandise"] as const;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface InvoiceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Invoice existante à éditer, ou undefined pour création */
  invoice?: Invoice;
  /** Valeurs pré-remplies pour une nouvelle facture */
  defaults?: {
    subject?: string;
    client?: string;
    number?: string;
  };
  onSave: (invoice: Invoice) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InvoiceEditDialog({
  open,
  onOpenChange,
  invoice,
  defaults,
  onSave,
}: InvoiceEditDialogProps) {
  const blankLine = (): InvoiceLine => ({
    id: Date.now(),
    description: "",
    type: "service",
    quantity: "1",
    unitPrice: "",
    vatPercent: "0",
  });

  const [form, setForm] = useState<{
    number: string;
    client: string;
    address: string;
    siret: string;
    subject: string;
    dueDate: string;
    status: InvoiceStatus;
    incomeType: IncomeType;
    lines: InvoiceLine[];
    notes: string;
  }>(() => {
    if (invoice) {
      const lines =
        invoice.lines && invoice.lines.length > 0
          ? invoice.lines
          : [blankLine()];
      return {
        number: invoice.number,
        client: invoice.client,
        address: invoice.address ?? "",
        siret: invoice.siret ?? "",
        subject: invoice.subject ?? "",
        dueDate: invoice.dueDate ? frToIso(invoice.dueDate) : "",
        status: invoice.status,
        incomeType: (invoice.incomeType ?? "Live") as IncomeType,
        lines,
        notes: invoice.notes ?? "",
      };
    }
    return {
      number: defaults?.number ?? "",
      client: defaults?.client ?? "",
      address: "",
      siret: "",
      subject: defaults?.subject ?? "",
      dueDate: "",
      status: "en_attente",
      incomeType: "Live",
      lines: [blankLine()],
      notes: "",
    };
  });

  // Reset when dialog opens with new data
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      if (invoice) {
        const lines =
          invoice.lines && invoice.lines.length > 0
            ? invoice.lines
            : [blankLine()];
        setForm({
          number: invoice.number,
          client: invoice.client,
          address: invoice.address ?? "",
          siret: invoice.siret ?? "",
          subject: invoice.subject ?? "",
          dueDate: invoice.dueDate ? frToIso(invoice.dueDate) : "",
          status: invoice.status,
          incomeType: (invoice.incomeType ?? "Live") as IncomeType,
          lines,
          notes: invoice.notes ?? "",
        });
      } else {
        setForm({
          number: defaults?.number ?? "",
          client: defaults?.client ?? "",
          address: "",
          siret: "",
          subject: defaults?.subject ?? "",
          dueDate: "",
          status: "en_attente",
          incomeType: "Live",
          lines: [blankLine()],
          notes: "",
        });
      }
    }
    onOpenChange(isOpen);
  };

  const addLine = () =>
    setForm((prev) => ({ ...prev, lines: [...prev.lines, blankLine()] }));

  const removeLine = (id: number) =>
    setForm((prev) => ({
      ...prev,
      lines:
        prev.lines.filter((l) => l.id !== id).length > 0
          ? prev.lines.filter((l) => l.id !== id)
          : [blankLine()],
    }));

  const updateLine = (id: number, field: keyof InvoiceLine, value: string) =>
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    }));

  const handleSave = () => {
    const number = form.number.trim();
    const client = form.client.trim();
    if (!number || !client) return;

    const lines = form.lines.filter(
      (l) => l.description.trim() || parseAmount(l.unitPrice) > 0
    );
    const { totalTTC } = computeTotals(lines);
    const existingAmount = invoice?.amount;
    const amount =
      lines.length > 0 ? formatMoney(totalTTC) : (existingAmount ?? "0,00");

    const saved: Invoice = {
      id: invoice?.id ?? crypto.randomUUID(),
      number,
      client,
      subject: form.subject.trim(),
      dueDate: form.dueDate ? isoToFr(form.dueDate) : "",
      status: form.status,
      amount,
      address: form.address.trim() || undefined,
      siret: form.siret.trim() || undefined,
      incomeType: form.incomeType,
      lines: lines.length > 0 ? lines : undefined,
      notes: form.notes.trim() || undefined,
    };

    onSave(saved);
    onOpenChange(false);
  };

  const { totalHT, totalTTC } = computeTotals(form.lines);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-[rgba(245,245,245,0.18)] bg-[rgba(44,44,46,0.84)] text-[#F5F5F5] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoice ? `Modifier la facture ${invoice.number}` : "Nouvelle facture"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">N° facture</p>
              <Input
                value={form.number}
                onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
                placeholder="2024-001"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Client</p>
              <Input
                value={form.client}
                onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))}
                placeholder="Nom du client"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Objet</p>
            <Input
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              placeholder="Prestation artistique – Concert…"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Adresse</p>
              <Input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Adresse du client"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">SIRET</p>
              <Input
                value={form.siret}
                onChange={(e) => setForm((p) => ({ ...p, siret: e.target.value }))}
                placeholder="000 000 000 00000"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Date d&apos;échéance</p>
              <DatePicker
                value={form.dueDate}
                onChange={(v) => setForm((p) => ({ ...p, dueDate: v }))}
                placeholder="Choisir une date"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Statut</p>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as InvoiceStatus }))}
              >
                <option value="en_attente">En attente</option>
                <option value="payee">Payée</option>
              </select>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Type de revenu</p>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={form.incomeType}
              onChange={(e) => setForm((p) => ({ ...p, incomeType: e.target.value as IncomeType }))}
            >
              {INCOME_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Lignes</p>
            <div className="space-y-2">
              {form.lines.map((line) => (
                <div key={line.id} className="grid grid-cols-[1fr,120px,70px,60px,auto] gap-2 items-end">
                  <div>
                    <p className="mb-1 text-[10px] text-muted-foreground">Description</p>
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(line.id, "description", e.target.value)}
                      placeholder="Prestation…"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] text-muted-foreground">Qté</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] text-muted-foreground">Prix U. HT</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.id, "unitPrice", e.target.value)}
                      placeholder="0"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] text-muted-foreground">TVA %</p>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={line.vatPercent}
                      onChange={(e) => updateLine(line.id, "vatPercent", e.target.value)}
                      placeholder="0"
                      className="text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive mt-4"
                    onClick={() => removeLine(line.id)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={addLine}
            >
              + Ajouter une ligne
            </Button>
            {form.lines.some((l) => l.unitPrice) && (
              <div className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
                <p>Total HT : <span className="font-medium">{formatMoney(totalHT)} €</span></p>
                <p>Total TTC : <span className="font-medium">{formatMoney(totalTTC)} €</span></p>
              </div>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Notes</p>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Notes en bas de facture..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!form.number.trim() || !form.client.trim()}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Expected: 0 erreurs.

---

## Task 4 : Créer `MissionEditDialog` — formulaire mission réutilisable

**Files:**
- Create: `src/modules/incomes/components/MissionEditDialog.tsx`

- [ ] **Step 1 : Lire le formulaire existant dans IntermittencePage**

```bash
grep -n "form\.\|setForm\|grossAmount\|charges\|netAmount\|employer\|type\|hours" src/modules/incomes/components/IntermittencePage.tsx | head -60
```

- [ ] **Step 2 : Créer le fichier**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { IntermittenceMission } from "@/hooks/useIncomesData";

const MISSION_TYPES = [
  "Spectacle",
  "Répétition rémunérée",
  "Enregistrement",
  "Autre",
] as const;

export interface MissionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mission existante à éditer, ou undefined pour création */
  mission?: IntermittenceMission;
  /** Valeurs pré-remplies pour une nouvelle mission */
  defaults?: {
    date?: string;   // ISO YYYY-MM-DD
    employer?: string;
  };
  onSave: (mission: IntermittenceMission) => void;
}

export function MissionEditDialog({
  open,
  onOpenChange,
  mission,
  defaults,
  onSave,
}: MissionEditDialogProps) {
  const blank = () => ({
    date: defaults?.date ?? "",
    employer: defaults?.employer ?? "",
    type: "Spectacle" as IntermittenceMission["type"],
    hours: "",
    grossAmount: "",
    charges: "",
    netAmount: "",
    notes: "",
  });

  const fromMission = (m: IntermittenceMission) => ({
    date: m.date,
    employer: m.employer,
    type: m.type,
    hours: String(m.hours),
    grossAmount: String(m.grossAmount),
    charges: String(m.charges),
    netAmount: String(m.netAmount),
    notes: m.notes,
  });

  const [form, setForm] = useState(() => (mission ? fromMission(mission) : blank()));

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setForm(mission ? fromMission(mission) : blank());
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    if (!form.date || !form.employer) return;

    const saved: IntermittenceMission = {
      id: mission?.id ?? crypto.randomUUID(),
      date: form.date,
      employer: form.employer.trim(),
      type: form.type,
      hours: Number(form.hours) || 0,
      grossAmount: Number(form.grossAmount) || 0,
      charges: Number(form.charges) || 0,
      netAmount: Number(form.netAmount) || 0,
      notes: form.notes.trim(),
    };

    onSave(saved);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-[rgba(245,245,245,0.18)] bg-[rgba(44,44,46,0.84)] text-[#F5F5F5]">
        <DialogHeader>
          <DialogTitle>
            {mission ? "Modifier le cachet" : "Nouveau cachet"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Date</p>
              <DatePicker
                value={form.date}
                onChange={(v) => setForm((p) => ({ ...p, date: v }))}
                placeholder="Choisir une date"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Type</p>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, type: e.target.value as IntermittenceMission["type"] }))
                }
              >
                {MISSION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Employeur</p>
            <Input
              value={form.employer}
              onChange={(e) => setForm((p) => ({ ...p, employer: e.target.value }))}
              placeholder="Nom de l'organisateur / employeur"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Heures</p>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.hours}
                onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Brut (€)</p>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.grossAmount}
                onChange={(e) => setForm((p) => ({ ...p, grossAmount: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Charges (€)</p>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.charges}
                onChange={(e) => setForm((p) => ({ ...p, charges: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Net (€)</p>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.netAmount}
              onChange={(e) => setForm((p) => ({ ...p, netAmount: e.target.value }))}
              placeholder="0"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Notes</p>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Informations complémentaires…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!form.date || !form.employer.trim()}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3 : Vérifier le typage**

```bash
npx tsc --noEmit
```

Expected: 0 erreurs.

---

## Task 5 : Implémenter le dialog Rémunération dans `TourDatesPage`

**Files:**
- Modify: `src/modules/live/components/TourDatesPage.tsx`

- [ ] **Step 1 : Ajouter les imports en haut du fichier**

Après les imports existants, ajouter :

```tsx
import { useIncomesData } from "@/hooks/useIncomesData";
import type { Invoice, IntermittenceMission } from "@/hooks/useIncomesData";
import { InvoiceEditDialog } from "@/modules/incomes/components/InvoiceEditDialog";
import { MissionEditDialog } from "@/modules/incomes/components/MissionEditDialog";
import { DollarSign } from "lucide-react";
```

- [ ] **Step 2 : Ajouter le hook `useIncomesData` dans le composant**

Dans `TourDatesPage`, après la destructuration de `useLiveData` (ligne ~185), ajouter :

```tsx
const { invoices, setInvoices, missions, setMissions } = useIncomesData();
```

- [ ] **Step 3 : Ajouter les états du dialog rémunération**

Après les états existants du composant, ajouter :

```tsx
const [invoiceEditDialog, setInvoiceEditDialog] = useState<{
  open: boolean;
  invoice?: Invoice;
  defaults?: { subject?: string; client?: string; number?: string };
}>({ open: false });

const [missionEditDialog, setMissionEditDialog] = useState<{
  open: boolean;
  mission?: IntermittenceMission;
  defaults?: { date?: string; employer?: string };
}>({ open: false });
```

- [ ] **Step 4 : Ajouter les helpers pour la rémunération**

Avant le `return`, ajouter :

```tsx
function getNextInvoiceNumber(invs: Invoice[]): string {
  let max = 0;
  const year = new Date().getFullYear();
  for (const inv of invs) {
    const match = inv.number.match(/-(\d+)$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${year}-${String(max + 1).padStart(3, "0")}`;
}

const handleSaveInvoice = (inv: Invoice, tourDate: TourDate) => {
  const isNew = !invoices.find((i) => i.id === inv.id);
  setInvoices((prev) =>
    isNew ? [...prev, inv] : prev.map((i) => (i.id === inv.id ? inv : i))
  );
  if (isNew) {
    setDates((prev) =>
      prev.map((d) =>
        d.id === tourDate.id
          ? { ...d, invoiceIds: [...(d.invoiceIds ?? []), inv.id] }
          : d
      )
    );
  }
};

const handleSaveMission = (m: IntermittenceMission, tourDate: TourDate) => {
  const isNew = !missions.find((x) => x.id === m.id);
  setMissions((prev) =>
    isNew ? [...prev, m] : prev.map((x) => (x.id === m.id ? m : x))
  );
  if (isNew) {
    setDates((prev) =>
      prev.map((d) =>
        d.id === tourDate.id
          ? { ...d, missionIds: [...(d.missionIds ?? []), m.id] }
          : d
      )
    );
  }
};

const handleUnlinkInvoice = (invoiceId: string, tourDateId: number) => {
  setDates((prev) =>
    prev.map((d) =>
      d.id === tourDateId
        ? { ...d, invoiceIds: (d.invoiceIds ?? []).filter((id) => id !== invoiceId) }
        : d
    )
  );
};

const handleUnlinkMission = (missionId: string, tourDateId: number) => {
  setDates((prev) =>
    prev.map((d) =>
      d.id === tourDateId
        ? { ...d, missionIds: (d.missionIds ?? []).filter((id) => id !== missionId) }
        : d
    )
  );
};
```

- [ ] **Step 5 : Implémenter le contenu du dialog Rémunération**

Localiser le bloc `{optionsDate && optionsDialog.type === "equipment" && (` dans le fichier et ajouter **avant** ce bloc le contenu suivant pour la rémunération :

```tsx
{optionsDate && optionsDialog.type === "remuneration" && (
  <>
    <div className="space-y-5 py-2 text-sm">

      {/* ── Factures ───────────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Factures</p>

        {/* Factures liées */}
        {(optionsDate.invoiceIds ?? []).length > 0 && (
          <div className="mb-2 space-y-2">
            {(optionsDate.invoiceIds ?? []).map((invId) => {
              const inv = invoices.find((i) => i.id === invId);
              if (!inv) return null;
              return (
                <div
                  key={invId}
                  className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium">{inv.number} — {inv.subject || inv.client}</p>
                    <p className="text-[11px] text-muted-foreground">{inv.amount} € • {inv.status === "payee" ? "Payée" : "En attente"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setInvoiceEditDialog({ open: true, invoice: inv })
                      }
                    >
                      Modifier
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleUnlinkInvoice(invId, optionsDate.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Délier</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {/* Lier une facture existante */}
          {invoices.filter((i) => !(optionsDate.invoiceIds ?? []).includes(i.id)).length > 0 && (
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none"
              defaultValue=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                setDates((prev) =>
                  prev.map((d) =>
                    d.id === optionsDate.id
                      ? { ...d, invoiceIds: [...(d.invoiceIds ?? []), id] }
                      : d
                  )
                );
                e.target.value = "";
              }}
            >
              <option value="">Lier une facture existante…</option>
              {invoices
                .filter((i) => !(optionsDate.invoiceIds ?? []).includes(i.id))
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.number} — {i.subject || i.client} ({i.amount} €)
                  </option>
                ))}
            </select>
          )}

          {/* Créer une facture */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const subject = [getRepresentationTitle(optionsDate), optionsDate.date]
                .filter(Boolean)
                .join(" – ");
              const client = optionsDate.organisateur ?? "";
              const number = getNextInvoiceNumber(invoices);
              setInvoiceEditDialog({
                open: true,
                defaults: { subject, client, number },
              });
            }}
          >
            <Plus className="mr-1 h-3 w-3" />
            Créer une facture
          </Button>
        </div>
      </div>

      {/* ── Cachets (Intermittence) ─────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Cachets</p>

        {/* Missions liées */}
        {(optionsDate.missionIds ?? []).length > 0 && (
          <div className="mb-2 space-y-2">
            {(optionsDate.missionIds ?? []).map((mId) => {
              const m = missions.find((x) => x.id === mId);
              if (!m) return null;
              return (
                <div
                  key={mId}
                  className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium">{m.type} — {m.employer}</p>
                    <p className="text-[11px] text-muted-foreground">{m.netAmount} € net • {m.hours}h</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setMissionEditDialog({ open: true, mission: m })
                      }
                    >
                      Modifier
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleUnlinkMission(mId, optionsDate.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Délier</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {/* Lier une mission existante */}
          {missions.filter((m) => !(optionsDate.missionIds ?? []).includes(m.id)).length > 0 && (
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none"
              defaultValue=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                setDates((prev) =>
                  prev.map((d) =>
                    d.id === optionsDate.id
                      ? { ...d, missionIds: [...(d.missionIds ?? []), id] }
                      : d
                  )
                );
                e.target.value = "";
              }}
            >
              <option value="">Lier un cachet existant…</option>
              {missions
                .filter((m) => !(optionsDate.missionIds ?? []).includes(m.id))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.type} — {m.employer} ({m.netAmount} € net)
                  </option>
                ))}
            </select>
          )}

          {/* Créer un cachet */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setMissionEditDialog({
                open: true,
                defaults: {
                  date: toIsoFromFr(optionsDate.date),
                  employer: optionsDate.organisateur ?? "",
                },
              });
            }}
          >
            <Plus className="mr-1 h-3 w-3" />
            Créer un cachet
          </Button>
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOptionsDialog({ dateId: null, type: null })}
      >
        Fermer
      </Button>
    </DialogFooter>
  </>
)}
```

- [ ] **Step 6 : Ajouter les sous-dialogs `InvoiceEditDialog` et `MissionEditDialog`**

Juste avant la balise fermante `</div>` principale du composant (après le dernier `</Dialog>`), ajouter :

```tsx
{/* Sous-dialog édition facture */}
<InvoiceEditDialog
  open={invoiceEditDialog.open}
  onOpenChange={(open) => setInvoiceEditDialog((prev) => ({ ...prev, open }))}
  invoice={invoiceEditDialog.invoice}
  defaults={invoiceEditDialog.defaults}
  onSave={(inv) => {
    if (optionsDate) handleSaveInvoice(inv, optionsDate);
  }}
/>

{/* Sous-dialog édition mission */}
<MissionEditDialog
  open={missionEditDialog.open}
  onOpenChange={(open) => setMissionEditDialog((prev) => ({ ...prev, open }))}
  mission={missionEditDialog.mission}
  defaults={missionEditDialog.defaults}
  onSave={(m) => {
    if (optionsDate) handleSaveMission(m, optionsDate);
  }}
/>
```

- [ ] **Step 7 : Mettre à jour le titre du dialog Rémunération**

Localiser la `DialogTitle` du dialog principal (options) et ajouter le cas `remuneration` :

```tsx
<DialogTitle>
  {optionsDate && optionsDialog.type === "transport"
    ? `Transports – ${getRepresentationTitle(optionsDate)}`
    : optionsDate && optionsDialog.type === "lodging"
      ? `Logement – ${getRepresentationTitle(optionsDate)}`
      : optionsDate && optionsDialog.type === "remuneration"
        ? `Rémunération – ${getRepresentationTitle(optionsDate)}`
        : optionsDate && optionsDialog.type === "equipment"
          ? `Matériel – ${getRepresentationTitle(optionsDate)}`
          : "Options"}
</DialogTitle>
```

- [ ] **Step 8 : Vérifier le typage et démarrer le serveur**

```bash
npx tsc --noEmit
npm run dev
```

Expected: 0 erreurs TypeScript. Ouvrir TourDates, cliquer "Rémunération" sur une date → le dialog s'ouvre avec les sections Factures et Cachets. Tester création + lien + modification + délier.

---

## Task 6 : Vérification finale

- [ ] **Step 1 : Tester le flux complet**

  1. Ouvrir une représentation → dialog Rémunération
  2. Créer une facture → vérifier qu'elle apparaît dans `/incomes` (Factures)
  3. Modifier la facture depuis TourDates → vérifier la mise à jour dans les deux endroits
  4. Lier une facture existante → vérifier l'ID dans `invoiceIds`
  5. Délier → vérifier que l'ID disparaît de `invoiceIds` (facture conservée dans Revenus)
  6. Répéter pour un cachet (Intermittence)

- [ ] **Step 2 : Lint**

```bash
npm run lint
```

Expected: 0 warnings/erreurs.

- [ ] **Step 3 : TypeScript final**

```bash
npx tsc --noEmit
```

Expected: 0 erreurs.
