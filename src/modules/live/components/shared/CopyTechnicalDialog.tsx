"use client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLiveData } from "@/hooks/useLiveData";
import { KIND_META, type LiveProduction } from "../../lib/live-model";
import { plural, showsOf } from "../../lib/live-links";
import { technicalIsEmpty } from "../../lib/live-equipment";

/** Choisit le spectacle ou le DJ set dont on reprend la fiche technique. */
export function CopyTechnicalDialog({ open, onOpenChange, excludeId, onPick }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    excludeId?: string;
    onPick: (source: LiveProduction) => void;
}) {
    const { productions } = useLiveData();
    const sources = showsOf(productions).filter(p => p.id !== excludeId);
    return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Importer une fiche technique</DialogTitle>
    <DialogDescription>Choisis le spectacle ou le DJ set dont tu veux reprendre la fiche : matériel, détails, équipe et contacts.</DialogDescription>
    </DialogHeader>
    <div className="max-h-80 space-y-2 overflow-y-auto">
        {sources.map(p => {
            const empty = technicalIsEmpty(p.technical, p.equipmentListIds);
            return <button key={p.id} type="button" disabled={empty} onClick={() => onPick(p)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#F5F5F5]/10 px-4 py-3 text-left text-sm transition-colors hover:border-[#F0FF00]/40 disabled:cursor-not-allowed disabled:opacity-40">
            <span className="min-w-0">
            <span className="block truncate font-medium">{p.title || "Sans titre"}</span>
            <span className="text-xs text-[#F5F5F5]/45">{KIND_META[p.kind].label}</span>
            </span>
            <span className="shrink-0 text-xs text-[#F5F5F5]/55">{empty ? "Fiche vide" : `${plural(p.equipmentListIds.length, "liste")} · ${plural(p.technical.brought.length + p.technical.venue.length, "ligne")}`}</span>
            </button>;
        })}
        {!sources.length && <p className="text-sm text-[#F5F5F5]/55">Aucun autre spectacle ou DJ set.</p>}
    </div>
    </DialogContent>
    </Dialog>;
}
