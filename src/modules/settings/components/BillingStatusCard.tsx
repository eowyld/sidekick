"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminStatus } from "@/hooks/useAdminData";
import {
  STATUS_FIELDS,
  formatStatusAddressLines,
  normalizeStoredAdminStatusType,
  typeLabel,
} from "@/modules/admin/data/statuts-form-config";
import { cn } from "@/lib/utils";
import { SettingsSection } from "./SettingsUI";

export function statusProfile(status: AdminStatus | undefined): Record<string, string> {
  return (status?.data?.profile ?? {}) as Record<string, string>;
}

type Line = { label: string; value: string | null; required: boolean };

/**
 * Ce que la facture imprimera pour ce statut, dans l'ordre de l'en-tête PDF.
 * Seuls les champs que le type de statut possède sont listés : un intermittent
 * n'a pas de SIRET à réclamer.
 */
function issuerLines(status: AdminStatus): Line[] {
  const profile = statusProfile(status);
  const keys = new Set(
    (STATUS_FIELDS[normalizeStoredAdminStatusType(status.type)] ?? []).map((f) => f.key)
  );
  const address = formatStatusAddressLines(profile).join(", ");
  const lines: Line[] = [{ label: "Adresse", value: address || null, required: true }];
  if (keys.has("siret")) lines.push({ label: "SIRET", value: profile.siret?.trim() || null, required: true });
  if (keys.has("vatNumber") && profile.vatNumber?.trim())
    lines.push({ label: "TVA", value: profile.vatNumber.trim(), required: false });
  if (keys.has("iban")) lines.push({ label: "IBAN", value: profile.iban?.trim() || null, required: false });
  if (keys.has("bic") && profile.bic?.trim()) lines.push({ label: "BIC", value: profile.bic.trim(), required: false });
  return lines;
}

export function BillingStatusCard({
  statuses,
  loading,
  hasNonBillingStatuses,
  adminHidden,
  previewId,
  onPreview,
}: {
  /** Statuts qui facturent uniquement (cf. `billingStatuses`). */
  statuses: AdminStatus[];
  hasNonBillingStatuses: boolean;
  loading: boolean;
  adminHidden: boolean;
  previewId: string | null;
  onPreview: (id: string) => void;
}) {
  const description = (
    <>
      Le statut qui émet la facture : son nom, son adresse, son SIRET et son IBAN figurent en
      en-tête. Seuls un statut auto-entrepreneur ou une association peuvent facturer. Ces
      informations se modifient dans{" "}
      <Link href="/admin/statuts" className="text-[#F0FF00] underline-offset-2 hover:underline">
        Admin &gt; Statuts
      </Link>
      .
    </>
  );

  if (loading) {
    return (
      <SettingsSection title="Statut utilisé" description={description}>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </SettingsSection>
    );
  }

  if (statuses.length === 0) {
    return (
      <SettingsSection title="Statut utilisé" description={description}>
        <div className="flex flex-col gap-3 rounded-md border border-amber-500/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#F5F5F5]/80">
            {hasNonBillingStatuses
              ? "Aucun de tes statuts ne facture : il faut un statut auto-entrepreneur ou une association."
              : "Aucun statut enregistré : tes factures partiraient sous « Mon activité », sans adresse ni SIRET."}
          </p>
          {!adminHidden && (
            <Button size="sm" className="shrink-0 gap-1.5" asChild>
              <Link href="/admin/statuts/new">
                <Plus className="h-4 w-4" />
                Créer un statut
              </Link>
            </Button>
          )}
        </div>
        {adminHidden && <AdminHiddenNote />}
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title={statuses.length > 1 ? "Statuts utilisés" : "Statut utilisé"} description={description}>
      {statuses.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Tu choisis le statut à chaque facture. Le premier est proposé par défaut. Clique sur un
          statut pour l&apos;afficher dans l&apos;aperçu.
        </p>
      )}
      {statuses.map((status, index) => {
        const lines = issuerLines(status);
        const missing = lines.filter((l) => l.required && !l.value).map((l) => l.label);
        const selected = status.id === previewId;
        return (
          <div
            key={status.id}
            role={statuses.length > 1 ? "button" : undefined}
            tabIndex={statuses.length > 1 ? 0 : undefined}
            onClick={() => onPreview(status.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPreview(status.id);
              }
            }}
            className={cn(
              "rounded-md border px-4 py-3 transition-colors",
              statuses.length > 1 && "cursor-pointer hover:bg-[rgba(245,245,245,0.04)]",
              selected && statuses.length > 1
                ? "border-[#F0FF00]/60"
                : "border-[rgba(245,245,245,0.12)]"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#F5F5F5]">{status.nom || "Sans nom"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{typeLabel(normalizeStoredAdminStatusType(status.type))}</Badge>
                  {statuses.length > 1 && index === 0 && <Badge variant="secondary">Par défaut</Badge>}
                  {status.actif === false && <Badge variant="secondary">Inactif</Badge>}
                </div>
              </div>
              {!adminHidden && (
                <Button variant="ghost" size="sm" className="shrink-0 gap-1" asChild>
                  <Link href={`/admin/statuts/${status.id}`} onClick={(e) => e.stopPropagation()}>
                    {missing.length > 0 ? "Compléter" : "Modifier"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
            <dl className="mt-3 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
              {lines.map((line) => (
                <div key={line.label} className="contents">
                  <dt className="text-muted-foreground">{line.label}</dt>
                  <dd
                    className={cn(
                      "min-w-0 truncate",
                      line.value
                        ? "text-[#F5F5F5]/85"
                        : line.required
                          ? "text-amber-300"
                          : "text-muted-foreground"
                    )}
                  >
                    {line.value ?? (line.required ? "Manquant" : "Non renseigné")}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
      {hasNonBillingStatuses && (
        <p className="text-xs text-muted-foreground">
          Tes autres statuts n&apos;apparaissent pas ici : ils ne facturent pas (un intermittent
          est payé en cachets, sur fiche de paie).
        </p>
      )}
      {adminHidden && <AdminHiddenNote />}
    </SettingsSection>
  );
}

function AdminHiddenNote() {
  return (
    <p className="text-xs text-muted-foreground">
      Le module Admin est masqué. Réactive-le dans{" "}
      <Link href="/settings/modules" className="text-[#F0FF00] underline-offset-2 hover:underline">
        Modules
      </Link>{" "}
      pour gérer tes statuts.
    </p>
  );
}
