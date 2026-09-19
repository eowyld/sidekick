"use client";
import { useId, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { progress, type PreparationState } from "../../lib/live-model";
export function LiveHeader({ title, eyebrow = "LIVE", description, actions, back }: {
    title: string;
    eyebrow?: string;
    description?: string;
    actions?: ReactNode;
    back?: string;
}) {
    return <header className="mb-6">
    <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#F5F5F5]/45">
    {back && <Link href={back} className="flex items-center gap-1 text-[#F5F5F5]/70 hover:text-[#F0FF00]"><ArrowLeft size={12}/>Retour</Link>}
    <span className="text-[#F0FF00]">
    {eyebrow}
    </span>
    </div>
    <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
    <h1 className="text-2xl font-bold tracking-tight">
    {title}
    </h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-[#F5F5F5]/55">
        {description}
        </p>}
    </div>
    <div className="flex flex-wrap gap-2">
    {actions}
    </div>
    </div>
    </header>;
}
export function Panel({ title, icon: Icon, color = "#F0FF00", children, action, description }: {
    title: string;
    icon?: LucideIcon;
    color?: string;
    children: ReactNode;
    action?: ReactNode;
    description?: string;
}) {
    return <section className="rounded-xl border border-[#F5F5F5]/[.09] bg-[rgba(44,44,46,.45)]">
    <div className="flex items-start justify-between gap-3 border-b border-[#F5F5F5]/[.06] px-5 py-4">
    <div className="flex items-center gap-3">
        {Icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}15`, color }}>
        <Icon size={17}/>
        </span>}
    <div>
    <h2 className="text-sm font-semibold">
    {title}
    </h2>
        {description && <p className="mt-1 text-xs text-[#F5F5F5]/50">
        {description}
        </p>}
    </div>
    </div>
    {action}
    </div>
    <div className="p-5">
    {children}
    </div>
    </section>;
}
export function TextField({ label, value, onChange, area, placeholder, type = "text", required, min }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    area?: boolean;
    placeholder?: string;
    type?: string;
    required?: boolean;
    min?: string;
}) {
    const id = useId();
    return <div className="space-y-2">
    <Label htmlFor={id} className="text-xs text-[#F5F5F5]/65">
    {label}
    {required ? " *" : ""}
    </Label>
    {area ? <Textarea id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}/> : <Input id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} required={required} min={min}/>}
    </div>;
}
export function Choice({ label, value, onChange, options, placeholder = "Choisir", optional }: {
    label: string;
    value?: string;
    onChange: (value: string) => void;
    options: {
        value: string;
        label: string;
    }[];
    placeholder?: string;
    optional?: boolean;
}) {
    const id = useId();
    return <div className="min-w-0 space-y-2">
    <Label htmlFor={id} className="text-xs text-[#F5F5F5]/65">
    {label}
    </Label>
    <Select value={value || "__none"} onValueChange={v => onChange(v === "__none" ? "" : v)}>
    <SelectTrigger id={id}>
    <SelectValue placeholder={placeholder}/>
    </SelectTrigger>
    <SelectContent>
        {(optional || !value) && <SelectItem value="__none">
        {optional ? "Aucun" : placeholder}
        </SelectItem>}
        {options.map(o => <SelectItem key={o.value} value={o.value}>
        {o.label}
        </SelectItem>)}
    </SelectContent>
    </Select>
    </div>;
}
export function ProgressBar({ percent, color = "#F0FF00" }: {
    percent: number;
    color?: string;
}) {
    return <div className="h-1.5 overflow-hidden rounded-full bg-[#F5F5F5]/[.07]" role="progressbar" aria-label="Préparation" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${percent}%`, background: color }}/>
    </div>;
}
export function Preparation({ steps, value, onChange, color = "#F0FF00" }: {
    steps: readonly (readonly [
        string,
        string
    ])[];
    value: Record<string, PreparationState>;
    onChange: (v: Record<string, PreparationState>) => void;
    color?: string;
}) {
    const p = progress(steps, value);
    return <div className="space-y-4">
    <div className="flex justify-between text-xs text-[#F5F5F5]/60">
    <span>{p.done} / {p.total} étapes</span>
    <span style={{ color }}>{p.percent}%</span>
    </div>
    <ProgressBar percent={p.percent} color={color}/>
    <div className="divide-y divide-[#F5F5F5]/[.06]">
        {steps.map(([id, label]) => <div key={id} className="flex items-center justify-between gap-2 py-2.5">
        <button type="button" onClick={() => onChange({ ...value, [id]: value[id] === "done" ? "todo" : "done" })} aria-pressed={value[id] === "done"} className="flex items-center gap-2 text-left text-xs focus-visible:outline-[#F0FF00]">
        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", value[id] === "done" ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-400" : "border-[#F5F5F5]/20 text-[#F5F5F5]/40")}>
        {value[id] === "done" && <Check size={12}/>}
        </span>
        <span className={cn(value[id] === "na" && "text-[#F5F5F5]/35 line-through")}>
        {label}
        </span>
        </button>
        <button type="button" onClick={() => onChange({ ...value, [id]: value[id] === "na" ? "todo" : "na" })} className="shrink-0 text-[10px] text-[#F5F5F5]/45 hover:text-[#F5F5F5]" aria-label={`${label} : ${value[id] === "na" ? "rendre nécessaire" : "non nécessaire"}`}>
        {value[id] === "na" ? "Rétablir" : "Non nécessaire"}
        </button>
        </div>)}
    </div>
    </div>;
}
export function Segments({ value, onChange, items }: {
    value: string;
    onChange: (v: string) => void;
    items: {
        id: string;
        label: string;
        count?: number;
    }[];
}) {
    return <div className="flex flex-wrap gap-1 border-b border-[#F5F5F5]/10" role="group" aria-label="Afficher">
        {items.map(i => <button key={i.id} type="button" onClick={() => onChange(i.id)} aria-pressed={value === i.id} className={cn("border-b-2 px-4 py-3 text-xs font-medium transition-colors focus-visible:outline-[#F0FF00]", value === i.id ? "border-[#F0FF00] text-[#F0FF00]" : "border-transparent text-[#F5F5F5]/50 hover:text-[#F5F5F5]")}>
        {i.label}
            {i.count !== undefined && <span className="ml-2 opacity-60">
            {i.count}
            </span>}
        </button>)}
    </div>;
}
export function Jump({ href, children }: {
    href: string;
    children: ReactNode;
}) {
    return <Button asChild variant="ghost" size="sm">
    <Link href={href}>
    {children}
    <ArrowUpRight size={13} className="ml-2"/>
    </Link>
    </Button>;
}
