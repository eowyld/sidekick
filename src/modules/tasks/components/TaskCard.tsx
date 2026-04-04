"use client";

import { Pencil, Trash2, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";
import type { TaskSector } from "./TaskModal";

const STATUS_NEXT: Record<Todo["status"], Todo["status"]> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const STATUS_LABEL: Record<Todo["status"], string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
};

const STATUS_CLASS: Record<Todo["status"], string> = {
  todo: "bg-slate-500/15 text-slate-300 border-slate-500/40",
  in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  done: "bg-green-500/15 text-green-300 border-green-500/40",
};

interface TaskCardProps {
  task: Todo;
  context: "today" | "backlog";
  onStatusChange: (id: string, status: Todo["status"]) => void;
  onAddToToday?: (id: string) => void;
  onRemoveFromToday?: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

export function TaskCard({
  task,
  context,
  onStatusChange,
  onAddToToday,
  onRemoveFromToday,
  onEdit,
  onDelete,
  dragHandleProps,
  isDragging,
}: TaskCardProps) {
  const sector = task.sector as TaskSector | undefined;

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-md border border-border bg-card/60 px-3 py-2 backdrop-blur-sm transition-opacity",
        task.status === "done" && "opacity-50",
        isDragging && "opacity-40"
      )}
      {...dragHandleProps}
    >
      {/* Badge statut cliquable */}
      <button
        type="button"
        onClick={() => onStatusChange(task.id, STATUS_NEXT[task.status])}
        className={cn(
          "mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors hover:brightness-110",
          STATUS_CLASS[task.status]
        )}
      >
        {STATUS_LABEL[task.status]}
      </button>

      {/* Contenu */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            task.status === "done" && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>
        {task.description ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {task.description}
          </p>
        ) : null}
        {task.deadline ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Intl.DateTimeFormat("fr-FR", {
              day: "2-digit",
              month: "short",
            }).format(new Date(task.deadline))}
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {context === "backlog" && onAddToToday ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-yellow-400 hover:text-yellow-300"
            title="Faire aujourd'hui"
            onClick={() => onAddToToday(task.id)}
          >
            <Zap className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        {context === "today" && onRemoveFromToday ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Retirer du focus"
            onClick={() => onRemoveFromToday(task.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => onEdit(task.id)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
