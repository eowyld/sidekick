"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { isChecked, type PreparationState } from "../../lib/live-model";
import type { Blocker, ProgressSummary } from "../../lib/live-progress";
import { ProgressBar } from "./LiveUI";

/**
 * Checklist d'un spectacle ou d'une tournée : une case par étape, cochée à la
 * main ou par le calcul. Une case cochée par le calcul ne se décoche pas.
 * `onChange(id, undefined)` = décocher (retirer la coche posée à la main).
 */
export function ComputedPreparation({ summary, onChange, color = "#F0FF00" }: {
    summary: ProgressSummary;
    onChange: (id: string, state: PreparationState | undefined) => void;
    color?: string;
}) {
    const [open, setOpen] = useState<string | null>(null);
    return <div className="space-y-4">
    <div className="flex justify-between text-xs text-[#F5F5F5]/60">
    <span>{summary.done} / {summary.total} étapes</span>
    <span style={{ color }}>{summary.percent}%</span>
    </div>
    <ProgressBar percent={summary.percent} color={color}/>
    <div className="divide-y divide-[#F5F5F5]/[.06]">
        {summary.steps.map(s => {
        const done = s.state === "done";
        const auto = done && !isChecked(s.stored);
        return <div key={s.id} className="py-2.5">
        <button type="button" disabled={auto} onClick={() => onChange(s.id, done ? undefined : "done")} aria-pressed={done} title={auto ? "Fait automatiquement d’après tes données" : undefined} className="flex min-w-0 items-start gap-2 text-left text-xs focus-visible:outline-[#F0FF00] disabled:cursor-default">
        <Dot done={done}/>
        <span className="min-w-0 pt-0.5">{s.label}</span>
        </button>
        {!done && s.blockers.length > 0 && <Blockers label={s.label} blockers={s.blockers} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)}/>}
        </div>;
        })}
    </div>
    </div>;
}

function Dot({ done }: { done: boolean }) {
    return <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", done ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-400" : "border-[#F5F5F5]/20 text-[#F5F5F5]/40")}>
    {done && <Check size={12}/>}
    </span>;
}

function BlockerLabel({ blocker }: { blocker: Blocker }) {
    return blocker.href ? <Link href={blocker.href} className="hover:text-[#F0FF00]">{blocker.label}</Link> : <>{blocker.label}</>;
}

/** Sous une étape à faire : ce qui manque pour qu'elle se coche d'elle-même. */
function Blockers({ label, blockers, open, onToggle }: { label: string; blockers: Blocker[]; open: boolean; onToggle: () => void }) {
    if (blockers.length === 1)
        return <p className="mt-0.5 pl-7 text-[10px] text-[#F5F5F5]/40"><BlockerLabel blocker={blockers[0]}/></p>;
    return <div className="pl-7">
    <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`Ce qui manque pour « ${label} »`} className="mt-0.5 inline-flex items-center gap-1 text-left text-[10px] text-[#F5F5F5]/40 hover:text-[#F5F5F5]">
    {blockers[0].label} (+{blockers.length - 1})
    <ChevronDown size={10} className={cn("shrink-0 transition-transform", open && "rotate-180")}/>
    </button>
    {open && <ul className="mt-2 space-y-1">
        {blockers.map((b, i) => <li key={i} className="text-[11px] text-[#F5F5F5]/55"><BlockerLabel blocker={b}/></li>)}
    </ul>}
    </div>;
}
