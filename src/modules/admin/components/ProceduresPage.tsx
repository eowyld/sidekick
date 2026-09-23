"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePostHog } from "posthog-js/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronUp, ListChecks, Plus, Pencil, Trash2 } from "lucide-react";
import { useAdminData } from "@/hooks/useAdminData";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
import { isoToFr, toIsoDatePickerValue } from "@/lib/date-format";
import { DatePicker } from "@/components/ui/date-picker";
import type { AdminProcedure } from "@/lib/sidekick-store";
import type { ProcedureRecurrence } from "@/modules/admin/data/procedure-templates";
import {
  applyAllRecurringRollovers,
  collapseRecurringForScope,
  computeNextDueDateStatic,
  parseDateLimite,
  procedureSeriesKey,
} from "@/modules/admin/lib/procedure-recurrence";
import { cn } from "@/lib/utils";

type ProcedureScope = "all" | "unlinked" | string;

function scopeMatchesProcedure(p: AdminProcedure, scope: ProcedureScope): boolean {
  const linked = (p as { statutJuridiqueId?: string }).statutJuridiqueId ?? "";
  if (scope === "all") return true;
  if (scope === "unlinked") return !linked;
  return linked === scope;
}

const PROCEDURE_STATUS = [
  { value: "a_faire", label: "À faire" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
] as const;
type ProcedureStatus = (typeof PROCEDURE_STATUS)[number]["value"];

function parseProcedureScope(raw: string | null, statuses: { id: string }[]): ProcedureScope {
  if (!raw || raw === "all") return "all";
  if (raw === "sans") return "unlinked";
  if (statuses.some((s) => s.id === raw)) return raw;
  return "all";
}

export function ProceduresPage() {
  const posthog = usePostHog();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { procedures: storedProcedures, setProcedures, statuses, loading, error } = useAdminData();
  const { confirm, confirmDialog } = useConfirm();

  // Le report des échéances récurrentes est fait par le cron quotidien
  // (app/api/cron/reminders) — c'est ce qui le rend fiable pour l'artiste qui
  // n'ouvre jamais cette page. Ici, on ne fait que l'appliquer à l'affichage,
  // pour ne pas montrer une date déjà périmée entre deux passages du cron.
  const procedures = useMemo(
    () => applyAllRecurringRollovers(storedProcedures),
    [storedProcedures]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formLabel, setFormLabel] = useState("");
  const [formStatus, setFormStatus] = useState<ProcedureStatus>("a_faire");
  const [formStatutJuridiqueId, setFormStatutJuridiqueId] = useState<string>("");
  const [formOrganisme, setFormOrganisme] = useState("");
  const [formDateLimite, setFormDateLimite] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formRecurrence, setFormRecurrence] = useState<ProcedureRecurrence>("none");
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);

  const sortedStatuses = useMemo(
    () =>
      [...statuses].sort((a, b) => {
        const aAct = a.actif !== false;
        const bAct = b.actif !== false;
        if (aAct !== bAct) return aAct ? -1 : 1;
        return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
      }),
    [statuses]
  );

  const scope = parseProcedureScope(searchParams.get("statut"), statuses);

  const applyScope = (next: ProcedureScope) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("statut");
    else if (next === "unlinked") params.set("statut", "sans");
    else params.set("statut", next);
    const q = params.toString();
    router.replace(q ? `/admin/demarches?${q}` : "/admin/demarches", { scroll: false });
  };

  const resetForm = () => {
    setFormLabel("");
    setFormStatus("a_faire");
    setFormStatutJuridiqueId("");
    setFormOrganisme("");
    setFormDateLimite("");
    setFormNotes("");
    setFormRecurrence("none");
    setEditingId(null);
    setShowAdvancedForm(false);
    setIsAddOpen(false);
  };

  const procedureUsesAdvanced = (
    p: AdminProcedure,
    status: ProcedureStatus,
    recurrence: ProcedureRecurrence
  ) =>
    status !== "a_faire" ||
    recurrence !== "none" ||
    !!(p as { organisme?: string }).organisme?.trim() ||
    !!(p as { dateLimite?: string }).dateLimite ||
    !!(p as { notes?: string }).notes?.trim();

  const openEdit = (p: AdminProcedure) => {
    const status = (((p as { status?: string }).status ?? "a_faire") as ProcedureStatus);
    const recurrence = (((p as { recurrence?: ProcedureRecurrence }).recurrence ?? "none") as ProcedureRecurrence);
    setEditingId(p.id);
    setFormLabel(p.label);
    setFormStatus(status);
    setFormStatutJuridiqueId((p as { statutJuridiqueId?: string }).statutJuridiqueId ?? "");
    setFormOrganisme((p as { organisme?: string }).organisme ?? "");
    setFormDateLimite((p as { dateLimite?: string }).dateLimite ?? "");
    setFormNotes((p as { notes?: string }).notes ?? "");
    setFormRecurrence(recurrence);
    setShowAdvancedForm(procedureUsesAdvanced(p, status, recurrence));
  };

  const openAdd = () => {
    setEditingId(null);
    setFormLabel("");
    setFormStatus("a_faire");
    setFormOrganisme("");
    setFormDateLimite("");
    setFormNotes("");
    setFormRecurrence("none");
    setShowAdvancedForm(false);
    if (scope !== "all" && scope !== "unlinked") setFormStatutJuridiqueId(scope);
    else setFormStatutJuridiqueId("");
    setIsAddOpen(true);
  };

  const saveEdit = () => {
    if (!formLabel.trim()) return;
    const payloadLabel = formLabel.trim();
    const payloadStatus = formStatus;
    const payloadStatutJuridiqueId = formStatutJuridiqueId || undefined;
    const payloadOrganisme = formOrganisme.trim() || undefined;
    const payloadDateLimite = formDateLimite || undefined;
    const payloadNotes = formNotes.trim() || undefined;
    const payloadRecurrence = formRecurrence;
    if (editingId) {
      setProcedures((prev) => {
        const before = prev.find((p) => p.id === editingId);
        const updated = prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                label: payloadLabel,
                status: payloadStatus,
                statutJuridiqueId: payloadStatutJuridiqueId,
                organisme: payloadOrganisme,
                dateLimite: payloadDateLimite,
                notes: payloadNotes,
                recurrence: payloadRecurrence,
              }
            : p
        );
        const isCompletion =
          (before as { status?: string } | undefined)?.status !== "termine" &&
          payloadStatus === "termine";
        if (!isCompletion || formRecurrence === "none" || !formDateLimite) return updated;
        const nextDate = computeNextDueDateStatic(formDateLimite, formRecurrence);
        if (!nextDate) return updated;
        return [
          ...updated,
          {
            id: crypto.randomUUID(),
            label: payloadLabel,
            status: "a_faire",
            statutJuridiqueId: payloadStatutJuridiqueId,
            organisme: payloadOrganisme,
            dateLimite: nextDate,
            notes: payloadNotes,
            recurrence: formRecurrence,
            templateKey: (before as { templateKey?: string } | undefined)?.templateKey,
            isAutoGenerated: true,
          },
        ];
      });
    } else {
      setProcedures((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          label: payloadLabel,
          status: payloadStatus,
          statutJuridiqueId: payloadStatutJuridiqueId,
          organisme: payloadOrganisme,
          dateLimite: payloadDateLimite,
          notes: payloadNotes,
          recurrence: payloadRecurrence,
        },
      ]);
      posthog?.capture("procedure_created", { module: "admin" });
      posthog?.capture("item_created", { module: "admin" });
    }
    resetForm();
  };

  const deleteProcedure = async (id: string) => {
    const target = procedures.find((p) => p.id === id);
    const series = target ? procedureSeriesKey(target) : null;
    const recurring = !!series && procedures.filter((p) => procedureSeriesKey(p) === series).length > 1;
    const ok = await confirm({
      title: target?.label ? `Supprimer « ${target.label} » ?` : "Supprimer cette démarche ?",
      description: recurring
        ? "Cette démarche est récurrente : toutes ses échéances seront supprimées."
        : "La démarche sera définitivement supprimée.",
    });
    if (!ok) return;
    setProcedures((prev) =>
      series ? prev.filter((p) => procedureSeriesKey(p) !== series) : prev.filter((p) => p.id !== id)
    );
    resetForm();
  };

  const completeProcedure = (p: AdminProcedure) => {
    const recurrence = ((p as { recurrence?: ProcedureRecurrence }).recurrence ?? "none") as ProcedureRecurrence;
    const dateLimite = (p as { dateLimite?: string }).dateLimite;

    setProcedures((prev) => {
      const updated = prev.map((item) =>
        item.id === p.id ? { ...item, status: "termine" as const } : item
      );
      if (recurrence === "none" || !dateLimite) return updated;
      const nextDate = computeNextDueDateStatic(dateLimite, recurrence);
      if (!nextDate) return updated;
      return [
        ...updated,
        {
          id: crypto.randomUUID(),
          label: p.label,
          status: "a_faire" as const,
          statutJuridiqueId: (p as { statutJuridiqueId?: string }).statutJuridiqueId,
          organisme: (p as { organisme?: string }).organisme,
          dateLimite: nextDate,
          notes: (p as { notes?: string }).notes,
          recurrence,
          templateKey: (p as { templateKey?: string }).templateKey,
          isAutoGenerated: true,
        },
      ];
    });
  };

  const handleStatusChange = (p: AdminProcedure, newStatus: ProcedureStatus) => {
    if (newStatus === "termine") {
      completeProcedure(p);
      return;
    }
    setProcedures((prev) =>
      prev.map((item) =>
        item.id === p.id ? { ...item, status: newStatus } : item
      )
    );
  };

  const statusLabel = (value: string) =>
    PROCEDURE_STATUS.find((s) => s.value === value)?.label ?? value;

  const recurrenceLabel = (value: string | undefined) => {
    if (!value || value === "none") return "Ponctuelle";
    if (value === "monthly") return "Mensuelle";
    if (value === "quarterly") return "Trimestrielle";
    if (value === "semi_annual") return "Semestrielle";
    if (value === "annual") return "Annuelle";
    return value;
  };

  const scopedRawProcedures = useMemo(() => {
    return procedures.filter((p) => scopeMatchesProcedure(p, scope));
  }, [procedures, scope]);

  const scopedProcedures = useMemo(
    () => collapseRecurringForScope(scopedRawProcedures),
    [scopedRawProcedures]
  );

  const collapsedTotalCount = useMemo(() => collapseRecurringForScope(procedures).length, [procedures]);

  const scopeSummary = useMemo(() => {
    if (scope === "all")
      return `${collapsedTotalCount} démarche${collapsedTotalCount !== 1 ? "s" : ""}`;
    if (scope === "unlinked") return `${scopedProcedures.length} sans statut juridique`;
    const nom = statuses.find((s) => s.id === scope)?.nom ?? "Ce statut";
    return `${scopedProcedures.length} pour ${nom}`;
  }, [scope, collapsedTotalCount, scopedProcedures.length, statuses]);

  const groupedProcedures = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const in7 = new Date(now);
    in7.setDate(now.getDate() + 7);
    const in30 = new Date(now);
    in30.setDate(now.getDate() + 30);

    const buckets: Record<string, AdminProcedure[]> = {
      overdue: [],
      week: [],
      month: [],
      later: [],
      nodate: [],
    };

    scopedProcedures.forEach((p) => {
      const rawDate = (p as { dateLimite?: string }).dateLimite;
      if (!rawDate) {
        buckets.nodate.push(p);
        return;
      }
      const d = parseDateLimite(rawDate);
      if (Number.isNaN(d.getTime())) {
        buckets.nodate.push(p);
        return;
      }
      if (d < now) buckets.overdue.push(p);
      else if (d <= in7) buckets.week.push(p);
      else if (d <= in30) buckets.month.push(p);
      else buckets.later.push(p);
    });

    return buckets;
  }, [scopedProcedures]);

  const dialogOpen = isAddOpen || !!editingId;

  const scopeSelectValue =
    scope === "all" ? "all" : scope === "unlinked" ? "sans" : scope;

  const getDeadlineInfo = (rawDate: string | undefined, workflow: string) => {
    if (!rawDate || workflow === "termine") return null;
    const d = parseDateLimite(rawDate);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7 = new Date(today);
    in7.setDate(today.getDate() + 7);
    const label = new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
    }).format(d);
    if (d < today)
      return { label, className: "border-red-500/35 bg-red-500/15 text-red-300" };
    if (d <= in7)
      return { label, className: "border-amber-500/35 bg-amber-500/15 text-amber-300" };
    return { label, className: "border-emerald-500/35 bg-emerald-500/15 text-emerald-300" };
  };

  /** Pilule statut d'avancement — haute visibilité + couleur + indicateur (pas seulement la couleur). */
  const workflowStatusTriggerClass = (workflow: string) => {
    if (workflow === "termine")
      return cn(
        "inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold tracking-tight transition-colors",
        "border-emerald-500/45 bg-emerald-500/15 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        "hover:bg-emerald-500/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]"
      );
    if (workflow === "en_cours")
      return cn(
        "inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold tracking-tight transition-colors",
        "border-amber-500/50 bg-amber-500/18 text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        "hover:bg-amber-500/26 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]"
      );
    return cn(
      "inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold tracking-tight transition-colors",
      "border-[rgba(245,245,245,0.22)] bg-[rgba(245,245,245,0.08)] text-[#F5F5F5]",
      "hover:bg-[rgba(245,245,245,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]"
    );
  };

  const workflowStatusDotClass = (workflow: string) => {
    if (workflow === "termine") return "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.55)]";
    if (workflow === "en_cours") return "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.45)]";
    return "bg-[#F5F5F5]/50";
  };

  const TabButton = ({
    active,
    onClick,
    children,
    title,
  }: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
    title?: string;
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors max-w-[200px] truncate",
        active
          ? "border-[#F0FF00]/35 bg-[#F0FF00]/10 text-[#F0FF00]"
          : "border-[rgba(245,245,245,0.1)] bg-[rgba(245,245,245,0.05)] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.1)] hover:text-[#F5F5F5]"
      )}
    >
      {children}
    </button>
  );

  if (loading) return <PageLoader />;
  if (error)
    return (
      <PageError
        title="Impossible de charger tes démarches"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
        onRetry={() => mutate("user_admin")}
      />
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes démarches</h1>
          <p className="text-sm text-muted-foreground">
            Liées à tes statuts juridiques : échéances URSSAF, France Travail, TVA… Les suggestions par
            type de statut se créent depuis{" "}
            <Link href="/admin" className="underline underline-offset-2 hover:text-foreground">
              Mes statuts
            </Link>
            .
          </p>
          <p className="mt-1 text-xs text-[#F5F5F5]/45">{scopeSummary}</p>
        </div>
        <Button className="shrink-0" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Ajouter une démarche
        </Button>
      </div>

      {statuses.length > 0 || procedures.length > 0 ? (
        <>
          <div className="md:hidden">
            <Select
              value={scopeSelectValue}
              onValueChange={(v) => {
                if (v === "all") applyScope("all");
                else if (v === "sans") applyScope("unlinked");
                else applyScope(v);
              }}
            >
              <SelectTrigger className="w-full border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.4)]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les démarches</SelectItem>
                <SelectItem value="sans">Sans statut juridique</SelectItem>
                {sortedStatuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden md:block">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/40">
              Par statut juridique
            </p>
            <div className="flex flex-wrap gap-2">
              <TabButton active={scope === "all"} onClick={() => applyScope("all")}>
                Toutes
              </TabButton>
              <TabButton active={scope === "unlinked"} onClick={() => applyScope("unlinked")}>
                Sans statut
              </TabButton>
              {sortedStatuses.map((s) => (
                <TabButton
                  key={s.id}
                  active={scope === s.id}
                  onClick={() => applyScope(s.id)}
                  title={s.nom}
                >
                  {s.nom}
                </TabButton>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {procedures.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Aucune démarche"
          description="Quand tu ajoutes un statut, Sidekick peut proposer des démarches types (URSSAF, France Travail…). Tu peux aussi en créer une à la main."
          action={{ label: "Ajouter une démarche", onClick: openAdd }}
        />
      ) : scopedProcedures.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={
            scope !== "all" && scope !== "unlinked"
              ? `Aucune démarche pour ${statuses.find((s) => s.id === scope)?.nom ?? "ce statut"}`
              : "Aucune démarche pour cette sélection"
          }
          description={
            scope !== "all" && scope !== "unlinked"
              ? "Les démarches types sont créées automatiquement à la création d'un statut. Tu peux aussi en ajouter une manuellement."
              : "Change d'onglet ou ajoute une démarche."
          }
          action={{ label: "Ajouter une démarche", onClick: openAdd }}
        />
      ) : (
        <div className="space-y-5">
          {[
            { key: "overdue", label: "En retard" },
            { key: "week", label: "Cette semaine" },
            { key: "month", label: "Ce mois" },
            { key: "later", label: "Plus tard" },
            { key: "nodate", label: "Sans date" },
          ].map((group) => {
            const items = groupedProcedures[group.key];
            if (!items || items.length === 0) return null;
            return (
              <div key={group.key} className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/40">
                  {group.label}
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {items.map((p) => {
                    const workflow = (p as { status?: string }).status ?? "a_faire";
                    const statutJuridiqueId = (p as { statutJuridiqueId?: string }).statutJuridiqueId;
                    const statutJuridiqueNom = statutJuridiqueId
                      ? statuses.find((s) => s.id === statutJuridiqueId)?.nom ?? "—"
                      : null;
                    const rawDate = (p as { dateLimite?: string }).dateLimite;
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    let overdueAccent = false;
                    let soonAccent = false;
                    if (rawDate && workflow !== "termine") {
                      const d = parseDateLimite(rawDate);
                      if (!Number.isNaN(d.getTime())) {
                        const in7 = new Date(now);
                        in7.setDate(now.getDate() + 7);
                        if (d < now) overdueAccent = true;
                        else if (d <= in7) soonAccent = true;
                      }
                    }
                    const isAuto = !!(p as { isAutoGenerated?: boolean }).isAutoGenerated;
                    const deadlineInfo = rawDate ? getDeadlineInfo(rawDate, workflow) : null;

                    return (
                      <Card
                        key={p.id}
                        className={cn(
                          "relative overflow-hidden border transition-opacity",
                          workflow === "termine" && "opacity-65",
                          overdueAccent && "border-l-[3px] border-l-red-500/55",
                          !overdueAccent && soonAccent && "border-l-[3px] border-l-[#F0FF00]/45",
                          !overdueAccent &&
                            !soonAccent &&
                            workflow !== "termine" &&
                            "border-l-[3px] border-l-[#F0FF00]/35"
                        )}
                      >
                        <CardContent className="p-0">
                          {/* En-tête — aligné sur les fiches Mes statuts : titre à gauche, statut + actions à droite */}
                          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <p className="text-base font-semibold leading-snug tracking-tight">{p.label}</p>
                                {deadlineInfo ? (
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                                      deadlineInfo.className
                                    )}
                                  >
                                    {deadlineInfo.label}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                {scope === "all" && statutJuridiqueNom ? (
                                  <Badge variant="secondary" className="text-[11px]">
                                    {statutJuridiqueNom}
                                  </Badge>
                                ) : null}
                                <Badge variant="outline" className="text-[11px]">
                                  {recurrenceLabel((p as { recurrence?: string }).recurrence)}
                                </Badge>
                                {isAuto ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#F5F5F5]/45">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#F5F5F5]/30" aria-hidden />
                                    Suggérée
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className={cn(
                                      workflowStatusTriggerClass(workflow),
                                      "cursor-pointer active:scale-[0.98]"
                                    )}
                                    aria-label={`Statut : ${statusLabel(workflow)}. Ouvrir le menu pour changer`}
                                  >
                                    <span
                                      className={cn("h-2 w-2 shrink-0 rounded-full", workflowStatusDotClass(workflow))}
                                      aria-hidden
                                    />
                                    <span>{statusLabel(workflow)}</span>
                                    <ChevronDown className="h-4 w-4 shrink-0 opacity-55" aria-hidden />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[12rem]">
                                  {PROCEDURE_STATUS.map((s) => (
                                    <DropdownMenuItem
                                      key={s.value}
                                      onSelect={() => handleStatusChange(p, s.value as ProcedureStatus)}
                                    >
                                      {s.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <div className="flex shrink-0 gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 text-[#F5F5F5]/80 hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
                                  onClick={() => openEdit(p)}
                                  aria-label={`Modifier ${p.label}`}
                                >
                                  <Pencil className="h-4 w-4" aria-hidden />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => void deleteProcedure(p.id)}
                                  aria-label={`Supprimer ${p.label}`}
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Bloc détail — même rythme que Mes statuts (label uppercase + corps) */}
                          {rawDate || (p as { organisme?: string }).organisme ? (
                            <div className="border-t border-[rgba(245,245,245,0.08)] px-5 py-4">
                              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                                {rawDate ? (
                                  <div className="min-w-0 sm:col-span-2">
                                    <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/40">
                                      Échéance
                                    </dt>
                                    <dd className="mt-0.5">
                                      {(() => {
                                        const d = parseDateLimite(rawDate);
                                        const longLabel =
                                          workflow !== "termine" && !Number.isNaN(d.getTime())
                                            ? new Intl.DateTimeFormat("fr-FR", {
                                                weekday: "short",
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                              }).format(d)
                                            : null;
                                        return (
                                          <p className="text-[13px] font-medium text-[#F5F5F5]/90">
                                            {longLabel ?? "—"}
                                          </p>
                                        );
                                      })()}
                                    </dd>
                                  </div>
                                ) : null}
                                {(p as { organisme?: string }).organisme ? (
                                  <div className="min-w-0">
                                    <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/40">
                                      Organisme
                                    </dt>
                                    <dd className="mt-0.5 truncate text-[13px] font-medium text-[#F5F5F5]/90" title={(p as { organisme?: string }).organisme}>
                                      {(p as { organisme?: string }).organisme}
                                    </dd>
                                  </div>
                                ) : null}
                              </dl>
                            </div>
                          ) : null}

                          {(p as { notes?: string }).notes ? (
                            <div className="border-t border-[rgba(245,245,245,0.08)] px-5 py-3">
                              <p className="line-clamp-3 text-xs leading-relaxed text-[#F5F5F5]/45" title={(p as { notes?: string }).notes}>
                                {(p as { notes?: string }).notes}
                              </p>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <Link href="/admin" className="underline hover:text-foreground">
          Retour à Mes statuts
        </Link>
      </p>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la démarche" : "Nouvelle démarche"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Que dois-tu faire ?</label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="Ex. Déclarer le CA du mois"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Pour quel statut ?</label>
              <Select
                value={formStatutJuridiqueId || "_none"}
                onValueChange={(v) => setFormStatutJuridiqueId(v === "_none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Aucun</SelectItem>
                  {sortedStatuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nom || "Sans nom"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-my-1 justify-start px-0 text-xs text-[#F5F5F5]/55 hover:text-[#F5F5F5]/80"
              onClick={() => setShowAdvancedForm((v) => !v)}
            >
              {showAdvancedForm ? (
                <>
                  <ChevronUp className="mr-1 h-3.5 w-3.5" /> Masquer les options avancées
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3.5 w-3.5" /> Échéance, organisme, récurrence…
                </>
              )}
            </Button>

            {showAdvancedForm ? (
              <div className="grid gap-4 border-l-2 border-[#F0FF00]/25 pl-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Avancement</label>
                  <Select value={formStatus} onValueChange={(value) => setFormStatus(value as ProcedureStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROCEDURE_STATUS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Organisme</label>
                  <Input
                    value={formOrganisme}
                    onChange={(e) => setFormOrganisme(e.target.value)}
                    placeholder="URSSAF, impôts…"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Récurrence</label>
                  <Select
                    value={formRecurrence}
                    onValueChange={(value) => setFormRecurrence(value as ProcedureRecurrence)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ponctuelle</SelectItem>
                      <SelectItem value="monthly">Mensuelle</SelectItem>
                      <SelectItem value="quarterly">Trimestrielle</SelectItem>
                      <SelectItem value="semi_annual">Semestrielle</SelectItem>
                      <SelectItem value="annual">Annuelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Date limite</label>
                  <DatePicker
                    value={toIsoDatePickerValue(formDateLimite)}
                    onChange={(iso) => setFormDateLimite(iso ? isoToFr(iso) : "")}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Référence dossier, lien utile…"
                    rows={2}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {editingId ? (
              <Button variant="destructive" className="mr-auto" onClick={() => editingId && void deleteProcedure(editingId)}>
                Supprimer
              </Button>
            ) : null}
            <Button variant="outline" onClick={resetForm}>
              Annuler
            </Button>
            <Button onClick={saveEdit} disabled={!formLabel.trim()}>
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmDialog}
    </div>
  );
}
