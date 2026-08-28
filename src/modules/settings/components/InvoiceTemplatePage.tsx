"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { RotateCcw, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSidekickData } from "@/hooks/useSidekickData";
import { DEFAULT_INVOICE_TEMPLATE, DEFAULT_TERMS_AND_CONDITIONS, type InvoiceTemplate } from "@/lib/sidekick-store";
import { INVOICE_FONTS } from "@/modules/incomes/components/pdf/fonts";
import type { InvoiceDocumentData } from "@/modules/incomes/components/pdf/InvoiceDocument";
import { cn } from "@/lib/utils";

const InvoicePreview = dynamic(
  () => import("@/modules/incomes/components/pdf/InvoicePreview"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[720px] items-center justify-center rounded-md border border-[rgba(245,245,245,0.12)] text-sm text-[#F5F5F5]/50">
        Chargement de l&apos;aperçu…
      </div>
    ),
  }
);

const COLOR_PRESETS = ["#101010", "#1d4ed8", "#0f766e", "#b91c1c", "#7c3aed", "#c2410c"];
const MAX_LOGO_DIM = 320;

/** Redimensionne et compresse une image en data URL PNG pour rester léger en localStorage. */
async function fileToLogoDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
  const scale = Math.min(1, MAX_LOGO_DIM / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

const SAMPLE_DATA = (template: InvoiceTemplate): InvoiceDocumentData => ({
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
  issuer: {
    name: "Mon Projet Musical",
    addressLines: ["12 rue de la Musique", "75011 Paris", "France"],
    siret: "987 654 321 00010",
    iban: "FR76 1234 5678 9012 3456 7890 123",
    bic: "BNPAFRPPXXX",
  },
  template,
});

export function InvoiceTemplatePage() {
  const { data, setData } = useSidekickData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState("");

  const template = data.preferences.invoiceTemplate ?? DEFAULT_INVOICE_TEMPLATE;

  const update = (patch: Partial<InvoiceTemplate>) => {
    setData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        invoiceTemplate: {
          ...DEFAULT_INVOICE_TEMPLATE,
          ...prev.preferences.invoiceTemplate,
          ...patch,
        },
      },
    }));
  };

  const handleLogoFile = async (file: File | undefined) => {
    setLogoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Choisis un fichier image (PNG, JPG, SVG…).");
      return;
    }
    try {
      const logoDataUrl = await fileToLogoDataUrl(file);
      update({ logoDataUrl });
    } catch {
      setLogoError("Impossible de traiter cette image.");
    }
  };

  const previewData = useMemo(() => SAMPLE_DATA(template), [template]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Modèle de facture</h1>
        <p className="text-sm text-muted-foreground">
          Personnalise l&apos;apparence de tes PDF de facture. Ces réglages s&apos;appliquent à toutes
          tes factures.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* Réglages */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Couleur d&apos;accent</CardTitle>
              <CardDescription>Titres, total TTC et en-tête du tableau.</CardDescription>
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

          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>Affiché en haut à gauche. Remplace le nom en titre.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {template.logoDataUrl ? (
                <div className="flex flex-col items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={template.logoDataUrl}
                    alt="Logo"
                    style={{ display: "block", height: "80px", width: "auto", maxWidth: "240px", marginLeft: 0 }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-red-950/40"
                    onClick={() => update({ logoDataUrl: undefined })}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Retirer
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-1.5 h-4 w-4" />
                  Importer un logo
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleLogoFile(e.target.files?.[0])}
              />
              {logoError && <p className="text-sm text-red-400">{logoError}</p>}
            </CardContent>
          </Card>

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
        <div className="min-w-0">
          <InvoicePreview data={previewData} />
        </div>
      </div>
    </div>
  );
}
