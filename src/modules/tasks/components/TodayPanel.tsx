"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/sidekick-store";
import { TaskCard } from "./TaskCard";

interface TodayPanelProps {
  tasks: Todo[]; // todayFocus: true seulement
  onStatusChange: (id: string, status: Todo["status"]) => void;
  onRemoveFromToday: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TodayPanel({
  tasks,
  onStatusChange,
  onRemoveFromToday,
  onEdit,
  onDelete,
}: TodayPanelProps) {
  const [doneOpen, setDoneOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id: "today-panel" });

  const active = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[300px] flex-col gap-2 rounded-lg border border-border bg-card/40 p-4 transition-colors",
        isOver && "border-yellow-400/60 bg-yellow-400/5"
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-base font-semibold">⚡ Aujourd'hui</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {active.length}
        </span>
      </div>

      {active.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Glisse des tâches ici ou clique sur ⚡ depuis le backlog
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {active.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              context="today"
              onStatusChange={onStatusChange}
              onRemoveFromToday={onRemoveFromToday}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {done.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setDoneOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {doneOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Terminées ({done.length})
          </button>
          {doneOpen ? (
            <div className="mt-2 flex flex-col gap-2">
              {done.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  context="today"
                  onStatusChange={onStatusChange}
                  onRemoveFromToday={onRemoveFromToday}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
