"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";
import type { Todo } from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";
import { TaskCard } from "./TaskCard";

interface TodayPanelProps {
  tasks: Todo[]; // todayFocus: true seulement
  hasBacklog: boolean;
  onStartDay: () => void;
  onStatusChange: (id: string, status: Todo["status"]) => void;
  onRemoveFromToday: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSubtaskToggle?: (taskId: string, subtaskId: string, done: boolean) => void;
  onSubtaskAdd?: (taskId: string, title: string) => void;
  onSubtaskRename?: (taskId: string, subtaskId: string, title: string) => void;
  onSubtaskReorder?: (taskId: string, fromIndex: number, toIndex: number) => void;
  onSubtaskSetCurrent?: (taskId: string, subtaskId: string) => void;
}

export function TodayPanel({
  tasks,
  hasBacklog,
  onStartDay,
  onStatusChange,
  onRemoveFromToday,
  onEdit,
  onDelete,
  onSubtaskToggle,
  onSubtaskAdd,
  onSubtaskRename,
  onSubtaskReorder,
  onSubtaskSetCurrent,
}: TodayPanelProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "today-panel" });

  const active = tasks.filter((t) => t.status !== "done");

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[320px] flex-col border border-[rgba(245,245,245,0.08)] bg-[rgba(240,255,0,0.02)] p-4 transition-colors duration-150",
        isOver && "border-[#F0FF00]/30 bg-[#F0FF00]/5"
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Zap size={14} className="text-[#F0FF00] shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F0FF00]">
          En cours
        </span>
        <span className="ml-auto text-[11px] font-medium text-[#F5F5F5]/35">
          {active.length}
        </span>
      </div>

      {active.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center">
          <p className="text-sm text-[#F5F5F5]/60">
            Ta journée n&apos;a pas commencé.
          </p>
          {hasBacklog ? (
            <>
              <Button onClick={onStartDay}>
                <Zap className="mr-1 h-4 w-4" />
                Démarrer ma journée
              </Button>
              <p className="text-[11px] text-[#F5F5F5]/30">
                ou glisse une tâche depuis le backlog
              </p>
            </>
          ) : (
            <p className="text-[11px] text-[#F5F5F5]/30">
              Ajoute une tâche pour démarrer.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[rgba(245,245,245,0.05)]">
          {active.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              context="today"
              onStatusChange={onStatusChange}
              onRemoveFromToday={onRemoveFromToday}
              onEdit={onEdit}
              onDelete={onDelete}
              onSubtaskToggle={onSubtaskToggle}
              onSubtaskAdd={onSubtaskAdd}
              onSubtaskRename={onSubtaskRename}
              onSubtaskReorder={onSubtaskReorder}
              onSubtaskSetCurrent={onSubtaskSetCurrent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
