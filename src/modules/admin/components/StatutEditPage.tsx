"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
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
import {
  getTemplatesForStatusType,
  isTemplateAvailable,
  recurrenceLabel,
  templateLabel,
  templateRecurrence,
  type AeCadence,
} from "@/modules/admin/data/procedure-templates";
import {
  buildProceduresForSelection,
  defaultSelectionForType,
  readDemarchesSelection,
  serializeDemarchesSelection,
  stripLegacyDemarchesBlobs,
  syncProceduresForSelection,
  type StatusDemarchesSelection,
} from "@/modules/admin/lib/procedure-builder";
import { ApeCodeSelect } from "@/modules/admin/components/ApeCodeSelect";
import { AeVatRegimeSelect } from "@/modules/admin/components/AeVatRegimeSelect";
import { ensureLockedFolderForStatus, removeStatusLockedFolder } from "@/modules/admin/lib/status-folder";
import { isSiretInputValid, siretDigitsOnly } from "@/modules/admin/lib/siret";

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
  const { invoices, setInvoices } = useIncomesData();
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
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [aeCadence, setAeCadence] = useState<AeCadence>("quarterly");
  const [anniversaryDate, setAnniversaryDate] = useState<string>("");
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
      const demarches = readDemarchesSelection({ type: typed, data: existing.data });
      setSelectedKeys(new Set(demarches.selectedKeys));
      setAeCadence(demarches.aeCadence);
      setAnniversaryDate(demarches.anniversaryDate ?? "");
    } else if (!isEdit) {
      setFormType(validInitialType);
      const demarches = defaultSelectionForType(validInitialType);
      setSelectedKeys(new Set(demarches.selectedKeys));
      setAeCadence(demarches.aeCadence);
      setAnniversaryDate("");
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
      const baseData = isEdit && existing?.data ? stripLegacyDemarchesBlobs({ ...existing.data }) : {};
      const profileForSave =
        formType === "auto_entrepreneur" &&
        isAeFranchiseBaseVatRegime(formProfile.tvaRegime)
          ? { ...formProfile, vatNumber: "" }
          : formProfile;
      const demarchesSelection: StatusDemarchesSelection = {
        selectedKeys: [...selectedKeys],
        aeCadence,
        anniversaryDate: anniversaryDate || undefined,
      };
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
          demarches: serializeDemarchesSelection(demarchesSelection),
        },
      };
      try {
        payload = await ensureLockedFolderForStatus(payload);
      } catch (folderErr) {
        console.error("[statut] Impossible de créer le dossier verrouillé :", folderErr);
      }

      if (isEdit) {
        setStatuses((prev) => prev.map((s) => (s.id === id ? payload : s)));
        posthog?.capture("status_updated", { module: "admin" });
        setProcedures((prev) =>
          syncProceduresForSelection(prev, { statusId: id, statusType: formType, selection: demarchesSelection })
        );
        router.push("/admin");
      } else {
        setStatuses((prev) => [...prev, payload]);
        posthog?.capture("status_created", { module: "admin" });
        posthog?.capture("item_created", { module: "admin" });

        const built = buildProceduresForSelection({
          statusId: id,
          statusType: formType,
          selection: demarchesSelection,
        });
        if (built.length > 0) {
          setProcedures((prev) => [...prev, ...built]);
          toast.success(
            `${built.length} démarche${built.length > 1 ? "s" : ""} créée${built.length > 1 ? "s" : ""} pour ce statut`
          );
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
                onValueChange={(v) => {
                  const nextType = v as AdminStatusType;
                  setFormType(nextType);
                  const demarches = defaultSelectionForType(nextType);
                  setSelectedKeys(new Set(demarches.selectedKeys));
                  setAeCadence(demarches.aeCadence);
                  setAnniversaryDate("");
                }}
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
                  Le type est figé une fois le statut créé : tes démarches et ton dossier en dépendent.
                </p>
              )}
              {intermittentDuplicate && (
                <p className="text-xs text-amber-400/90">
                  Tu as déjà un statut intermittent, un seul à la fois est autorisé. Modifie-le ou supprime-le avant d&apos;en créer un nouveau.
                </p>
              )}
            </div>
          </div>
        </EditSection>

        <EditSection
          id="section-details"
          title="Informations principales"
          description={`Les infos propres à ton statut « ${typeLabel(formType)} ».${
            hasSiretFieldInForm
              ? " Avec un SIRET valide, tu peux tout remplir automatiquement depuis l’annuaire des entreprises."
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
                On récupère seulement ce que l’annuaire publie. Si une info est masquée, elle ne sera pas remplie, et il ne fournit ni ta TVA, ni ton URSSAF, ni ton IBAN.
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
              ? "Ton adresse personnelle, pour les courriers de France Travail, Audiens, etc."
              : "L’adresse de ce statut, pour tes factures, courriers et ton siège."
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
            description="Précise si tu es en ce moment indemnisé."
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
                  La fin de ta période d&apos;indemnisation en cours. C&apos;est différent de la date anniversaire juste en dessous.
                </p>
              </div>
            </div>
          </EditSection>
        ) : (
          <EditSection
            id="section-periode"
            title="Période & état"
            description="Les dates de ce statut, et s’il est actif ou non."
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

        {formType === "association_1901" ? (
          <EditSection
            id="section-assoc-licences"
            title="Licences spectacles"
            description="Tes licences d’entrepreneur de spectacles, délivrées par la DRAC. Indique le numéro de chaque catégorie que tu as."
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


        <EditSection
          id="section-demarches"
          title="Démarches à suivre"
          description="Sidekick t’envoie des rappels, mais ne te dit pas quoi déclarer. Vérifie toujours tes obligations auprès de ton organisme."
          variant="muted"
        >
          <div className="space-y-5">
            {formType === "auto_entrepreneur" ? (
              <div className="grid gap-2 sm:max-w-xs">
                <Label htmlFor="ae-cadence-ca">Cadence de déclaration</Label>
                <Select
                  value={aeCadence}
                  onValueChange={(v) => setAeCadence(v === "monthly" ? "monthly" : "quarterly")}
                >
                  <SelectTrigger id="ae-cadence-ca">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarterly">Trimestriel (par défaut)</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#F5F5F5]/55">
                  Tu peux vérifier ta cadence exacte sur ton espace{" "}
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
            ) : null}

            {formType === "intermittent" ? (
              <div className="grid gap-2 sm:max-w-xs">
                <Label htmlFor="int-anniversary">Date anniversaire (facultatif)</Label>
                <DatePicker
                  id="int-anniversary"
                  value={anniversaryDate}
                  onChange={(iso) => setAnniversaryDate(iso ?? "")}
                />
                <p className="text-[11px] text-[#F5F5F5]/40">
                  C&apos;est la date à laquelle France Travail réexamine tes droits. Sans elle, on ne
                  peut pas te proposer le rappel des 507 h. Le cumul de tes heures se suit dans{" "}
                  <Link
                    href="/incomes/intermittence"
                    className="text-[#F0FF00]/85 underline underline-offset-2 hover:text-[#F0FF00]"
                  >
                    Revenus &gt; Intermittence
                  </Link>
                  .
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              {getTemplatesForStatusType(formType).map((template) => {
                const available = isTemplateAvailable(template, { anniversaryDate });
                const checked = available && selectedKeys.has(template.key);
                return (
                  <div
                    key={template.key}
                    className={cn(
                      "flex items-start gap-3 rounded-md border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] px-3 py-3",
                      !available && "opacity-50"
                    )}
                  >
                    <Checkbox
                      id={`demarche-${template.key}`}
                      checked={checked}
                      disabled={!available}
                      onCheckedChange={(c) =>
                        setSelectedKeys((prev) => {
                          const next = new Set(prev);
                          if (c === true) next.add(template.key);
                          else next.delete(template.key);
                          return next;
                        })
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <Label
                        htmlFor={`demarche-${template.key}`}
                        className="cursor-pointer text-sm font-medium leading-none"
                      >
                        {templateLabel(template, aeCadence)}
                      </Label>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#F5F5F5]/45">
                        {recurrenceLabel(templateRecurrence(template, aeCadence))}
                        {template.organisme ? ` · ${template.organisme}` : ""}
                        {template.hint ? `. ${template.hint}` : ""}
                      </p>
                      {!available ? (
                        <p className="mt-1 text-[11px] text-amber-300/80">
                          Ajoute ta date anniversaire ci-dessus pour activer ce rappel.
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </EditSection>

        <EditSection id="section-notes" title="Notes" description="Note ici tout ce qui peut te servir : rappels, contacts, références.">
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
            description="Supprimer ce statut efface aussi son dossier Documents et tout ce qu’il contient."
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
