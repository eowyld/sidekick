"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferencesData } from "@/hooks/usePreferencesData";
import { cn } from "@/lib/utils";
import { InvoiceTemplatePanel } from "./InvoiceTemplatePage";
import { TechnicalTemplatePanel } from "./TechnicalTemplatePage";
import { SettingsHeader } from "./SettingsUI";

export type PersonalizationDoc = "factures" | "fiche-technique";

/** Lien vers un onglet, pour les boutons « Personnaliser » des éditeurs. */
export const personalizationHref = (doc: PersonalizationDoc) => `/settings/personnalisation?doc=${doc}`;

const TABS: { id: PersonalizationDoc; label: string; action: { href: string; label: string } }[] = [
  { id: "factures", label: "Factures", action: { href: "/incomes/facturation", label: "Aller à mes factures" } },
  { id: "fiche-technique", label: "Fiche technique", action: { href: "/live", label: "Aller au Live" } },
];

/**
 * Apparence des documents que l'artiste envoie : factures et fiches
 * techniques. Couleur et police sont communes ; le logo se gère dans Compte.
 * L'onglet vit dans l'URL (`?doc=`) pour que les éditeurs y mènent directement.
 */
export function PersonalizationPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { enabledModules } = usePreferencesData();
  // La fiche technique appartient au Live : pas d'onglet pour un module masqué.
  const tabs = TABS.filter((t) => t.id !== "fiche-technique" || enabledModules.live !== false);
  const requested = params.get("doc");
  const current = tabs.find((t) => t.id === requested) ?? tabs[0];

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Personnalisation"
        description="L’apparence des documents que tu envoies. Ces réglages s’appliquent à toutes tes factures et à toutes tes fiches techniques."
        action={
          <Button asChild className="gap-1.5">
            <Link href={current.action.href}>
              {current.action.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {tabs.length > 1 && (
        <div className="flex gap-1 border-b border-[rgba(245,245,245,0.12)]" role="tablist" aria-label="Document">
          {tabs.map((t) => {
            const active = t.id === current.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => router.replace(`${pathname}?doc=${t.id}`, { scroll: false })}
                className={cn(
                  "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00]/70",
                  active ? "border-[#F0FF00] text-[#F0FF00]" : "border-transparent text-[#F5F5F5]/55 hover:text-[#F5F5F5]"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {current.id === "fiche-technique" ? <TechnicalTemplatePanel /> : <InvoiceTemplatePanel />}
    </div>
  );
}
