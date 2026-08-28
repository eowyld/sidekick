"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  filterNafCodes,
  formatApeOptionLabel,
  getCanonicalNafCode,
  getNafLabelForCode,
  NAF_CODES_FR,
  type NafEntry,
} from "@/modules/admin/lib/naf-codes";

const FEATURED_APE_CODES = ["90.01Z", "90.02Z", "90.03B", "59.20Z", "82.30Z", "74.90B"];

const featuredEntries: NafEntry[] = FEATURED_APE_CODES.flatMap((code) => {
  const entry = NAF_CODES_FR.find((e) => e.code === code);
  return entry ? [entry] : [];
});

type ApeCodeSelectProps = {
  id: string;
  value: string;
  onChange: (code: string) => void;
  /** Libellé du champ (accessibilité) */
  fieldLabel: string;
  disabled?: boolean;
};

function ApeOption({ entry, selected, onPick }: { entry: NafEntry; selected: boolean; onPick: (e: NafEntry) => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={cn(
        "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[rgba(245,245,245,0.06)]",
        selected && "bg-[rgba(240,255,0,0.06)]"
      )}
      onClick={() => onPick(entry)}
    >
      <Check
        className={cn("mt-0.5 h-4 w-4 shrink-0", selected ? "text-[#F0FF00]" : "opacity-0")}
        aria-hidden
      />
      <span className="min-w-0 leading-snug">
        <span className="font-medium text-[#F5F5F5]/95">{entry.code}</span>
        <span className="text-[#F5F5F5]/35"> - </span>
        <span className="text-[#F5F5F5]/80">{entry.label}</span>
      </span>
    </button>
  );
}

export function ApeCodeSelect({ id, value, onChange, fieldLabel, disabled }: ApeCodeSelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => filterNafCodes(search), [search]);

  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  const triggerText = useMemo(() => {
    const t = value.trim();
    if (!t) return null;
    const label = getNafLabelForCode(t);
    const canonical = getCanonicalNafCode(t);
    if (canonical && label) return formatApeOptionLabel({ code: canonical, label });
    return t;
  }, [value]);

  function pick(entry: NafEntry) {
    onChange(entry.code);
    setOpen(false);
  }

  const displayLabel = triggerText ?? "Rechercher un code APE…";

  return (
    <div className="min-w-0 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            id={id}
            title={triggerText ?? undefined}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={open ? listId : undefined}
            aria-label={fieldLabel}
            className={cn(
              "flex h-9 w-full min-w-0 max-w-full justify-between gap-2 overflow-hidden whitespace-normal rounded-none border border-[rgba(245,245,245,0.12)] bg-[rgba(255,255,255,0.05)] px-3 py-1 font-normal text-[#F5F5F5] shadow-sm hover:bg-[rgba(255,255,255,0.07)]",
              !triggerText && "text-[#F5F5F5]/40"
            )}
          >
            <span className="min-w-0 flex-1 truncate text-left text-sm">{displayLabel}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-45" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="z-50 w-[min(calc(100vw-2rem),36rem)] border-[rgba(245,245,245,0.12)] bg-[#2c2c2e]/98 p-0 text-[#F5F5F5] shadow-lg backdrop-blur-xl"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-2 border-b border-[rgba(245,245,245,0.08)] p-3">
            <Label htmlFor={`${id}-search`} className="sr-only">
              Filtrer les codes APE
            </Label>
            <Input
              id={`${id}-search`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Code ou libellé…"
              autoComplete="off"
              className="rounded-none"
            />
          </div>
          <div
            id={listId}
            role="listbox"
            aria-label={fieldLabel}
            className="max-h-[min(50vh,19rem)] overflow-y-auto overscroll-contain py-1"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[#F5F5F5]/45">Aucun résultat.</p>
            ) : search.trim() ? (
              filtered.map((entry) => (
                <ApeOption key={entry.code} entry={entry} selected={entry.code === value.trim()} onPick={pick} />
              ))
            ) : (
              <>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/35">
                  Musique & spectacle
                </p>
                {featuredEntries.map((entry) => (
                  <ApeOption key={entry.code} entry={entry} selected={entry.code === value.trim()} onPick={pick} />
                ))}
                <div className="mx-3 my-1.5 border-t border-[rgba(245,245,245,0.08)]" />
                <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/35">
                  Tous les codes
                </p>
                {filtered.map((entry) => (
                  <ApeOption key={entry.code} entry={entry} selected={entry.code === value.trim()} onPick={pick} />
                ))}
              </>
            )}
          </div>
          {value.trim() ? (
            <div className="border-t border-[rgba(245,245,245,0.08)] p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full text-xs text-[#F5F5F5]/55 hover:text-[#F5F5F5]"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Effacer la sélection
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
