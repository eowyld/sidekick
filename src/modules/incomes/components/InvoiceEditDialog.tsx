"use client";

import { useEffect, useState } from "react";
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
import type { Invoice, InvoiceStatus, IncomeType, InvoiceLine } from "@/hooks/useIncomesData";
import { mergeEncaissementDate } from "@/modules/incomes/components/invoice-utils";

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

export interface InvoiceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice;
  defaults?: {
    subject?: string;
    client?: string;
    number?: string;
  };
  onSave: (invoice: Invoice) => void;
}

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
      const lines = invoice.lines && invoice.lines.length > 0 ? invoice.lines : [blankLine()];
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

  useEffect(() => {
    if (!open) return;
    if (invoice) {
      const lines = invoice.lines && invoice.lines.length > 0 ? invoice.lines : [blankLine()];
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    const amount = lines.length > 0 ? formatMoney(totalTTC) : (existingAmount ?? "0,00");

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

    onSave(mergeEncaissementDate(invoice, saved));
    onOpenChange(false);
  };

  const { totalHT, totalTTC } = computeTotals(form.lines);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
