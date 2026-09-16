"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import posthog from "posthog-js";
import { mutate } from "swr";
import { useRouter } from "next/navigation";
import { useProjectsData } from "@/hooks/useProjectsData";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useEditionData } from "@/hooks/useEditionData";
import { useLiveData } from "@/hooks/useLiveData";
import { buildProjectCockpit } from "@/modules/projects/lib/project-cockpit";
import { ProjectModal } from "./ProjectModal";
import { ProjectTabs } from "./ProjectTabs";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, BookOpen, CalendarDays, ChevronDown, Mic2, MoreHorizontal, Music2, Pencil, Star } from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/sidekick-store";
import { cn, focusRing } from "@/lib/utils";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idée" }, { value: "in_progress", label: "En cours" },
  { value: "paused", label: "En pause" }, { value: "done", label: "Terminé" },
];
const STATUS_STYLE: Record<ProjectStatus, string> = { idea: "text-amber-300", in_progress: "text-[#F0FF00]", paused: "text-white/45", done: "text-blue-300", archived: "text-white/30" };
const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function ProjectDashboard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { projects, setProjects, loading, error } = useProjectsData();
  const phono = usePhonoData(); const edition = useEditionData(); const live = useLiveData();
  const [editOpen, setEditOpen] = useState(false); const [deleteOpen, setDeleteOpen] = useState(false);
  const project = projects.find((item) => item.id === projectId);
  const source = useMemo(() => ({ tracks: phono.tracks, albums: phono.albums, sessions: phono.sessions, works: edition.works, tourDates: live.tourDates, rehearsals: live.rehearsals }), [phono.tracks, phono.albums, phono.sessions, edition.works, live.tourDates, live.rehearsals]);
  const cockpit = useMemo(() => project ? buildProjectCockpit(project, source) : null, [project, source]);

  if (loading || phono.loading || edition.loading || live.loading) return <PageLoader />;
  if (error || phono.error || edition.error || live.error) return <PageError title="Impossible de charger ce projet" description="Vérifie ta connexion ou réessaie dans quelques instants." onRetry={() => { mutate("user_projects"); mutate("user_phono"); mutate("user_edition"); mutate("user_live"); }} />;
  if (!project || !cockpit) return <PageError title="Projet introuvable" description="Il a peut-être été supprimé ou archivé." onRetry={() => router.push("/projects")} />;

  const update = (updates: Partial<Project>) => setProjects((prev) => prev.map((item) => item.id === projectId ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item));
  const setStatus = (status: ProjectStatus) => { posthog.capture("project_status_changed", { new_status: status, previous_status: project.status }); update({ status }); };
  const remove = () => { posthog.capture("project_deleted", { sectors: project.sectors }); setProjects((prev) => prev.filter((item) => item.id !== projectId)); router.push("/projects"); };
  const currentStatus = STATUS_OPTIONS.find((item) => item.value === project.status);

  return <div className="max-w-6xl space-y-7 pb-12">
    <button type="button" onClick={() => router.push("/projects")} className={cn("flex items-center gap-1.5 rounded-sm text-xs text-white/40 transition-colors hover:text-white", focusRing)}><ArrowLeft size={13} /> Tous les projets</button>

    <header className="overflow-hidden rounded-xl border border-white/[.09] bg-[rgba(44,44,46,.5)]">
      <div className="grid md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative min-h-[150px] overflow-hidden bg-gradient-to-br from-[#242438] to-[#14141c]">
          {project.cover ? <Image src={project.cover} alt="" fill unoptimized className="object-cover" sizes="180px" priority /> : <span className="flex h-full min-h-[150px] items-center justify-center text-5xl font-extralight text-white/10">{project.title.charAt(0).toUpperCase()}</span>}
        </div>
        <div className="flex min-w-0 flex-col justify-between gap-6 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="mb-1 text-[10px] font-semibold uppercase tracking-[.16em] text-white/35">Projet · {cockpit.phase}</p><h1 className="truncate text-2xl font-bold tracking-tight text-[#F5F5F5]">{project.title}</h1>{project.description && <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-white/50">{project.description}</p>}</div><div className="flex items-center gap-1"><button type="button" onClick={() => update({ pinned: !project.pinned })} aria-label={project.pinned ? "Désépingler" : "Épingler"} aria-pressed={project.pinned} className={cn("flex h-9 w-9 items-center justify-center rounded-md text-white/35 hover:bg-white/5 hover:text-[#F0FF00]", focusRing)}><Star size={15} className={project.pinned ? "fill-[#F0FF00] text-[#F0FF00]" : ""} /></button><DropdownMenu><DropdownMenuTrigger asChild><button aria-label="Actions du projet" className={cn("flex h-9 w-9 items-center justify-center rounded-md text-white/40 hover:bg-white/5 hover:text-white", focusRing)}><MoreHorizontal size={17} /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setEditOpen(true)}><Pencil size={13} /> Modifier</DropdownMenuItem><DropdownMenuItem onClick={() => setStatus("archived")}>Archiver</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>Supprimer</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div>
          <div className="grid gap-4 border-t border-white/[.08] pt-4 sm:grid-cols-[minmax(220px,1fr)_auto_auto] sm:items-end">
            <div>{cockpit.progress === null ? <><p className="text-sm text-white/55">À démarrer</p><p className="mt-1 text-[11px] text-white/30">Lie un premier élément pour calculer l’avancement.</p></> : <><div className="flex items-end justify-between"><span className="text-[10px] font-semibold uppercase tracking-[.12em] text-white/35">Progression globale</span><span className="text-2xl font-extralight tabular-nums">{cockpit.progress}<span className="text-sm text-white/35">%</span></span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-[#F0FF00] shadow-[0_0_12px_rgba(240,255,0,.35)]" style={{ width: `${cockpit.progress}%` }} /></div></>}</div>
            <div>{cockpit.nextDate ? <><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-white/35">Prochaine échéance</p><p className="mt-1 flex items-center gap-1.5 text-xs text-white/75"><CalendarDays size={13} className="text-[#F0FF00]/70" /> {formatDate(cockpit.nextDate.date)}</p><p className="mt-0.5 max-w-[220px] truncate text-[10px] text-white/35">{cockpit.nextDate.label}</p></> : <><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-white/35">Prochaine échéance</p><p className="mt-1 text-xs text-white/35">Aucune date à venir</p></>}</div>
            <DropdownMenu><DropdownMenuTrigger asChild><button className={cn("flex items-center gap-1.5 rounded border border-white/10 px-2.5 py-1.5 text-xs font-medium", STATUS_STYLE[project.status], focusRing)}>{currentStatus?.label ?? project.status}<ChevronDown size={12} /></button></DropdownMenuTrigger><DropdownMenuContent align="end">{STATUS_OPTIONS.map((option) => <DropdownMenuItem key={option.value} onClick={() => setStatus(option.value)} className={STATUS_STYLE[option.value]}>{option.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
          </div>
          <div className="flex flex-wrap gap-2">{Object.entries(cockpit.sectorProgress).map(([sector, value]) => { const Icon = sector === "phono" ? Music2 : sector === "edition" ? BookOpen : Mic2; return <span key={sector} className="flex items-center gap-1.5 rounded border border-white/[.09] bg-white/[.025] px-2 py-1 text-[10px] capitalize text-white/45"><Icon size={11} /> {sector} · {value}%</span>; })}</div>
        </div>
      </div>
    </header>

    <Suspense fallback={null}><ProjectTabs project={project} /></Suspense>
    <ProjectModal open={editOpen} onClose={() => setEditOpen(false)} project={project} />
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Supprimer « {project.title} » ?</DialogTitle></DialogHeader><p className="text-sm leading-relaxed text-white/55">Le projet et ses données propres seront supprimés. Les titres, œuvres et dates liés resteront dans leurs modules.</p><DialogFooter><Button variant="ghost" onClick={() => setDeleteOpen(false)}>Annuler</Button><Button variant="destructive" onClick={remove}>Supprimer le projet</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
