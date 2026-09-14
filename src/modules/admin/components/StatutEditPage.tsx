"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { ArrowLeft, ChevronRight, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { AdminStatus, AdminStatusType } from "@/lib/sidekick-store";
import { useAdminData } from "@/hooks/useAdminData";
import { useIncomesData } from "@/hooks/useIncomesData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isoToFr, toIsoDatePickerValue } from "@/lib/date-format";
import { DatePicker } from "@/components/ui/date-picker";
import { mutate } from "swr";
import {
  STATUS_ADDRESS_FIELDS,
  STATUS_FIELDS,
  SELECTABLE_STATUS_TYPES,
  typeLabel,
  normalizeStoredAdminStatusType,
  getStatusIdentityNameField,
  getAdvancedSectionMeta,
  isAeFranchiseBaseVatRegime,
  AE_VAT_REGIME_FRANCHISE_BASE,
} from "@/modules/admin/data/statuts-form-config";
import { getTemplatesForStatusType } from "@/modules/admin/data/procedure-templates";
import {
  buildAeAutoProcedures,
  cfeFirstDueAfterCreationYearIso,
  DEFAULT_AE_DEMARCHES,
  defaultSocialFiscalFromHeuristic,
  inferAeMicroHeuristicFromApe,
  isCfeFirstCalendarYearOfActivity,
  isSecondCalendarYearAfterCreation,
  mergeSyncedAeAutoProcedures,
  microHeuristicLabel,
  microPlafondHintEuros,
  normalizeAeDemarchesFromData,
  parseCreationYearFromFrDate,
  type AeDemarchesPersisted,
} from "@/modules/admin/lib/ae-demarches";
import {
  buildAssociationAutoProcedures,
  DEFAULT_ASSOCIATION_DEMARCHES,
  mergeSyncedAssociationAutoProcedures,
  normalizeAssociationDemarchesFromData,
  rapportActiviteRequired,
  type AssociationDemarchesPersisted,
} from "@/modules/admin/lib/association-demarches";
import {
  buildIntermittentAutoProcedures,
  cumulativeHoursLast12Months,
  DEFAULT_INTERMITTENT_DEMARCHES,
  INTERMITTENT_HOURS_TARGET,
  mergeSyncedIntermittentAutoProcedures,
  normalizeIntermittentDemarchesFromData,
  type IntermittentDemarchesPersisted,
} from "@/modules/admin/lib/intermittent-demarches";
import { ApeCodeSelect } from "@/modules/admin/components/ApeCodeSelect";
import { AeVatRegimeSelect } from "@/modules/admin/components/AeVatRegimeSelect";
import { ensureLockedFolderForStatus, removeStatusLockedFolder } from "@/modules/admin/lib/status-folder";
import { isSiretInputValid, siretDigitsOnly } from "@/modules/admin/lib/siret";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const URSSAF_AE_RECURRENCE_URL = "https://www.autoentrepreneur.urssaf.fr/";

function EditSection({
  id,
  title,
  description,
  children,
  variant = "default",
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: "default" | "muted" | "danger";
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-28 overflow-hidden rounded-lg border backdrop-blur-xl",
        variant === "default" &&
          "border-[rgba(245,245,245,0.12)] border-l-[3px] border-l-[#F0FF00]/45 bg-[rgba(44,44,46,0.35)]",
        variant === "muted" &&
          "border-[rgba(245,245,245,0.1)] border-l-[3px] border-l-[#F0FF00]/25 bg-[rgba(245,245,245,0.03)]",
        variant === "danger" && "border-destructive/35 bg-destructive/5"
      )}
    >
      <div className="border-b border-[rgba(245,245,245,0.08)] px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-[#F5F5F5]/45">{description}</p>
        ) : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

type StatutEditPageProps = {
  /** Absent = création */
  statusId?: string;
};

export function StatutEditPage({ statusId }: StatutEditPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const isEdit = Boolean(statusId);

  const { statuses, setStatuses, setProcedures, procedures, loading, error } = useAdminData();
  const { invoices, setInvoices, missions } = useIncomesData();
  const [, setSelectedBillingStatusId] = useLocalStorage<string | null>(
    "incomes:selected-billing-status",
    null
  );

  const initialTypeParam = searchParams.get("type") as AdminStatusType | null;
  const validInitialType =
    initialTypeParam && SELECTABLE_STATUS_TYPES.some((t) => t.value === initialTypeParam)
      ? initialTypeParam
      : "auto_entrepreneur";

  const [hydrated, setHydrated] = useState(false);
  const [formNom, setFormNom] = useState("");
  const [formType, setFormType] = useState<AdminStatusType>(validInitialType);
  const [formActif, setFormActif] = useState(true);
  const [formDateDebut, setFormDateDebut] = useState("");
  const [formDateFin, setFormDateFin] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formProfile, setFormProfile] = useState<Record<string, string>>({});
  const [aeDemarches, setAeDemarches] = useState<AeDemarchesPersisted>(DEFAULT_AE_DEMARCHES);
  const [associationDemarches, setAssociationDemarches] = useState<AssociationDemarchesPersisted>(DEFAULT_ASSOCIATION_DEMARCHES);
  const [intermittentDemarches, setIntermittentDemarches] = useState<IntermittentDemarchesPersisted>(DEFAULT_INTERMITTENT_DEMARCHES);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [annuaireLoading, setAnnuaireLoading] = useState(false);
  const [annuaireError, setAnnuaireError] = useState<string | null>(null);

  const existing = useMemo(
    () => (statusId ? statuses.find((s) => s.id === statusId) : undefined),
    [statusId, statuses]
  );

  useEffect(() => {
    if (loading) return;
    if (isEdit && statusId && !existing) {
      setNotFound(true);
      return;
    }
    if (isEdit && existing) {
      setFormNom(existing.nom ?? "");
      setFormType(normalizeStoredAdminStatusType(String(existing.type ?? "auto_entrepreneur")));
      setFormActif(existing.actif ?? true);
      setFormDateDebut(existing.dateDebut ?? "");
      setFormDateFin(existing.dateFin ?? "");
      setFormNotes(existing.notes ?? "");
      const profile = (existing.data?.profile as Record<string, unknown> | undefined) ?? {};
      const rawProfile = Object.fromEntries(
        Object.entries(profile).map(([k, v]) => [k, typeof v === "string" ? v : String(v ?? "")])
      );
      const typed = normalizeStoredAdminStatusType(String(existing.type ?? "auto_entrepreneur"));
      setFormProfile(
        typed === "auto_entrepreneur" && isAeFranchiseBaseVatRegime(rawProfile.tvaRegime)
          ? { ...rawProfile, vatNumber: "" }
          : rawProfile,
      );
      setAeDemarches(normalizeAeDemarchesFromData(existing.data?.aeDemarches));
      setAssociationDemarches(normalizeAssociationDemarchesFromData(existing.data?.associationDemarches));
      setIntermittentDemarches(normalizeIntermittentDemarchesFromData(existing.data?.intermittentDemarches));
    } else if (!isEdit) {
      setFormType(validInitialType);
      setAeDemarches(DEFAULT_AE_DEMARCHES);
      setAssociationDemarches(DEFAULT_ASSOCIATION_DEMARCHES);
      setIntermittentDemarches(DEFAULT_INTERMITTENT_DEMARCHES);
    }
    setHydrated(true);
  }, [loading, isEdit, statusId, existing, validInitialType]);

  const currentFields = STATUS_FIELDS[formType] ?? STATUS_FIELDS.auto_entrepreneur;
  const essentialFields = currentFields.filter((f) => !f.advanced);
  const advancedFields = currentFields.filter((f) => f.advanced);

  const identityNameField = useMemo(() => getStatusIdentityNameField(formType), [formType]);
  const advancedSectionMeta = useMemo(() => getAdvancedSectionMeta(formType), [formType]);

  const siretFieldsInvalid = useMemo(() => {
    const fields = STATUS_FIELDS[formType] ?? STATUS_FIELDS.auto_entrepreneur;
    return fields.some((f) => {
      if (f.key !== "siret") return false;
      return !isSiretInputValid(formProfile[f.key] ?? "");
    });
  }, [formType, formProfile]);

  const associationFieldsInvalid = useMemo(() => {
    if (formType !== "association_1901") return false;
    return (
      !formProfile.rna?.trim() ||
      !formProfile.president?.trim() ||
      !formDateDebut?.trim() ||
      (!formProfile.addressLine?.trim() && !formProfile.addressCity?.trim())
    );
  }, [formType, formProfile, formDateDebut]);

  const intermittentFieldsInvalid = useMemo(() => {
    if (formType !== "intermittent") return false;
    return !intermittentDemarches.anniversaryDate?.trim();
  }, [formType, intermittentDemarches.anniversaryDate]);

  /** Vrai si un statut intermittent existe déjà et qu'on essaie d'en créer un second. */
  const intermittentDuplicate = useMemo(() => {
    if (isEdit) return false;
    if (formType !== "intermittent") return false;
    return statuses.some((s) => s.type === "intermittent");
  }, [isEdit, formType, statuses]);

  const hasSiretFieldInForm = useMemo(() => {
    const fields = STATUS_FIELDS[formType] ?? STATUS_FIELDS.auto_entrepreneur;
    return fields.some((f) => f.key === "siret");
  }, [formType]);

  const canFetchAnnuaire = siretDigitsOnly(formProfile.siret ?? "").length === 14;

  const handleAnnuaireFetch = async () => {
    const digits = siretDigitsOnly(formProfile.siret ?? "");
    if (digits.length !== 14) return;
    setAnnuaireLoading(true);
    setAnnuaireError(null);
    try {
      const res = await fetch(`/api/admin/siret-annuaire?siret=${encodeURIComponent(digits)}`);
      const data = (await res.json()) as {
        error?: string;
        nom?: string;
        siret?: string;
        ape?: string;
        addressLine?: string;
        addressPostal?: string;
        addressCity?: string;
        addressCountry?: string;
        dateCreationIso?: string;
      };
      if (!res.ok) {
        setAnnuaireError(typeof data.error === "string" ? data.error : "Recherche impossible");
        return;
      }
      if (data.nom?.trim()) setFormNom(data.nom.trim());
      setFormProfile((prev) => {
        const next: Record<string, string> = { ...prev };
        if (typeof data.siret === "string" && data.siret.trim()) next.siret = data.siret.trim();
        if (data.ape?.trim()) next.ape = data.ape.trim();
        /** L’annuaire est la source sur cette action : pas de voie exploitable → champ vidé (évite un reste « [NON-DIFFUSIBLE] »). */
        next.addressLine = data.addressLine?.trim() ?? "";
        if (data.addressPostal?.trim()) next.addressPostal = data.addressPostal.trim();
        if (data.addressCity?.trim()) next.addressCity = data.addressCity.trim();
        if (data.addressCountry?.trim()) next.addressCountry = data.addressCountry.trim();
        return next;
      });
      if (data.dateCreationIso && /^\d{4}-\d{2}-\d{2}$/.test(data.dateCreationIso)) {
        setFormDateDebut(isoToFr(data.dateCreationIso));
      }
      toast.success("Champs disponibles pré-remplis depuis l’annuaire (data.gouv).");
    } catch {
      setAnnuaireError("Réseau indisponible");
    } finally {
      setAnnuaireLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formNom.trim()) return;
    if (siretFieldsInvalid) {
      toast.error("SIRET : 14 chiffres ou champ vide.");
      return;
    }
    setSaving(true);
    try {
      const id = statusId ?? crypto.randomUUID();
      const baseData = isEdit && existing?.data ? { ...existing.data } : {};
      const profileForSave =
        formType === "auto_entrepreneur" &&
        isAeFranchiseBaseVatRegime(formProfile.tvaRegime)
          ? { ...formProfile, vatNumber: "" }
          : formProfile;
      let payload: AdminStatus = {
        id,
        nom: formNom.trim(),
        type: formType,
        actif: formActif,
        dateDebut: formDateDebut || undefined,
        dateFin: formDateFin || undefined,
        notes: formNotes.trim() || undefined,
        data: {
          ...baseData,
          profile: profileForSave,
          ...(formType === "auto_entrepreneur" ? { aeDemarches } : {}),
          ...(formType === "association_1901" ? { associationDemarches } : {}),
          ...(formType === "intermittent" ? { intermittentDemarches } : {}),
        },
      };
      try {
        payload = await ensureLockedFolderForStatus(payload);
      } catch (folderErr) {
        console.error("[statut] Impossible de créer le dossier verrouillé :", folderErr);
      }

      const creationYear = parseCreationYearFromFrDate(formDateDebut);
      const calendarYear = new Date().getFullYear();

      if (isEdit) {
        setStatuses((prev) => prev.map((s) => (s.id === id ? payload : s)));
        posthog?.capture("status_updated", { module: "admin" });
        if (formType === "auto_entrepreneur") {
          setProcedures((prev) =>
            mergeSyncedAeAutoProcedures(prev, id, aeDemarches, creationYear, calendarYear)
          );
        } else if (formType === "association_1901") {
          setProcedures((prev) =>
            mergeSyncedAssociationAutoProcedures(prev, id, associationDemarches)
          );
        } else if (formType === "intermittent") {
          setProcedures((prev) =>
            mergeSyncedIntermittentAutoProcedures(prev, id, intermittentDemarches)
          );
        }
        router.push("/admin");
      } else {
        setStatuses((prev) => [...prev, payload]);
        posthog?.capture("status_created", { module: "admin" });
        posthog?.capture("item_created", { module: "admin" });

        if (formType === "auto_entrepreneur") {
          const built = buildAeAutoProcedures({
            statusId: id,
            dem: aeDemarches,
            creationYear,
            calendarYear,
          });
          if (built.length > 0) {
            setProcedures((prev) => [...prev, ...built]);
            toast.success(
              `${built.length} démarche${built.length > 1 ? "s" : ""} créée${built.length > 1 ? "s" : ""} pour ce statut`
            );
          }
        } else if (formType === "association_1901") {
          const built = buildAssociationAutoProcedures({ statusId: id, dem: associationDemarches });
          if (built.length > 0) {
            setProcedures((prev) => [...prev, ...built]);
            toast.success(
              `${built.length} démarche${built.length > 1 ? "s" : ""} créée${built.length > 1 ? "s" : ""} pour ce statut`
            );
          }
        } else if (formType === "intermittent") {
          const built = buildIntermittentAutoProcedures({ statusId: id, dem: intermittentDemarches });
          if (built.length > 0) {
            setProcedures((prev) => [...prev, ...built]);
            toast.success(
              `${built.length} démarche${built.length > 1 ? "s" : ""} créée${built.length > 1 ? "s" : ""} pour ce statut`
            );
          }
        } else {
          const templates = getTemplatesForStatusType(formType);
          if (templates.length > 0) {
            const today = new Date();
            setProcedures((prev) => [
              ...prev,
              ...templates.map((tpl) => {
                const due = new Date(today);
                due.setDate(due.getDate() + tpl.defaultDueInDays);
                return {
                  id: crypto.randomUUID(),
                  label: tpl.label,
                  status: "a_faire" as const,
                  statutJuridiqueId: id,
                  organisme: tpl.organisme,
                  recurrence: tpl.recurrence,
                  templateKey: tpl.key,
                  isAutoGenerated: true,
                  dateLimite: due.toISOString().slice(0, 10),
                };
              }),
            ]);
            toast.success(
              `${templates.length} démarche${templates.length > 1 ? "s" : ""} créée${templates.length > 1 ? "s" : ""} pour ce statut`
            );
          }
        }

        router.push("/admin");
      }
    } catch (err) {
      console.error("[statut] Erreur lors de la sauvegarde :", err);
      toast.error("Impossible d'enregistrer le statut. Vérifie ta connexion et réessaie.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!statusId || !existing) return;
    const invoiceIdsToRemove = invoices
      .filter((inv) => inv.statutJuridiqueId === statusId)
      .map((inv) => inv.id);

    if (invoiceIdsToRemove.length > 0) {
      setInvoices((prev) => prev.filter((inv) => !invoiceIdsToRemove.includes(inv.id)));
    }

    const proceduresLinked = procedures.filter(
      (p) => (p as { statutJuridiqueId?: string }).statutJuridiqueId === statusId
    );
    if (proceduresLinked.length > 0) {
      const removeIds = new Set(proceduresLinked.map((p) => p.id));
      setProcedures((prev) => prev.filter((p) => !removeIds.has(p.id)));
    }

    setStatuses((prev) => prev.filter((s) => s.id !== statusId));
    setSelectedBillingStatusId((current) => (current === statusId ? null : current));

    posthog?.capture("status_deleted", {
      module: "admin",
      invoices_removed: invoiceIdsToRemove.length,
      procedures_removed: proceduresLinked.length,
    });

    try {
      await removeStatusLockedFolder(existing);
    } catch {
      /* déjà non bloquant */
    }

    setPendingDelete(false);
    router.push("/admin");
  };

  const intermittentHours = useMemo(
    () => cumulativeHoursLast12Months(missions),
    [missions]
  );

  const creationYearForDemarches = useMemo(
    () => parseCreationYearFromFrDate(formDateDebut),
    [formDateDebut]
  );
  const calendarYearForDemarches = new Date().getFullYear();
  const apeMicroHeuristic = useMemo(
    () => inferAeMicroHeuristicFromApe(formProfile.ape ?? ""),
    [formProfile.ape]
  );
  const cfeCaNum = useMemo(() => {
    const raw = (aeDemarches.cfeCurrentYearCaEuros ?? "").replace(",", ".").replace(/\s/g, "");
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : null;
  }, [aeDemarches.cfeCurrentYearCaEuros]);

  if (loading || !hydrated) return <PageLoader />;
  if (error)
    return (
      <PageError
        title="Impossible de charger le statut"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
        onRetry={() => mutate("user_admin")}
      />
    );
  if (notFound)
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Ce statut n&apos;existe pas ou a été supprimé.</p>
        <Button variant="outline" asChild>
          <Link href="/admin">Retour aux statuts</Link>
        </Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      {/* Barre d’action sticky — alignée avec les fiches liste */}
      <div
        className={cn(
          "sticky top-0 z-20 -mx-2 flex flex-col gap-3 border-b border-[rgba(245,245,245,0.12)] bg-[#101010]/95 px-2 py-3 backdrop-blur-md sm:-mx-0 sm:flex-row sm:items-center sm:justify-between sm:px-0"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button variant="ghost" size="sm" className="shrink-0 gap-1 px-2" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Statuts</span>
            </Link>
          </Button>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-50" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight">
              {isEdit ? formNom.trim() || "Modifier le statut" : "Nouveau statut"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {isEdit ? typeLabel(formType) : "Crée une fiche comme sur la liste Mes statuts"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">Annuler</Link>
          </Button>
          <Button
            size="sm"
            disabled={
              !formNom.trim() ||
              saving ||
              siretFieldsInvalid ||
              associationFieldsInvalid ||
              intermittentFieldsInvalid ||
              intermittentDuplicate
            }
            onClick={() => void handleSave()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : isEdit ? (
              "Enregistrer"
            ) : (
              "Créer le statut"
            )}
          </Button>
        </div>
      </div>

      {/* Aperçu type / état — même vocabulaire visuel que les cartes */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-lg border border-[rgba(245,245,245,0.12)] border-l-[3px] border-l-[#F0FF00]/45 bg-[rgba(44,44,46,0.35)] px-4 py-3 backdrop-blur-xl",
          !formActif && "opacity-80"
        )}
      >
        <Badge variant="secondary" className="text-[11px]">
          {typeLabel(formType)}
        </Badge>
        {formActif ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            Actif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#F5F5F5]/40">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F5F5F5]/25" aria-hidden />
            Inactif
          </span>
        )}
      </div>

<div className="space-y-5">
        <EditSection
          id="section-identite"
          title="Identité"
          description={identityNameField.identitySectionDescription}
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="statut-nom">{identityNameField.label}</Label>
              <Input
                id="statut-nom"
                value={formNom}
                onChange={(e) => setFormNom(e.target.value)}
                placeholder={identityNameField.placeholder}
                autoComplete="organization"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="statut-type">Type</Label>
              <Select
                value={formType}
                onValueChange={(v) => setFormType(v as AdminStatusType)}
                disabled={isEdit}
              >
                <SelectTrigger id="statut-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SELECTABLE_STATUS_TYPES.map((t) => {
                    const isIntermittentBlocked =
                      !isEdit &&
                      t.value === "intermittent" &&
                      statuses.some((s) => s.type === "intermittent");
                    return (
                      <SelectItem
                        key={t.value}
                        value={t.value}
                        disabled={isIntermittentBlocked}
                      >
                        {t.label}
                        {isIntermittentBlocked ? " (déjà créé)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  Le type ne peut pas être modifié après création (démarches et dossier liés).
                </p>
              )}
              {intermittentDuplicate && (
                <p className="text-xs text-amber-400/90">
                  Tu as déjà un statut intermittent. Un seul est autorisé — modifie le statut existant ou supprime-le d&apos;abord.
                </p>
              )}
            </div>
          </div>
        </EditSection>

        <EditSection
          id="section-details"
          title="Informations principales"
          description={`Champs pour « ${typeLabel(formType)} ».${
            hasSiretFieldInForm
              ? " Avec un SIRET valide, tu peux pré-remplir depuis l’API publique Recherche d’entreprises (data.gouv)."
              : ""
          }`}
        >
          {hasSiretFieldInForm ? (
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!canFetchAnnuaire || annuaireLoading}
                onClick={() => void handleAnnuaireFetch()}
              >
                {annuaireLoading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                    Recherche…
                  </>
                ) : (
                  "Remplir depuis l’annuaire"
                )}
              </Button>
              <span className="text-[11px] leading-snug text-[#F5F5F5]/45">
                Seuls les champs réellement publiés par l’annuaire sont copiés. Entités non diffusibles ou données masquées : aucun pré-remplissage. TVA, URSSAF ou IBAN ne sont pas fournis par ce service.
              </span>
              {annuaireError ? (
                <span className="text-xs text-rose-400 sm:w-full" role="alert">
                  {annuaireError}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {essentialFields.map((field) => (
              <div key={field.key} className="grid min-w-0 gap-2">
                <Label htmlFor={`profile-${field.key}`} className="text-[11px] uppercase tracking-wide text-[#F5F5F5]/50">
                  {field.label}
                </Label>
                {field.variant === "ape" ? (
                  <ApeCodeSelect
                    id={`profile-${field.key}`}
                    fieldLabel={field.label}
                    value={formProfile[field.key] ?? ""}
                    onChange={(code) =>
                      setFormProfile((prev) => ({ ...prev, [field.key]: code }))
                    }
                  />
                ) : field.variant === "ae_vat_regime" ? (
                  <AeVatRegimeSelect
                    id={`profile-${field.key}`}
                    value={formProfile[field.key] ?? ""}
                    onChange={(stored) =>
                      setFormProfile((prev) => ({
                        ...prev,
                        [field.key]: stored,
                        ...(stored === AE_VAT_REGIME_FRANCHISE_BASE
                          ? { vatNumber: "" }
                          : {}),
                      }))
                    }
                  />
                ) : field.variant === "ae_vat_number" ? (
                  <Input
                    id={`profile-${field.key}`}
                    value={formProfile[field.key] ?? ""}
                    onChange={(e) =>
                      setFormProfile((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    autoComplete="off"
                    disabled={isAeFranchiseBaseVatRegime(formProfile.tvaRegime)}
                  />
                ) : field.variant === "intermittent_annexe" ? (
                  <Select
                    value={formProfile[field.key] || undefined}
                    onValueChange={(v) =>
                      setFormProfile((prev) => ({ ...prev, [field.key]: v }))
                    }
                  >
                    <SelectTrigger id={`profile-${field.key}`}>
                      <SelectValue placeholder="Choisir…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">Annexe 10 — artistes</SelectItem>
                      <SelectItem value="8">Annexe 8 — techniciens</SelectItem>
                    </SelectContent>
                  </Select>
                ) : field.key === "rightsEnd" ? (
                  <DatePicker
                    id={`profile-${field.key}`}
                    value={toIsoDatePickerValue(formProfile[field.key])}
                    onChange={(iso) =>
                      setFormProfile((prev) => ({ ...prev, [field.key]: iso ? isoToFr(iso) : "" }))
                    }
                  />
                ) : (
                  <>
                    <Input
                      id={`profile-${field.key}`}
                      value={formProfile[field.key] ?? ""}
                      onChange={(e) =>
                        setFormProfile((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      inputMode={field.key === "siret" ? "numeric" : undefined}
                      autoComplete={field.key === "siret" ? "off" : undefined}
                      aria-invalid={field.key === "siret" && !isSiretInputValid(formProfile[field.key] ?? "")}
                      className={
                        field.key === "siret" && !isSiretInputValid(formProfile[field.key] ?? "")
                          ? "border-rose-500/55 focus-visible:border-rose-500/50 focus-visible:ring-rose-500/20"
                          : undefined
                      }
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </EditSection>

        {advancedFields.length > 0 && (
          <EditSection
            id="section-details-optionnel"
            title={advancedSectionMeta.title}
            description={advancedSectionMeta.description}
            variant="muted"
          >
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              {advancedFields.map((field) => (
                <div key={field.key} className="grid min-w-0 gap-2">
                  <Label
                    htmlFor={`profile-adv-${field.key}`}
                    className="text-[11px] uppercase tracking-wide text-[#F5F5F5]/50"
                  >
                    {field.label}
                  </Label>
                  {field.variant === "ape" ? (
                    <ApeCodeSelect
                      id={`profile-adv-${field.key}`}
                      fieldLabel={field.label}
                      value={formProfile[field.key] ?? ""}
                      onChange={(code) =>
                        setFormProfile((prev) => ({ ...prev, [field.key]: code }))
                      }
                    />
                  ) : field.variant === "ae_vat_regime" ? (
                    <AeVatRegimeSelect
                      id={`profile-adv-${field.key}`}
                      value={formProfile[field.key] ?? ""}
                      onChange={(stored) =>
                        setFormProfile((prev) => ({
                          ...prev,
                          [field.key]: stored,
                          ...(stored === AE_VAT_REGIME_FRANCHISE_BASE
                            ? { vatNumber: "" }
                            : {}),
                        }))
                      }
                    />
                  ) : field.variant === "ae_vat_number" ? (
                    <Input
                      id={`profile-adv-${field.key}`}
                      value={formProfile[field.key] ?? ""}
                      onChange={(e) =>
                        setFormProfile((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      autoComplete="off"
                      disabled={isAeFranchiseBaseVatRegime(formProfile.tvaRegime)}
                    />
                  ) : field.key === "rightsEnd" ? (
                    <DatePicker
                      id={`profile-adv-${field.key}`}
                      value={toIsoDatePickerValue(formProfile[field.key])}
                      onChange={(iso) =>
                        setFormProfile((prev) => ({ ...prev, [field.key]: iso ? isoToFr(iso) : "" }))
                      }
                    />
                  ) : (
                    <>
                      <Input
                        id={`profile-adv-${field.key}`}
                        value={formProfile[field.key] ?? ""}
                        onChange={(e) =>
                          setFormProfile((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={field.placeholder}
                        inputMode={field.key === "siret" ? "numeric" : undefined}
                        autoComplete={field.key === "siret" ? "off" : undefined}
                        aria-invalid={
                          field.key === "siret" && !isSiretInputValid(formProfile[field.key] ?? "")
                        }
                        className={
                          field.key === "siret" && !isSiretInputValid(formProfile[field.key] ?? "")
                            ? "border-rose-500/55 focus-visible:border-rose-500/50 focus-visible:ring-rose-500/20"
                            : undefined
                        }
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </EditSection>
        )}

        <EditSection
          id="section-adresse"
          title="Adresse"
          description={
            formType === "intermittent"
              ? "Adresse personnelle (courriers administratifs France Travail, Audiens…)."
              : "Adresse postale liée à ce statut (facturation, courriers, siège…)."
          }
          variant="muted"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="addr-line">{STATUS_ADDRESS_FIELDS[0].label}</Label>
              <Input
                id="addr-line"
                value={formProfile.addressLine ?? ""}
                onChange={(e) =>
                  setFormProfile((prev) => ({ ...prev, addressLine: e.target.value }))
                }
                placeholder={STATUS_ADDRESS_FIELDS[0].placeholder}
                autoComplete="street-address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="addr-postal">{STATUS_ADDRESS_FIELDS[1].label}</Label>
              <Input
                id="addr-postal"
                value={formProfile.addressPostal ?? ""}
                onChange={(e) =>
                  setFormProfile((prev) => ({ ...prev, addressPostal: e.target.value }))
                }
                placeholder={STATUS_ADDRESS_FIELDS[1].placeholder}
                autoComplete="postal-code"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="addr-city">{STATUS_ADDRESS_FIELDS[2].label}</Label>
              <Input
                id="addr-city"
                value={formProfile.addressCity ?? ""}
                onChange={(e) =>
                  setFormProfile((prev) => ({ ...prev, addressCity: e.target.value }))
                }
                placeholder={STATUS_ADDRESS_FIELDS[2].placeholder}
                autoComplete="address-level2"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="addr-country">{STATUS_ADDRESS_FIELDS[3].label}</Label>
              <Input
                id="addr-country"
                value={formProfile.addressCountry ?? ""}
                onChange={(e) =>
                  setFormProfile((prev) => ({ ...prev, addressCountry: e.target.value }))
                }
                placeholder={STATUS_ADDRESS_FIELDS[3].placeholder}
                autoComplete="country-name"
              />
            </div>
          </div>
        </EditSection>

        {formType === "intermittent" ? (
          <EditSection
            id="section-periode"
            title="État"
            description="Indique si tu es actuellement en cours d'indemnisation."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] px-3 py-3">
                <Checkbox
                  id="statut-actif"
                  checked={formActif}
                  onCheckedChange={(c) => setFormActif(c === true)}
                />
                <Label htmlFor="statut-actif" className="cursor-pointer text-sm font-medium leading-none">
                  Intermittence en cours
                </Label>
              </div>
              <div className="grid gap-2 sm:max-w-xs">
                <Label htmlFor="date-fin">Date de fin des droits (optionnel)</Label>
                <DatePicker
                  id="date-fin"
                  value={toIsoDatePickerValue(formDateFin)}
                  onChange={(iso) => setFormDateFin(iso ? isoToFr(iso) : "")}
                />
                <p className="text-[11px] text-[#F5F5F5]/40">
                  Fin de ta période d&apos;indemnisation en cours — distinct de la date anniversaire ci-dessous.
                </p>
              </div>
            </div>
          </EditSection>
        ) : (
          <EditSection
            id="section-periode"
            title="Période & état"
            description="Dates de validité et activation du statut."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] px-3 py-3">
                <Checkbox
                  id="statut-actif"
                  checked={formActif}
                  onCheckedChange={(c) => setFormActif(c === true)}
                />
                <Label htmlFor="statut-actif" className="cursor-pointer text-sm font-medium leading-none">
                  Statut actif
                </Label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="date-creation">Date de création</Label>
                  <DatePicker
                    id="date-creation"
                    value={toIsoDatePickerValue(formDateDebut)}
                    onChange={(iso) => setFormDateDebut(iso ? isoToFr(iso) : "")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date-fin">Date de fin (optionnel)</Label>
                  <DatePicker
                    id="date-fin"
                    value={toIsoDatePickerValue(formDateFin)}
                    onChange={(iso) => setFormDateFin(iso ? isoToFr(iso) : "")}
                  />
                </div>
              </div>
            </div>
          </EditSection>
        )}

        {formType === "auto_entrepreneur" ? (
          <TooltipProvider delayDuration={200}>
            <EditSection
              id="section-ae-demarches"
              title="Personnalisation des démarches"
              description="Jalons indicatifs selon ton profil. Vérifie toujours tes obligations auprès de l’URSSAF et des impôts."
              variant="muted"
            >
              <div className="space-y-10">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#f5f5f5]">
                    1. Déclaration de chiffre d&apos;affaires
                  </h3>
                  <div className="grid gap-2 sm:max-w-xs">
                    <Label htmlFor="ae-cadence-ca">Récurrence</Label>
                    <Select
                      value={aeDemarches.declarationCadence}
                      onValueChange={(v) =>
                        setAeDemarches((d) => ({
                          ...d,
                          declarationCadence: v === "monthly" ? "monthly" : "quarterly",
                        }))
                      }
                    >
                      <SelectTrigger id="ae-cadence-ca">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quarterly">Trimestriel (par défaut)</SelectItem>
                        <SelectItem value="monthly">Mensuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-[#F5F5F5]/55">
                    Retrouve la récurrence exacte imposée sur ton espace :{" "}
                    <a
                      href={URSSAF_AE_RECURRENCE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F0FF00]/90 underline underline-offset-2 hover:text-[#F0FF00]"
                    >
                      autoentrepreneur.urssaf.fr
                    </a>
                  </p>
                </div>

                <div className="space-y-4 border-t border-[rgba(245,245,245,0.08)] pt-8">
                  <h3 className="text-sm font-semibold text-[#f5f5f5]">
                    2. Cotisation foncière des entreprises (CFE)
                  </h3>
                  {isCfeFirstCalendarYearOfActivity(
                    creationYearForDemarches,
                    calendarYearForDemarches
                  ) ? (
                    <p className="text-sm leading-relaxed text-emerald-300/95">
                      Première année civile d&apos;activité ({calendarYearForDemarches}) : en principe
                      exonéré de CFE pour cette année. La démarche est tout de même créée, avec une
                      première échéance au{" "}
                      <span className="font-medium">
                        {isoToFr(cfeFirstDueAfterCreationYearIso(calendarYearForDemarches))}
                      </span>{" "}
                      (indicatif — adapte selon ton avis d&apos;imposition).
                    </p>
                  ) : (
                    <>
                      {aeDemarches.cfeMarkedExempt ? (
                        <div className="space-y-2">
                          <p className="text-xs text-[#F5F5F5]/50">
                            Tu as indiqué être exonéré : la démarche CFE n&apos;est pas proposée,
                            quel que soit le montant saisi.
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-fit"
                            onClick={() => setAeDemarches((d) => ({ ...d, cfeMarkedExempt: false }))}
                          >
                            Réactiver la démarche CFE
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-end gap-3">
                            <div className="grid flex-1 gap-2 sm:max-w-xs">
                              <div className="flex items-center gap-2">
                                <Label htmlFor="ae-cfe-ca">
                                  Chiffre d&apos;affaires année en cours (€)
                                </Label>
                                {isSecondCalendarYearAfterCreation(
                                  creationYearForDemarches,
                                  calendarYearForDemarches
                                ) ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className="rounded p-0.5 text-[#F5F5F5]/45 hover:text-[#F5F5F5]/75"
                                        aria-label="Exonération partielle de CFE"
                                      >
                                        <Info className="h-4 w-4" aria-hidden />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      className="max-w-xs border-[rgba(245,245,245,0.12)] bg-[#2c2c2e] text-[#f5f5f5]"
                                    >
                                      En deuxième année civile après la création, une exonération partielle
                                      d&apos;environ 50 % peut s&apos;appliquer selon ta situation — renseigne-toi
                                      auprès des impôts.
                                    </TooltipContent>
                                  </Tooltip>
                                ) : null}
                              </div>
                              <Input
                                id="ae-cfe-ca"
                                inputMode="decimal"
                                placeholder="ex. 12000"
                                value={aeDemarches.cfeCurrentYearCaEuros ?? ""}
                                onChange={(e) =>
                                  setAeDemarches((d) => ({ ...d, cfeCurrentYearCaEuros: e.target.value }))
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              onClick={() => setAeDemarches((d) => ({ ...d, cfeMarkedExempt: true }))}
                            >
                              Je suis exonéré de CFE
                            </Button>
                          </div>
                          {cfeCaNum !== null && cfeCaNum > 0 && cfeCaNum < 5000 ? (
                            <p className="text-sm text-amber-300/95">
                              En principe exonéré de la CFE car ton CA est inférieur à 5 000 € pour
                              l&apos;instant. La démarche reste tout de même créée : si ton CA dépasse le
                              seuil, l&apos;échéance sera à jour côté suivi.
                            </p>
                          ) : null}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-4 border-t border-[rgba(245,245,245,0.08)] pt-8">
                  <h3 className="text-sm font-semibold text-[#f5f5f5]">
                    3. Code APE, plafonds micro et fiscalité
                  </h3>
                  <p className="text-xs leading-relaxed text-[#F5F5F5]/55">
                    {formProfile.ape?.trim()
                      ? `Famille d’activité : ${microHeuristicLabel(apeMicroHeuristic)}. Plafond micro-entreprise indicatif : ${new Intl.NumberFormat("fr-FR").format(microPlafondHintEuros(apeMicroHeuristic))} € / an.`
                      : "Renseigne un code APE pour afficher une famille d’activité indicative et un plafond."}
                  </p>
                  <div className="grid gap-2 sm:max-w-md">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="ae-social-mode">Cotisations & impôt sur le revenu</Label>
                      {formProfile.ape?.trim() ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="rounded p-0.5 text-[#F5F5F5]/45 hover:text-[#F5F5F5]/75"
                              aria-label="Plafond micro-entreprise indicatif"
                            >
                              <Info className="h-4 w-4" aria-hidden />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="max-w-xs border-[rgba(245,245,245,0.12)] bg-[#2c2c2e] text-[#f5f5f5]"
                          >
                            Plafond micro-entreprise indicatif : {new Intl.NumberFormat("fr-FR").format(microPlafondHintEuros(apeMicroHeuristic))} € / an.
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                    <Select
                      value={aeDemarches.socialFiscalMode}
                      onValueChange={(v) =>
                        setAeDemarches((d) => ({
                          ...d,
                          socialFiscalMode: v === "liberatoire" ? "liberatoire" : "micro_social",
                        }))
                      }
                    >
                      <SelectTrigger id="ae-social-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="liberatoire">
                          Versement libératoire de l&apos;IR
                        </SelectItem>
                        <SelectItem value="micro_social">
                          Micro-social
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#F5F5F5]/45">
                    Le versement libératoire n&apos;est pas ouvert à toutes les activités : adapte selon
                    ton courrier URSSAF / tes choix réels. « Micro-social » couvre l&apos;affiliation
                    sans option libératoire.
                  </p>
                </div>
              </div>
            </EditSection>
          </TooltipProvider>
        ) : null}

        {formType === "association_1901" ? (
          <EditSection
            id="section-assoc-licences"
            title="Licences spectacles"
            description="Licences d'entrepreneur de spectacles délivrées par la DRAC. Renseigne le numéro de chaque catégorie détenue."
            variant="muted"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {(["1", "2", "3"] as const).map((cat) => (
                <div key={cat} className="grid gap-2">
                  <Label htmlFor={`assoc-license-${cat}`} className="text-[11px] uppercase tracking-wide text-[#F5F5F5]/50">
                    {cat === "1" ? "1re" : `${cat}e`} catégorie
                  </Label>
                  <Input
                    id={`assoc-license-${cat}`}
                    value={formProfile[`spectacleLicense${cat}`] ?? ""}
                    onChange={(e) =>
                      setFormProfile((prev) => ({ ...prev, [`spectacleLicense${cat}`]: e.target.value }))
                    }
                    placeholder="N° de licence…"
                  />
                </div>
              ))}
            </div>
          </EditSection>
        ) : null}

        {formType === "association_1901" ? (
          <EditSection
            id="section-assoc-demarches"
            title="Personnalisation des démarches"
            description="Démarches récurrentes proposées selon ton profil. Vérifie toujours tes obligations auprès de ta préfecture."
            variant="muted"
          >
            <div className="space-y-8">
              {/* AGO */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#f5f5f5]">
                  1. Assemblée Générale Ordinaire
                </h3>
                <p className="text-xs leading-relaxed text-[#F5F5F5]/55">
                  Démarche annuelle créée automatiquement. Par défaut au 30 juin — adapte selon tes statuts.
                </p>
                <div className="grid gap-2 sm:max-w-xs">
                  <Label htmlFor="assoc-ago-date">Date de l&apos;AGO (selon statuts)</Label>
                  <DatePicker
                    id="assoc-ago-date"
                    value={associationDemarches.agoDate ?? ""}
                    onChange={(iso) =>
                      setAssociationDemarches((d) => ({ ...d, agoDate: iso ?? undefined }))
                    }
                  />
                </div>
              </div>

              {/* Renouvellement bureau */}
              <div className="space-y-3 border-t border-[rgba(245,245,245,0.08)] pt-6">
                <h3 className="text-sm font-semibold text-[#f5f5f5]">
                  2. Renouvellement du bureau
                </h3>
                <p className="text-xs leading-relaxed text-[#F5F5F5]/55">
                  Si vos statuts prévoient un mandat annuel, une déclaration de changement de dirigeants est à déposer en préfecture.
                </p>
                <div className="flex items-center gap-3 rounded-md border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] px-3 py-3">
                  <Checkbox
                    id="assoc-bureau-renewal"
                    checked={associationDemarches.bureauRenewalEnabled}
                    onCheckedChange={(c) =>
                      setAssociationDemarches((d) => ({ ...d, bureauRenewalEnabled: c === true }))
                    }
                  />
                  <Label htmlFor="assoc-bureau-renewal" className="cursor-pointer text-sm font-medium leading-none">
                    Inclure cette démarche
                  </Label>
                </div>
              </div>

              {/* Compte rendu financier */}
              <div className="space-y-3 border-t border-[rgba(245,245,245,0.08)] pt-6">
                <h3 className="text-sm font-semibold text-[#f5f5f5]">
                  3. Compte rendu financier et bilan moral
                </h3>
                <p className="text-xs leading-relaxed text-[#F5F5F5]/55">
                  Obligatoire si l&apos;association reçoit des subventions ou emploie des salarié·e·s. Sinon, optionnel.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-md border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] px-3 py-3">
                    <Checkbox
                      id="assoc-subventions"
                      checked={associationDemarches.hasSubventions}
                      onCheckedChange={(c) =>
                        setAssociationDemarches((d) => ({ ...d, hasSubventions: c === true }))
                      }
                    />
                    <Label htmlFor="assoc-subventions" className="cursor-pointer text-sm font-medium leading-none">
                      L&apos;association reçoit des subventions
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 rounded-md border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] px-3 py-3">
                    <Checkbox
                      id="assoc-employes"
                      checked={associationDemarches.hasEmployes}
                      onCheckedChange={(c) =>
                        setAssociationDemarches((d) => ({ ...d, hasEmployes: c === true }))
                      }
                    />
                    <Label htmlFor="assoc-employes" className="cursor-pointer text-sm font-medium leading-none">
                      L&apos;association a des salarié·e·s
                    </Label>
                  </div>
                </div>
                {rapportActiviteRequired(associationDemarches) ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-emerald-300/90">
                      Démarche incluse automatiquement.
                    </p>
                    <div className="grid gap-2 sm:max-w-xs">
                      <Label htmlFor="assoc-fin-exercice">Fin d&apos;exercice comptable</Label>
                      <DatePicker
                        id="assoc-fin-exercice"
                        value={associationDemarches.finExerciceDate ?? ""}
                        onChange={(iso) =>
                          setAssociationDemarches((d) => ({ ...d, finExerciceDate: iso ?? undefined }))
                        }
                      />
                      <p className="text-[11px] text-[#F5F5F5]/40">
                        Échéance du compte rendu : 6 mois après. Sans date : 6 mois après le 31 déc.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-md border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] px-3 py-3">
                    <Checkbox
                      id="assoc-rapport"
                      checked={associationDemarches.rapportActiviteEnabled}
                      onCheckedChange={(c) =>
                        setAssociationDemarches((d) => ({ ...d, rapportActiviteEnabled: c === true }))
                      }
                    />
                    <Label htmlFor="assoc-rapport" className="cursor-pointer text-sm font-medium leading-none">
                      Inclure quand même cette démarche
                    </Label>
                  </div>
                )}
              </div>
            </div>
          </EditSection>
        ) : null}

        {formType === "intermittent" ? (
          <EditSection
            id="section-intermittent-demarches"
            title="Personnalisation des démarches"
            description="Rappels calés sur ta situation. Vérifie toujours tes informations sur ton espace France Travail."
            variant="muted"
          >
            <div className="space-y-8">
              {/* 1. Actualisation mensuelle */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#f5f5f5]">
                  1. Actualisation mensuelle France Travail
                </h3>
                <p className="text-xs leading-relaxed text-[#F5F5F5]/55">
                  Démarche mensuelle créée automatiquement — le réflexe à ne pas oublier pour être indemnisé.
                </p>
              </div>

              {/* 2. Vérification 507h — date anniversaire + jauge heures */}
              <div className="space-y-3 border-t border-[rgba(245,245,245,0.08)] pt-6">
                <h3 className="text-sm font-semibold text-[#f5f5f5]">
                  2. Vérification des 507 h avant date anniversaire
                </h3>
                <p className="text-xs leading-relaxed text-[#F5F5F5]/55">
                  Démarche annuelle calée sur ta date anniversaire — la date à laquelle France Travail réexamine tes droits (507 h sur 12 mois glissants). Requise pour créer la fiche.
                </p>
                <div className="grid gap-2 sm:max-w-xs">
                  <Label htmlFor="int-anniversary">Date anniversaire</Label>
                  <DatePicker
                    id="int-anniversary"
                    value={intermittentDemarches.anniversaryDate ?? ""}
                    onChange={(iso) =>
                      setIntermittentDemarches((d) => ({ ...d, anniversaryDate: iso ?? undefined }))
                    }
                  />
                  {!intermittentDemarches.anniversaryDate ? (
                    <p className="text-[11px] text-amber-300/90">
                      Renseigne cette date pour pouvoir créer la fiche.
                    </p>
                  ) : null}
                </div>
                <div className="rounded-md border border-[rgba(245,245,245,0.1)] bg-[rgba(245,245,245,0.03)] px-3 py-3">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-[#f5f5f5]">
                      {intermittentHours.toFixed(1)} h cumulées
                    </span>
                    <span className="text-xs text-[#F5F5F5]/55">
                      objectif {INTERMITTENT_HOURS_TARGET} h · 12 mois glissants
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-[rgba(245,245,245,0.08)]"
                    role="progressbar"
                    aria-valuenow={Math.round(intermittentHours)}
                    aria-valuemin={0}
                    aria-valuemax={INTERMITTENT_HOURS_TARGET}
                  >
                    <div
                      className="h-full rounded-full bg-[#F0FF00] transition-[width] duration-500"
                      style={{
                        width: `${Math.min(100, (intermittentHours / INTERMITTENT_HOURS_TARGET) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-[#F5F5F5]/45">
                      {intermittentHours >= INTERMITTENT_HOURS_TARGET
                        ? "Objectif atteint pour l'ouverture des droits."
                        : `Encore ${(INTERMITTENT_HOURS_TARGET - intermittentHours).toFixed(1)} h à cumuler.`}
                    </p>
                    <Link
                      href="/incomes/intermittence"
                      className="shrink-0 text-[11px] text-[#F0FF00]/85 underline underline-offset-2 hover:text-[#F0FF00]"
                    >
                      Ouvrir le suivi →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Congés Spectacles */}
              <div className="space-y-3 border-t border-[rgba(245,245,245,0.08)] pt-6">
                <h3 className="text-sm font-semibold text-[#f5f5f5]">
                  3. Congés Spectacles
                </h3>
                <p className="text-xs leading-relaxed text-[#F5F5F5]/55">
                  Si tu es affilié à la caisse des Congés Spectacles, ajoute un rappel annuel pour réclamer tes congés payés.
                </p>
                <div className="flex items-center gap-3 rounded-md border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] px-3 py-3">
                  <Checkbox
                    id="int-conges"
                    checked={intermittentDemarches.congesSpectaclesEnabled}
                    onCheckedChange={(c) =>
                      setIntermittentDemarches((d) => ({ ...d, congesSpectaclesEnabled: c === true }))
                    }
                  />
                  <Label htmlFor="int-conges" className="cursor-pointer text-sm font-medium leading-none">
                    Je suis affilié·e aux Congés Spectacles
                  </Label>
                </div>
              </div>

              {/* Visite médicale CMB */}
              <div className="space-y-3 border-t border-[rgba(245,245,245,0.08)] pt-6">
                <h3 className="text-sm font-semibold text-[#f5f5f5]">
                  4. Visite médicale — médecine du travail
                </h3>
                <p className="text-xs leading-relaxed text-[#F5F5F5]/55">
                  Obligatoire tous les 2 ans pour les intermittents (CMB Médecine du Travail ou équivalent selon ta région). Un rappel est créé automatiquement.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-md border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] px-3 py-3">
                    <Checkbox
                      id="int-medecine"
                      checked={intermittentDemarches.medecineTravailEnabled}
                      onCheckedChange={(c) =>
                        setIntermittentDemarches((d) => ({ ...d, medecineTravailEnabled: c === true }))
                      }
                    />
                    <Label htmlFor="int-medecine" className="cursor-pointer text-sm font-medium leading-none">
                      Suivre la visite médicale
                    </Label>
                  </div>
                  {intermittentDemarches.medecineTravailEnabled ? (
                    <div className="grid gap-2 sm:max-w-xs">
                      <Label htmlFor="int-last-medecine">Date de la dernière visite (optionnel)</Label>
                      <DatePicker
                        id="int-last-medecine"
                        value={intermittentDemarches.lastMedecineVisitDate ?? ""}
                        onChange={(iso) =>
                          setIntermittentDemarches((d) => ({
                            ...d,
                            lastMedecineVisitDate: iso ?? undefined,
                          }))
                        }
                      />
                      <p className="text-[11px] text-[#F5F5F5]/40">
                        Permet de calculer la prochaine échéance (J + 2 ans). Sans date : rappel dans 2 ans.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* AFDAS */}
              <div className="space-y-3 border-t border-[rgba(245,245,245,0.08)] pt-6">
                <h3 className="text-sm font-semibold text-[#f5f5f5]">
                  5. AFDAS — droits à la formation
                </h3>
                <p className="text-xs leading-relaxed text-[#F5F5F5]/55">
                  Si tu cotises à l&apos;AFDAS, un rappel annuel en septembre t&apos;invite à vérifier tes droits à la formation professionnelle.
                </p>
                <div className="flex items-center gap-3 rounded-md border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] px-3 py-3">
                  <Checkbox
                    id="int-afdas"
                    checked={intermittentDemarches.afdasEnabled}
                    onCheckedChange={(c) =>
                      setIntermittentDemarches((d) => ({ ...d, afdasEnabled: c === true }))
                    }
                  />
                  <Label htmlFor="int-afdas" className="cursor-pointer text-sm font-medium leading-none">
                    Je cotise à l&apos;AFDAS
                  </Label>
                </div>
              </div>
            </div>
          </EditSection>
        ) : null}

        <EditSection id="section-notes" title="Notes" description="Rappels libres, références, contacts utiles.">
          <Textarea
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="Remarques, liens, numéros de dossier…"
            rows={4}
            className="min-h-[100px] resize-y"
          />
        </EditSection>

        {isEdit && (
          <EditSection
            id="section-danger"
            title="Zone sensible"
            description="La suppression retire le dossier Documents verrouillé et tout son contenu."
            variant="danger"
          >
            <Button variant="destructive" size="sm" onClick={() => setPendingDelete(true)}>
              Supprimer ce statut
            </Button>
          </EditSection>
        )}
      </div>

      <Dialog open={pendingDelete} onOpenChange={setPendingDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer ce statut ?</DialogTitle>
            <DialogDescription className="text-left text-[#F5F5F5]/70">
              Toutes les données liées à « {formNom.trim() || "ce statut"} » seront supprimées : factures
              associées en local, démarches rattachées, dossier Admin verrouillé et son contenu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => void handleConfirmDelete()}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
