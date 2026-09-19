"use client";

import { useMemo } from "react";
import { ArrowRight, Clock3, MapPin, Users } from "lucide-react";
import type { StudioSession } from "@/hooks/usePhonoData";
import { cn, focusRing } from "@/lib/utils";
import {
  daysUntil,
  formatDuration,
  isSessionPast,
  relativeDayLabel,
  sessionCost,
  sessionDurationMinutes,
  sessionMonthKey,
  sessionTimestamp,
  sessionTypeColor,
  sessionTypeLabel,
  sessionWeekday,
} from "@/modules/phono/lib/session";

interface SessionsHeaderProps {
  sessions: StudioSession[];
  onOpenSession: (id: string) => void;
}

/** Six mois derrière, six devant : la fenêtre dans laquelle on planifie. */
const MONTHS_BACK = 5;
const MONTHS_FORWARD = 6;

const MONTH_LONG = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

/**
 * Bandeau de tête des sessions studio : la prochaine échéance, le rythme de
 * travail et l'argent engagé — les trois questions qu'on se pose en arrivant.
 * Purement indicatif : le filtrage de la liste passe par la recherche et les
 * portées (Toutes / À venir / Passées), pas par ces cartes.
 */
export function SessionsHeader({
  sessions,
  onOpenSession,
}: SessionsHeaderProps) {
  const stats = useMemo(() => {
    const upcoming = sessions.filter(
      (s) => !isSessionPast(s) && s.status !== "cancelled"
    );
    const next = [...upcoming].sort(
      (a, b) => sessionTimestamp(a) - sessionTimestamp(b)
    )[0];

    const studioCost = sessions.reduce(
      (sum, s) => sum + (s.studioCost ?? 0),
      0
    );
    const otherCosts = sessions.reduce(
      (sum, s) => sum + (s.otherCosts ?? 0),
      0
    );
    const minutes = sessions.reduce(
      (sum, s) => sum + sessionDurationMinutes(s),
      0
    );

    // Répartition mensuelle, centrée sur le mois courant.
    const counts = new Map<string, number>();
    for (const s of sessions) {
      const key = sessionMonthKey(s);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const now = new Date();
    const months = [];
    for (let offset = -MONTHS_BACK; offset <= MONTHS_FORWARD; offset += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        count: counts.get(key) ?? 0,
        future: offset > 0,
        current: offset === 0,
        label: MONTH_LONG.format(d),
      });
    }

    return {
      next,
      upcomingCount: upcoming.length,
      studioCost,
      otherCosts,
      minutes,
      months,
      peak: Math.max(1, ...months.map((m) => m.count)),
    };
  }, [sessions]);

  const total = stats.studioCost + stats.otherCosts;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <NextSessionCard session={stats.next} onOpen={onOpenSession} />

      <Card label="À venir">
        <p className="text-[28px] font-extralight leading-none tabular-nums text-[#F5F5F5]">
          {stats.upcomingCount}
        </p>
        <p className="mt-1 text-xs text-[#F5F5F5]/45">
          session{stats.upcomingCount > 1 ? "s" : ""} planifiée
          {stats.upcomingCount > 1 ? "s" : ""}
        </p>

        {/* Rythme de travail sur un an glissant. Les mois à venir sont en
              accent, le passé en gris : la lecture se fait d'un coup d'œil. */}
        <div className="mt-4 flex h-8 items-end gap-[3px]">
          {stats.months.map((m) => (
            <div
              key={m.key}
              title={`${m.label} : ${m.count} session${m.count > 1 ? "s" : ""}`}
              className="flex-1 rounded-sm"
              style={{
                height: `${Math.max(3, (m.count / stats.peak) * 100)}%`,
                background:
                  m.count === 0
                    ? "rgba(245,245,245,0.06)"
                    : m.future
                      ? "rgba(240,255,0,0.55)"
                      : "rgba(245,245,245,0.28)",
                outline: m.current
                  ? "1px solid rgba(240,255,0,0.35)"
                  : undefined,
                outlineOffset: m.current ? "1px" : undefined,
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-[10px] text-[#F5F5F5]/30">Sur un an glissant</p>
      </Card>

      <Card label="Coûts enregistrés">
        <p className="flex items-baseline gap-1 text-[28px] font-extralight leading-none tabular-nums text-[#F5F5F5]">
          {total.toLocaleString("fr-FR")}
          <span className="text-base text-[#F5F5F5]/50">€</span>
        </p>
        <dl className="mt-3 space-y-1.5 text-[11px]">
          {/* Le détail n'apporte rien quand tout est à zéro : trois lignes de
                « 0 € » pour dire qu'il n'y a rien à dire. */}
          {total > 0 && (
            <>
              <CostLine label="Studio" value={stats.studioCost} />
              <CostLine label="Autres frais" value={stats.otherCosts} />
            </>
          )}
          {stats.minutes > 0 && (
            <div
              className={cn(
                "flex items-center justify-between text-[#F5F5F5]/45",
                total > 0 && "border-t border-[rgba(245,245,245,0.08)] pt-1.5"
              )}
            >
              <dt className="inline-flex items-center gap-1.5">
                <Clock3 size={11} />
                Temps de studio
              </dt>
              <dd className="tabular-nums">{formatDuration(stats.minutes)}</dd>
            </div>
          )}
        </dl>
        <p className="mt-3 text-[10px] text-[#F5F5F5]/30">
          Repris automatiquement dans les projets liés
        </p>
      </Card>
    </div>
  );
}

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/35">
        {label}
      </p>
      {children}
    </div>
  );
}

function CostLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[#F5F5F5]/45">
      <dt>{label}</dt>
      <dd className="tabular-nums text-[#F5F5F5]/70">
        {value.toLocaleString("fr-FR")} €
      </dd>
    </div>
  );
}

/**
 * Première carte : la prochaine session, cliquable et bordée d'accent. C'est
 * la seule information de la page qui appelle une action dans les jours qui
 * viennent — tout le reste est de la consultation.
 */
function NextSessionCard({
  session,
  onOpen,
}: {
  session: StudioSession | undefined;
  onOpen: (id: string) => void;
}) {
  if (!session) {
    return (
      <Card label="Prochaine session">
        <p className="text-lg font-semibold text-[#F5F5F5]">Rien de planifié</p>
        <p className="mt-1 text-xs text-[#F5F5F5]/45">
          Ton agenda studio est libre.
        </p>
      </Card>
    );
  }

  const color = sessionTypeColor(session);
  const days = daysUntil(session);
  const duration = formatDuration(sessionDurationMinutes(session));
  const cost = sessionCost(session);

  return (
    <button
      type="button"
      onClick={() => onOpen(session.id)}
      className={cn(
        "group flex flex-col rounded-xl border border-[rgba(240,255,0,0.18)] bg-[#F0FF00]/[0.04] p-5 text-left transition-colors hover:border-[rgba(240,255,0,0.32)] hover:bg-[#F0FF00]/[0.07]",
        focusRing
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F0FF00]/70">
          Prochaine session
        </p>
        {days !== null && (
          <span className="text-[10px] text-[#F5F5F5]/45">
            {relativeDayLabel(days)}
          </span>
        )}
        <ArrowRight
          size={14}
          className="ml-auto text-[#F0FF00]/50 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>

      <div className="flex items-start gap-4">
        <div className="shrink-0 text-center">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#F0FF00]/60">
            {sessionWeekday(session) || "—"}
          </p>
          <p className="text-2xl font-semibold leading-tight tabular-nums text-[#F0FF00]">
            {session.date?.slice(0, 2) || "—"}
          </p>
          <p className="text-[10px] tabular-nums text-[#F0FF00]/60">
            {session.date?.slice(3, 5) || "—"}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight text-[#F5F5F5]">
            {session.title || "Session sans titre"}
          </p>
          <div className="mt-2 space-y-1 text-[11px] text-[#F5F5F5]/50">
            <p className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: color, boxShadow: `0 0 8px ${color}66` }}
              />
              {sessionTypeLabel(session)}
            </p>
            <p className="flex items-center gap-1 tabular-nums">
              <Clock3 size={11} />
              {session.time || "Heure à définir"}
              {duration ? ` · ${duration}` : ""}
            </p>
            {session.location && (
              <p className="flex items-center gap-1 truncate">
                <MapPin size={11} />
                {session.location}
              </p>
            )}
            <p className="flex items-center gap-1">
              <Users size={11} />
              {session.participants.length} participant
              {session.participants.length > 1 ? "s" : ""}
              {cost > 0 ? ` · ${cost.toLocaleString("fr-FR")} €` : ""}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
