"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePreferencesData } from "@/hooks/usePreferencesData";
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import { logoFor } from "@/lib/artist-logo";
import { useAdminData } from "@/hooks/useAdminData";
import { billingStatuses, formatStatusAddressLines } from "@/modules/admin/data/statuts-form-config";
import { DEFAULT_TERMS_AND_CONDITIONS, type InvoiceTemplate } from "@/lib/sidekick-store";
import { INVOICE_FONTS } from "@/modules/incomes/components/pdf/fonts";
import type { InvoiceDocumentData } from "@/modules/incomes/components/pdf/InvoiceDocument";
import { cn } from "@/lib/utils";
import { BillingStatusCard, statusProfile } from "./BillingStatusCard";
import { LogoStatus } from "./LogoStatus";

const InvoicePreview = dynamic(
  () => import("@/modules/incomes/components/pdf/InvoicePreview"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-md border border-[rgba(245,245,245,0.12)] text-sm text-[#F5F5F5]/50">
        Chargement de l&apos;aperçu…
      </div>
    ),
  }
);

const COLOR_PRESETS = ["#101010", "#1d4ed8", "#0f766e", "#b91c1c", "#7c3aed", "#c2410c"];
const SAMPLE_ISSUER: InvoiceDocumentData["issuer"] = {
  name: "Mon Projet Musical",
  addressLines: ["12 rue de la Musique", "75011 Paris", "France"],
  siret: "987 654 321 00010",
  iban: "FR76 1234 5678 9012 3456 7890 123",
  bic: "BNPAFRPPXXX",
};

const SAMPLE_DATA = (
  template: InvoiceTemplate,
  issuer: InvoiceDocumentData["issuer"]
): InvoiceDocumentData => ({
  number: "FAC-2026-001",
  client: "Spectacles & Co.",
  clientAddress: "14 rue des Arts, 75003 Paris",
  clientSiret: "123 456 789 00012",
  clientVatNumber: "FR 12 123456789",
  clientEmail: "contact@spectacles-co.fr",
  clientPhone: "+33 1 23 45 67 89",
  subject: "Concert du 14 juin 2026 — cachet + frais",
  issueDate: "29/05/2026",
  dueDate: "05/06/2026",
  status: "en_attente",
  incomeType: "Live",
  lines: [
    { id: 1, description: "Cachet artistique (concert)", type: "service", quantity: "1", unitPrice: "1200", vatPercent: "0" },
    { id: 2, description: "Frais de déplacement", type: "service", quantity: "1", unitPrice: "180", vatPercent: "0" },
    { id: 3, description: "Vente de merch (CD)", type: "vente de marchandise", quantity: "20", unitPrice: "12", vatPercent: "0" },
  ],
  notes: "Merci pour votre confiance.\nPaiement à réception, par virement bancaire.",
  issuer,
  template,
});

/**
 * Couleur d'accent et police : communes aux factures et aux fiches
 * techniques, affichées dans les deux onglets de Personnalisation.
 */
export function AppearanceCards() {
  const { invoiceTemplate: template, setInvoiceTemplate: update } = usePreferencesData();
  return (
    <>
      <div className="pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/50">
          Apparence
        </p>
        <p className="mt-1 text-xs text-[#F5F5F5]/45">
          Couleur et police sont communes à tes factures et à tes fiches techniques.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Couleur d&apos;accent</CardTitle>
          <CardDescription>Titres, totaux, en-têtes de tableau et filets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Couleur ${color}`}
                onClick={() => update({ accentColor: color })}
                className={cn(
                  "size-8 rounded-full border-2 transition-transform hover:scale-110",
                  template.accentColor.toLowerCase() === color.toLowerCase()
                    ? "border-[#F0FF00]"
                    : "border-transparent"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={template.accentColor}
              onChange={(e) => update({ accentColor: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-[rgba(245,245,245,0.12)] bg-transparent"
              aria-label="Couleur personnalisée"
            />
            <Input
              value={template.accentColor}
              onChange={(e) => update({ accentColor: e.target.value })}
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Police</CardTitle>
          <CardDescription>Police utilisée dans tout le document.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={template.fontFamily} onValueChange={(v) => update({ fontFamily: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVOICE_FONTS.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </>
  );
}

/** Onglet Factures de Personnalisation : statut émetteur, apparence, conditions. */
export function InvoiceTemplatePanel() {
  const { invoiceTemplate: template, setInvoiceTemplate: update, enabledModules } = usePreferencesData();
  const { logo, logoExports } = useArtistIdentity();
  const { statuses: allStatuses, loading: statusesLoading } = useAdminData();
  const statuses = useMemo(() => billingStatuses(allStatuses), [allStatuses]);
  const [previewStatusId, setPreviewStatusId] = useState<string | null>(null);

  // L'aperçu montre le vrai en-tête : même construction que l'éditeur de
  // facture (InvoiceEditorPage), premier statut par défaut.
  const previewStatus = statuses.find((st) => st.id === previewStatusId) ?? statuses[0];
  const issuer = useMemo<InvoiceDocumentData["issuer"]>(() => {
    if (!previewStatus) return SAMPLE_ISSUER;
    const profile = statusProfile(previewStatus);
    return {
      name: previewStatus.nom || "Mon activité",
      addressLines: formatStatusAddressLines(profile),
      siret: profile.siret || undefined,
      vatNumber: profile.vatNumber || undefined,
      iban: profile.iban || undefined,
      bic: profile.bic || undefined,
    };
  }, [previewStatus]);

  const previewLogo = logoFor(logo, logoExports, "invoices");
  const previewData = useMemo(
    () => ({ ...SAMPLE_DATA(template, issuer), logo: previewLogo }),
    [template, issuer, previewLogo]
  );

  return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_1fr]">
        {/* Réglages */}
        <div className="space-y-4">
          <BillingStatusCard
            statuses={statuses}
            hasNonBillingStatuses={allStatuses.length > statuses.length}
            loading={statusesLoading}
            adminHidden={enabledModules.admin === false}
            previewId={previewStatus?.id ?? null}
            onPreview={setPreviewStatusId}
          />

          <AppearanceCards />
          <LogoStatus target="invoices" />

          <Card>
            <CardHeader>
              <CardTitle>Termes et conditions</CardTitle>
              <CardDescription>Affiché en bas de chaque facture.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                rows={6}
                value={template.termsAndConditions ?? DEFAULT_TERMS_AND_CONDITIONS}
                onChange={(e) => update({ termsAndConditions: e.target.value })}
                className="resize-y font-mono text-xs"
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-[#F5F5F5]/50 hover:text-[#F5F5F5]"
                onClick={() => update({ termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS })}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Rétablir le texte par défaut
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Aperçu live */}
        {/* Page A4 entière : la hauteur suit la largeur de la colonne (210 × 297,
            un peu de marge pour le cadre du lecteur PDF). Pas de téléchargement
            ici, on règle un modèle, on n'émet pas de facture. */}
        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <div className="aspect-[210/298] w-full">
            <InvoicePreview data={previewData} hideDownload fillHeight />
          </div>
        </div>
      </div>
  );
}
