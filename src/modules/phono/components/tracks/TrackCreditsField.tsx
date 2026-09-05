"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TrackGuest } from "@/lib/sidekick-store";
import { ROLES } from "@/modules/phono/lib/track";

interface TrackCreditsFieldProps {
  value: TrackGuest[];
  onChange: (guests: TrackGuest[]) => void;
}

/**
 * Liste des personnes créditées (nom + rôle).
 *
 * Autonome et sans dépendance au formulaire parent, pour être réutilisé tel
 * quel par `AlbumDialog` — un album porte les mêmes crédits.
 */
export function TrackCreditsField({ value, onChange }: TrackCreditsFieldProps) {
  const setGuest = (index: number, values: Partial<TrackGuest>) =>
    onChange(value.map((g, i) => (i === index ? { ...g, ...values } : g)));

  return (
    <>
      <div className="flex items-center justify-between">
        <Label>Personnes impliquées</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onChange([...value, { name: "", role: "" }])}
        >
          <Plus className="mr-1 h-3 w-3" />
          Ajouter une personne
        </Button>
      </div>
      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aucune personne créditée pour l’instant.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((guest, i) => (
            <div key={i} className="flex w-full items-center gap-2">
              <div className="min-w-0 basis-2/3">
                <Input
                  value={guest.name}
                  onChange={(e) => setGuest(i, { name: e.target.value })}
                  placeholder="Nom"
                  className="h-8 w-full text-xs sm:text-sm"
                />
              </div>
              <div className="min-w-0 basis-1/3">
                {/* La valeur stockée est le LIBELLÉ du rôle : c'est ce que
                    comparent PERFORMER_ROLES / COMPOSER_ROLES. */}
                <Select
                  value={guest.role}
                  onValueChange={(v) => setGuest(i, { role: v })}
                >
                  <SelectTrigger className="h-8 w-full text-[10px] sm:text-xs">
                    <SelectValue placeholder="Rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.label}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                title="Supprimer"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
