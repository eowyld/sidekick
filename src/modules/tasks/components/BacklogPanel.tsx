"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/sidekick-store";
import { TaskCard } from "./TaskCard";
import { AiSuggestions } from "./AiSuggestions";

interface BacklogPanelProps {
  tasks: Todo[]; // todayFocus: false ET status !== "done"
  userId: string | null;
  enabledModules: Record<string, boolean>;
  aiInstructions: Record<string, string>;
  calendarEvents: Array<{ title: string; start: string }>;
  onStatusChange: (id: string, status: Todo["status"]) => void;
  onAddToToday: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSuggestion: (title: string, sector: string) => void;
}

export function BacklogPanel({
  tasks,
  userId,
  enabledModules,
  aiInstructions,
  calendarEvents,
  onStatusChange,
  onAddToToday,
  onEdit,
  onDelete,
  onAddSuggestion,
}: BacklogPanelProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "backlog-panel" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[300px] flex-col gap-2 rounded-lg border border-border bg-card/40 p-4 transition-colors",
        isOver && "border-border/80 bg-muted/10"
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-base font-semibold">Backlog</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Aucune tâche en attente
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              context="backlog"
              onStatusChange={onStatusChange}
              onAddToToday={onAddToToday}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <div className="mt-4">
        <AiSuggestions
          userId={userId}
          tasks={tasks}
          calendarEvents={calendarEvents}
          enabledModules={enabledModules}
          aiInstructions={aiInstructions}
          onAdd={onAddSuggestion}
        />
      </div>
    </div>
  );
}
