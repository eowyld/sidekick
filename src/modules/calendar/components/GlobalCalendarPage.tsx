"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function createMonthMatrix(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // JS: 0 = dimanche ... 6 = samedi
  // On veut un calendrier qui commence le lundi
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // 0 = lundi, ..., 6 = dimanche

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  // Cases vides avant le 1er
  for (let i = 0; i < startOffset; i++) {
    currentWeek.push(null);
  }

  // Jours du mois
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Compléter la dernière ligne
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

export function GlobalCalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const monthMatrix = useMemo(() => createMonthMatrix(currentDate), [currentDate]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-FR", {
        month: "long",
        year: "numeric"
      }).format(currentDate),
    [currentDate]
  );

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const goToToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentDate(d);
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return d.getTime() === today.getTime();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Calendrier
            </h1>
            <p className="text-sm text-muted-foreground">
              Vue mensuelle avec navigation par mois.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[150px] text-center text-sm font-medium capitalize">
            {monthLabel}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="ml-2"
          >
            Aujourd&apos;hui
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-1.5">
            <CardTitle className="text-base">Vue mensuelle</CardTitle>
            <CardDescription>
              Clique sur un jour pour voir ou ajouter des événements (à venir).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-3 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-sm">
              {monthMatrix.map((week, weekIndex) =>
                week.map((day, dayIndex) => (
                  <button
                    key={`${weekIndex}-${dayIndex}`}
                    type="button"
                    className={[
                      "flex h-14 flex-col items-center justify-start rounded-md border text-xs transition-colors",
                      day
                        ? "bg-background/80 hover:bg-accent hover:text-accent-foreground"
                        : "bg-muted/40 text-muted-foreground/60 border-dashed",
                      isToday(day)
                        ? "border-primary text-primary font-semibold"
                        : "border-border"
                    ].join(" ")}
                    disabled={!day}
                  >
                    <span className="mt-1 text-xs">{day ?? ""}</span>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Prochains événements</CardTitle>
            <CardDescription>
              Cette section affichera bientôt la liste de tes événements à venir
              (concerts, répétitions, sorties, campagnes...).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <p>Aucun événement n&apos;est encore configuré.</p>
            <p className="mt-1">
              Tu pourras bientôt les créer depuis le calendrier et les autres
              modules.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

