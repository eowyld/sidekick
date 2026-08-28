"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Inbox, ListTodo } from "lucide-react";
import type { Todo } from "@/lib/sidekick-store";
import type { RuleSuggestion } from "../rules/types";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskCard } from "./TaskCard";
import { AiSuggestions } from "./AiSuggestions";

interface BacklogPanelProps {
  tasks: Todo[]; // todayFocus: false ET status !== "done"
  userId: string | null;
  enabledModules: Record<string, boolean>;
  calendarEvents: Array<{ title: string; start: string }>;
  ruleSuggestions: RuleSuggestion[];
  onStatusChange: (id: string, status: Todo["status"]) => void;
  onAddToToday: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSuggestion: (title: string, sector: string) => void;
  onAddTask: () => void;
}

export function BacklogPanel({
  tasks,
  userId,
  enabledModules,
  calendarEvents,
  ruleSuggestions,
  onStatusChange,
  onAddToToday,
  onEdit,
  onDelete,
  onAddSuggestion,
  onAddTask,
}: BacklogPanelProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "backlog-panel" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[320px] flex-col border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.3)] p-4 transition-colors duration-150",
        isOver && "border-[rgba(245,245,245,0.18)] bg-[rgba(44,44,46,0.45)]"
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <ListTodo size={14} className="text-[#F5F5F5]/50 shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/50">
          À faire
        </span>
        <span className="ml-auto text-[11px] font-medium text-[#F5F5F5]/35">
          {tasks.length}
        </span>
      </div>

      <div className="mb-4">
        <AiSuggestions
          userId={userId}
          tasks={tasks}
          calendarEvents={calendarEvents}
          enabledModules={enabledModules}
          ruleSuggestions={ruleSuggestions}
          onAdd={onAddSuggestion}
        />
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Ton backlog est vide"
          description="Toutes tes tâches créées atterrissent ici. Ajoute une tâche pour la garder en mémoire."
          action={{ label: "Ajouter une tâche", onClick: onAddTask }}
          className="py-8"
        />
      ) : (
        <div className="flex flex-col divide-y divide-[rgba(245,245,245,0.05)]">
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
    </div>
  );
}
