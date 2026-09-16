"use client";

import { ArrowUpDown, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, focusRing } from "@/lib/utils";
import { CATALOG_SORTS, type SortKey } from "@/modules/phono/lib/catalog-sort";
import { usePhonoSort, type SortScope } from "./PhonoSortProvider";

/** Forme commune aux commandes de barre d'outils du catalogue. */
export const CATALOG_CONTROL =
  "flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium uppercase tracking-[0.06em] transition-colors";

/**
 * Sélecteur de tri d'un onglet du catalogue.
 *
 * Partage la forme des pastilles de filtre plutôt que celle d'un `Select` : un
 * champ de formulaire à côté de boutons laissait croire à une saisie, alors que
 * c'est une commande de plus.
 *
 * Le tri est écrit dans le contexte partagé, pas dans l'état de l'onglet : la
 * file du lecteur le lit pour enchaîner dans l'ordre affiché.
 */
export function CatalogSortMenu({ scope }: { scope: SortScope }) {
  const { sorts, setSort } = usePhonoSort();
  const value = sorts[scope];
  const label = CATALOG_SORTS.find((s) => s.value === value)?.label ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Trier : ${label}`}
          className={cn(
            CATALOG_CONTROL,
            focusRing,
            "group whitespace-nowrap border-[rgba(245,245,245,0.1)] text-[#F5F5F5]/55",
            "hover:border-[rgba(245,245,245,0.2)] hover:text-[#F5F5F5]/85",
            "data-[state=open]:border-[rgba(245,245,245,0.25)] data-[state=open]:text-[#F5F5F5]"
          )}
        >
          <ArrowUpDown aria-hidden className="h-3 w-3 shrink-0" />
          {label}
          <ChevronDown
            aria-hidden
            className="h-3 w-3 shrink-0 opacity-50 transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => setSort(scope, v as SortKey)}
        >
          {CATALOG_SORTS.map((s) => (
            <DropdownMenuRadioItem key={s.value} value={s.value}>
              {s.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
