"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Download, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DatePicker } from "@/components/ui/date-picker";

type InvoiceStatus = "en_attente" | "payee";

const INCOME_TYPES = ["Live", "Phono", "Edition", "Merchandising", "Autre"] as const;
type IncomeType = (typeof INCOME_TYPES)[number];

const LINE_TYPES = ["service", "vente de marchandise"] as const;
type LineType = (typeof LINE_TYPES)[number];

type InvoiceLine = {
  id: number;
  description: string;
  type: LineType;
  quantity: string;
  unitPrice: string;
  vatPercent: string;
};

type Invoice = {
  id: number;
  number: string;
  client: string;
  subject: string;
  amount: string;
  dueDate: string;
  status: InvoiceStatus;
  address?: string;
  siret?: string;
  incomeType?: IncomeType;
  lines?: InvoiceLine[];
  notes?: string;
};

const defaultInvoices: Invoice[] = [
  {
    id: 1,
    number: "FAC-2025-001",
    client: "La Cigale",
    subject: "Prestation scénique",
    amount: "2 500,00",
    dueDate: "15/03/2025",
    status: "en_attente",
    address: "",
    siret: "",
    incomeType: "Live",
    lines: [{ id: 1, description: "Prestation scénique", type: "service", quantity: "1", unitPrice: "2500", vatPercent: "0" }],
    notes: ""
  },
  {
    id: 2,
    number: "FAC-2025-002",
    client: "Le Transbordeur",
    subject: "Concert",
    amount: "1 800,00",
    dueDate: "28/02/2025",
    status: "payee",
    address: "",
    siret: "",
    incomeType: "Live",
    lines: [],
    notes: ""
  }
];

function frToIso(frDate: string): string {
  if (!frDate) return "";
  const parts = frDate.split("/");
  if (parts.length !== 3) return frDate;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function isoToFr(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function parseFrDate(frDate: string): Date | null {
  if (!frDate) return null;
  const parts = frDate.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  return isNaN(date.getTime()) ? null : date;
}

function isOverdue(inv: Invoice): boolean {
  if (inv.status !== "en_attente" || !inv.dueDate) return false;
  const due = parseFrDate(inv.dueDate);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function parseAmount(s: string): number {
  const n = parseFloat(String(s || "0").replace(",", ".").replace(/\s/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

function computeTotals(lines: InvoiceLine[]): { totalHT: number; totalTTC: number } {
  let totalHT = 0;
  let totalTTC = 0;
  for (const line of lines) {
    const qty = parseAmount(line.quantity);
    const pu = parseAmount(line.unitPrice);
    const vat = parseAmount(line.vatPercent);
    const ht = qty * pu;
    totalHT += ht;
    totalTTC += ht * (1 + vat / 100);
  }
  return { totalHT, totalTTC };
}

function formatMoney(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function getNextInvoiceNumber(invoices: Invoice[]): string {
  const year = new Date().getFullYear();
  let maxNum = 0;
  for (const inv of invoices) {
    const match = inv.number.match(/-(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
    }
  }
  const next = maxNum + 1;
  return `FAC-${year}-${String(next).padStart(3, "0")}`;
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>(
    "incomes:invoices",
    defaultInvoices
  );
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [openSections, setOpenSections] = useState<{ en_attente: boolean; payees: boolean }>({
    en_attente: true,
    payees: false
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

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
  }>({
    number: "",
    client: "",
    address: "",
    siret: "",
    subject: "",
    dueDate: "",
    status: "en_attente",
    incomeType: "Live",
    lines: [{ id: 1, description: "", type: "service", quantity: "1", unitPrice: "", vatPercent: "0" }],
    notes: ""
  });

  const pendingInvoices = invoices.filter((i) => i.status === "en_attente");
  const paidInvoices = invoices.filter((i) => i.status === "payee");

  const getInvoiceAmount = (inv: Invoice): number => {
    if (inv.lines && inv.lines.length > 0) return computeTotals(inv.lines).totalTTC;
    return parseAmount(inv.amount);
  };
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);

  const toggleSection = (section: "en_attente" | "payees") => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const openAdd = () => {
    const nextNumber = getNextInvoiceNumber(invoices);
    setForm({
      number: nextNumber,
      client: "",
      address: "",
      siret: "",
      subject: "",
      dueDate: "",
      status: "en_attente",
      incomeType: "Live",
      lines: [{ id: Date.now(), description: "", type: "service", quantity: "1", unitPrice: "", vatPercent: "0" }],
      notes: ""
    });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (inv: Invoice) => {
    const lines = (inv.lines && inv.lines.length > 0) ? inv.lines : [{ id: Date.now(), description: "", type: "service" as const, quantity: "1", unitPrice: "", vatPercent: "0" }];
    setForm({
      number: inv.number,
      client: inv.client,
      address: inv.address ?? "",
      siret: inv.siret ?? "",
      subject: inv.subject ?? "",
      dueDate: inv.dueDate ? frToIso(inv.dueDate) : "",
      status: inv.status,
      incomeType: (inv.incomeType ?? "Live") as IncomeType,
      lines,
      notes: inv.notes ?? ""
    });
    setEditingId(inv.id);
    setDialogOpen(true);
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        { id: Date.now(), description: "", type: "service", quantity: "1", unitPrice: "", vatPercent: "0" }
      ]
    }));
  };

  const removeLine = (lineId: number) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((l) => l.id !== lineId).length > 0 ? prev.lines.filter((l) => l.id !== lineId) : [{ id: Date.now(), description: "", type: "service", quantity: "1", unitPrice: "", vatPercent: "0" }]
    }));
  };

  const updateLine = (lineId: number, field: keyof InvoiceLine, value: string | LineType) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === lineId ? { ...l, [field]: value } : l))
    }));
  };

  const saveInvoice = () => {
    const number = form.number.trim();
    const client = form.client.trim();
    const subject = form.subject.trim();
    const dueDate = form.dueDate.trim() ? isoToFr(form.dueDate.trim()) : "";
    const lines = form.lines.filter((l) => l.description.trim() || parseAmount(l.unitPrice) > 0);
    const { totalTTC } = computeTotals(lines);
    const existingAmount = editingId !== null ? invoices.find((i) => i.id === editingId)?.amount : null;
    const amount = lines.length > 0 ? formatMoney(totalTTC) : (existingAmount ?? "0,00");

    if (!number || !client) return;

    const payload = {
      number,
      client,
      subject,
      dueDate,
      status: form.status,
      amount,
      address: form.address.trim() || undefined,
      siret: form.siret.trim() || undefined,
      incomeType: form.incomeType,
      lines: lines.length > 0 ? lines : undefined,
      notes: form.notes.trim() || undefined
    };

    if (editingId !== null) {
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === editingId ? { ...inv, ...payload } : inv))
      );
    } else {
      const nextId = invoices.length > 0 ? Math.max(...invoices.map((i) => i.id)) + 1 : 1;
      setInvoices((prev) => [...prev, { id: nextId, ...payload }]);
    }
    setDialogOpen(false);
  };

  const deleteInvoice = (id: number) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    setDeleteConfirmId(null);
  };

  const markAsPaid = (id: number) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, status: "payee" as const } : inv
      )
    );
  };

  const downloadInvoice = (inv: Invoice) => {
    if (typeof window === "undefined") return;
    const { jsPDF } = require("jspdf") as typeof import("jspdf");
    const doc = new jsPDF();
    const lines = inv.lines && inv.lines.length > 0 ? inv.lines : [];
    const { totalHT, totalTTC } = lines.length > 0 ? computeTotals(lines) : { totalHT: parseAmount(inv.amount), totalTTC: parseAmount(inv.amount) };
    const statusLabel = inv.status === "payee" ? "Payée" : isOverdue(inv) ? "En retard" : "En attente";

    let y = 15;
    doc.setFontSize(18);
    doc.text(`Facture ${inv.number}`, 10, y);
    y += 10;
    doc.setFontSize(11);
    doc.text(`Client : ${inv.client}`, 10, y);
    y += 6;
    if (inv.address) {
      doc.text(`Adresse : ${inv.address}`, 10, y);
      y += 6;
    }
    if (inv.siret) {
      doc.text(`SIRET : ${inv.siret}`, 10, y);
      y += 6;
    }
    y += 4;
    doc.text(`Objet : ${inv.subject || "—"}`, 10, y);
    y += 6;
    doc.text(`Date d'échéance : ${inv.dueDate || "—"}`, 10, y);
    y += 6;
    doc.text(`Statut : ${statusLabel}`, 10, y);
    y += 6;
    doc.text(`Type de revenu : ${inv.incomeType || "—"}`, 10, y);
    y += 10;

    if (lines.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Détail des lignes", 10, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const colW = [60, 25, 15, 22, 15, 25];
      doc.text("Description", 10, y);
      doc.text("Type", 72, y);
      doc.text("Qté", 100, y);
      doc.text("Prix unit.", 117, y);
      doc.text("TVA %", 142, y);
      doc.text("Total HT", 160, y);
      y += 5;
      for (const line of lines) {
        const qty = parseAmount(line.quantity);
        const pu = parseAmount(line.unitPrice);
        const vat = parseAmount(line.vatPercent);
        const lineHT = qty * pu;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line.description.slice(0, 35) || "—", 10, y);
        doc.text(line.type === "service" ? "Service" : "Vente", 72, y);
        doc.text(line.quantity, 100, y);
        doc.text(line.unitPrice, 117, y);
        doc.text(line.vatPercent + " %", 142, y);
        doc.text(formatMoney(lineHT) + " €", 160, y);
        y += 5;
      }
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.text("Montant total HT : " + formatMoney(totalHT) + " €", 10, y);
      y += 6;
      doc.text("Montant total TTC : " + formatMoney(totalTTC) + " €", 10, y);
      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
    } else {
      doc.text("Montant : " + inv.amount + " €", 10, y);
      y += 10;
    }

    if (inv.notes) {
      doc.text("Notes :", 10, y);
      y += 5;
      const noteLines = doc.splitTextToSize(inv.notes, 180);
      doc.text(noteLines, 10, y);
    }

    doc.save(`facture-${inv.number.replace(/\s/g, "-")}.pdf`);
  };

  if (!isHydrated) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Facturation
        </h1>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">
            Facturation
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestion des factures : en attente et payées.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle facture
        </Button>
      </div>

      {/* Récap */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border bg-muted/30 px-4 py-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Revenu total (payé)
          </p>
          <p className="text-xl font-semibold">{formatMoney(totalPaid)} €</p>
        </div>
        <div className="rounded-md border bg-muted/30 px-4 py-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            En attente
          </p>
          <p className="text-xl font-semibold">{formatMoney(totalPending)} €</p>
        </div>
      </div>

      {/* Sections déroulantes */}
      <div className="space-y-2">
        {/* En attente */}
        <div className="rounded-md border">
          <button
            type="button"
            onClick={() => toggleSection("en_attente")}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/50"
          >
            <span className="flex items-center gap-2">
              {openSections.en_attente ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              En attente
              {pendingInvoices.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 text-xs">
                  {pendingInvoices.length}
                </span>
              )}
            </span>
          </button>
          {openSections.en_attente && (
            <div className="border-t">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">N° facture</th>
                    <th className="px-4 py-3 text-left font-medium">Client</th>
                    <th className="px-4 py-3 text-left font-medium">Objet</th>
                    <th className="px-4 py-3 text-left font-medium">Montant</th>
                    <th className="px-4 py-3 text-left font-medium">Date d&apos;échéance</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Aucune facture en attente.
                      </td>
                    </tr>
                  ) : (
                    pendingInvoices.map((inv) => {
                        const overdue = isOverdue(inv);
                        const displayAmount = inv.lines && inv.lines.length > 0 ? formatMoney(computeTotals(inv.lines).totalTTC) : inv.amount;
                        return (
                      <tr key={inv.id} className={`border-b last:border-0 hover:bg-muted/30 ${overdue ? "bg-red-50" : ""}`}>
                        <td className="px-4 py-3 font-medium">{inv.number}</td>
                        <td className="px-4 py-3">{inv.client}</td>
                        <td className="px-4 py-3">{inv.subject || "—"}</td>
                        <td className="px-4 py-3">{displayAmount} €</td>
                        <td className="px-4 py-3">
                          {inv.dueDate || "—"}
                          {overdue && (
                            <span className="ml-2 inline-block rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                              En retard
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" title="Télécharger" onClick={() => downloadInvoice(inv)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Modifier" onClick={() => openEdit(inv)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Marquer payée"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => markAsPaid(inv.id)}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Supprimer"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(inv.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payées */}
        <div className="rounded-md border">
          <button
            type="button"
            onClick={() => toggleSection("payees")}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/50"
          >
            <span className="flex items-center gap-2">
              {openSections.payees ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              Payées
              {paidInvoices.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 text-xs">
                  {paidInvoices.length}
                </span>
              )}
            </span>
          </button>
          {openSections.payees && (
            <div className="border-t">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">N° facture</th>
                    <th className="px-4 py-3 text-left font-medium">Client</th>
                    <th className="px-4 py-3 text-left font-medium">Objet</th>
                    <th className="px-4 py-3 text-left font-medium">Montant</th>
                    <th className="px-4 py-3 text-left font-medium">Date d&apos;échéance</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paidInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Aucune facture payée.
                      </td>
                    </tr>
                  ) : (
                    paidInvoices.map((inv) => {
                        const displayAmount = inv.lines && inv.lines.length > 0 ? formatMoney(computeTotals(inv.lines).totalTTC) : inv.amount;
                        return (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{inv.number}</td>
                        <td className="px-4 py-3">{inv.client}</td>
                        <td className="px-4 py-3">{inv.subject || "—"}</td>
                        <td className="px-4 py-3">{displayAmount} €</td>
                        <td className="px-4 py-3">{inv.dueDate || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" title="Télécharger" onClick={() => downloadInvoice(inv)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Modifier" onClick={() => openEdit(inv)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Supprimer"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(inv.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dialog Ajouter / Modifier */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden p-6 sm:max-w-2xl [&>button]:shrink-0">
          <div className="flex max-h-[calc(90vh-3rem)] min-h-0 flex-col overflow-hidden">
            <DialogTitle className="shrink-0 pr-8">
              {editingId !== null ? "Modifier la facture" : "Nouvelle facture"}
            </DialogTitle>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4 pr-2">
              <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">N° facture</label>
              <Input
                value={form.number}
                onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))}
                placeholder="ex. FAC-2025-001"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Client</label>
              <Input
                value={form.client}
                onChange={(e) => setForm((prev) => ({ ...prev, client: e.target.value }))}
                placeholder="Nom du client"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Adresse</label>
              <Input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Adresse du client"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">SIRET</label>
              <Input
                value={form.siret}
                onChange={(e) => setForm((prev) => ({ ...prev, siret: e.target.value }))}
                placeholder="SIRET"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Objet</label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Objet de la facture"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Date d&apos;échéance</label>
                <DatePicker value={form.dueDate} onChange={(value) => setForm((prev) => ({ ...prev, dueDate: value }))} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Statut</label>
                <Select value={form.status} onValueChange={(v: InvoiceStatus) => setForm((prev) => ({ ...prev, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="payee">Payée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Type de revenu</label>
              <Select value={form.incomeType} onValueChange={(v: IncomeType) => setForm((prev) => ({ ...prev, incomeType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCOME_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Lignes de facturation</label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="mr-1 h-3 w-3" /> Ajouter une ligne
                </Button>
              </div>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 py-2 text-left font-medium text-xs">Description</th>
                      <th className="px-2 py-2 text-left font-medium text-xs">Type</th>
                      <th className="px-2 py-2 text-left font-medium text-xs w-16">Qté</th>
                      <th className="px-2 py-2 text-left font-medium text-xs w-20">Prix unit.</th>
                      <th className="px-2 py-2 text-left font-medium text-xs w-14">TVA %</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line) => (
                      <tr key={line.id} className="border-b last:border-0">
                        <td className="px-2 py-1"><Input className="h-8 text-xs" value={line.description} onChange={(e) => updateLine(line.id, "description", e.target.value)} placeholder="Description" /></td>
                        <td className="px-2 py-1">
                          <Select value={line.type} onValueChange={(v: LineType) => updateLine(line.id, "type", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="service">Service</SelectItem>
                              <SelectItem value="vente de marchandise">Vente marchandise</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1"><Input className="h-8 text-xs" type="number" min={0} value={line.quantity} onChange={(e) => updateLine(line.id, "quantity", e.target.value)} /></td>
                        <td className="px-2 py-1"><Input className="h-8 text-xs" value={line.unitPrice} onChange={(e) => updateLine(line.id, "unitPrice", e.target.value)} placeholder="0,00" /></td>
                        <td className="px-2 py-1"><Input className="h-8 text-xs" value={line.vatPercent} onChange={(e) => updateLine(line.id, "vatPercent", e.target.value)} placeholder="0" /></td>
                        <td className="px-2 py-1">
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeLine(line.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {form.lines.length > 0 && (() => {
                const { totalHT, totalTTC } = computeTotals(form.lines);
                return (
                  <div className="text-xs text-muted-foreground mt-1">
                    Total HT : {formatMoney(totalHT)} € — Total TTC : {formatMoney(totalTTC)} €
                  </div>
                );
              })()}
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes en bas de facture..." rows={3} />
              </div>
            </div>
          </div>
            <DialogFooter className="shrink-0 border-t pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={saveInvoice} disabled={!form.number.trim() || !form.client.trim()}>
                {editingId !== null ? "Enregistrer" : "Ajouter"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Supprimer cette facture ?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmId !== null && deleteInvoice(deleteConfirmId)
              }
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
