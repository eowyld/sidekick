"use client";

import { Switch } from "@/components/ui/switch";
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import { usePreferencesData } from "@/hooks/usePreferencesData";
import type { LogoTarget } from "@/lib/artist-logo";
import { ArtistLogoField } from "./ArtistLogoField";
import { SettingRow, SettingsSection } from "./SettingsUI";

const TARGETS: { target: LogoTarget; label: string; description: string }[] = [
  { target: "invoices", label: "Factures", description: "En haut à gauche du PDF, au-dessus de ton statut." },
  { target: "technical", label: "Fiche technique", description: "Dans l’en-tête du PDF envoyé aux lieux." },
  { target: "listening", label: "Liens d’écoute", description: "Au-dessus de ton nom, sur la page d’écoute et dans le mail d’invitation." },
];

/** Logo de l'artiste dans Réglages > Compte : les deux versions et où l'afficher. */
export function ArtistLogoCard() {
  const { logo, logoExports, setLogo, setLogoExports } = useArtistIdentity();
  const { enabledModules } = usePreferencesData();
  const hasLogo = Boolean(logo.light || logo.dark);
  // La fiche technique appartient au Live : pas de réglage pour un module masqué.
  const targets = TARGETS.filter((t) => t.target !== "technical" || enabledModules.live !== false);

  return (
    <SettingsSection
      title="Logo"
      description="Facultatif. Une version pour les fonds clairs, une pour les fonds sombres : si tu n’en mets qu’une, elle sert partout."
    >
      <ArtistLogoField logo={logo} onChange={setLogo} />
      {hasLogo && (
        <div className="space-y-2 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/50">
            Afficher sur
          </p>
          {targets.map((t) => (
            <SettingRow
              key={t.target}
              htmlFor={`logo-${t.target}`}
              label={t.label}
              description={t.description}
              control={
                <Switch
                  id={`logo-${t.target}`}
                  checked={logoExports[t.target]}
                  onCheckedChange={(checked) => setLogoExports({ [t.target]: checked })}
                />
              }
            />
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
