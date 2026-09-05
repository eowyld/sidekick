"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReleaseStatus } from "@/lib/sidekick-store";
import { RELEASE_STATUSES } from "@/modules/phono/lib/release-status";
import type { CatalogFilter } from "../CatalogHeader";
import {
  effectiveFilterValues,
  type AudioExtra,
  type IsrcExtra,
  type SortKey,
} from "./track-filters";


interface TracksToolbarProps {
  filter: CatalogFilter;
  onFilterChange: (filter: CatalogFilter) => void;
  search: string;
  onSearch: (value: string) => void;
  sort: SortKey;
  onSort: (value: SortKey) => void;
  audioExtra: AudioExtra;
  setAudioExtra: (value: AudioExtra) => void;
  isrcExtra: IsrcExtra;
  setIsrcExtra: (value: IsrcExtra) => void;
  onCreate: () => void;
}

export function TracksToolbar({
  filter,
  onFilterChange,
  search,
  onSearch,
  sort,
  onSort,
  audioExtra,
  setAudioExtra,
  isrcExtra,
  setIsrcExtra,
  onCreate,
}: TracksToolbarProps) {
  const {
    status: statusValue,
    audio: audioValue,
    isrc: isrcValue,
  } = effectiveFilterValues(filter, audioExtra, isrcExtra);

  const handleStatus = (v: string) => {
    if (v === "all") {
      if (filter.kind === "status") onFilterChange({ kind: "none" });
    } else {
      onFilterChange({ kind: "status", status: v as ReleaseStatus });
    }
  };
  const handleAudio = (v: string) => {
    if (v === "without") {
      setAudioExtra("all");
      onFilterChange({ kind: "missing-audio" });
    } else {
      setAudioExtra(v as AudioExtra);
      if (filter.kind === "missing-audio") onFilterChange({ kind: "none" });
    }
  };
  const handleIsrc = (v: string) => {
    if (v === "missing") {
      setIsrcExtra("all");
      onFilterChange({ kind: "missing-isrc" });
    } else {
      setIsrcExtra(v as IsrcExtra);
      if (filter.kind === "missing-isrc") onFilterChange({ kind: "none" });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Rechercher…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="h-9 w-full max-w-xs"
      />

      <Select value={statusValue} onValueChange={handleStatus}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          {RELEASE_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={audioValue} onValueChange={handleAudio}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Audio : tous</SelectItem>
          <SelectItem value="with">Avec audio</SelectItem>
          <SelectItem value="without">Sans audio</SelectItem>
        </SelectContent>
      </Select>

      <Select value={isrcValue} onValueChange={handleIsrc}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ISRC : tous</SelectItem>
          <SelectItem value="present">ISRC renseigné</SelectItem>
          <SelectItem value="missing">ISRC manquant</SelectItem>
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-2">
        <Select value={sort} onValueChange={(v) => onSort(v as SortKey)}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Date de sortie ↓</SelectItem>
            <SelectItem value="title-asc">Titre A→Z</SelectItem>
            <SelectItem value="status">Statut</SelectItem>
            <SelectItem value="recent">Ajout récent</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" onClick={onCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Titre
        </Button>
      </div>
    </div>
  );
}
