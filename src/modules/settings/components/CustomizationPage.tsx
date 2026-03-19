"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSidekickData } from "@/hooks/useSidekickData";

const MODULE_LABELS: { key: keyof EnabledModules; label: string; description: string }[] = [
  {
    key: "live",
    label: "Live",
    description: "Dates, répétitions, matériel et prospection."
  },
  {
    key: "phono",
    label: "Phono",
    description: "Catalogue, sessions studio et sorties."
  },
  {
    key: "admin",
    label: "Admin",
    description: "Statuts, démarches administratives, documents."
  },
  {
    key: "marketing",
    label: "Marketing",
    description: "Publications et campagnes."
  },
  {
    key: "edition",
    label: "Edition",
    description: "Travaux d’édition (à venir)."
  },
  {
    key: "revenus",
    label: "Revenus",
    description: "Facturation, royalties et suivis financiers."
  }
];

type EnabledModules = {
  live: boolean;
  phono: boolean;
  admin: boolean;
  marketing: boolean;
  edition: boolean;
  revenus: boolean;
};

export function CustomizationPage() {
  const { data, setData } = useSidekickData();
  const enabled = useMemo(
    () => data.preferences?.enabledModules ?? ({} as EnabledModules),
    [data.preferences?.enabledModules]
  );

  const handleToggle = (key: keyof EnabledModules, value: boolean) => {
    setData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        enabledModules: {
          ...prev.preferences.enabledModules,
          [key]: value
        }
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Personnalisation</h1>
        <p className="text-sm text-muted-foreground">
          Active ou désactive des modules sans perdre tes données. Les éléments désactivés disparaissent des menus et filtres.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modules affichés</CardTitle>
          <CardDescription>
            Choisis les modules visibles dans la sidebar, le calendrier et les secteurs de tâches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {MODULE_LABELS.map((module) => (
            <div key={module.key} className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
              <div>
                <Label className="text-sm font-medium">{module.label}</Label>
                <p className="text-xs text-muted-foreground">{module.description}</p>
              </div>
              <Switch
                checked={enabled[module.key] ?? true}
                onCheckedChange={(checked) => handleToggle(module.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

