"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/sidekick-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SECTOR_BAR: Record<string, string> = {
  Live: "bg-blue-500/60",
  Phono: "bg-red-500/60",
  Admin: "bg-violet-500/60",
  Marketing: "bg-emerald-500/60",
  Edition: "bg-cyan-500/60",
  Revenus: "bg-orange-500/60",
  Autre: "bg-[rgba(245,245,245,0.25)]",
};

const SECTOR_LABEL: Record<string, string> = {
  Live: "text-blue-300",
  Phono: "text-red-300",
  Admin: "text-violet-300",
  Marketing: "text-emerald-300",
  Edition: "text-cyan-300",
  Revenus: "text-orange-300",
  Autre: "text-[#F5F5F5]/40",
};

interface DayStartDialogProps {
  open: boolean;
  onClose: () => void;
  backlogTasks: Todo[];
  onConfirm: (selectedIds: string[]) => void;
}

type Bucket = "overdue" | "today" | "thisWeek" | "later";

function bucketize(task: Todo, todayISO: string, weekHorizonISO: string): Bucket {
  if (!task.deadline) return "later";
  if (task.deadline < todayISO) return "overdue";
  if (task.deadline === todayISO) return "today";
  if (task.deadline <= weekHorizonISO) return "thisWeek";
  return "later";
}

const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: "EN RETARD",
  today: "AUJOURD'HUI",
  thisWeek: "CETTE SEMAINE",
  later: "BACKLOG",
};

function getLocalDateISO(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function DayStartDialog({
  open,
  onClose,
  backlogTasks,
  onConfirm,
}: DayStartDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { buckets, todayISO } = useMemo(() => {
    const todayDate = new Date();
    const todayISO = getLocalDateISO(todayDate);
    const weekHorizonDate = new Date(todayDate);
    weekHorizonDate.setDate(weekHorizonDate.getDate() + 7);
    const weekHorizonISO = getLocalDateISO(weekHorizonDate);

    const grouped: Record<Bucket, Todo[]> = {
      overdue: [],
      today: [],
      thisWeek: [],
      later: [],
    };
    for (const task of backlogTasks) {
      grouped[bucketize(task, todayISO, weekHorizonISO)].push(task);
    }

    const byDeadline = (a: Todo, b: Todo) => {
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    };
    grouped.overdue.sort(byDeadline);
    grouped.today.sort(byDeadline);
    grouped.thisWeek.sort(byDeadline);
    grouped.later.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

    return { buckets: grouped, todayISO };
  }, [backlogTasks]);

  useEffect(() => {
    if (!open) return;
    const initial = new Set<string>();
    for (const task of buckets.overdue) initial.add(task.id);
    for (const task of buckets.today) initial.add(task.id);
    setSelected(initial);
  }, [open, buckets]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
    onClose();
  };

  const order: Bucket[] = ["overdue", "today", "thisWeek", "later"];
  const totalSelected = selected.size;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choisis tes tâches du jour</DialogTitle>
          <DialogDescription>
            Coche celles que tu veux faire aujourd&apos;hui. Les retards et les échéances du jour sont pré-cochés.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-2">
          {order.map((bucket) => {
            const items = buckets[bucket];
            if (items.length === 0) return null;
            return (
              <section key={bucket}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/50">
                    {BUCKET_LABEL[bucket]}
                  </span>
                  <span className="text-[10px] text-[#F5F5F5]/30">({items.length})</span>
                  <div className="flex-1 h-px bg-[rgba(245,245,245,0.08)]" />
                </div>
                <ul className="space-y-1">
                  {items.map((task) => {
                    const sector = task.sector ?? "Autre";
                    const isSelected = selected.has(task.id);
                    const overdue = task.deadline && task.deadline < todayISO;

                    return (
                      <li
                        key={task.id}
                        onClick={() => toggle(task.id)}
                        className={cn(
                          "relative flex items-start gap-2 border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.4)] pl-4 pr-3 py-2 cursor-pointer transition-colors",
                          "hover:border-[rgba(245,245,245,0.15)] hover:bg-[rgba(44,44,46,0.6)]",
                          isSelected && "border-[#F0FF00]/30 bg-[rgba(240,255,0,0.04)]"
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-0 top-0 bottom-0 w-[4px]",
                            SECTOR_BAR[sector] ?? SECTOR_BAR["Autre"]
                          )}
                        />
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(task.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[#F0FF00] cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.15em] mb-0.5", SECTOR_LABEL[sector] ?? SECTOR_LABEL["Autre"])}>
                            {sector}
                          </p>
                          <p className="text-sm font-medium text-[#F5F5F5] leading-snug">
                            {task.title}
                          </p>
                          {task.deadline ? (
                            <p
                              className={cn(
                                "mt-0.5 text-xs",
                                overdue
                                  ? "inline-flex items-center gap-1 border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-300 font-medium"
                                  : "text-[#F5F5F5]/40"
                              )}
                            >
                              {overdue ? "⚠ " : ""}
                              {new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(task.deadline))}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t border-[rgba(245,245,245,0.08)] pt-3">
          <span className="text-xs text-[#F5F5F5]/50">
            {totalSelected} {totalSelected > 1 ? "tâches sélectionnées" : "tâche sélectionnée"}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={totalSelected === 0}>
              <Zap className="mr-1 h-3.5 w-3.5" />
              C&apos;est parti
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
