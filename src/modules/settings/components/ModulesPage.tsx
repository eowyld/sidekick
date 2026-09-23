"use client";

import { Switch } from "@/components/ui/switch";
import { usePreferencesData, type EnabledModules } from "@/hooks/usePreferencesData";
import { usePostHog } from "posthog-js/react";
import { SettingRow, SettingsHeader, SettingsSection } from "./SettingsUI";

const MODULE_LABELS: { key: keyof EnabledModules; label: string; description: string }[] = [
  {
    key: "live",
    label: "Live",
    description: "Dates, répétitions, matériel et prospection."
  },
  {
    key: "phono",
    label: "Phono",
    description: "Catalogue, sessions studio, sorties et liens d’écoute."
  },
  {
    key: "edition",
    label: "Édition",
    description: "Œuvres et répartitions de droits d’auteur."
  },
  // Marketing est fermé pour l'alpha (cf. src/lib/coming-soon.ts) : proposer un
  // interrupteur sans effet serait trompeur. À remettre à sa réouverture.
  {
    key: "admin",
    label: "Admin",
    description: "Statuts et démarches administratives."
  },
  {
    key: "revenus",
    label: "Revenus",
    description: "Facturation, royalties, droits d’auteur et intermittence."
  }
];

export function ModulesPage() {
  const { enabledModules: enabled, setEnabledModules } = usePreferencesData();
  const posthog = usePostHog();

  const handleToggle = (key: keyof EnabledModules, value: boolean) => {
    setEnabledModules({ [key]: value });
    posthog?.capture("module_visibility_updated", { module: "settings" });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <SettingsHeader
        title="Modules"
        description="Affiche seulement ce qui te sert. Un module masqué disparaît des menus, du calendrier et des tâches, sans perdre ses données : tu le retrouves intact en le réactivant."
      />

      <SettingsSection title="Modules affichés">
        {MODULE_LABELS.map((module) => (
          <SettingRow
            key={module.key}
            htmlFor={`module-${module.key}`}
            label={module.label}
            description={module.description}
            control={
              <Switch
                id={`module-${module.key}`}
                checked={enabled[module.key] ?? true}
                onCheckedChange={(checked) => handleToggle(module.key, checked)}
              />
            }
          />
        ))}
      </SettingsSection>
    </div>
  );
}
