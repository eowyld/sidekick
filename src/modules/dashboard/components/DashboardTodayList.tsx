// src/modules/dashboard/components/DashboardTodayList.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, ListChecks, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/sidekick-store";

export type TodayTask = Todo;

type Props = {
  tasks: TodayTask[];
  today: string; // YYYY-MM-DD
  onTaskComplete?: (id: string) => void;
  onSubtaskToggle?: (taskId: string, subtaskId: string, done: boolean) => void;
};

function whenLabel(deadline: string | null, today: string): { text: string; urgent: boolean } {
  if (!deadline) return { text: "", urgent: false };
  if (deadline < today) return { text: "en retard", urgent: true };
  if (deadline === today) return { text: "aujourd'hui", urgent: true };
  const tomorrow = new Date(`${today}T00:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().split("T")[0];
  if (deadline === tomorrowKey) return { text: "demain", urgent: false };
  const d = new Date(`${deadline}T00:00:00`);
  return {
    text: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    urgent: false,
  };
}

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

function deadlineBadgeClass(urgent: boolean, hasDeadline: boolean) {
  if (!hasDeadline) return "border-[rgba(245,245,245,0.12)] bg-[rgba(245,245,245,0.05)] text-[#F5F5F5]/45";
  return urgent
    ? "border-red-500/35 bg-red-500/15 text-red-300"
    : "border-orange-500/35 bg-orange-500/15 text-orange-300";
}

function getVisibleSubtasks(subtasks: NonNullable<Todo["subtasks"]>) {
  if (subtasks.length <= 2) return subtasks;

  const currentIndex = subtasks.findIndex((subtask) => !subtask.done);
  if (currentIndex < 0) return subtasks.slice(-2);

  const startIndex = Math.min(currentIndex, subtasks.length - 2);
  return subtasks.slice(startIndex, startIndex + 2);
}

export function DashboardTodayList({ tasks, today, onTaskComplete, onSubtaskToggle }: Props) {
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());

  const handleTaskComplete = (id: string) => {
    if (completingTaskIds.has(id)) return;
    setCompletingTaskIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      onTaskComplete?.(id);
      setCompletingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 260);
  };

  return (
    <section className="mt-9">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[9px] uppercase tracking-[0.22em] text-[#F5F5F5]/35">
          Tâches en cours
        </h2>
        <Link
          href="/tasks"
          className="flex items-center gap-1 text-[10px] text-[#F5F5F5]/40 transition-colors hover:text-[#F0FF00]"
        >
          tout voir <ChevronRight size={12} />
        </Link>
      </div>

      {tasks.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-[#F5F5F5]/30">
          Aucune tâche en cours.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {tasks.map((task) => {
            const sector = task.sector ?? "Autre";
            const deadline = task.deadline ?? null;
            const w = whenLabel(deadline, today);
            const subtasks = task.subtasks ?? [];
            const doneSubtasks = subtasks.filter((subtask) => subtask.done).length;
            const isCompleting = completingTaskIds.has(task.id);

            return (
              <article
                key={task.id}
                className={cn(
                  "group relative overflow-hidden border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.50)] p-3 pl-4 transition-all duration-200 ease-out hover:scale-[1.01] hover:border-[rgba(245,245,245,0.15)] hover:bg-[rgba(44,44,46,0.65)]",
                  isCompleting && "pointer-events-none animate-[task-complete-pop_260ms_ease-in_forwards]"
                )}
              >
                <span
                  aria-hidden
                  className={cn("absolute bottom-0 left-0 top-0 w-[4px]", SECTOR_BAR[sector] ?? SECTOR_BAR.Autre)}
                />

                <div className="flex items-start gap-3">
                  <div className="flex w-14 shrink-0 flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTaskComplete(task.id)}
                      disabled={isCompleting}
                      aria-label="Marquer comme terminée"
                      className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[rgba(245,245,245,0.25)] transition-colors hover:border-[#F0FF00] hover:bg-[#F0FF00]/10"
                    >
                      <Check size={10} className="text-[#F0FF00] opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                    <Link
                      href={`/tasks?editTask=${encodeURIComponent(task.id)}`}
                      aria-label="Modifier la tâche"
                      title="Modifier"
                      className="inline-flex h-5 w-5 items-center justify-center rounded border border-[rgba(245,245,245,0.10)] text-[#F5F5F5]/45 opacity-0 transition-all hover:border-[#F0FF00]/30 hover:text-[#F0FF00] group-hover:opacity-100"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </Link>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={cn("mb-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]", SECTOR_LABEL[sector] ?? SECTOR_LABEL.Autre)}>
                          {sector}
                        </p>
                        <Link
                          href="/tasks"
                          className="block text-sm font-medium leading-snug text-[#F5F5F5] transition-colors hover:text-[#F0FF00]"
                        >
                          {task.title}
                        </Link>
                      </div>

                      <span
                        className={cn(
                          "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
                          deadlineBadgeClass(w.urgent, !!deadline)
                        )}
                      >
                        {w.text || "sans date"}
                      </span>
                    </div>

                    {task.description ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#F5F5F5]/45">
                        {task.description}
                      </p>
                    ) : null}

                    {subtasks.length > 0 ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#F5F5F5]/40">
                        <span className="inline-flex items-center gap-1">
                          <ListChecks className="h-3 w-3" />
                          {doneSubtasks}/{subtasks.length} étapes
                        </span>
                      </div>
                    ) : null}

                    {subtasks.length > 0 ? (
                      <div className="mt-2 space-y-1 overflow-hidden">
                        {getVisibleSubtasks(subtasks).map((subtask, index) => (
                          <div
                            key={subtask.id}
                            className={cn(
                              "flex animate-[dashboard-step-slide_220ms_ease-out] items-center gap-2 text-[11px]",
                              index === 0 ? "text-[#F5F5F5]/65" : "text-[#F5F5F5]/45"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => onSubtaskToggle?.(task.id, subtask.id, !subtask.done)}
                              className={cn(
                                "h-3 w-3 shrink-0 rounded-full border transition-all hover:scale-110",
                                subtask.done
                                  ? "border-[#F0FF00]/70 bg-[#F0FF00]/70"
                                  : "border-[rgba(245,245,245,0.22)] bg-[#F5F5F5]/10 hover:border-[#F0FF00]/60 hover:bg-[#F0FF00]/10"
                              )}
                              aria-label={subtask.done ? "Marquer l'étape comme à faire" : "Valider l'étape"}
                            />
                            <span className={cn("min-w-0 truncate transition-colors", subtask.done ? "text-[#F5F5F5]/30 line-through" : "")}>
                              {subtask.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
