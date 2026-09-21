"use client";

import { Check, Sparkles, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IdentityMode } from "@/lib/artist-identity";
import { cn } from "@/lib/utils";

const CHOICES: {
  id: IdentityMode;
  label: string;
  description: string;
  icon: typeof User;
}[] = [
  {
    id: "artist",
    label: "Un nom d'artiste",
    description: "Tu sors ta musique sous un nom de scène ou un nom de projet.",
    icon: Sparkles,
  },
  {
    id: "legal",
    label: "Mon nom",
    description: "Tu sors ta musique sous ton nom, prénom et nom.",
    icon: User,
  },
];

/**
 * Choix « nom d'artiste ou nom propre », partagé par l'onboarding et
 * Réglages. Deux brouillons distincts : passer d'un mode à l'autre ne perd
 * pas ce qui a été tapé dans le premier.
 */
export function IdentityChoice({
  mode,
  artistDraft,
  legalDraft,
  onModeChange,
  onArtistDraftChange,
  onLegalDraftChange,
}: {
  mode: IdentityMode | null;
  artistDraft: string;
  legalDraft: string;
  onModeChange: (mode: IdentityMode) => void;
  onArtistDraftChange: (value: string) => void;
  onLegalDraftChange: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {CHOICES.map((choice) => {
          const Icon = choice.icon;
          const checked = mode === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => onModeChange(choice.id)}
              aria-pressed={checked}
              className={cn(
                "flex items-start gap-3 rounded-sm border p-4 text-left transition-colors",
                checked
                  ? "border-[#F0FF00] bg-[rgba(240,255,0,0.06)]"
                  : "border-[rgba(245,245,245,0.12)] hover:bg-[rgba(245,245,245,0.04)]"
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#F0FF00]" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {choice.label}
                  {checked && <Check className="h-3.5 w-3.5 text-[#F0FF00]" />}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[#f5f5f5]/55">
                  {choice.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {mode === "artist" && (
        <div className="space-y-2">
          <Label htmlFor="identity-artist-name">Ton nom d&apos;artiste</Label>
          <Input
            id="identity-artist-name"
            value={artistDraft}
            onChange={(e) => onArtistDraftChange(e.target.value)}
            placeholder="Nom d'artiste"
            autoFocus
          />
        </div>
      )}

      {mode === "legal" && (
        <div className="space-y-2">
          <Label htmlFor="identity-legal-name">Ton nom, tel qu&apos;il apparaîtra</Label>
          <Input
            id="identity-legal-name"
            value={legalDraft}
            onChange={(e) => onLegalDraftChange(e.target.value)}
            placeholder="Prénom Nom"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
