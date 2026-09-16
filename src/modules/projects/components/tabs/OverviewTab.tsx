"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Project } from "@/lib/sidekick-store";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useEditionData } from "@/hooks/useEditionData";
import { useLiveData } from "@/hooks/useLiveData";
import { useProjectBudgetData } from "@/hooks/useProjectBudgetData";
import { buildProjectCockpit } from "@/modules/projects/lib/project-cockpit";
import { AlertTriangle, ArrowRight, BookOpen, CalendarDays, CheckCircle2, Mic2, Music2, Wallet } from "lucide-react";
import { cn, focusRing } from "@/lib/utils";

const fmtMoney = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
const fmtDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const dateKey = (value: string) => { const iso = value?.match(/^(\d{4})-(\d{2})-(\d{2})/); if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`; const fr = value?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return fr ? `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}` : null; };

function ModuleCard({ href, icon: Icon, label, value, detail }: { href: string; icon: typeof Music2; label: string; value: string; detail: string }) {
  return <Link href={href} className={cn("group rounded-xl border border-white/[.08] bg-[rgba(44,44,46,.42)] p-4 transition-colors hover:border-white/20", focusRing)}><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.12em] text-white/35"><Icon size={13} />{label}</span><ArrowRight size={13} className="text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/50" /></div><p className="mt-4 text-xl font-light text-white/90">{value}</p><p className="mt-1 text-[11px] text-white/35">{detail}</p></Link>;
}

export function OverviewTab({ project }: { project: Project; onGoTab: (tab: string) => void }) {
  const phono = usePhonoData(); const edition = useEditionData(); const live = useLiveData(); const { kpis } = useProjectBudgetData(project.id);
  const source = useMemo(() => ({ tracks: phono.tracks, albums: phono.albums, sessions: phono.sessions, works: edition.works, tourDates: live.tourDates, rehearsals: live.rehearsals }), [phono.tracks, phono.albums, phono.sessions, edition.works, live.tourDates, live.rehearsals]);
  const cockpit = useMemo(() => buildProjectCockpit(project, source), [project, source]);
  const tracks = phono.tracks.filter((item) => project.linkedTracks.includes(item.id));
  const albums = phono.albums.filter((item) => project.linkedAlbums.includes(item.id));
  const works = edition.works.filter((item) => project.linkedWorks.includes(item.id));
  const dates = live.tourDates.filter((item) => project.linkedTourDates.includes(String(item.id)));
  const rehearsals = live.rehearsals.filter((item) => project.linkedRehearsals.includes(item.id));
  const timeline = [
    ...albums.map((item) => ({ date: dateKey(item.releaseDate), label: `Sortie · ${item.title}`, sector: "Phono" })),
    ...tracks.map((item) => ({ date: dateKey(item.releaseDate), label: `Sortie titre · ${item.title}`, sector: "Phono" })),
    ...dates.map((item) => ({ date: dateKey(item.date), label: `${item.venue || "Concert"} · ${item.city}`, sector: "Live" })),
    ...rehearsals.map((item) => ({ date: dateKey(item.date), label: item.label || "Répétition", sector: "Live" })),
    ...(project.keyDates ?? []).map((item) => ({ date: dateKey(item.date), label: item.label, sector: "Projet" })),
  ].filter((item): item is { date: string; label: string; sector: string } => Boolean(item.date)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);

  return <div className="space-y-7">
    <section aria-labelledby="attention-title"><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#F0FF00]/60">Priorités</p><h2 id="attention-title" className="mt-1 text-base font-semibold">À faire maintenant</h2></div><span className="text-[11px] text-white/30">Calculé depuis les modules liés</span></div>
      {cockpit.alerts.length ? <div className="divide-y divide-white/[.06] overflow-hidden rounded-xl border border-amber-300/15 bg-amber-300/[.025]">{cockpit.alerts.map((alert, index) => <div key={alert} className="flex items-center gap-3 px-4 py-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-300/10 text-amber-300"><AlertTriangle size={14} /></span><p className="flex-1 text-sm text-white/70">{alert}</p><span className="text-[10px] tabular-nums text-white/25">{String(index + 1).padStart(2, "0")}</span></div>)}</div> : <div className="flex items-center gap-3 rounded-xl border border-emerald-300/10 bg-emerald-300/[.025] px-4 py-4"><CheckCircle2 size={17} className="text-emerald-300/70" /><div><p className="text-sm text-white/75">Aucun blocage détecté</p><p className="mt-0.5 text-[11px] text-white/35">Les données liées sont à jour.</p></div></div>}
    </section>

    <section aria-labelledby="modules-title"><h2 id="modules-title" className="mb-3 text-[11px] font-semibold uppercase tracking-[.13em] text-white/40">Le projet dans SIDEKICK</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ModuleCard href={`/phono/catalogue?projectId=${project.id}`} icon={Music2} label="Phono" value={`${tracks.length + albums.length}`} detail={`${tracks.length} titre${tracks.length > 1 ? "s" : ""} · ${albums.length} sortie${albums.length > 1 ? "s" : ""}`} /><ModuleCard href={`/edition?projectId=${project.id}`} icon={BookOpen} label="Édition" value={`${works.length}`} detail={`œuvre${works.length > 1 ? "s" : ""} liée${works.length > 1 ? "s" : ""}`} /><ModuleCard href={`/live/representations?projectId=${project.id}`} icon={Mic2} label="Live" value={`${dates.length + rehearsals.length}`} detail={`${dates.length} date${dates.length > 1 ? "s" : ""} · ${rehearsals.length} répétition${rehearsals.length > 1 ? "s" : ""}`} /><ModuleCard href={`/projects/${project.id}?tab=budget`} icon={Wallet} label="Finances" value={fmtMoney(kpis.balance)} detail={`${fmtMoney(kpis.totalRealExpenses)} dépensé`} /></div></section>

    <section aria-labelledby="timeline-title"><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-white/30">Tous modules confondus</p><h2 id="timeline-title" className="mt-1 text-base font-semibold">Chronologie</h2></div><CalendarDays size={16} className="text-white/25" /></div>{timeline.length ? <ol className="overflow-hidden rounded-xl border border-white/[.08] bg-[rgba(44,44,46,.32)]">{timeline.map((item, index) => <li key={`${item.date}-${item.label}-${index}`} className="grid grid-cols-[72px_14px_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[.06] px-4 py-3 last:border-0"><time className="text-xs font-medium capitalize tabular-nums text-white/55">{fmtDate(item.date)}</time><span className="relative h-2 w-2 rounded-full bg-[#F0FF00] shadow-[0_0_8px_rgba(240,255,0,.4)]" /><span className="truncate text-sm text-white/70">{item.label}</span><span className="text-[9px] uppercase tracking-[.1em] text-white/25">{item.sector}</span></li>)}</ol> : <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center"><p className="text-sm text-white/45">Aucune date liée pour le moment</p><p className="mt-1 text-xs text-white/25">Les sorties, répétitions et concerts apparaîtront ici automatiquement.</p></div>}</section>
  </div>;
}
