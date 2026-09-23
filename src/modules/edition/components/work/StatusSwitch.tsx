"use client";

import type { Work } from "@/lib/sidekick-store";
import { cn, focusRing } from "@/lib/utils";
import { manualStatus, storedStatus, STEP_META, type ManualStatus } from "../../lib/work-lifecycle";

const CHOICES: { value: ManualStatus; label: string; color: string }[] = [
  { value: "draft", label: "Pas déclarée", color: STEP_META.draft.color },
  { value: "declared", label: "Déclarée SACEM", color: STEP_META.declared.color },
  { value: "accepted", label: "Acceptée", color: STEP_META.accepted.color },
];

/** Valeur stockée pour un statut choisi. « finalisée » (historique) reste telle quelle si on reste en brouillon. */
export function nextStoredStatus(current: Work["status"], choice: ManualStatus): Work["status"] {
  return choice === "draft" && current === "finalized" ? "finalized" : storedStatus(choice);
}

/**
 * Statut de déclaration d'une œuvre, en trois positions. Utilisé par la fiche
 * et par le panneau déplié de la liste : le même geste aux deux endroits.
 */
export function StatusSwitch({ status, onChange, size = "md" }: { status: Work["status"]; onChange: (next: Work["status"]) => void; size?: "sm" | "md" }) {
  const current = manualStatus(status);
  return (
    <div role="radiogroup" aria-label="Statut de déclaration" className="inline-flex rounded-lg border border-[#F5F5F5]/10 bg-black/20 p-0.5">
      {CHOICES.map((c) => {
        const on = current === c.value;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => !on && onChange(nextStoredStatus(status, c.value))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              on ? "text-[#F5F5F5]" : "text-[#F5F5F5]/45 hover:text-[#F5F5F5]/80",
              focusRing,
            )}
            style={on ? { background: `${c.color}26`, color: c.color } : undefined}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? c.color : "rgba(245,245,245,0.25)" }} />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
