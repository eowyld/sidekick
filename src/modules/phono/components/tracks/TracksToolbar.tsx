"use client";

import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, focusRing } from "@/lib/utils";
import {
  RELEASE_STATUSES,
  RELEASE_STATUS_COLOR,
} from "@/modules/phono/lib/release-status";
import type { CatalogFilter } from "../CatalogHeader";
import { CATALOG_CONTROL, CatalogSortMenu } from "../CatalogSortMenu";

interface TracksToolbarProps {
  filter: CatalogFilter;
  onFilterChange: (filter: CatalogFilter) => void;
  search: string;
  onSearch: (value: string) => void;
  onCreate: () => void;
}

export function TracksToolbar({
  filter,
  onFilterChange,
  search,
  onSearch,
  onCreate,
}: TracksToolbarProps) {
  const activeStatus = filter.kind === "status" ? filter.status : null;

  return (
    // `xl:flex-nowrap` : recherche, filtres et tri tiennent sur une seule ligne
    // dès que la fenêtre le permet, et se replient proprement en dessous.
    <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
      <div className="relative w-full min-w-[180px] max-w-xs shrink xl:w-56">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#F5F5F5]/30"
        />
        <Input
          placeholder="Rechercher un titre, un ISRC…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="h-9 w-full pl-9"
        />
      </div>

      {/*
        Le statut se filtre en un clic, pas en deux : un Select gris obligeait à
        ouvrir un menu pour découvrir des options que la ligne affiche déjà en
        couleur. Chaque pastille reprend la teinte de la pastille de statut des
        lignes et de la barre de répartition du bandeau — une couleur, un sens.
      */}
      <div
        role="group"
        aria-label="Filtrer par statut"
        className="flex flex-wrap items-center gap-1.5"
      >
        <button
          type="button"
          aria-pressed={activeStatus === null}
          onClick={() => onFilterChange({ kind: "none" })}
          className={cn(
            CATALOG_CONTROL,
            focusRing,
            activeStatus === null
              ? "border-[rgba(245,245,245,0.25)] bg-[rgba(245,245,245,0.08)] text-[#F5F5F5]"
              : "border-[rgba(245,245,245,0.1)] text-[#F5F5F5]/45 hover:text-[#F5F5F5]/75"
          )}
        >
          Tous
        </button>

        {RELEASE_STATUSES.map((s) => {
          const color = RELEASE_STATUS_COLOR[s.value];
          const active = activeStatus === s.value;
          return (
            <button
              key={s.value}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onFilterChange(
                  active ? { kind: "none" } : { kind: "status", status: s.value }
                )
              }
              className={cn(
                CATALOG_CONTROL,
                focusRing,
                "group whitespace-nowrap",
                !active &&
                  "border-[rgba(245,245,245,0.1)] text-[#F5F5F5]/45 hover:text-[#F5F5F5]/75"
              )}
              style={
                active
                  ? {
                      borderColor: `${color}66`,
                      background: `${color}1A`,
                      color,
                    }
                  : undefined
              }
            >
              <span
                aria-hidden
                className={cn(
                  "h-[7px] w-[7px] shrink-0 rounded-full transition-opacity",
                  !active && "opacity-45 group-hover:opacity-80"
                )}
                style={{
                  background: color,
                  boxShadow: active ? `0 0 8px ${color}66` : undefined,
                }}
              />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <CatalogSortMenu scope="tracks" />
        <Button type="button" onClick={onCreate} className="btn-glow">
          <Plus className="mr-1.5 h-4 w-4" />
          Titre
        </Button>
      </div>
    </div>
  );
}
