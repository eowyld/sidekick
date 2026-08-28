"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { Calculator, Info, Landmark, Percent, Scale, TrendingUp } from "lucide-react";

import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAdminData } from "@/hooks/useAdminData";
import { useIncomesData } from "@/hooks/useIncomesData";
import { isoToFr } from "@/lib/date-format";
import { typeLabel } from "@/modules/admin/data/statuts-form-config";
import {
  computeAeComptaSnapshot,
  formatComptaEuros,
} from "@/modules/admin/lib/ae-compta";
import { filterInvoicesForBillingStatus } from "@/modules/incomes/components/invoice-utils";

export function ComptabilitePage() {
  const posthog = usePostHog();
  const { statuses, loading: adminLoading, error: adminError } = useAdminData();
  const { invoices, loading: invLoading, error: invError } = useIncomesData();
  const [invoiceStatusScopeMap] = useLocalStorage<Record<string, string>>(
    "incomes:invoice-status-scope-map",
    {}
  );
  const [selectedStatusId, setSelectedStatusId] = useLocalStorage<string | null>(
    "incomes:selected-billing-status",
    null
  );

  const loading = adminLoading || invLoading;
  const error = adminError ?? invError;

  const hasMultipleStatuses = statuses.length > 1;
  const singleStatus = statuses.length === 1 ? statuses[0] : null;
  const effectiveStatusId = useMemo(() => {
    if (statuses.length === 0) return null;
    if (!hasMultipleStatuses) return singleStatus?.id ?? statuses[0]?.id ?? null;
    if (selectedStatusId && statuses.some((s) => s.id === selectedStatusId)) {
      return selectedStatusId;
    }
    return statuses[0]?.id ?? null;
  }, [hasMultipleStatuses, selectedStatusId, singleStatus?.id, statuses]);

  useEffect(() => {
    if (hasMultipleStatuses && effectiveStatusId && selectedStatusId !== effectiveStatusId) {
      setSelectedStatusId(effectiveStatusId);
    }
  }, [effectiveStatusId, hasMultipleStatuses, selectedStatusId, setSelectedStatusId]);

  useEffect(() => {
    posthog?.capture("comptabilite_page_view", { module: "admin" });
  }, [posthog]);

  const selectedStatus = useMemo(
    () => statuses.find((s) => s.id === effectiveStatusId),
    [effectiveStatusId, statuses]
  );

  const scopedInvoices = useMemo(
    () =>
      filterInvoicesForBillingStatus(
        invoices,
        effectiveStatusId,
        invoiceStatusScopeMap,
        statuses
      ),
    [effectiveStatusId, invoiceStatusScopeMap, invoices, statuses]
  );

  const snapshot = useMemo(() => {
    if (!selectedStatus) return null;
    return computeAeComptaSnapshot(selectedStatus, scopedInvoices);
  }, [scopedInvoices, selectedStatus]);

  if (loading) return <PageLoader />;
  if (error) {
    return (
      <PageError
        title="Impossible de charger la comptabilité"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
      />
    );
  }

  if (statuses.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-8 text-center">
        <Calculator className="mx-auto h-10 w-10 text-[#F5F5F5]/35" aria-hidden />
        <h1 className="text-xl font-semibold text-[#f5f5f5]">Ma comptabilité</h1>
        <p className="text-sm text-[#F5F5F5]/65">
          Crée d&apos;abord un statut juridique dans l&apos;admin pour afficher une fiche compta.
        </p>
        <Button asChild variant="default" size="sm">
          <Link href="/admin/statuts/new">Ajouter un statut</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f5f5f5]">Ma comptabilité</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#F5F5F5]/65">
            Vue indicatif par statut — alignée sur la facturation (même rattachement des factures).
          </p>
        </div>
        {hasMultipleStatuses ? (
          <div className="flex w-full max-w-xs flex-col gap-1.5">
            <Label htmlFor="compta-status" className="text-[11px] uppercase tracking-wide text-[#F5F5F5]/50">
              Statut travaillé
            </Label>
            <Select
              value={effectiveStatusId ?? undefined}
              onValueChange={(v) => setSelectedStatusId(v)}
            >
              <SelectTrigger id="compta-status" className="border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.5)]">
                <SelectValue placeholder="Choisir un statut" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nom} {!s.actif ? "(inactif)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </header>

      {selectedStatus && selectedStatus.type !== "auto_entrepreneur" ? (
        <Card className="border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg text-[#f5f5f5]">
              {selectedStatus.nom}
            </CardTitle>
            <CardDescription className="text-[#F5F5F5]/65">
              Fiche compta disponible pour l&apos;instant uniquement pour le type{" "}
              <strong className="text-[#f5f5f5]">Auto-entrepreneur</strong> (statut sélectionné :{" "}
              {typeLabel(selectedStatus.type)}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/statuts/${selectedStatus.id}`}>Modifier le statut</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {selectedStatus && snapshot ? (
        <>
          <p className="text-xs text-[#F5F5F5]/45">{snapshot.referenceLabel}</p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card className="border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl md:col-span-2">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-[#F0FF00]/90" aria-hidden />
                <div>
                  <CardTitle className="text-base text-[#f5f5f5]">Chiffre d&apos;affaires encaissé</CardTitle>
                  <CardDescription className="text-[#F5F5F5]/55">
                    Factures payées, date d&apos;encaissement (ou échéance si ancienne facture).
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[#F5F5F5]/50">Année en cours (TTC)</p>
                  <p className="text-2xl font-semibold tabular-nums text-[#f5f5f5]">
                    {formatComptaEuros(snapshot.caTtcYear)}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(16,16,16,0.35)] p-3">
                    <p className="text-[11px] text-[#F5F5F5]/50">{snapshot.quarterCurrentLabel}</p>
                    <p className="text-lg font-medium tabular-nums text-[#f5f5f5]">
                      {formatComptaEuros(snapshot.caTtcQuarterCurrent)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(16,16,16,0.35)] p-3">
                    <p className="text-[11px] text-[#F5F5F5]/50">Trimestre précédent</p>
                    <p className="text-xs text-[#F5F5F5]/45">{snapshot.quarterPrevLabel}</p>
                    <p className="text-lg font-medium tabular-nums text-[#f5f5f5]">
                      {formatComptaEuros(snapshot.caTtcQuarterPrev)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                <Percent className="mt-0.5 h-5 w-5 shrink-0 text-[#F0FF00]/90" aria-hidden />
                <div>
                  <CardTitle className="text-base text-[#f5f5f5]">Cotisations (indicatif)</CardTitle>
                  <CardDescription className="text-[#F5F5F5]/55">
                    {snapshot.versementLiberatoire
                      ? `Versement libératoire — taux indicatif ${snapshot.cotisationPct} % selon famille d&apos;activité (APE).`
                      : "Micro-social sans versement libératoire : pas d’estimation automatique ici."}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {snapshot.cotisationProvisionYtdEuros != null ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[#F5F5F5]/50">
                      Provision sur CA encaissé année en cours
                    </p>
                    <p className="text-xl font-semibold tabular-nums text-[#f5f5f5]">
                      {formatComptaEuros(snapshot.cotisationProvisionYtdEuros)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-[#F5F5F5]/60">
                    Renseigne le mode fiscal dans le statut (versement libératoire ou micro-social) pour
                    afficher une fourchette.
                  </p>
                )}
                {snapshot.cotisationProvisionPeriodEuros != null ? (
                  <div className="rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(16,16,16,0.35)] p-3">
                    <p className="text-[11px] text-[#F5F5F5]/50">
                      Estimation sur la période URSSAF en cours ({snapshot.urssafCadence === "monthly" ? "mois" : "trimestre"})
                    </p>
                    <p className="text-lg font-medium tabular-nums text-[#f5f5f5]">
                      {formatComptaEuros(snapshot.cotisationProvisionPeriodEuros)}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-[#F0FF00]/90" aria-hidden />
                <div>
                  <CardTitle className="text-base text-[#f5f5f5]">Prochaine échéance URSSAF</CardTitle>
                  <CardDescription className="text-[#F5F5F5]/55">
                    Cadence : {snapshot.urssafCadence === "monthly" ? "mensuelle" : "trimestrielle"} (comme sur le
                    statut).
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-lg font-medium text-[#f5f5f5]">
                  {isoToFr(snapshot.urssafNextDueIso)}
                </p>
                <p className="text-xs text-[#F5F5F5]/50">{snapshot.urssafNextDueLabel}</p>
                {snapshot.cotisationProvisionPeriodEuros != null && snapshot.versementLiberatoire ? (
                  <p className="text-sm text-[#F5F5F5]/70">
                    Montant estimé (versement libératoire, période en cours) :{" "}
                    <span className="font-medium text-[#f5f5f5] tabular-nums">
                      {formatComptaEuros(snapshot.cotisationProvisionPeriodEuros)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-[#F5F5F5]/55">
                    Hors versement libératoire, l&apos;acompte dépend des taux micro-sociaux — voir ton espace URSSAF.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                <Scale className="mt-0.5 h-5 w-5 shrink-0 text-[#F0FF00]/90" aria-hidden />
                <div>
                  <CardTitle className="text-base text-[#f5f5f5]">TVA</CardTitle>
                  <CardDescription className="text-[#F5F5F5]/55">
                    Franchise en base : seuils indicatifs (services) ; CA HT sur 12 mois glissants
                    (encaissements). Sinon résumé selon le régime renseigné sur le statut.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-[#F5F5F5]/80">{snapshot.tvaFranchiseSummary}</p>
              </CardContent>
            </Card>

            <Card className="border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#F0FF00]/90" aria-hidden />
                <div>
                  <CardTitle className="text-base text-[#f5f5f5]">CFE</CardTitle>
                  <CardDescription className="text-[#F5F5F5]/55">
                    Cohérent avec les options « démarches » du statut.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-[#F5F5F5]/80">{snapshot.cfeSummary}</p>
              </CardContent>
            </Card>

            <Card className="border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl md:col-span-2 xl:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[#f5f5f5]">Plafond micro-entreprise (CA HT année civile)</CardTitle>
                <CardDescription>
                  {snapshot.microHeuristicLabel} — plafond indicatif {formatComptaEuros(snapshot.plafondMicroEuros)} / an (
                  {selectedStatus.nom}).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs text-[#F5F5F5]/55">
                  <span>CA HT {new Date().getFullYear()}</span>
                  <span className="tabular-nums">
                    {formatComptaEuros(snapshot.caHtYear)} / {formatComptaEuros(snapshot.plafondMicroEuros)}
                  </span>
                </div>
                <Progress value={snapshot.progressPct} className="h-2 bg-[rgba(16,16,16,0.5)]" />
                <p className="text-xs text-[#F5F5F5]/45">{Math.round(snapshot.progressPct)} % du plafond indicatif</p>
              </CardContent>
            </Card>
          </div>

          <p className="max-w-3xl text-xs leading-relaxed text-[#F5F5F5]/45">{snapshot.disclaimer}</p>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/statuts/${selectedStatus.id}`}>Modifier le statut (APE, TVA, URSSAF…)</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-[#F5F5F5]/70">
              <Link href="/incomes/facturation">Voir la facturation</Link>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
