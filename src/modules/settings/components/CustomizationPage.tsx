"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePreferencesData, type EnabledModules } from "@/hooks/usePreferencesData";
import { removeDemoData } from "@/lib/demo-seed";
import { usePostHog } from "posthog-js/react";

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
  // Marketing est fermé pour l'alpha (cf. src/lib/coming-soon.ts) : proposer un
  // interrupteur sans effet serait trompeur. À remettre à sa réouverture.
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

export function CustomizationPage() {
  const {
    enabledModules: enabled,
    setEnabledModules,
    demoSeed,
    setDemoSeed,
    remindersEnabled,
    setRemindersEnabled,
  } = usePreferencesData();
  const posthog = usePostHog();
  const [removingDemo, setRemovingDemo] = useState(false);

  const handleToggle = (key: keyof EnabledModules, value: boolean) => {
    setEnabledModules({ [key]: value });
    posthog?.capture("module_visibility_updated", { module: "settings" });
  };

  const demoRowCount = useMemo(
    () =>
      demoSeed
        ? Object.values(demoSeed).reduce((sum, ids) => sum + ids.length, 0)
        : 0,
    [demoSeed]
  );

  const handleRemoveDemo = async () => {
    if (!demoSeed) return;
    setRemovingDemo(true);
    try {
      await removeDemoData(demoSeed);
      await setDemoSeed(null);
      posthog?.capture("demo_data_removed");
      toast.success("Données d'exemple supprimées.");
    } catch (e) {
      console.error("[settings] suppression des données d'exemple échouée", e);
      toast.error("Suppression impossible. Réessaie dans un instant.");
    } finally {
      setRemovingDemo(false);
    }
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

      <Card>
        <CardHeader>
          <CardTitle>Rappels de démarches</CardTitle>
          <CardDescription>
            Un email récapitulatif quand des démarches administratives arrivent
            à échéance. Un seul message par jour, jamais un par démarche.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
            <div>
              <Label className="text-sm font-medium">Recevoir les rappels par email</Label>
              <p className="text-xs text-muted-foreground">
                Tes démarches restent visibles dans l&apos;application même si tu
                désactives les emails.
              </p>
            </div>
            <Switch
              checked={remindersEnabled}
              onCheckedChange={(checked) => {
                setRemindersEnabled(checked);
                posthog?.capture("reminders_toggled", { enabled: checked });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {demoSeed && demoRowCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Données d&apos;exemple</CardTitle>
            <CardDescription>
              Ton compte contient {demoRowCount} éléments fictifs créés à
              l&apos;inscription. Les supprimer ne touchera pas à ce que tu as
              saisi toi-même.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleRemoveDemo}
              disabled={removingDemo}
              className="gap-2"
            >
              {removingDemo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {removingDemo ? "Suppression…" : "Supprimer les données d'exemple"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

