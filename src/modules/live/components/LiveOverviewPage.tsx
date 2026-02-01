"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { defaultRepresentations } from "@/modules/live/data/defaultRepresentations";

type RepresentationItem = {
  id: number;
  city: string;
  venue: string;
  date: string;
  status: string;
};

type RehearsalItem = {
  id: number;
  label?: string;
  date: string;
  time: string;
  location: string;
};

function parseFrDate(frDate: string): Date | null {
  if (!frDate) return null;
  const parts = frDate.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  return isNaN(date.getTime()) ? null : date;
}

function formatDateShort(frDate: string): string {
  const d = parseFrDate(frDate);
  if (!d) return frDate;
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const dayName = days[d.getDay()];
  const day = d.getDate();
  const month = d.getMonth() + 1;
  return `${dayName} ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function isDateTodayOrFuture(frDate: string): boolean {
  const d = parseFrDate(frDate);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime();
}

type UpcomingEvent =
  | { type: "representation"; id: number; name: string; date: string; href: string }
  | { type: "rehearsal"; id: number; name: string; date: string; href: string };

export function LiveOverviewPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [representations] = useLocalStorage<RepresentationItem[]>(
    "live:representations",
    defaultRepresentations
  );
  const [rehearsals] = useLocalStorage<RehearsalItem[]>("live:rehearsals", []);

  // Même logique que l'onglet "A venir" du module Représentations (date >= aujourd'hui)
  const upcomingRepresentations = useMemo(
    () =>
      isHydrated
        ? representations.filter((r) => isDateTodayOrFuture(r.date))
        : [],
    [representations, isHydrated]
  );

  const upcomingRepresentationsForList = upcomingRepresentations;

  const upcomingRehearsals = useMemo(
    () =>
      isHydrated
        ? rehearsals.filter((r) => isDateTodayOrFuture(r.date))
        : [],
    [rehearsals, isHydrated]
  );

  const upcomingEvents: UpcomingEvent[] = useMemo(() => {
    const reps: UpcomingEvent[] = upcomingRepresentationsForList.map((r) => ({
      type: "representation" as const,
      id: r.id,
      name: r.venue ? `${r.venue} – ${r.city}` : r.city,
      date: r.date,
      href: "/live/representations"
    }));
    const rehs: UpcomingEvent[] = upcomingRehearsals.map((r) => ({
      type: "rehearsal" as const,
      id: r.id,
      name: r.label || `Répétition – ${r.location}`,
      date: r.date,
      href: "/live/repetitions"
    }));
    const combined = [...reps, ...rehs];
    combined.sort((a, b) => {
      const da = parseFrDate(a.date)?.getTime() ?? 0;
      const db = parseFrDate(b.date)?.getTime() ?? 0;
      return da - db;
    });
    return combined;
  }, [upcomingRepresentationsForList, upcomingRehearsals]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          Live – vue d&apos;ensemble
        </h1>
        <p className="text-sm text-muted-foreground">
          Synthèse rapide de ta tournée : dates, répétitions et prochains
          événements.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Représentations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Représentations</CardTitle>
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <Link href="/live/representations">Gérer les représentations</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-2xl font-semibold tabular-nums">
              {upcomingRepresentations.length}
            </p>
            <p className="text-sm text-muted-foreground">Concerts à venir</p>
          </CardContent>
        </Card>

        {/* Répétitions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Répétitions</CardTitle>
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <Link href="/live/repetitions">Gérer les répétitions</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-2xl font-semibold tabular-nums">
              {upcomingRehearsals.length}
            </p>
            <p className="text-sm text-muted-foreground">
              Planifiez et organisez vos sessions de répétition avec votre
              groupe.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Les Prochains événements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Les prochains événements
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Représentations et répétitions à venir, par date.
          </p>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun événement à venir. Ajoutez des représentations ou des
              répétitions.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcomingEvents.map((event) => (
                <li
                  key={`${event.type}-${event.id}`}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{event.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateShort(event.date)}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
                    <Link href={event.href}>Voir détails</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
