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
import type { AlbumGuest, PhonoRole } from "@/lib/sidekick-store";
import { ROLES } from "@/modules/phono/lib/track";

interface AlbumContributorsProps {
  contributors: Array<{ name: string; roles: string[] }>;
}

/**
 * Liste en lecture seule des contributeurs agrégés depuis les titres de la
 * tracklist. La mention explicite évite qu'on prenne une liste vide pour un
 * champ non rempli.
 */
export function AlbumContributors({ contributors }: AlbumContributorsProps) {
  return (
    <div className="space-y-2 border-t border-[rgba(245,245,245,0.12)] pt-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#F5F5F5]/70">
        Contributeurs
      </p>
      <p className="text-xs text-[#F5F5F5]/45">
        Calculés depuis les titres de la tracklist.
      </p>
      {contributors.length === 0 ? (
        <p className="text-sm text-[#F5F5F5]/45">
          Aucun titre dans la tracklist pour l&apos;instant.
        </p>
      ) : (
        <ul className="space-y-0.5 text-sm text-[#F5F5F5]">
          {contributors.map((person) => (
            <li key={person.name}>
              {person.name}
              {person.roles.length > 0
                ? ` · ${person.roles.join(", ")}`
                : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface AlbumGuestListProps {
  guests: AlbumGuest[];
  onAdd: () => void;
  onUpdate: (id: string, values: Partial<AlbumGuest>) => void;
  onRemove: (id: string) => void;
}

/**
 * Invités propres à l'album — éditables. Contrairement aux invités de titre, le
 * `Select` de rôle porte la **clé** `r.value` (un `PhonoRole`), pas le libellé.
 */
export function AlbumGuestList({
  guests,
  onAdd,
  onUpdate,
  onRemove,
}: AlbumGuestListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Invités de l&apos;album</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onAdd}
        >
          <Plus className="mr-1 h-3 w-3" />
          Ajouter une personne
        </Button>
      </div>
      {guests.length === 0 ? (
        <p className="text-xs text-[#F5F5F5]/45">
          Personnes créditées sur l&apos;album sans figurer sur un titre.
        </p>
      ) : (
        <div className="space-y-2">
          {guests.map((g) => (
            <div key={g.id} className="flex items-center gap-2">
              <Input
                value={g.name}
                onChange={(e) => onUpdate(g.id, { name: e.target.value })}
                placeholder="Nom"
                className="h-9 min-w-0 flex-1"
              />
              <div className="w-44 shrink-0">
                <Select
                  value={g.role}
                  onValueChange={(v) => onUpdate(g.id, { role: v as PhonoRole })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-[#F5F5F5]/40 hover:text-red-400"
                aria-label="Retirer cette personne"
                onClick={() => onRemove(g.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
