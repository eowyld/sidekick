"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Briques communes des Réglages. Toutes les rubriques suivent le même modèle :
 * un en-tête de page, des sections en cartes, et dans chaque section des lignes
 * « libellé et description à gauche, contrôle à droite ». Les confirmations
 * passent toutes par un toast (sonner), jamais par un bloc dans la carte.
 */

export function SettingsHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: ReactNode;
  /** Bouton à droite du titre, typiquement un lien vers le module concerné. */
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function SettingRow({
  label,
  description,
  control,
  htmlFor,
  tone = "default",
}: {
  label: ReactNode;
  description?: ReactNode;
  control: ReactNode;
  htmlFor?: string;
  tone?: "default" | "danger";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        tone === "danger" ? "border-red-500/30" : "border-[rgba(245,245,245,0.12)]"
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-[#F5F5F5]">
          {label}
        </label>
        {description ? (
          <div className="text-xs leading-relaxed text-muted-foreground">{description}</div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">{control}</div>
    </div>
  );
}
