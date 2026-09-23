"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Download, EyeOff, Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDuration } from "@/lib/audio-peaks";
import { useListeningData } from "@/hooks/useListeningData";
import type {
  ListeningItemStat,
  ListeningLink,
  ListeningLinkStats as Stats,
} from "@/lib/listening-types";

interface Props {
  link: ListeningLink;
  onClose: () => void;
}

type LinkItem = ListeningLink["items"][number];

const ACCENT = "#F0FF00";
const DAY_MS = 86_400_000;

export function ListeningLinkStats({ link, onClose }: Props) {
  const { loadStats } = useListeningData();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void loadStats(link.id).then(setStats);
  }, [link.id, loadStats]);

  const itemById = useMemo(
    () => new Map(link.items.map((item) => [item.id, item])),
    [link.items]
  );

  return (
    <Dialog open onOpenChange={onClose}>
      {/* Largeur en style : `cn()` ne fusionne pas, un `max-w-4xl` perdrait
          contre le `max-w-[calc(100%-2rem)]` de base. */}
      <DialogContent className="max-h-[90vh] overflow-y-auto" style={{ maxWidth: "min(960px, calc(100% - 2rem))" }}>
        <DialogHeader>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40">
            Statistiques
          </p>
          <DialogTitle className="text-xl">{link.title || "Sans titre"}</DialogTitle>
          <p className="text-xs text-[#F5F5F5]/45">
            Créé le {new Date(link.createdAt).toLocaleDateString("fr-FR")}
            {stats?.lastPlayedAt ? ` · dernière écoute ${timeAgo(stats.lastPlayedAt)}` : ""}
          </p>
        </DialogHeader>

        {!stats ? (
          <p className="py-10 text-center text-sm text-[#F5F5F5]/50">Chargement…</p>
        ) : stats.sessionCount === 0 ? (
          <div className="py-12 text-center">
            <p className="font-medium">Pas encore d&apos;écoute</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[#F5F5F5]/55">
              Une tâche de relance apparaîtra automatiquement si un envoi reste
              sans ouverture.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <KpiRow stats={stats} />
            <ActivityChart dates={stats.sessionDates} createdAt={link.createdAt} />
            <TrackRetention link={link} stats={stats} />
            <Listeners stats={stats} itemById={itemById} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Chiffres clés ─────────────────────────────────────────────────────── */

function KpiRow({ stats }: { stats: Stats }) {
  const identified = stats.identifiedSessions.length;
  const perVisitor = stats.sessionCount > 0 ? stats.totalListenedMs / stats.sessionCount : 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Kpi
        label="Visiteurs"
        value={String(stats.sessionCount)}
        hint={identified > 0 ? `dont ${identified} identifié${identified > 1 ? "s" : ""}` : "tous anonymes"}
      />
      <Kpi
        label="Temps d'écoute"
        value={formatListenTime(stats.totalListenedMs)}
        hint={`${formatListenTime(perVisitor)} par visiteur`}
      />
      <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/40">
          Écoute complète
        </p>
        <div className="mt-2 flex items-center gap-3">
          <CompletionRing ratio={stats.averageCompletion} />
          <p className="min-w-0 text-xs text-[#F5F5F5]/45">des titres lancés</p>
        </div>
      </div>
      <Kpi
        label="Téléchargements"
        value={String(stats.downloadCount)}
        hint={stats.downloadCount > 0 ? "fichiers récupérés" : "aucun pour l'instant"}
      />
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/40" title={label}>{label}</p>
      <p className="mt-2 whitespace-nowrap text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-1 truncate text-xs text-[#F5F5F5]/45">{hint}</p>
    </div>
  );
}

function CompletionRing({ ratio }: { ratio: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.round(ratio * 100);

  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 64 64" className="h-14 w-14 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(245,245,245,0.1)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={ACCENT}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
        {percent}%
      </span>
    </div>
  );
}

/* ─── Activité jour par jour ────────────────────────────────────────────── */

function ActivityChart({ dates, createdAt }: { dates: string[]; createdAt: string }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    const created = startOfDay(new Date(createdAt));
    // Au plus 30 jours, au moins 14 : une courbe de trois barres ne dit rien.
    const span = Math.min(30, Math.max(14, Math.round((today - created) / DAY_MS) + 1));
    const start = today - (span - 1) * DAY_MS;

    const counts = new Array<number>(span).fill(0);
    for (const iso of dates) {
      const index = Math.round((startOfDay(new Date(iso)) - start) / DAY_MS);
      if (index >= 0 && index < span) counts[index] += 1;
    }
    return counts.map((count, i) => ({ date: new Date(start + i * DAY_MS), count }));
  }, [dates, createdAt]);

  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const active = hovered !== null ? days[hovered] : null;

  return (
    <section>
      <SectionTitle
        title="Activité"
        aside={
          active
            ? `${formatDay(active.date)} · ${active.count} visite${active.count > 1 ? "s" : ""}`
            : `${total} visite${total > 1 ? "s" : ""} sur ${days.length} jours`
        }
      />
      <div className="rounded-xl border border-white/[0.08] bg-black/20 px-4 pb-3 pt-4">
        <div
          className="flex h-28 items-end gap-[2px]"
          onMouseLeave={() => setHovered(null)}
          role="img"
          aria-label={`Visites par jour sur les ${days.length} derniers jours`}
        >
          {days.map((day, i) => (
            <div
              key={i}
              className="flex h-full flex-1 items-end"
              onMouseEnter={() => setHovered(i)}
            >
              <div
                className="w-full rounded-t-[4px] transition-colors"
                style={{
                  height: day.count > 0 ? `${Math.max(6, (day.count / max) * 100)}%` : "2px",
                  background:
                    day.count === 0
                      ? "rgba(245,245,245,0.12)"
                      : hovered === null || hovered === i
                        ? ACCENT
                        : "rgba(240,255,0,0.35)",
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] tabular-nums text-[#F5F5F5]/35">
          <span>{formatDay(days[0].date)}</span>
          <span>aujourd&apos;hui</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Rétention par titre ───────────────────────────────────────────────── */

function TrackRetention({ link, stats }: { link: ListeningLink; stats: Stats }) {
  const maxListeners = Math.max(
    1,
    ...Object.values(stats.itemStats).map((item) => item.listeners)
  );

  return (
    <section>
      <SectionTitle title="Titres" aside="plus c'est jaune, plus on est allé loin" />
      <ul className="space-y-2">
        {link.items.map((item, index) => (
          <TrackRow
            key={item.id}
            index={index}
            item={item}
            stat={stats.itemStats[item.id]}
            maxListeners={maxListeners}
          />
        ))}
      </ul>
    </section>
  );
}

function TrackRow({
  index,
  item,
  stat,
  maxListeners,
}: {
  index: number;
  item: LinkItem;
  stat?: ListeningItemStat;
  maxListeners: number;
}) {
  const listeners = stat?.listeners ?? 0;
  const averageReach =
    stat && item.durationMs > 0
      ? stat.reachedMs.reduce((sum, ms) => sum + Math.min(1, ms / item.durationMs), 0) /
        stat.reachedMs.length
      : 0;

  return (
    <li className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
      <div className="flex items-center gap-3">
        <span className="w-5 text-xs tabular-nums text-[#F5F5F5]/30">
          {String(index + 1).padStart(2, "0")}
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.snapshot.title}</p>
        <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums text-[#F5F5F5]/55">
          {stat && stat.replays > 0 && (
            <span className="flex items-center gap-1" title="Réécoutes">
              <Repeat className="h-3 w-3" />
              {stat.replays}
            </span>
          )}
          {stat && stat.downloads > 0 && (
            <span className="flex items-center gap-1" title="Téléchargements">
              <Download className="h-3 w-3" />
              {stat.downloads}
            </span>
          )}
          <span>{formatDuration(item.durationMs)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <RetentionWave item={item} stat={stat} />
        </div>
        <div className="flex items-baseline gap-2 sm:block sm:w-24 sm:shrink-0 sm:text-right">
          <p className="text-lg font-bold tabular-nums leading-none">
            {listeners > 0 ? `${Math.round(averageReach * 100)}%` : "–"}
          </p>
          <p className="text-[10px] text-[#F5F5F5]/40 sm:mt-1">écouté en moyenne</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full"
            style={{ width: `${(listeners / maxListeners) * 100}%`, background: ACCENT }}
          />
        </div>
        <p className="w-24 shrink-0 text-right text-[10px] tabular-nums text-[#F5F5F5]/45">
          {listeners} auditeur{listeners > 1 ? "s" : ""}
        </p>
      </div>
    </li>
  );
}

/**
 * Forme d'onde du titre, chaque barre éclairée selon la part des auditeurs
 * arrivés jusqu'à ce point. On lit d'un coup d'œil où l'écoute décroche.
 */
function RetentionWave({ item, stat }: { item: LinkItem; stat?: ListeningItemStat }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const peaks = item.peaks.length > 0 ? item.peaks : new Array<number>(80).fill(0.5);
  const count = peaks.length;
  const listeners = stat?.reachedMs.length ?? 0;

  const shares = useMemo(() => {
    if (!stat || listeners === 0 || item.durationMs <= 0) return peaks.map(() => 0);
    return peaks.map((_, i) => {
      const position = ((i + 0.5) / count) * item.durationMs;
      return stat.reachedMs.filter((ms) => ms >= position).length / listeners;
    });
  }, [peaks, count, stat, listeners, item.durationMs]);

  const active = hovered !== null ? shares[hovered] : null;

  return (
    <div className="relative">
      <svg
        width="100%"
        height={44}
        viewBox={`0 0 ${count} 100`}
        preserveAspectRatio="none"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const i = Math.floor(((event.clientX - rect.left) / rect.width) * count);
          setHovered(Math.min(count - 1, Math.max(0, i)));
        }}
        onMouseLeave={() => setHovered(null)}
        role="img"
        aria-label={`Rétention de ${item.snapshot.title}`}
      >
        {peaks.map((peak, i) => {
          const barHeight = Math.max(6, peak * 100);
          const share = shares[i];
          return (
            <rect
              key={i}
              x={i}
              y={(100 - barHeight) / 2}
              width={0.7}
              height={barHeight}
              fill={share > 0 ? ACCENT : "rgba(245,245,245,0.14)"}
              fillOpacity={share > 0 ? 0.18 + share * 0.82 : 1}
            />
          );
        })}
        {hovered !== null && (
          <rect x={hovered} y={0} width={0.7} height={100} fill="#F5F5F5" fillOpacity={0.9} />
        )}
      </svg>
      {hovered !== null && active !== null && (
        <div
          className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#101010] px-2 py-1 text-[11px] tabular-nums shadow-lg"
          style={{ left: `${((hovered + 0.5) / count) * 100}%` }}
        >
          {formatDuration(((hovered + 0.5) / count) * item.durationMs)} ·{" "}
          {Math.round(active * listeners)} sur {listeners} encore là
        </div>
      )}
    </div>
  );
}

/* ─── Auditeurs ─────────────────────────────────────────────────────────── */

function Listeners({ stats, itemById }: { stats: Stats; itemById: Map<string, LinkItem> }) {
  const anonymousMs = Object.values(stats.anonymousListenedMsByItem).reduce((a, b) => a + b, 0);

  return (
    <section>
      <SectionTitle title="Auditeurs" />
      <div className="grid gap-3 md:grid-cols-2">
        {stats.identifiedSessions.map((session) => {
          const listened = session.plays.reduce((sum, play) => sum + play.listenedMs, 0);
          return (
            <div key={session.id} className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0FF00]/10 text-sm font-bold text-[#F0FF00]">
                  {initials(session.visitorName ?? "")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{session.visitorName}</p>
                  <p className="text-xs text-[#F5F5F5]/45">
                    {`${timeAgo(session.lastSeenAt)} · ${formatListenTime(listened)} d'écoute`}
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-2.5">
                {session.plays.map((play) => {
                  const item = itemById.get(play.itemId);
                  const duration = item?.durationMs ?? 0;
                  const reach = play.completed
                    ? 1
                    : duration > 0
                      ? Math.min(1, play.maxPositionMs / duration)
                      : 0;
                  return (
                    <li key={play.itemId}>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="min-w-0 flex-1 truncate text-[#F5F5F5]/75">
                          {item?.snapshot.title ?? "Titre retiré"}
                        </span>
                        {play.playCount > 1 && (
                          <span className="flex items-center gap-0.5 text-[#F5F5F5]/50" title="Réécoutes">
                            <Repeat className="h-3 w-3" />×{play.playCount}
                          </span>
                        )}
                        {play.downloaded && (
                          <Download className="h-3 w-3 text-[#F5F5F5]/50" aria-label="Téléchargé" />
                        )}
                        {play.completed && (
                          <Check className="h-3 w-3 text-[#F0FF00]" aria-label="Écouté jusqu'au bout" />
                        )}
                        <span className="w-9 text-right tabular-nums text-[#F5F5F5]/50">
                          {Math.round(reach * 100)}%
                        </span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${reach * 100}%`,
                            background: play.completed ? ACCENT : "rgba(240,255,0,0.55)",
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {stats.anonymousSessionCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/[0.12] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
              <EyeOff className="h-4 w-4 text-[#F5F5F5]/50" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {stats.anonymousSessionCount} écoute{stats.anonymousSessionCount > 1 ? "s" : ""} anonyme
                {stats.anonymousSessionCount > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-[#F5F5F5]/45">
                {formatListenTime(anonymousMs)} au total, comptées dans les titres ci-dessus
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Utilitaires ───────────────────────────────────────────────────────── */

function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/40">{title}</h3>
      {aside && <p className="truncate text-xs tabular-nums text-[#F5F5F5]/45">{aside}</p>}
    </div>
  );
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

/** « 42 s », « 7 min », « 1 h 12 ». Un temps cumulé, pas une position. */
function formatListenTime(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${String(rest).padStart(2, "0")}` : `${hours} h`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / DAY_MS);
  if (days <= 1) return "hier";
  if (days < 30) return `il y a ${days} jours`;
  return `le ${new Date(iso).toLocaleDateString("fr-FR")}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
