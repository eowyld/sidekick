"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { Archive, FolderKanban, Plus } from "lucide-react";
import { useProjectsData, EMPTY_PROJECT_MILESTONES } from "@/hooks/useProjectsData";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useEditionData } from "@/hooks/useEditionData";
import { useLiveData } from "@/hooks/useLiveData";
import { useSidekickData } from "@/hooks/useSidekickData";
import { migrateProjectsToSupabase } from "@/modules/projects/lib/migrate-projects-to-supabase";
import { buildProjectCockpit } from "@/modules/projects/lib/project-cockpit";
import { ProjectCard } from "./ProjectCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { PageError } from "@/components/ui/page-error";
import { PageLoader } from "@/components/ui/page-loader";
import { cn, focusRing } from "@/lib/utils";
import type { Project } from "@/lib/sidekick-store";

const isAbortError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AbortError" || error.message.toLowerCase().includes("signal is aborted"));

type Filter = "all" | "in_progress" | "paused" | "done";
const FILTERS: Array<{ key: Filter; label: string }> = [{ key: "all", label: "Tous" }, { key: "in_progress", label: "En cours" }, { key: "paused", label: "En pause" }, { key: "done", label: "Terminés" }];

function QuickProjectDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (title: string, targetDate: string) => void }) {
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const close = () => { setTitle(""); setTargetDate(""); onClose(); };
  const submit = () => { if (!title.trim()) return; onCreate(title.trim(), targetDate); close(); };
  return <Dialog open={open} onOpenChange={(value) => !value && close()}><DialogContent className="max-w-md border-white/10 bg-[#171717]"><DialogHeader><DialogTitle>Nouveau projet</DialogTitle></DialogHeader><div className="space-y-5 py-2"><div className="space-y-2"><Label htmlFor="project-title">Nom du projet</Label><Input id="project-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="EP Horizon, tournée d'été…" /></div><div className="space-y-2"><Label htmlFor="project-target">Date cible <span className="font-normal text-white/35">· facultative</span></Label><DatePicker id="project-target" value={targetDate} onChange={setTargetDate} placeholder="Ajouter une date cible" /><p className="text-[11px] leading-relaxed text-white/35">Elle servira seulement si aucune sortie, date live ou autre échéance liée n’est disponible.</p></div></div><DialogFooter><Button variant="ghost" onClick={close}>Annuler</Button><Button onClick={submit} disabled={!title.trim()}>Créer le projet</Button></DialogFooter></DialogContent></Dialog>;
}

export function ProjectsPage() {
  const router = useRouter();
  const { projects, setProjects, loading, error } = useProjectsData();
  const phono = usePhonoData();
  const edition = useEditionData();
  const live = useLiveData();
  const { data: legacy } = useSidekickData();
  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    void migrateProjectsToSupabase((legacy.projects?.projects ?? []) as Project[]).catch((migrationError) => {
      if (!isAbortError(migrationError)) console.error("[ProjectsPage] Migration échouée:", migrationError);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const source = useMemo(() => ({ tracks: phono.tracks, albums: phono.albums, sessions: phono.sessions, works: edition.works, tourDates: live.tourDates, rehearsals: live.rehearsals }), [phono.tracks, phono.albums, phono.sessions, edition.works, live.tourDates, live.rehearsals]);
  const cockpitById = useMemo(() => new Map(projects.map((project) => [project.id, buildProjectCockpit(project, source)])), [projects, source]);
  const ideas = projects.filter((project) => project.status === "idea");
  const engaged = projects.filter((project) => project.status !== "idea" && project.status !== "archived" && (filter === "all" || project.status === filter)).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.pinned && b.pinned) return a.pinnedOrder - b.pinnedOrder;
    const ac = cockpitById.get(a.id)!; const bc = cockpitById.get(b.id)!;
    if (ac.alerts.length !== bc.alerts.length) return bc.alerts.length - ac.alerts.length;
    return (ac.nextDate?.date ?? "9999").localeCompare(bc.nextDate?.date ?? "9999");
  });

  const create = (title: string, targetDate: string) => { const now = new Date().toISOString(); const project: Project = { id: crypto.randomUUID(), title, targetDate, description: "", status: "idea", cover: "", images: [], sectors: [], members: [], linkedAlbums: [], linkedTracks: [], linkedSessions: [], linkedWorks: [], linkedTourDates: [], linkedRehearsals: [], linkedStatutIds: [], keyDates: [], notes: "", brainstorm: "", creationSeededSectors: [], createdAt: now, updatedAt: now, pinned: false, pinnedOrder: 0, manualMilestones: { ...EMPTY_PROJECT_MILESTONES }, objectives: [], milestoneStates: {} }; setProjects((prev) => [project, ...prev]); };
  const togglePin = (project: Project) => setProjects((prev) => prev.map((item) => item.id === project.id ? { ...item, pinned: !item.pinned, pinnedOrder: project.pinned ? 0 : Math.max(0, ...prev.filter((p) => p.pinned).map((p) => p.pinnedOrder)) + 1, updatedAt: new Date().toISOString() } : item));
  const drop = (targetId: string) => { if (!draggedId || draggedId === targetId) return; setProjects((prev) => { const pinned = prev.filter((p) => p.pinned).sort((a, b) => a.pinnedOrder - b.pinnedOrder); const from = pinned.findIndex((p) => p.id === draggedId); const to = pinned.findIndex((p) => p.id === targetId); if (from < 0 || to < 0) return prev; const [moved] = pinned.splice(from, 1); pinned.splice(to, 0, moved); const order = new Map(pinned.map((p, index) => [p.id, index])); return prev.map((p) => order.has(p.id) ? { ...p, pinnedOrder: order.get(p.id)!, updatedAt: new Date().toISOString() } : p); }); setDraggedId(null); };

  if (loading || phono.loading || edition.loading || live.loading) return <PageLoader />;
  if (error || phono.error || edition.error || live.error) return <PageError title="Impossible de charger tes projets" description="Vérifie ta connexion ou réessaie dans quelques instants." onRetry={() => { mutate("user_projects"); mutate("user_phono"); mutate("user_edition"); mutate("user_live"); }} />;

  return <div className="max-w-6xl pb-12">
    <header className="flex flex-wrap items-end justify-between gap-5"><div><p className="mb-1 text-[11px] font-semibold uppercase tracking-[.15em] text-white/40">Pilotage</p><h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">Projets</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-white/45">Suis l’avancement de tes sorties, tournées et projets transversaux depuis un seul endroit.</p></div><div className="flex items-center gap-2"><Button variant="ghost" size="sm" asChild><Link href="/projects/archives"><Archive size={14} /> Archives</Link></Button><Button size="sm" onClick={() => router.push("/projects/nouveau")}><Plus size={14} /> Nouveau projet</Button></div></header>
    {projects.length === 0 ? <EmptyState className="mt-12 rounded-xl border border-white/10 bg-white/[.02]" icon={FolderKanban} title="Ton premier projet commence ici" description="Regroupe tout ce qui fait avancer une sortie, une tournée ou une création. SIDEKICK relie les informations de tes modules et t’offre une vision claire de l’ensemble." action={{ label: "Créer un projet", onClick: () => router.push("/projects/nouveau") }} /> : <>
      <div className="mb-5 mt-9 flex flex-wrap items-center gap-2">{FILTERS.map((item) => { const active = filter === item.key; const count = item.key === "all" ? projects.filter((p) => !["idea", "archived"].includes(p.status)).length : projects.filter((p) => p.status === item.key).length; return <button key={item.key} type="button" aria-pressed={active} onClick={() => setFilter(item.key)} className={cn("rounded border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[.06em] transition-colors", focusRing, active ? "border-[#F0FF00]/50 bg-[#F0FF00]/10 text-[#F0FF00]" : "border-white/10 text-white/45 hover:text-white/75")}>{item.label}<span className={cn("ml-2 tabular-nums", active ? "text-[#F0FF00]/60" : "text-white/30")}>{count}</span></button>; })}</div>
      <section aria-labelledby="active-projects"><div className="mb-3 flex items-center justify-between"><h2 id="active-projects" className="text-[11px] font-semibold uppercase tracking-[.13em] text-white/40">Projets engagés</h2><span className="text-[11px] text-white/25">Les épinglés peuvent être réordonnés</span></div><div className="space-y-3">{engaged.length ? engaged.map((project) => <ProjectCard key={project.id} project={project} cockpit={cockpitById.get(project.id)!} onTogglePin={togglePin} onDragStart={() => setDraggedId(project.id)} onDrop={() => drop(project.id)} />) : <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-white/35">Aucun projet dans cette vue.</div>}</div></section>
      {ideas.length > 0 && <section className="mt-10" aria-labelledby="project-ideas"><div className="mb-3"><h2 id="project-ideas" className="text-[11px] font-semibold uppercase tracking-[.13em] text-white/40">Idées</h2><p className="mt-1 text-xs text-white/30">Des projets encore légers, à développer quand le moment sera venu.</p></div><div className="space-y-3">{ideas.map((project) => <ProjectCard key={project.id} project={project} cockpit={cockpitById.get(project.id)!} onTogglePin={togglePin} />)}</div></section>}
    </>}
    <QuickProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreate={create} />
  </div>;
}
