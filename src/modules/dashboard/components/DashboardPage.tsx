"use client";

import { useMemo, useState } from "react";
import { mutate } from "swr";
import { useSidekickData } from "@/hooks/useSidekickData";
import { useTasksData } from "@/hooks/useTasksData";
import { useLiveData } from "@/hooks/useLiveData";
import { useIncomesData } from "@/hooks/useIncomesData";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useCalendarData } from "@/hooks/useCalendarData";
import { useDashboardHero } from "@/hooks/useDashboardHero";
import { PageError } from "@/components/ui/page-error";
import { EventDialog } from "@/components/ui/event-dialog";
import { formatTimeForDisplay } from "@/lib/utils";
import { enumerateDateKeysInclusive } from "@/modules/calendar/week-schedule-utils";
import { DashboardHero } from "./DashboardHero";
import { DashboardWeekRibbon, type RibbonEvent } from "./DashboardWeekRibbon";
import { DashboardTodayList, type TodayTask } from "./DashboardTodayList";

// ─── Helpers dates ────────────────────────────────────────────────────────────

function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) {
    const d = new Date(parseInt(fr[3], 10), parseInt(fr[2], 10) - 1, parseInt(fr[1], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getRibbonCta(
  id: string
): { label: string; href: string } | null {
  if (id.startsWith("live-rep-") || id.startsWith("live-reh-"))
    return { label: "Voir dans Live →", href: "/live" };
  if (id.startsWith("rev-inv-"))
    return { label: "Voir dans Revenus →", href: "/revenus" };
  if (id.startsWith("phono-ses-"))
    return { label: "Voir dans Phono →", href: "/phono" };
  // Les événements custom n'ont pas de CTA
  return null;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [selectedRibbonEvent, setSelectedRibbonEvent] = useState<RibbonEvent | null>(null);
  const [selectedRibbonEventAnchor, setSelectedRibbonEventAnchor] = useState<DOMRect | null>(null);
  const { data, preferencesReady } = useSidekickData();
  const enabled = data.preferences?.enabledModules ?? {
    live: true, phono: true, admin: true, marketing: true, edition: true, revenus: true,
  };

  const { tasks, setTasks, error: tasksError } = useTasksData();
  const { tourDates, rehearsals, error: liveError } = useLiveData();
  const { invoices, error: incomesError } = useIncomesData();
  const { sessions, error: phonoError } = usePhonoData();
  const { customEvents, error: calendarError } = useCalendarData();

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const todayKey = toDateKey(today);

  const weekDays = useMemo(() => {
    const offsetToMonday = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - offsetToMonday);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [today]);

  const weekEventsByDate = useMemo<Record<string, RibbonEvent[]>>(() => {
    if (!preferencesReady) return {};
    const startKey = toDateKey(weekDays[0]);
    const endKey = toDateKey(weekDays[6]);
    const inRange = (d: Date | null): d is Date =>
      d !== null && toDateKey(d) >= startKey && toDateKey(d) <= endKey;
    const map: Record<string, RibbonEvent[]> = {};
    const push = (d: Date, e: RibbonEvent) => {
      const k = toDateKey(d);
      if (!map[k]) map[k] = [];
      map[k].push(e);
    };

    if (enabled.live) {
      tourDates.forEach((t) => {
        const d = parseDate(t.date);
        if (!inRange(d)) return;
        const fields = [
          { label: "Salle", value: t.venue || "—" },
          { label: "Ville", value: t.city || "—" },
          ...(t.organisateur ? [{ label: "Organisateur", value: t.organisateur }] : []),
          ...(t.address ? [{ label: "Adresse", value: t.address }] : []),
          ...(t.status ? [{ label: "Statut", value: t.status }] : []),
          ...(t.note ? [{ label: "Note", value: t.note }] : []),
        ];
        push(d, { id: `live-rep-${t.id}`, title: `${t.venue} – ${t.city}`, sector: "live", detail: { subLabel: "Représentation", dateKey: toDateKey(d), fields } });
      });
      rehearsals.forEach((r) => {
        const d = parseDate(r.date);
        if (!inRange(d)) return;
        const fields = [
          { label: "Lieu", value: r.location || "—" },
          ...(r.time ? [{ label: "Heure", value: r.time }] : []),
          ...(r.address ? [{ label: "Adresse", value: r.address }] : []),
          ...(r.note ? [{ label: "Note", value: r.note }] : []),
        ];
        push(d, { id: `live-reh-${r.id}`, title: r.label || r.location || "Répétition", sector: "live", detail: { subLabel: "Répétition", dateKey: toDateKey(d), fields } });
      });
    }
    if (enabled.revenus) {
      invoices.forEach((i) => {
        const d = parseDate(i.dueDate);
        if (!inRange(d)) return;
        const fields = [
          { label: "N° facture", value: i.number || "—" },
          { label: "Client", value: i.client || "—" },
          ...(i.subject ? [{ label: "Objet", value: i.subject }] : []),
          ...(i.amount ? [{ label: "Montant", value: i.amount.includes("€") ? i.amount : `${i.amount} €` }] : []),
          { label: "Statut", value: i.status === "payee" ? "Payée" : "En attente" },
        ];
        push(d, { id: `rev-inv-${i.id}`, title: `Facture ${i.number}`, sector: "revenus", detail: { subLabel: "Échéance facture", dateKey: toDateKey(d), fields } });
      });
    }
    if (enabled.phono) {
      sessions.forEach((s) => {
        const d = parseDate(s.date);
        if (!inRange(d)) return;
        const fields = [
          { label: "Lieu", value: s.location || "—" },
          ...(s.time ? [{ label: "Heure", value: s.time }] : []),
          ...(s.sessionType ? [{ label: "Type", value: s.sessionType }] : []),
          ...(s.note ? [{ label: "Note", value: s.note }] : []),
        ];
        push(d, { id: `phono-ses-${s.id}`, title: s.title || s.location || "Session", sector: "phono", detail: { subLabel: "Session studio", dateKey: toDateKey(d), fields } });
      });
    }
    customEvents.forEach((e) => {
      const sector = (e.sector ?? "other") as RibbonEvent["sector"];
      const moduleEnabled =
        sector === "live" ? enabled.live :
        sector === "phono" ? enabled.phono :
        sector === "admin" ? enabled.admin :
        sector === "marketing" ? enabled.marketing :
        sector === "edition" ? enabled.edition :
        sector === "revenus" ? enabled.revenus :
        true;
      if (!moduleEnabled) return;
      const sd = parseDate(e.date);
      if (!sd) return;
      const ed = parseDate(e.endDate ?? e.date) ?? sd;
      const keys = enumerateDateKeysInclusive(toDateKey(sd), toDateKey(ed));
      keys.forEach((dateKey) => {
        const d = parseDate(dateKey);
        if (!d || !inRange(d)) return;
        const fields = [
          ...(e.time
            ? [{ label: "Heure", value: formatTimeForDisplay(e.time) }]
            : []),
          ...(e.place ? [{ label: "Lieu", value: e.place }] : []),
        ];
        const multi = keys.length > 1;
        push(d, {
          id: multi ? `custom-${e.id}__${dateKey}` : `custom-${e.id}`,
          title: e.title || "Événement",
          sector,
          detail: {
            subLabel: "Événement personnalisé",
            dateKey,
            fields,
          },
        });
      });
    });

    return map;
  }, [preferencesReady, weekDays, tourDates, rehearsals, invoices, sessions, customEvents, enabled]);

  const tomorrowKey = useMemo(() => {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return toDateKey(t);
  }, [today]);

  const tasksToDoCount = tasks.filter((t) => t.todayFocus && t.status !== "done").length;
  const urgentTasksCount = tasks.filter(
    (t) => t.status !== "done" && t.deadline && t.deadline <= tomorrowKey,
  ).length;
  const weekEventsCount = Object.values(weekEventsByDate).reduce((acc, arr) => acc + arr.length, 0);

  const todayTasks: TodayTask[] = useMemo(() => {
    const deadlineKey = (deadline: string | null | undefined) => {
      if (!deadline) return Number.POSITIVE_INFINITY;
      const ts = new Date(`${deadline}T12:00:00`).getTime();
      return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
    };

    return tasks
      .filter((t) => t.todayFocus && t.status !== "done")
      .sort((a, b) => {
        const da = deadlineKey(a.deadline);
        const db = deadlineKey(b.deadline);
        if (da !== db) return da - db;
        return a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
      })
      .slice(0, 2);
  }, [tasks]);

  const heroPayload = useMemo(() => {
    if (!preferencesReady) return null;
    type HeroEv = {
      id: string;
      title: string;
      date: string;
      type: "representation" | "rehearsal" | "invoice" | "session" | "custom";
      sector?: string;
    };
    const events: HeroEv[] = [];
    tourDates.forEach((t) => {
      const d = parseDate(t.date);
      if (d) events.push({ id: `live-rep-${t.id}`, title: `${t.venue} – ${t.city}`, date: toDateKey(d), type: "representation", sector: "live" });
    });
    rehearsals.forEach((r) => {
      const d = parseDate(r.date);
      if (d) events.push({ id: `live-reh-${r.id}`, title: r.label || r.location || "Répétition", date: toDateKey(d), type: "rehearsal", sector: "live" });
    });
    invoices.forEach((i) => {
      const d = parseDate(i.dueDate);
      if (d) events.push({ id: `rev-inv-${i.id}`, title: `Facture ${i.number} – ${i.client}`, date: toDateKey(d), type: "invoice", sector: "revenus" });
    });
    sessions.forEach((s) => {
      const d = parseDate(s.date);
      if (d) events.push({ id: `phono-ses-${s.id}`, title: s.title || s.location || "Session", date: toDateKey(d), type: "session", sector: "phono" });
    });
    customEvents.forEach((e) => {
      const sd = parseDate(e.date);
      if (!sd) return;
      const ed = parseDate(e.endDate ?? e.date) ?? sd;
      const keys = enumerateDateKeysInclusive(toDateKey(sd), toDateKey(ed));
      keys.forEach((dateKey) => {
        const d = parseDate(dateKey);
        if (!d) return;
        events.push({
          id: keys.length > 1 ? `custom-${e.id}__${dateKey}` : `custom-${e.id}`,
          title: e.title || "Événement",
          date: dateKey,
          type: "custom",
          sector: e.sector,
        });
      });
    });

    const projects = (data.projects?.projects ?? []).map((p) => ({ id: p.id, title: p.title }));

    const heroTasks = tasks
      .filter((t) => t.status !== "done")
      .map((t) => ({
        id: t.id,
        title: t.title,
        sector: t.sector ?? "Admin",
        status: t.status,
        deadline: t.deadline ?? null,
      }));

    return { tasks: heroTasks, events, projects };
  }, [preferencesReady, tasks, tourDates, rehearsals, invoices, sessions, customEvents, data.projects]);

  const { phrase, accent, loading: heroLoading } = useDashboardHero(heroPayload);

  const dataError = tasksError || liveError || incomesError || phonoError || calendarError;
  if (dataError) return (
    <PageError
      title="Impossible de charger le tableau de bord"
      description="Vérifie ta connexion ou réessaie dans quelques instants."
      onRetry={() => {
        mutate("user_tasks");
        mutate("user_live");
        mutate("user_incomes");
        mutate("user_phono");
        mutate("calendar_events");
      }}
    />
  );

  return (
    <div>
      <DashboardHero
        now={now}
        phrase={phrase}
        accent={accent}
        loading={heroLoading}
        stats={[
          { value: urgentTasksCount, label: "tâches urgentes", accent: urgentTasksCount > 0, href: "/tasks" },
          { value: weekEventsCount, label: "événements cette semaine", href: "/calendar" },
        ]}
      />

      <DashboardWeekRibbon
        weekDays={weekDays}
        todayKey={todayKey}
        eventsByDate={weekEventsByDate}
        onEventClick={(event, rect) => {
            setSelectedRibbonEvent(event);
            setSelectedRibbonEventAnchor(rect);
          }}
      />

      <DashboardTodayList
        tasks={todayTasks}
        today={todayKey}
        onTaskComplete={(id) => setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "done" } : t))}
        onSubtaskToggle={(taskId, subtaskId, done) =>
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    subtasks: (t.subtasks ?? []).map((subtask) =>
                      subtask.id === subtaskId ? { ...subtask, done } : subtask
                    ),
                  }
                : t
            )
          )
        }
      />

      {selectedRibbonEvent && (() => {
        const cta = getRibbonCta(selectedRibbonEvent.id);
        const isCustom = selectedRibbonEvent.id.startsWith("custom-");
        return (
          <EventDialog
            open={!!selectedRibbonEvent}
            onClose={() => { setSelectedRibbonEvent(null); setSelectedRibbonEventAnchor(null); }}
            title={selectedRibbonEvent.title}
            subLabel={selectedRibbonEvent.detail?.subLabel ?? ""}
            dateKey={selectedRibbonEvent.detail?.dateKey ?? ""}
            sector={selectedRibbonEvent.sector}
            fields={(selectedRibbonEvent.detail?.fields ?? []).map((f) => ({
              label: f.label,
              value: f.value,
            }))}
            ctaLabel={!isCustom ? cta?.label : undefined}
            ctaHref={!isCustom ? cta?.href : undefined}
            anchorRect={selectedRibbonEventAnchor}
          />
        );
      })()}
    </div>
  );
}
