"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Project } from "@/lib/sidekick-store";
import type { ProjectCockpit } from "@/modules/projects/lib/project-cockpit";
import { cn, focusRing } from "@/lib/utils";
import { AlertTriangle, ArrowRight, BookOpen, CalendarDays, GripVertical, Mic2, Music2, Star } from "lucide-react";

const STATUS_LABEL: Record<Project["status"], string> = { idea: "Idée", in_progress: "En cours", paused: "En pause", done: "Terminé", archived: "Archivé" };
const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export function ProjectCard({ project, cockpit, onTogglePin, onDragStart, onDrop }: { project: Project; cockpit: ProjectCockpit; onTogglePin: (project: Project) => void; onDragStart?: () => void; onDrop?: () => void }) {
  const router = useRouter();
  const open = () => router.push(`/projects/${project.id}`);
  return (
    <article draggable={project.pinned} onDragStart={onDragStart} onDragOver={(e) => project.pinned && e.preventDefault()} onDrop={onDrop} className="group relative overflow-hidden rounded-xl border border-[rgba(245,245,245,0.09)] bg-[rgba(44,44,46,0.5)] transition-colors hover:border-[rgba(245,245,245,0.2)]">
      <div className="grid min-h-[126px] grid-cols-[76px_minmax(0,1fr)] gap-4 p-4 md:grid-cols-[84px_minmax(180px,1.1fr)_minmax(220px,1.35fr)_minmax(150px,.75fr)_76px] md:items-center md:gap-5">
        <div className="relative h-[76px] w-[76px] overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-[#242438] to-[#14141c] md:h-[84px] md:w-[84px]">
          {project.cover ? <Image src={project.cover} alt="" fill unoptimized className="object-cover" sizes="84px" /> : <span className="flex h-full items-center justify-center text-2xl font-light text-white/15">{project.title.charAt(0).toUpperCase()}</span>}
        </div>
        <button type="button" onClick={open} className={cn("min-w-0 rounded-sm text-left", focusRing)}>
          <div className="flex items-center gap-2"><h2 className="truncate text-[15px] font-semibold text-[#F5F5F5]">{project.title}</h2><span className="shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[.08em] text-white/40">{STATUS_LABEL[project.status]}</span></div>
          <p className="mt-1 text-[11px] text-white/40">{cockpit.phase}</p>
          <div className="mt-3 flex items-center gap-2 text-white/35">{cockpit.sectorProgress.phono !== undefined && <Music2 size={13} aria-label="Phono" />}{cockpit.sectorProgress.edition !== undefined && <BookOpen size={13} aria-label="Édition" />}{cockpit.sectorProgress.live !== undefined && <Mic2 size={13} aria-label="Live" />}</div>
        </button>
        <button type="button" onClick={open} className={cn("col-span-2 rounded-sm text-left md:col-span-1", focusRing)}>
          {cockpit.progress === null ? <div className="rounded-lg border border-dashed border-white/10 px-4 py-3"><p className="text-sm text-white/55">À démarrer</p><p className="mt-0.5 text-[11px] text-white/30">Lie un premier élément pour calculer l’avancement.</p></div> : <><div className="flex items-end justify-between"><span className="text-[10px] font-semibold uppercase tracking-[.12em] text-white/35">Progression</span><span className="text-2xl font-extralight tabular-nums text-[#F5F5F5]">{cockpit.progress}<span className="text-sm text-white/35">%</span></span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-[#F0FF00] shadow-[0_0_12px_rgba(240,255,0,.35)]" style={{ width: `${cockpit.progress}%` }} /></div><div className="mt-2 flex gap-3 text-[10px] text-white/35">{Object.entries(cockpit.sectorProgress).map(([sector, value]) => <span key={sector} className="capitalize">{sector} {value}%</span>)}</div></>}
        </button>
        {project.status !== "idea" && <div className="col-span-2 space-y-2 md:col-span-1">{cockpit.nextDate && <div className="flex items-start gap-2"><CalendarDays size={13} className="mt-0.5 shrink-0 text-[#F0FF00]/70" /><div><p className="text-xs text-white/70">{formatDate(cockpit.nextDate.date)}</p><p className="line-clamp-1 text-[10px] text-white/35">{cockpit.nextDate.label}</p></div></div>}{cockpit.alerts[0] ? <div className="flex items-center gap-2 text-[11px] text-amber-300/80"><AlertTriangle size={12} /><span className="truncate">{cockpit.alerts[0]}</span>{cockpit.alerts.length > 1 && <span className="text-white/30">+{cockpit.alerts.length - 1}</span>}</div> : <p className="text-[11px] text-emerald-300/60">Aucun blocage détecté</p>}</div>}
        <div className="absolute right-3 top-3 flex items-center gap-1 md:static">{project.pinned && <GripVertical size={15} className="cursor-grab text-white/20" aria-label="Réordonner" />}<button type="button" onClick={() => onTogglePin(project)} aria-label={project.pinned ? "Désépingler le projet" : "Épingler le projet"} aria-pressed={project.pinned} className={cn("flex h-8 w-8 items-center justify-center rounded-md text-white/30 hover:bg-white/5 hover:text-[#F0FF00]", focusRing)}><Star size={15} className={project.pinned ? "fill-[#F0FF00] text-[#F0FF00]" : ""} /></button><ArrowRight size={15} className="hidden text-white/15 transition-transform group-hover:translate-x-0.5 group-hover:text-white/45 md:block" /></div>
      </div>
    </article>
  );
}
