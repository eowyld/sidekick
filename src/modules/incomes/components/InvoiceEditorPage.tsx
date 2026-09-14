"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { ArrowLeft, ArrowRight, FileText, Pen, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAdminData } from "@/hooks/useAdminData";
import { usePreferencesData } from "@/hooks/usePreferencesData";
import { useIncomesData, type InvoiceLine } from "@/hooks/useIncomesData";
import { formatStatusAddressLines } from "@/modules/admin/data/statuts-form-config";
import { cn } from "@/lib/utils";
import type { InvoiceDocumentData } from "./pdf/InvoiceDocument";
import {
  computeTotals,
  formatMoney,
  frToIso,
  getNextInvoiceNumber,
  INCOME_TYPES,
  isoToFr,
  LINE_TYPES,
  mergeEncaissementDate,
  parseAmount,
  type IncomeType,
  type InvoiceStatus,
  type LineType,
} from "./invoice-utils";

type InvoiceFormState = {
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
};

type SavedInvoiceClient = {
  id: string;
  name: string;
  address: string;
  siret: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  extraInfo?: string;
};

const DEFAULT_FOOTER_NOTE = `Merci pour votre confiance.
Paiement à réception, par virement bancaire.
En cas de retard, des pénalités pourront être appliquées conformément aux conditions en vigueur.`;

const EMPTY_LINE: InvoiceLine = {
  id: 1,
  description: "",
  type: "service",
  quantity: "1",
  unitPrice: "",
  vatPercent: "0",
};

const InvoicePreview = dynamic(() => import("./pdf/InvoicePreview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[720px] items-center justify-center rounded-md border border-[rgba(245,245,245,0.12)] text-sm text-[#F5F5F5]/50">
      Chargement de l&apos;aperçu…
    </div>
  ),
});

function todayFr(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getDefaultDueDateIso(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeEmptyForm(nextNumber = ""): InvoiceFormState {
  return {
    number: nextNumber,
    client: "",
    address: "",
    siret: "",
    subject: "",
    dueDate: getDefaultDueDateIso(),
    status: "en_attente",
    incomeType: "Live",
    lines: [{ ...EMPTY_LINE, id: Date.now() }],
    notes: "",
  };
}

export function InvoiceEditorPage({ invoiceId }: { invoiceId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const { statuses, loading: adminLoading } = useAdminData();
  const { invoiceTemplate, invoiceFooterNote, setInvoiceFooterNote } = usePreferencesData();
  const { invoices, setInvoices, loading, error } = useIncomesData();
  const isEditMode = !!invoiceId;
  const currentInvoice = useMemo(
    () => (invoiceId ? invoices.find((invoice) => invoice.id === invoiceId) : null),
    [invoiceId, invoices]
  );

  const [form, setForm] = useState<InvoiceFormState>(() =>
    makeEmptyForm(getNextInvoiceNumber(invoices))
  );
  const [savedClients, setSavedClients] = useLocalStorage<SavedInvoiceClient[]>("incomes:invoice-clients", []);
  const [selectedBillingStatusId, setSelectedBillingStatusId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState<{
    name: string;
    address: string;
    siret: string;
    vatNumber: string;
    email: string;
    phone: string;
    extraInfo: string;
  }>({
    name: "",
    address: "",
    siret: "",
    vatNumber: "",
    email: "",
    phone: "",
    extraInfo: "",
  });
  const [clientDialogError, setClientDialogError] = useState<string>("");
  const billingStatusFromQuery = searchParams.get("billingStatus");

  const legacyClients = useMemo<SavedInvoiceClient[]>(
    () =>
      invoices
        .filter((invoice) => invoice.client && invoice.address && invoice.siret)
        .map((invoice) => ({
          id: `legacy-${invoice.id}`,
          name: invoice.client,
          address: invoice.address ?? "",
          siret: invoice.siret ?? "",
        })),
    [invoices]
  );

  const allClients = useMemo<SavedInvoiceClient[]>(() => {
    const byKey = new Map<string, SavedInvoiceClient>();
    [...savedClients, ...legacyClients].forEach((client) => {
      const key = `${client.name.toLowerCase()}|${client.address.toLowerCase()}|${client.siret.toLowerCase()}`;
      if (!byKey.has(key)) byKey.set(key, client);
    });
    return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [legacyClients, savedClients]);


  const documentData = useMemo<InvoiceDocumentData>(() => {
    const status = statuses.find((st) => st.id === selectedBillingStatusId) ?? statuses[0];
    const profile = (status?.data?.profile ?? {}) as Record<string, string>;
    const selectedClient = selectedClientId
      ? allClients.find((c) => c.id === selectedClientId)
      : undefined;
    return {
      number: form.number,
      client: form.client,
      clientAddress: form.address || undefined,
      clientSiret: form.siret || undefined,
      clientVatNumber: selectedClient?.vatNumber || undefined,
      clientEmail: selectedClient?.email || undefined,
      clientPhone: selectedClient?.phone || undefined,
      clientExtraInfo: selectedClient?.extraInfo || undefined,
      subject: form.subject || undefined,
      issueDate: todayFr(),
      dueDate: form.dueDate ? isoToFr(form.dueDate) : undefined,
      status: form.status,
      incomeType: form.incomeType,
      lines: form.lines,
      notes: form.notes || undefined,
      issuer: {
        name: status?.nom ?? "Mon activité",
        addressLines: formatStatusAddressLines(profile),
        siret: profile.siret || undefined,
        vatNumber: profile.vatNumber || undefined,
        iban: profile.iban || undefined,
        bic: profile.bic || undefined,
      },
      template: invoiceTemplate,
    };
  }, [form, statuses, selectedBillingStatusId, invoiceTemplate, selectedClientId, allClients]);

  const hasMultipleStatuses = statuses.length > 1;
  const singleStatus = statuses.length === 1 ? statuses[0] : null;
  const fallbackStatusId = statuses[0]?.id ?? null;

  const getInvoicesForBillingStatus = (statusId: string | null) => {
    if (!statusId) return invoices;
    return invoices.filter((invoice) => {
      const mapped = invoice.statutJuridiqueId;
      if (mapped) return mapped === statusId;
      if (singleStatus?.id) return singleStatus.id === statusId;
      if (fallbackStatusId) return fallbackStatusId === statusId;
      return false;
    });
  };

  useEffect(() => {
    if (isEditMode) {
      if (!currentInvoice) return;
      const mappedStatusId = currentInvoice.statutJuridiqueId ?? null;
      const fallbackStatusId = mappedStatusId ?? billingStatusFromQuery ?? statuses[0]?.id ?? null;
      setSelectedBillingStatusId(fallbackStatusId);
      setForm({
        number: currentInvoice.number,
        client: currentInvoice.client,
        address: currentInvoice.address ?? "",
        siret: currentInvoice.siret ?? "",
        subject: currentInvoice.subject ?? "",
        dueDate: currentInvoice.dueDate ? frToIso(currentInvoice.dueDate) : "",
        status: currentInvoice.status,
        incomeType: (currentInvoice.incomeType ?? "Live") as IncomeType,
        lines:
          currentInvoice.lines && currentInvoice.lines.length > 0
            ? currentInvoice.lines
            : [{ ...EMPTY_LINE, id: Date.now() }],
        notes: currentInvoice.notes ?? "",
      });
      return;
    }
    const defaultStatusId = billingStatusFromQuery ?? statuses[0]?.id ?? null;
    setSelectedBillingStatusId(defaultStatusId);
    const savedFooter = invoiceFooterNote.trim();
    const scopedInvoices = getInvoicesForBillingStatus(defaultStatusId);
    setForm({
      ...makeEmptyForm(getNextInvoiceNumber(scopedInvoices)),
      notes: savedFooter && savedFooter.length > 0 ? savedFooter : DEFAULT_FOOTER_NOTE,
    });
  }, [
    billingStatusFromQuery,
    currentInvoice,
    invoiceId,
    invoices,
    isEditMode,
    invoiceFooterNote,
    statuses,
  ]);

  useEffect(() => {
    if (isEditMode) return;
    if (!selectedBillingStatusId) return;
    const nextNumber = getNextInvoiceNumber(getInvoicesForBillingStatus(selectedBillingStatusId));
    setForm((prev) => {
      if (!prev.number || /^FAC-\d{4}-\d+$/.test(prev.number)) {
        return { ...prev, number: nextNumber };
      }
      return prev;
    });
  }, [invoices, isEditMode, selectedBillingStatusId, singleStatus?.id, fallbackStatusId]);

  useEffect(() => {
    if (!form.client || !form.address || !form.siret) {
      setSelectedClientId(undefined);
      return;
    }
    const match = allClients.find(
      (client) =>
        client.name === form.client && client.address === form.address && client.siret === form.siret
    );
    setSelectedClientId(match ? match.id : undefined);
  }, [allClients, form.address, form.client, form.siret]);

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { ...EMPTY_LINE, id: Date.now() }],
    }));
  };

  const removeLine = (lineId: number) => {
    setForm((prev) => {
      const nextLines = prev.lines.filter((line) => line.id !== lineId);
      return {
        ...prev,
        lines: nextLines.length > 0 ? nextLines : [{ ...EMPTY_LINE, id: Date.now() }],
      };
    });
  };

  const updateLine = (lineId: number, field: keyof InvoiceLine, value: string | LineType) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.id === lineId ? { ...line, [field]: value } : line)),
    }));
  };

  const saveInvoice = () => {
    if (statuses.length > 0 && !selectedBillingStatusId) return;

    const number = form.number.trim();
    const client = form.client.trim();
    if (!number || !client) return;

    const lines = form.lines.filter((line) => line.description.trim() || parseAmount(line.unitPrice) > 0);
    const { totalTTC } = computeTotals(lines);
    const amount = lines.length > 0 ? formatMoney(totalTTC) : "0,00";
    const payload = {
      number,
      client,
      subject: form.subject.trim(),
      dueDate: form.dueDate ? isoToFr(form.dueDate.trim()) : "",
      status: form.status,
      amount,
      address: form.address.trim() || undefined,
      siret: form.siret.trim() || undefined,
      incomeType: form.incomeType,
      lines: lines.length > 0 ? lines : undefined,
      notes: form.notes.trim() || undefined,
      // Le rattachement à l'entité émettrice fait partie de la facture : c'est
      // lui qui décide de quel statut relèvent son numéro et ses totaux.
      statutJuridiqueId: selectedBillingStatusId ?? undefined,
    };

    if (isEditMode && invoiceId) {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? mergeEncaissementDate(inv, { ...inv, ...payload }) : inv
        )
      );
    } else {
      const newInvoiceId = crypto.randomUUID();
      setInvoices((prev) => [
        ...prev,
        mergeEncaissementDate(undefined, { id: newInvoiceId, ...payload }),
      ]);
      posthog?.capture("invoice_created", { module: "incomes" });
      posthog?.capture("item_created", { module: "incomes" });

      const footerNote = form.notes.trim();
      if (footerNote) setInvoiceFooterNote(footerNote);

      setSavedInvoiceId(newInvoiceId);
      setConfirmDialogOpen(true);
      return;
    }

    const footerNote = form.notes.trim();
    if (footerNote) setInvoiceFooterNote(footerNote);

    router.push("/incomes/facturation");
  };

  const openNewClientDialog = () => {
    setEditingClientId(null);
    setClientDialogError("");
    setNewClient({
      name: "",
      address: "",
      siret: "",
      vatNumber: "",
      email: "",
      phone: "",
      extraInfo: "",
    });
    setClientDialogOpen(true);
  };

  const editSelectedClient = () => {
    if (!selectedClientId) return;
    const client = allClients.find((item) => item.id === selectedClientId);
    if (!client) return;
    setEditingClientId(selectedClientId);
    setClientDialogError("");
    setNewClient({
      name: client.name,
      address: client.address,
      siret: client.siret,
      vatNumber: client.vatNumber ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      extraInfo: client.extraInfo ?? "",
    });
    setClientDialogOpen(true);
  };

  const deleteSelectedClient = () => {
    if (!editingClientId) return;
    setSavedClients((prev) => prev.filter((item) => item.id !== editingClientId));
    setClientDialogOpen(false);
    setEditingClientId(null);
  };

  const selectClient = (id: string) => {
    if (id === "__new__") {
      openNewClientDialog();
      return;
    }
    const client = allClients.find((item) => item.id === id);
    if (!client) return;
    setSelectedClientId(id);
    setForm((prev) => ({
      ...prev,
      client: client.name,
      address: client.address,
      siret: client.siret,
    }));
  };

  const createClient = () => {
    const name = newClient.name.trim();
    const address = newClient.address.trim();
    const siret = newClient.siret.trim();
    if (!name || !address || !siret) {
      setClientDialogError("Nom, adresse et SIRET sont obligatoires.");
      return;
    }

    if (editingClientId) {
      // Mode édition: remplacer le client existant
      setSavedClients((prev) =>
        prev.map((item) =>
          item.id === editingClientId
            ? {
                id: editingClientId,
                name,
                address,
                siret,
                vatNumber: newClient.vatNumber.trim() || undefined,
                email: newClient.email.trim() || undefined,
                phone: newClient.phone.trim() || undefined,
                extraInfo: newClient.extraInfo.trim() || undefined,
              }
            : item
        )
      );
      setForm((prev) => ({ ...prev, client: name, address, siret }));
      setClientDialogOpen(false);
      setEditingClientId(null);
    } else {
      // Mode création: ajouter un nouveau client
      const client: SavedInvoiceClient = {
        id: crypto.randomUUID(),
        name,
        address,
        siret,
        vatNumber: newClient.vatNumber.trim() || undefined,
        email: newClient.email.trim() || undefined,
        phone: newClient.phone.trim() || undefined,
        extraInfo: newClient.extraInfo.trim() || undefined,
      };
      setSavedClients((prev) => {
        const exists = prev.some(
          (item) =>
            item.name.toLowerCase() === name.toLowerCase() &&
            item.address.toLowerCase() === address.toLowerCase() &&
            item.siret.toLowerCase() === siret.toLowerCase()
        );
        return exists ? prev : [...prev, client];
      });
      setForm((prev) => ({ ...prev, client: client.name, address: client.address, siret: client.siret }));
      setSelectedClientId(client.id);
      setClientDialogOpen(false);
    }
  };

  if (loading || adminLoading) return <PageLoader />;
  if (error) {
    return (
      <PageError
        title="Impossible de charger l'éditeur de facture"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
      />
    );
  }
  if (isEditMode && !currentInvoice) {
    return (
      <PageError
        title="Facture introuvable"
        description="Cette facture n'existe pas ou a été supprimée."
        onRetry={() => router.push("/incomes/facturation")}
      />
    );
  }

  const { totalHT, totalTTC } = computeTotals(form.lines);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40">
            Revenus
          </p>
          <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">
            {isEditMode ? "Modifier une facture" : "Nouvelle facture"}
          </h1>
          <p className="mt-1 text-sm text-[#F5F5F5]/60">
            {isEditMode
              ? "Ajuste les informations de facturation, les lignes et les montants."
              : "Crée une facture complète avec détails, TVA et notes client."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/incomes/facturation")}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Retour
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/settings/facturation")}>
            <FileText className="mr-1.5 h-4 w-4" />
            Modèle
          </Button>
          <Button
            size="sm"
            onClick={saveInvoice}
            disabled={
              !form.number.trim() ||
              !form.client.trim() ||
              (statuses.length > 0 && !selectedBillingStatusId)
            }
          >
            <Save className="mr-1.5 h-4 w-4" />
            {isEditMode ? "Enregistrer" : "Créer la facture"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/50">
            Statut utilisé
          </p>
          <div className="flex min-w-0 items-center justify-end gap-1.5">
            {singleStatus ? (
              <p className="min-w-0 truncate text-xs font-medium text-[#F5F5F5]">{singleStatus.nom}</p>
            ) : hasMultipleStatuses ? (
              <Select
                value={selectedBillingStatusId ?? undefined}
                onValueChange={(value) => setSelectedBillingStatusId(value)}
              >
                <SelectTrigger className="h-7 w-[min(280px,100%)] max-w-full text-xs">
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="min-w-0 text-xs text-[#F5F5F5]/60">Aucun statut disponible dans Admin.</p>
            )}
            <Link
              href="/admin"
              aria-label="Gérer les statuts (Admin)"
              className={cn(
                "inline-flex size-5 shrink-0 items-center justify-center rounded-sm",
                "bg-[#F0FF00] text-[#0d0d0d]",
                "transition-[color,background-color,box-shadow] duration-200 hover:bg-[#F0FF00]/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]",
              )}
            >
              <ArrowRight className="size-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>N° facture</Label>
                <Input value={form.number} onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <div className="flex gap-2">
                  <Select value={selectedClientId ?? ""} onValueChange={selectClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {allClients.length > 0 && (
                        <div className="px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[#F5F5F5]/40">
                          Clients sauvegardés
                        </div>
                      )}
                      {allClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">+ Ajouter un nouveau client</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!selectedClientId}
                    onClick={editSelectedClient}
                  >
                    <Pen className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Objet</Label>
                <Input value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Date d&apos;échéance</Label>
                <DatePicker value={form.dueDate} onChange={(value) => setForm((prev) => ({ ...prev, dueDate: value }))} />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v: InvoiceStatus) => setForm((prev) => ({ ...prev, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="payee">Payée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Type de revenu</Label>
                <Select value={form.incomeType} onValueChange={(v: IncomeType) => setForm((prev) => ({ ...prev, incomeType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCOME_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résumé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-hidden rounded-md border border-[rgba(245,245,245,0.08)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)]">
                    <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-[0.08em] text-[#F5F5F5]/45">
                      Item
                    </th>
                    <th className="px-2 py-1.5 text-right font-semibold uppercase tracking-[0.08em] text-[#F5F5F5]/45">
                      HT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line) => {
                    const label = line.description.trim() || "Ligne sans libellé";
                    const lineTotalHt = parseAmount(line.quantity) * parseAmount(line.unitPrice);
                    return (
                      <tr key={`summary-${line.id}`} className="border-b border-[rgba(245,245,245,0.06)] last:border-0">
                        <td className="px-2 py-1.5 text-[#F5F5F5]/80">
                          <span className="line-clamp-2">{label}</span>
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium text-[#F5F5F5]/85">
                          {formatMoney(lineTotalHt)} €
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-1 border-t border-[rgba(245,245,245,0.08)] pt-3">
              <div className="flex items-center justify-between text-sm">
                <p className="uppercase tracking-[0.08em] text-[#F5F5F5]/45">Total HT</p>
                <p className="font-semibold text-[#F5F5F5]">{formatMoney(totalHT)} €</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <p className="uppercase tracking-[0.08em] text-[#F5F5F5]/45">Total TTC</p>
                <p className="text-lg font-semibold text-[#F0FF00]">{formatMoney(totalTTC)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Lignes de facturation</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-md border border-[rgba(245,245,245,0.08)]">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[20%]" />
                <col className="w-[9%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[4%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)]">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Description</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Type</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Qté</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Prix unit.</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">TVA</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Total HT</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, index) => (
                  <tr key={line.id} className="border-b border-[rgba(245,245,245,0.06)] last:border-0">
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 text-xs"
                        value={line.description}
                        onChange={(e) => updateLine(line.id, "description", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select value={line.type} onValueChange={(v: LineType) => updateLine(line.id, "type", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LINE_TYPES.map((lineType) => (
                            <SelectItem key={lineType} value={lineType}>
                              {lineType === "service" ? "Service" : "Marchandise"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        min={0}
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 text-xs"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.id, "unitPrice", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-8 text-xs"
                          value={line.vatPercent}
                          onChange={(e) => updateLine(line.id, "vatPercent", e.target.value)}
                        />
                        <span className="text-xs font-medium text-[#F5F5F5]/55">%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium text-[#F5F5F5]/80">
                      {formatMoney(parseAmount(line.quantity) * parseAmount(line.unitPrice))} €
                    </td>
                    <td className="px-3 py-2">
                      {index > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-destructive hover:bg-red-950/40"
                          onClick={() => removeLine(line.id)}
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Notes en bas de facture..."
            rows={6}
          />
        </CardContent>
      </Card>

      <Card>
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-base font-semibold tracking-tight text-[#F5F5F5]">Aperçu PDF</h2>
          <Button variant="outline" size="sm" onClick={() => router.push("/settings/facturation")}>
            <FileText className="mr-1.5 h-4 w-4" />
            Modèle
          </Button>
        </div>
        <CardContent className="pt-0">
          <InvoicePreview data={documentData} hideDownload />
        </CardContent>
      </Card>

      {/* Dialog confirmation création — non dismissible accidentellement */}
      <Dialog open={confirmDialogOpen}>
        <DialogPortal>
          <DialogOverlay />
          <div
            className="fixed left-1/2 top-1/2 z-50 flex h-[92vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border-2 border-[rgba(245,245,245,0.3)] bg-[rgba(44,44,46,0.84)] text-[#F5F5F5] shadow-2xl backdrop-blur-xl"
            onKeyDown={(e) => e.key === "Escape" && e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[rgba(245,245,245,0.08)] px-4 py-3">
              <DialogTitle className="text-sm font-semibold">Facture créée — {form.number}</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConfirmDialogOpen(false);
                    if (savedInvoiceId) router.push(`/incomes/facturation/${savedInvoiceId}`);
                  }}
                >
                  Modifier
                </Button>
                <Button size="sm" onClick={() => router.push("/incomes/facturation")}>
                  Retour à mes factures
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 p-3">
              <InvoicePreview data={documentData} fillHeight />
            </div>
          </div>
        </DialogPortal>
      </Dialog>

      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClientId ? "Modifier le client" : "Nouveau client"}</DialogTitle>
            <DialogDescription>
              {editingClientId
                ? "Mets à jour les informations de ton client."
                : "Renseigne les informations de ton client pour le réutiliser rapidement."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Nom / Raison sociale *</Label>
              <Input value={newClient.name} onChange={(e) => setNewClient((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Adresse *</Label>
              <Input value={newClient.address} onChange={(e) => setNewClient((prev) => ({ ...prev, address: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>SIRET *</Label>
              <Input value={newClient.siret} onChange={(e) => setNewClient((prev) => ({ ...prev, siret: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>N° TVA</Label>
              <Input value={newClient.vatNumber} onChange={(e) => setNewClient((prev) => ({ ...prev, vatNumber: e.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mail</Label>
                <Input type="email" value={newClient.email} onChange={(e) => setNewClient((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input value={newClient.phone} onChange={(e) => setNewClient((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Infos complémentaires</Label>
              <Textarea
                rows={3}
                value={newClient.extraInfo}
                onChange={(e) => setNewClient((prev) => ({ ...prev, extraInfo: e.target.value }))}
              />
            </div>
            {clientDialogError && <p className="text-sm text-red-400">{clientDialogError}</p>}
          </div>
          <DialogFooter className="flex items-center justify-between">
            <div>
              {editingClientId && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={deleteSelectedClient}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Supprimer le client
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setClientDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={createClient}>
                {editingClientId ? "Mettre à jour" : "Créer le client"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
