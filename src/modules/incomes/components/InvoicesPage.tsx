"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Download,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Receipt,
  Folder,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAdminData } from "@/hooks/useAdminData";
import { useIncomesData, type Invoice } from "@/hooks/useIncomesData";
import { useSidekickData } from "@/hooks/useSidekickData";
import { useProjectsData } from "@/hooks/useProjectsData";
import { DEFAULT_INVOICE_TEMPLATE } from "@/lib/sidekick-store";
import { formatStatusAddressLines } from "@/modules/admin/data/statuts-form-config";
import { InvoiceDocument, type InvoiceDocumentData } from "./pdf/InvoiceDocument";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
import { cn } from "@/lib/utils";
import { computeTotals, formatMoney, isOverdue, isoToFr, mergeEncaissementDate, parseAmount } from "./invoice-utils";

export function InvoicesPage() {
  const router = useRouter();
  const posthog = usePostHog();
  const { invoices, setInvoices, loading, error } = useIncomesData();
  const { statuses, loading: adminLoading } = useAdminData();
  const { projects } = useProjectsData();
  const projectsMap = Object.fromEntries(projects.map((p) => [p.id, p]));
  const { data: sidekickData } = useSidekickData();
  const [savedClients] = useLocalStorage<{ id: string; name: string; address: string; siret: string; vatNumber?: string; email?: string; phone?: string; extraInfo?: string }[]>("incomes:invoice-clients", []);
  const [invoiceStatusScopeMap, setInvoiceStatusScopeMap] = useLocalStorage<Record<string, string>>(
    "incomes:invoice-status-scope-map",
    {}
  );
  const [selectedStatusId, setSelectedStatusId] = useLocalStorage<string | null>(
    "incomes:selected-billing-status",
    null
  );
  const [searchTerm, setSearchTerm] = useState("");

  const [openSections, setOpenSections] = useState<{ en_attente: boolean; payees: boolean }>({
    en_attente: true,
    payees: false,
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const availableStatuses = statuses;
  const hasMultipleStatuses = availableStatuses.length > 1;
  const singleStatus = availableStatuses.length === 1 ? availableStatuses[0] : null;
  const effectiveStatusId = hasMultipleStatuses
    ? (selectedStatusId && availableStatuses.some((s) => s.id === selectedStatusId)
      ? selectedStatusId
      : (availableStatuses[0]?.id ?? null))
    : singleStatus?.id ?? null;
  useEffect(() => {
    if (hasMultipleStatuses && effectiveStatusId && selectedStatusId !== effectiveStatusId) {
      setSelectedStatusId(effectiveStatusId);
    }
  }, [effectiveStatusId, hasMultipleStatuses, selectedStatusId, setSelectedStatusId]);

  // Toujours lier chaque facture à un statut Admin : avec un seul statut, on force la liaison
  // pour que l’ajout ultérieur d’un 2e statut ne fasse pas « disparaître » l’historique.
  useEffect(() => {
    if (adminLoading || availableStatuses.length !== 1 || !singleStatus) return;
    const onlyId = singleStatus.id;
    setInvoiceStatusScopeMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const inv of invoices) {
        if (next[inv.id] !== onlyId) {
          next[inv.id] = onlyId;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [adminLoading, invoices, setInvoiceStatusScopeMap, singleStatus?.id]);

  // Plusieurs statuts : factures sans liaison (anciennes données) → rattacher au 1er statut (tri nom Admin).
  useEffect(() => {
    if (adminLoading || availableStatuses.length < 2) return;
    const fallbackId = availableStatuses[0]?.id;
    if (!fallbackId) return;
    setInvoiceStatusScopeMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const inv of invoices) {
        const cur = next[inv.id];
        if (cur == null || cur === "") {
          next[inv.id] = fallbackId;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [adminLoading, availableStatuses, invoices, setInvoiceStatusScopeMap]);

  const resolveInvoiceBillingStatusId = (invoiceId: string): string | null => {
    const mapped = invoiceStatusScopeMap[invoiceId];
    if (mapped) return mapped;
    if (availableStatuses.length === 1) return availableStatuses[0]?.id ?? null;
    return null;
  };

  const scopedInvoices = invoices.filter((invoice) => {
    if (!effectiveStatusId) return true;
    const scopedStatusId = resolveInvoiceBillingStatusId(invoice.id);
    if (!scopedStatusId) return false;
    return scopedStatusId === effectiveStatusId;
  });

  const pendingInvoices = scopedInvoices
    .filter((i) => i.status === "en_attente")
    .filter((i) => {
      if (!normalizedSearch) return true;
      return (
        i.number.toLowerCase().includes(normalizedSearch) ||
        i.client.toLowerCase().includes(normalizedSearch) ||
        (i.subject ?? "").toLowerCase().includes(normalizedSearch)
      );
    });
  const paidInvoices = scopedInvoices
    .filter((i) => i.status === "payee")
    .filter((i) => {
      if (!normalizedSearch) return true;
      return (
        i.number.toLowerCase().includes(normalizedSearch) ||
        i.client.toLowerCase().includes(normalizedSearch) ||
        (i.subject ?? "").toLowerCase().includes(normalizedSearch)
      );
    });

  const getInvoiceAmount = (inv: Invoice): number => {
    if (inv.lines && inv.lines.length > 0) return computeTotals(inv.lines).totalTTC;
    return parseAmount(inv.amount);
  };
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);

  const toggleSection = (section: "en_attente" | "payees") => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const deleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    setInvoiceStatusScopeMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDeleteConfirmId(null);
  };

  const markAsPaid = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? mergeEncaissementDate(inv, { ...inv, status: "payee" }) : inv
      )
    );
  };

  const downloadInvoice = async (inv: Invoice) => {
    if (typeof window === "undefined") return;
    const { pdf } = await import("@react-pdf/renderer");

    const statusId = resolveInvoiceBillingStatusId(inv.id);
    const status = statuses.find((s) => s.id === statusId) ?? statuses[0];
    const profile = (status?.data?.profile ?? {}) as Record<string, string>;
    const template = sidekickData.preferences.invoiceTemplate ?? DEFAULT_INVOICE_TEMPLATE;

    const savedClient = savedClients.find(
      (c) => c.name === inv.client && c.address === (inv.address ?? "") && c.siret === (inv.siret ?? "")
    );

    const docData: InvoiceDocumentData = {
      number: inv.number,
      client: inv.client,
      clientAddress: inv.address || undefined,
      clientSiret: inv.siret || undefined,
      clientVatNumber: savedClient?.vatNumber || undefined,
      clientEmail: savedClient?.email || undefined,
      clientPhone: savedClient?.phone || undefined,
      clientExtraInfo: savedClient?.extraInfo || undefined,
      subject: inv.subject || undefined,
      dueDate: inv.dueDate || undefined,
      status: inv.status,
      incomeType: inv.incomeType,
      lines: inv.lines ?? [],
      notes: inv.notes || undefined,
      issuer: {
        name: status?.nom ?? "Mon activité",
        addressLines: formatStatusAddressLines(profile),
        siret: profile.siret || undefined,
        vatNumber: profile.vatNumber || undefined,
        iban: profile.iban || undefined,
        bic: profile.bic || undefined,
      },
      template,
    };

    const blob = await pdf(<InvoiceDocument data={docData} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.number.replace(/[^\w.-]+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    posthog?.capture("invoice_downloaded", { module: "incomes" });
  };

  if (loading || adminLoading) return <PageLoader />;
  if (error) return (
    <PageError
      title="Impossible de charger tes factures"
      description="Vérifie ta connexion ou réessaie dans quelques instants."
      onRetry={() => mutate("user_incomes")}
    />
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40">
            Revenus
          </p>
          <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">Facturation</h1>
          <p className="mt-1 text-sm text-[#F5F5F5]/60">
            Suis tes factures en attente, en retard et payées.
          </p>
        </div>
        <Button
          onClick={() => {
            const query = effectiveStatusId ? `?billingStatus=${effectiveStatusId}` : "";
            router.push(`/incomes/facturation/nouvelle${query}`);
          }}
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle facture
        </Button>
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
                value={effectiveStatusId ?? undefined}
                onValueChange={(value) => setSelectedStatusId(value)}
              >
                <SelectTrigger className="h-7 w-[min(280px,100%)] max-w-full text-xs">
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((status) => (
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/45">
              Total encaissé
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-[#F0FF00]">{formatMoney(totalPaid)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/45">
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-[#F0FF00]/70">{formatMoney(totalPending)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/45">
              En retard
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-red-400">
              {scopedInvoices.filter((invoice) => isOverdue(invoice)).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {scopedInvoices.length > 0 && (
        <div className="flex items-center justify-between gap-3 border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.3)] px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/40">
            {scopedInvoices.length} facture{scopedInvoices.length > 1 ? "s" : ""}
          </span>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher client, numéro, objet..."
            className="h-8 w-full max-w-[280px] text-xs"
            aria-label="Rechercher dans les factures"
          />
        </div>
      )}

      {/* État vide global */}
      {scopedInvoices.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="Aucune facture émise"
          description="Émets, suis et archive tes factures : cachets, prestations, royalties. Relances et paiements en un coup d'œil."
          action={{
            label: "Créer une facture",
            onClick: () => {
              const query = effectiveStatusId ? `?billingStatus=${effectiveStatusId}` : "";
              router.push(`/incomes/facturation/nouvelle${query}`);
            },
          }}
        />
      )}

      {/* Sections déroulantes */}
      {scopedInvoices.length > 0 && <div className="space-y-3">
        {/* En attente */}
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("en_attente")}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-[rgba(245,245,245,0.04)]"
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
            <div className="border-t border-[rgba(245,245,245,0.08)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)]">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">N° facture</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Client</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Objet</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Montant</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Échéance</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Actions</th>
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
                      <tr
                        key={inv.id}
                        className={cn(
                          "border-b border-[rgba(245,245,245,0.06)] last:border-0 hover:bg-[rgba(245,245,245,0.03)]",
                          overdue && "bg-[rgba(220,38,38,0.08)]"
                        )}
                      >
                        <td className="px-4 py-3 font-medium">{inv.number}</td>
                        <td className="px-4 py-3">{inv.client}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{inv.subject || "—"}</span>
                            {inv.projectId && projectsMap[inv.projectId] && (
                              <Link
                                href={`/projects/${inv.projectId}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[rgba(240,255,0,0.12)] text-[#F0FF00] border border-[rgba(240,255,0,0.25)] hover:bg-[rgba(240,255,0,0.2)] transition-colors shrink-0"
                                title={`Projet : ${projectsMap[inv.projectId].title}`}
                              >
                                <Folder size={9} /> {projectsMap[inv.projectId].title}
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{displayAmount} €</td>
                        <td className="px-4 py-3">
                          {inv.dueDate || "—"}
                          {overdue && (
                            <Badge variant="destructive" className="ml-2">En retard</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" title="Télécharger" onClick={() => downloadInvoice(inv)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Modifier"
                              onClick={() => {
                                const scoped = invoiceStatusScopeMap[inv.id] ?? effectiveStatusId;
                                const query = scoped ? `?billingStatus=${scoped}` : "";
                                router.push(`/incomes/facturation/${inv.id}${query}`);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Marquer payée"
                              className="text-emerald-300 hover:bg-emerald-900/30 hover:text-emerald-200"
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
        </Card>

        {/* Payées */}
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("payees")}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-[rgba(245,245,245,0.04)]"
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
            <div className="border-t border-[rgba(245,245,245,0.08)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)]">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">N° facture</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Client</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Objet</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Montant</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Date d&apos;encaissement</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/45">Actions</th>
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
                      <tr key={inv.id} className="border-b border-[rgba(245,245,245,0.06)] last:border-0 hover:bg-[rgba(245,245,245,0.03)]">
                        <td className="px-4 py-3 font-medium">{inv.number}</td>
                        <td className="px-4 py-3">{inv.client}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{inv.subject || "—"}</span>
                            {inv.projectId && projectsMap[inv.projectId] && (
                              <Link
                                href={`/projects/${inv.projectId}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[rgba(240,255,0,0.12)] text-[#F0FF00] border border-[rgba(240,255,0,0.25)] hover:bg-[rgba(240,255,0,0.2)] transition-colors shrink-0"
                                title={`Projet : ${projectsMap[inv.projectId].title}`}
                              >
                                <Folder size={9} /> {projectsMap[inv.projectId].title}
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{displayAmount} €</td>
                        <td className="px-4 py-3">
                          {inv.encaissementDate ? isoToFr(inv.encaissementDate) || "—" : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" title="Télécharger" onClick={() => downloadInvoice(inv)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Modifier"
                              onClick={() => {
                                const scoped = invoiceStatusScopeMap[inv.id] ?? effectiveStatusId;
                                const query = scoped ? `?billingStatus=${scoped}` : "";
                                router.push(`/incomes/facturation/${inv.id}${query}`);
                              }}
                            >
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
        </Card>
      </div>}

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
