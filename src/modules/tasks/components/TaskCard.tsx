"use client";

import { useState } from "react";
import posthog from "posthog-js";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent as StepsDragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Trash2, Zap, Check, ArrowRight, RotateCcw, Plus, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";

function SubtaskInlineInput({ taskId, onAdd }: { taskId: string; onAdd: (taskId: string, title: string) => void }) {
  const [value, setValue] = useState("");
  const handleAdd = () => {
    if (!value.trim()) return;
    onAdd(taskId, value.trim());
    setValue("");
  };
  return (
    <div className="flex items-center gap-1 mt-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
        placeholder="Ajouter une étape..."
        className="flex-1 bg-transparent text-xs outline-none placeholder:text-[#F5F5F5]/30 border-b border-[rgba(245,245,245,0.12)] pb-0.5 text-[#F5F5F5]/70"
      />
      <button type="button" onClick={handleAdd} className="text-[#F5F5F5]/40 hover:text-[#F0FF00] transition-colors">
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

function SubtaskEditableRow({
  taskId,
  subtask,
  onToggle,
  onRename,
}: {
  taskId: string;
  subtask: { id: string; title: string; done: boolean };
  onToggle: (taskId: string, subtaskId: string, done: boolean) => void;
  onRename: (taskId: string, subtaskId: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(subtask.title);

  const commit = () => {
    setEditing(false);
    onRename(taskId, subtask.id, value);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <input
        type="checkbox"
        checked={subtask.done}
        onChange={(e) => onToggle(taskId, subtask.id, e.target.checked)}
        className="h-3 w-3 shrink-0 accent-[#F0FF00] cursor-pointer"
      />
      {editing ? (
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { setValue(subtask.title); setEditing(false); }
          }}
          className="flex-1 min-w-0 bg-transparent text-xs outline-none border-b border-[rgba(245,245,245,0.20)] pb-0.5 text-[#F5F5F5]"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={cn(
            "flex-1 min-w-0 text-xs cursor-text truncate",
            subtask.done ? "line-through text-[#F5F5F5]/30" : "text-[#F5F5F5]/60"
          )}
        >
          {subtask.title}
        </span>
      )}
    </div>
  );
}

function TimelineStepLabel({
  taskId,
  subtask,
  isCurrent,
  className,
  onRename,
}: {
  taskId: string;
  subtask: { id: string; title: string; done: boolean };
  isCurrent: boolean;
  className?: string;
  onRename: (taskId: string, subtaskId: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(subtask.title);

  const commit = () => {
    setEditing(false);
    onRename(taskId, subtask.id, value);
  };

  return editing ? (
    <div className={cn("mt-2 flex items-center justify-center gap-1", className)}>
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setValue(subtask.title); setEditing(false); }
        }}
        className="w-[44px] bg-transparent text-center text-[10px] outline-none border-b border-[rgba(245,245,245,0.20)] pb-0.5 text-[#F5F5F5]"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setEditing(false);
          onRename(taskId, subtask.id, "");
        }}
        className="shrink-0 rounded p-0.5 text-[#F5F5F5]/35 hover:text-red-300"
        aria-label="Supprimer l'étape"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "mt-2 leading-tight text-center max-w-[170px] whitespace-normal break-words transition-all",
        isCurrent
          ? "text-[12px] font-semibold text-[#F5F5F5]"
          : subtask.done
            ? "text-[11px] text-[#F5F5F5]/35 line-through"
            : "text-[11px] text-[#F5F5F5]/55",
        className
      )}
      title={subtask.title}
    >
      {subtask.title}
    </button>
  );
}

const SECTOR_BADGE: Record<string, string> = {
  Live: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Phono: "bg-red-500/15 text-red-300 border-red-500/30",
  Admin: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Marketing: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Edition: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  Revenus: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  Projets: "bg-[rgba(240,255,0,0.1)] text-[#F0FF00] border-[rgba(240,255,0,0.3)]",
  Autre: "bg-[rgba(245,245,245,0.06)] text-[#F5F5F5]/50 border-[rgba(245,245,245,0.12)]",
};

const SECTOR_BAR: Record<string, string> = {
  Live: "bg-blue-500/60",
  Phono: "bg-red-500/60",
  Admin: "bg-violet-500/60",
  Marketing: "bg-emerald-500/60",
  Edition: "bg-cyan-500/60",
  Revenus: "bg-orange-500/60",
  Projets: "bg-[rgba(240,255,0,0.5)]",
  Autre: "bg-[rgba(245,245,245,0.25)]",
};

const SECTOR_LABEL: Record<string, string> = {
  Live: "text-blue-300",
  Phono: "text-red-300",
  Admin: "text-violet-300",
  Marketing: "text-emerald-300",
  Edition: "text-cyan-300",
  Revenus: "text-orange-300",
  Projets: "text-[#F0FF00]",
  Autre: "text-[#F5F5F5]/40",
};

function getLocalDateISO(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function SortableTimelinePoint({
  taskId,
  step,
  isCurrent,
  onToggle,
  onSetCurrent,
}: {
  taskId: string;
  step: { id: string; title: string; done: boolean };
  isCurrent: boolean;
  onToggle: (taskId: string, subtaskId: string, done: boolean) => void;
  onSetCurrent?: (taskId: string, subtaskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={() => {
        if (isDragging) return;
        if (onSetCurrent) onSetCurrent(taskId, step.id);
        else onToggle(taskId, step.id, !step.done);
      }}
      className="z-10 flex shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"
      aria-label={`Déplacer ou aller à l'étape ${step.title}`}
      {...attributes}
      {...listeners}
    >
      <span
        className={cn(
          "block rounded-full border transition-all",
          isCurrent
            ? "h-[16px] w-[16px] border-2 border-[#F0FF00] bg-[#F0FF00] shadow-[0_0_0_3px_rgba(240,255,0,0.20)]"
            : step.done
              ? "h-2.5 w-2.5 border border-[rgba(240,255,0,0.22)] bg-[rgba(112,122,0,0.38)]"
              : "h-2.5 w-2.5 border border-[rgba(245,245,245,0.18)] bg-[rgba(20,20,20,0.95)]"
        )}
      />
    </button>
  );
}

function TaskStepsBlock({
  taskId,
  steps,
  onToggle,
  onRename,
  onAdd,
  onReorder,
  onSetCurrent,
}: {
  taskId: string;
  steps: { id: string; title: string; done: boolean }[];
  onToggle: (taskId: string, subtaskId: string, done: boolean) => void;
  onRename: (taskId: string, subtaskId: string, title: string) => void;
  onAdd: (taskId: string, title: string) => void;
  onReorder?: (taskId: string, fromIndex: number, toIndex: number) => void;
  onSetCurrent?: (taskId: string, subtaskId: string) => void;
}) {
  const currentIndex = steps.findIndex((s) => !s.done);
  const current = currentIndex >= 0 ? steps[currentIndex] : null;
  const upcoming = currentIndex >= 0 ? steps.slice(currentIndex + 1).filter((s) => !s.done) : [];
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = total > 0 && doneCount === total;
  const progressIndex = allDone ? total - 1 : Math.max(currentIndex, 0);
  const [adding, setAdding] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState("");
  const stepSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 400,
        tolerance: 5,
      },
    })
  );

  const handleConfirmAdd = () => {
    const title = newStepTitle.trim();
    if (!title) return;
    onAdd(taskId, title);
    setNewStepTitle("");
    setAdding(false);
  };

  const handleDragEnd = (event: StepsDragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const fromIndex = steps.findIndex((s) => s.id === active.id);
    const toIndex = steps.findIndex((s) => s.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    onReorder(taskId, fromIndex, toIndex);
  };

  if (steps.length === 0) {
    return (
      <div className="mt-2 w-full">
        <SubtaskInlineInput taskId={taskId} onAdd={onAdd} />
      </div>
    );
  }

  return (
    <div
      className="mt-2 min-w-[14rem] max-w-full space-y-2"
      style={{ width: "min(32rem, calc(100% - 9.5rem))" }}
    >
      {allDone ? (
        <p className="text-[11px] text-emerald-300/80">
          Toutes les étapes sont faites — clique sur ✓ pour clôturer.
        </p>
      ) : null}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F0FF00]/70 mb-3">
          Etapes ({doneCount}/{total})
        </p>
        <div className="relative pt-5">
          <DndContext sensors={stepSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={steps.map((step) => step.id)} strategy={horizontalListSortingStrategy}>
              <div
                className={cn(
                  "flex items-center",
                  total === 1 && "justify-center"
                )}
              >
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={cn("flex items-center", index < steps.length - 1 ? "flex-1" : "shrink-0")}
                  >
                    <SortableTimelinePoint
                      taskId={taskId}
                      step={step}
                      isCurrent={current?.id === step.id}
                      onToggle={onToggle}
                      onSetCurrent={onSetCurrent}
                    />
                    {index < steps.length - 1 ? (
                      <span
                        className={cn(
                          "h-[2px] flex-1",
                          index < progressIndex ? "bg-[#F0FF00]" : "bg-[rgba(245,245,245,0.16)]"
                        )}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div className="absolute right-0 top-5 flex translate-x-[calc(100%+12px)] items-center gap-2">
            {adding ? (
              <input
                autoFocus
                type="text"
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmAdd();
                  }
                  if (e.key === "Escape") {
                    setNewStepTitle("");
                    setAdding(false);
                  }
                }}
                placeholder="Nom de l'étape..."
                className="h-6 w-[124px] shrink-0 bg-transparent text-xs outline-none placeholder:text-[#F5F5F5]/30 border-b border-[rgba(245,245,245,0.18)] pb-0.5 text-[#F5F5F5]/80"
              />
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (!adding) {
                  setAdding(true);
                  return;
                }
                if (!newStepTitle.trim()) {
                  setNewStepTitle("");
                  setAdding(false);
                  return;
                }
                handleConfirmAdd();
              }}
              className="text-[#F5F5F5]/55 hover:text-[#F0FF00] transition-colors"
              aria-label="Ajouter une étape"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div
            className={cn("mt-1 grid gap-1", total === 1 && "justify-items-center")}
            style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
          >
            {steps.map((step, index) => (
              <div key={step.id} className="flex min-w-0 justify-center">
                <TimelineStepLabel
                  taskId={taskId}
                  subtask={step}
                  isCurrent={current?.id === step.id}
                  className={
                    total === 1
                      ? "translate-y-0"
                      : index % 2 === 0
                        ? "translate-y-0"
                        : "-translate-y-12"
                  }
                  onRename={onRename}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrentStepRow({
  taskId,
  subtask,
  onToggle,
  onRename,
}: {
  taskId: string;
  subtask: { id: string; title: string; done: boolean };
  onToggle: (taskId: string, subtaskId: string, done: boolean) => void;
  onRename: (taskId: string, subtaskId: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(subtask.title);

  const commit = () => {
    setEditing(false);
    onRename(taskId, subtask.id, value);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <input
        type="checkbox"
        checked={subtask.done}
        onChange={(e) => onToggle(taskId, subtask.id, e.target.checked)}
        className="h-4 w-4 shrink-0 accent-[#F0FF00] cursor-pointer"
      />
      {editing ? (
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { setValue(subtask.title); setEditing(false); }
          }}
          className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none border-b border-[rgba(245,245,245,0.20)] pb-0.5 text-[#F5F5F5]"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className="flex-1 min-w-0 text-sm font-medium cursor-text text-[#F5F5F5]"
        >
          {subtask.title}
        </span>
      )}
    </div>
  );
}

function SortableUpcomingStep({
  taskId,
  subtask,
  onToggle,
  onRename,
}: {
  taskId: string;
  subtask: { id: string; title: string; done: boolean };
  onToggle: (taskId: string, subtaskId: string, done: boolean) => void;
  onRename: (taskId: string, subtaskId: string, title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subtask.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-1.5">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab text-[#F5F5F5]/30 opacity-0 transition-opacity hover:text-[#F5F5F5]/70 group-hover:opacity-100"
        aria-label="Réordonner"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1">
        <SubtaskEditableRow
          taskId={taskId}
          subtask={subtask}
          onToggle={onToggle}
          onRename={onRename}
        />
      </div>
    </li>
  );
}

interface TaskCardProps {
  task: Todo;
  context: "today" | "backlog" | "done";
  onStatusChange: (id: string, status: Todo["status"]) => void;
  onAddToToday?: (id: string) => void;
  onRemoveFromToday?: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
  onSubtaskToggle?: (taskId: string, subtaskId: string, done: boolean) => void;
  onSubtaskAdd?: (taskId: string, title: string) => void;
  onSubtaskRename?: (taskId: string, subtaskId: string, title: string) => void;
  onSubtaskReorder?: (taskId: string, fromIndex: number, toIndex: number) => void;
  onSubtaskSetCurrent?: (taskId: string, subtaskId: string) => void;
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
  onSubtaskToggle,
  onSubtaskAdd,
  onSubtaskRename,
  onSubtaskReorder,
  onSubtaskSetCurrent,
}: TaskCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const sector = task.sector;
  const today = getLocalDateISO();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilDeadline = task.deadline
    ? Math.floor((new Date(`${task.deadline}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / msPerDay)
    : null;
  const isUrgentDeadline = daysUntilDeadline !== null && daysUntilDeadline <= 0;
  const isSoonDeadline = daysUntilDeadline !== null && daysUntilDeadline > 0 && daysUntilDeadline < 7;
  const deadlineClass = isUrgentDeadline
    ? "border-red-500/35 bg-red-500/15 text-red-300"
    : isSoonDeadline
      ? "border-orange-500/35 bg-orange-500/15 text-orange-300"
      : "border-emerald-500/35 bg-emerald-500/15 text-emerald-300";
  const deadlineSubtitleClass = isUrgentDeadline
    ? "text-red-300/95"
    : isSoonDeadline
      ? "text-orange-300/90"
      : "text-emerald-300/85";
  const deadlineBadge = task.deadline ? (
    <span
      className={cn(
        "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
        deadlineClass
      )}
    >
      {new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(task.deadline))}
    </span>
  ) : null;

  const handleComplete = () => {
    if (isCompleting) return;
    posthog.capture("task_completed", { sector: task.sector });
    setIsCompleting(true);
    window.setTimeout(() => {
      onStatusChange(task.id, "done");
    }, 260);
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-2.5 border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] px-3 py-2.5 transition-all duration-200 ease-out origin-left",
        "hover:border-[rgba(245,245,245,0.15)] hover:bg-[rgba(44,44,46,0.65)] hover:scale-[1.02]",
        context === "today" && "pl-4",
        task.status === "done" && context !== "done" && "opacity-40",
        isDragging && "opacity-30 scale-[0.98]",
        isCompleting && "pointer-events-none animate-[task-complete-pop_260ms_ease-in_forwards]"
      )}
      {...dragHandleProps}
    >
      {context === "today" && sector ? (
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-0 bottom-0 w-[4px]",
            SECTOR_BAR[sector] ?? SECTOR_BAR["Autre"]
          )}
        />
      ) : null}

      {task.deadline ? (
        <div className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1">
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {context === "backlog" && onAddToToday ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-[#F0FF00]/70 hover:text-[#F0FF00]"
                title="Faire aujourd'hui"
                onClick={() => {
                  posthog.capture("task_added_to_today", { sector: task.sector });
                  onAddToToday(task.id);
                }}
              >
                <Zap className="h-3 w-3" />
              </Button>
            ) : null}
            {context === "today" ? (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-emerald-400/70 hover:text-emerald-400"
                  title="Marquer comme terminée"
                  onClick={handleComplete}
                  disabled={isCompleting}
                >
                  <Check className="h-3 w-3" />
                </Button>
                {onRemoveFromToday ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
                    title="Renvoyer au backlog"
                    onClick={() => onRemoveFromToday(task.id)}
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                ) : null}
              </>
            ) : null}
            {context === "done" ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
                title="Restaurer"
                onClick={() => onStatusChange(task.id, "todo")}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
              onClick={() => onEdit(task.id)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-red-400/50 hover:text-red-400"
              onClick={() => {
                posthog.capture("task_deleted", { sector: task.sector });
                onDelete(task.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          {context !== "backlog" ? deadlineBadge : null}
        </div>
      ) : null}

      {/* Badge secteur — backlog only */}
      {context === "backlog" && sector ? (
        <span
          className={cn(
            "mt-0.5 shrink-0 border px-1.5 py-0.5 text-[10px] font-medium tracking-wide",
            SECTOR_BADGE[sector] ?? SECTOR_BADGE["Autre"]
          )}
        >
          {sector}
        </span>
      ) : null}

      {/* Contenu */}
      <div className="min-w-0 flex-1">
        {context === "today" && sector ? (
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.15em] mb-0.5",
              SECTOR_LABEL[sector] ?? SECTOR_LABEL["Autre"]
            )}
          >
            {sector}
          </p>
        ) : null}
        <p
          className={cn(
            "text-sm font-medium leading-snug text-[#F5F5F5]",
            task.status === "done" && context !== "done" && "line-through text-[#F5F5F5]/40"
          )}
        >
          {task.title}
        </p>
        {context === "backlog" && task.deadline ? (
          <p
            className={cn(
              "mt-0.5 text-[10px] font-medium tabular-nums tracking-wide",
              deadlineSubtitleClass
            )}
          >
            {new Intl.DateTimeFormat("fr-FR", {
              day: "numeric",
              month: "short",
            }).format(new Date(`${task.deadline}T12:00:00`))}
          </p>
        ) : null}
        {task.description ? (
          <p className="mt-0.5 truncate text-xs text-[#F5F5F5]/45">
            {task.description}
          </p>
        ) : null}
        {context === "today" && onSubtaskToggle && onSubtaskRename && onSubtaskAdd ? (
          <TaskStepsBlock
            taskId={task.id}
            steps={task.subtasks ?? []}
            onToggle={onSubtaskToggle}
            onRename={onSubtaskRename}
            onAdd={onSubtaskAdd}
            onReorder={onSubtaskReorder}
            onSetCurrent={onSubtaskSetCurrent}
          />
        ) : null}
      </div>

      {/* Actions — sans date limite : comme avant, colonne à droite */}
      {!task.deadline ? (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {context === "backlog" && onAddToToday ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-[#F0FF00]/70 hover:text-[#F0FF00]"
              title="Faire aujourd'hui"
              onClick={() => {
                posthog.capture("task_added_to_today", { sector: task.sector });
                onAddToToday(task.id);
              }}
            >
              <Zap className="h-3 w-3" />
            </Button>
          ) : null}
          {context === "today" ? (
            <>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-emerald-400/70 hover:text-emerald-400"
                title="Marquer comme terminée"
                onClick={handleComplete}
                disabled={isCompleting}
              >
                <Check className="h-3 w-3" />
              </Button>
              {onRemoveFromToday ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
                  title="Renvoyer au backlog"
                  onClick={() => onRemoveFromToday(task.id)}
                >
                  <ArrowRight className="h-3 w-3" />
                </Button>
              ) : null}
            </>
          ) : null}
          {context === "done" ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
              title="Restaurer"
              onClick={() => onStatusChange(task.id, "todo")}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
            onClick={() => onEdit(task.id)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-red-400/50 hover:text-red-400"
            onClick={() => {
              posthog.capture("task_deleted", { sector: task.sector });
              onDelete(task.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
