"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePreferencesData } from "@/hooks/usePreferencesData";
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import type { TechnicalLayout } from "@/lib/sidekick-store";
import { cn } from "@/lib/utils";
import { TECHNICAL_LAYOUTS, type TechnicalDocumentInput } from "@/modules/live/components/pdf/TechnicalDocument";
import { emptyTechnical } from "@/modules/live/lib/live-model";
import { logoFor, logoForDarkSpot } from "@/lib/artist-logo";
import { AppearanceCards } from "./InvoiceTemplatePage";
import { LogoStatus } from "./LogoStatus";

const TechnicalPreview = dynamic(() => import("@/modules/live/components/pdf/TechnicalPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-md border border-[rgba(245,245,245,0.12)] text-sm text-[#F5F5F5]/50">
      Chargement de l&apos;aperçu…
    </div>
  ),
});

/** Fiche d'exemple : assez remplie pour juger chaque mise en page. */
const SAMPLE: Omit<TechnicalDocumentInput, "artistName" | "template"> = {
  title: "La Cigale",
  meta: [
    { label: "Date", value: "14/11/2026" },
    { label: "Lieu", value: "La Cigale" },
    { label: "Adresse", value: "120 bd de Rochechouart, Paris" },
    { label: "Spectacle", value: "Tournée d’automne" },
    { label: "Durée du set", value: "55 min · 12 titres" },
  ],
  sheet: {
    ...emptyTechnical(),
    people: [
      { id: "1", group: "tech", firstName: "Léa", lastName: "Martin", role: "Son façade", phone: "06 12 34 56 78", email: "lea@exemple.fr" },
      { id: "2", group: "tech", firstName: "Samir", lastName: "Haddad", role: "Régie lumière", phone: "06 98 76 54 32" },
      { id: "3", group: "artistic", firstName: "Camille", lastName: "Roux", role: "Chant, guitare" },
      { id: "4", group: "artistic", firstName: "Hugo", lastName: "Lemaire", role: "Claviers, machines" },
      { id: "5", group: "organisation", firstName: "Nina", lastName: "Petit", role: "Tour manager", phone: "07 11 22 33 44", email: "nina@exemple.fr" },
    ],
    details: { sound: "2 micros voix, 2 DI stéréo, 4 retours", light: "Ambiance chaude, pas de stroboscope", stage: "Espace 6 × 4 m minimum", other: "" },
    venue: [
      { id: "v1", name: "Diffusion façade", quantity: 1, category: "sound" },
      { id: "v2", name: "Retours de scène", quantity: 4, category: "sound" },
      { id: "v3", name: "Praticables 2 × 1 m", quantity: 2, category: "stage" },
    ],
  },
  brought: [
    { key: "b1", name: "Micro voix SM58", quantity: 2, category: "sound" },
    { key: "b2", name: "Pédalier d’effets", quantity: 1, category: "sound" },
    { key: "b3", name: "Barres LED", quantity: 4, category: "light" },
    { key: "b4", name: "Guitare électrique", quantity: 1, category: "other" },
  ],
  contacts: [],
  schedule: [
    { time: "16:00", activity: "Arrivée et déchargement" },
    { time: "17:00", activity: "Balances" },
    { time: "21:00", activity: "Concert" },
  ],
};

/** Schéma miniature de chaque mise en page, pour choisir sans lire. */
function LayoutThumb({ layout, accent }: { layout: TechnicalLayout; accent: string }) {
  const line = "h-1 rounded-full bg-[#101010]/15";
  return (
    // Fond en style direct : globals.css force `bg-white` en sombre (thème dark-only), or c'est une page imprimée.
    <div className="aspect-[210/150] w-full overflow-hidden rounded-sm p-2" style={{ backgroundColor: "#ffffff" }}>
      {layout === "poster" ? (
        <>
          <div className="-mx-2 -mt-2 mb-2 px-2 pb-2 pt-3" style={{ backgroundColor: accent }}>
            <div className="h-2 w-2/3 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.8)" }} />
          </div>
          <div className="mb-2 grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <div key={i} className="h-1.5 border-t-2" style={{ borderColor: accent }} />)}</div>
          {["#818CF8", "#2DD4BF"].map((c) => (
            <div key={c} className="mb-1.5 overflow-hidden rounded-sm border border-[#101010]/10">
              <div className="h-1.5" style={{ backgroundColor: c }} />
              <div className="space-y-0.5 p-1"><div className={line} /><div className={cn(line, "w-2/3")} /></div>
            </div>
          ))}
        </>
      ) : layout === "compact" ? (
        <>
          <div className="mb-1 h-1.5 w-1/2 rounded-full bg-[#101010]/60" />
          <div className="mb-2 h-px" style={{ backgroundColor: accent }} />
          <div className={cn(line, "mb-2 w-5/6")} />
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="mb-1 flex gap-1"><div className="h-1 w-1/4 rounded-full bg-[#101010]/30" /><div className={cn(line, "flex-1")} /></div>)}
        </>
      ) : (
        <>
          <div className="mb-1 h-2 w-1/2 rounded-full bg-[#101010]/70" />
          <div className="mb-2 h-0.5" style={{ backgroundColor: accent }} />
          <div className="mb-2 h-3 rounded-sm bg-[#101010]/5" />
          {["#818CF8", "#2DD4BF"].map((c) => (
            <div key={c} className="mb-1.5 border-l-2 pl-1" style={{ borderColor: c }}>
              <div className="space-y-0.5"><div className={line} /><div className={cn(line, "w-2/3")} /></div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/** Onglet Fiche technique de Personnalisation : mise en page, apparence commune. */
export function TechnicalTemplatePanel() {
  const { invoiceTemplate: template, setInvoiceTemplate: update } = usePreferencesData();
  const { artistName, logo, logoExports } = useArtistIdentity();
  const current = template.technicalLayout ?? "classic";
  const previewLogo = logoFor(logo, logoExports, "technical");
  const previewPosterLogo = logoForDarkSpot(logo, logoExports, "technical");
  const previewData = useMemo<TechnicalDocumentInput>(
    () => ({ ...SAMPLE, artistName: artistName || "Ton nom d’artiste", template, logo: previewLogo, posterLogo: previewPosterLogo }),
    [artistName, template, previewLogo, previewPosterLogo]
  );

  return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mise en page</CardTitle>
              <CardDescription>Trois modèles, le contenu reste le même.</CardDescription>
            </CardHeader>
            <CardContent>
              <div role="radiogroup" aria-label="Mise en page" className="space-y-2">
                {TECHNICAL_LAYOUTS.map((l) => {
                  const on = current === l.value;
                  return (
                    <button
                      key={l.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => update({ technicalLayout: l.value })}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00]/70",
                        on ? "border-[#F0FF00]/70 bg-[#F0FF00]/[0.06]" : "border-[rgba(245,245,245,0.12)] hover:border-[rgba(245,245,245,0.3)]"
                      )}
                    >
                      <div className="w-24 shrink-0">
                        <LayoutThumb layout={l.value} accent={template.accentColor || "#101010"} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-[#F5F5F5]">
                          {l.label}
                          {on && <Check className="h-3.5 w-3.5 text-[#F0FF00]" />}
                        </p>
                        <p className="mt-0.5 text-xs text-[#F5F5F5]/55">{l.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <AppearanceCards />
          <LogoStatus target="technical" />
        </div>

        {/* Aperçu sur une fiche d'exemple : pas de téléchargement ici, on règle un modèle. */}
        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <div className="aspect-[210/298] w-full">
            <TechnicalPreview data={previewData} />
          </div>
        </div>
      </div>
  );
}
