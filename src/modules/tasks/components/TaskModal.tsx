"use client";

import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";

export type TaskSector =
  | "Live"
  | "Phono"
  | "Admin"
  | "Marketing"
  | "Edition"
  | "Revenus"
  | "Projets"
  | "Autre";

export const TASK_SECTORS: TaskSector[] = [
  "Live",
  "Phono",
  "Admin",
  "Marketing",
  "Edition",
  "Revenus",
  "Projets",
  "Autre"
];

/** Aligné sur TaskCard — fond / texte / bordure pour trigger et options */
const SECTOR_BADGE: Record<TaskSector, string> = {
  Live: "border-blue-500/35 bg-blue-500/15 text-blue-300",
  Phono: "border-red-500/35 bg-red-500/15 text-red-300",
  Admin: "border-violet-500/35 bg-violet-500/15 text-violet-300",
  Marketing: "border-emerald-500/35 bg-emerald-500/15 text-emerald-300",
  Edition: "border-cyan-500/35 bg-cyan-500/15 text-cyan-300",
  Revenus: "border-orange-500/35 bg-orange-500/15 text-orange-300",
  Projets: "border-[rgba(240,255,0,0.35)] bg-[rgba(240,255,0,0.1)] text-[#F0FF00]",
  Autre: "border-[rgba(245,245,245,0.18)] bg-[rgba(245,245,245,0.06)] text-[#F5F5F5]/70",
};

const SECTOR_OPTION: Record<TaskSector, string> = {
  Live: "focus:bg-blue-500/20 focus:text-blue-200 data-[highlighted]:bg-blue-500/20 data-[highlighted]:text-blue-200",
  Phono: "focus:bg-red-500/20 focus:text-red-200 data-[highlighted]:bg-red-500/20 data-[highlighted]:text-red-200",
  Admin: "focus:bg-violet-500/20 focus:text-violet-200 data-[highlighted]:bg-violet-500/20 data-[highlighted]:text-violet-200",
  Marketing:
    "focus:bg-emerald-500/20 focus:text-emerald-200 data-[highlighted]:bg-emerald-500/20 data-[highlighted]:text-emerald-200",
  Edition: "focus:bg-cyan-500/20 focus:text-cyan-200 data-[highlighted]:bg-cyan-500/20 data-[highlighted]:text-cyan-200",
  Revenus:
    "focus:bg-orange-500/20 focus:text-orange-200 data-[highlighted]:bg-orange-500/20 data-[highlighted]:text-orange-200",
  Projets:
    "focus:bg-[rgba(240,255,0,0.12)] focus:text-[#F0FF00] data-[highlighted]:bg-[rgba(240,255,0,0.12)] data-[highlighted]:text-[#F0FF00]",
  Autre:
    "focus:bg-[rgba(245,245,245,0.12)] focus:text-[#F5F5F5] data-[highlighted]:bg-[rgba(245,245,245,0.12)] data-[highlighted]:text-[#F5F5F5]",
};

export interface TaskFormData {
  title: string;
  description: string;
  deadline: string;
  sector: TaskSector;
  subtasks: { id: string; title: string; done: boolean }[];
}

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: TaskFormData) => void;
  task: TaskFormData | null;
  allowedSectors: TaskSector[];
}

function ModalSubtaskRow({
  subtask,
  onRename,
  onRemove,
  isLast,
  isFocusStep,
  onSetFocus,
}: {
  subtask: { id: string; title: string; done: boolean };
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  isLast: boolean;
  isFocusStep: boolean;
  onSetFocus: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(subtask.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    setEditing(false);
    onRename(subtask.id, value);
  };

  return (
    <li className={cn("flex gap-3", !isLast && "pb-3")}>
      {/* Colonne rail : même hauteur que la ligne pour que le trait relie bien les points */}
      <div className="relative flex w-10 shrink-0 flex-col items-center self-stretch">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onSetFocus();
          }}
          className="relative z-[2] flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none hover:bg-[rgba(245,245,245,0.06)] focus-visible:ring-2 focus-visible:ring-[#F0FF00]/55"
          aria-current={isFocusStep ? "step" : undefined}
          aria-label={
            isFocusStep
              ? `Étape en cours : ${subtask.title}`
              : `Placer le focus sur cette étape : ${subtask.title}`
          }
        >
          <span
            className={cn(
              "block shrink-0 rounded-full border transition-all",
              isFocusStep
                ? "h-4 w-4 border-2 border-[#F0FF00] bg-[#F0FF00] shadow-[0_0_0_3px_rgba(240,255,0,0.2)]"
                : subtask.done
                  ? "h-2.5 w-2.5 border border-[rgba(240,255,0,0.22)] bg-[rgba(112,122,0,0.38)]"
                  : "h-2.5 w-2.5 border border-[rgba(245,245,245,0.18)] bg-[rgba(20,20,20,0.95)]"
            )}
            aria-hidden
          />
        </button>
        {!isLast ? (
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-10 bottom-0 z-0 w-px -translate-x-1/2 bg-[rgba(240,255,0,0.28)]"
          />
        ) : null}
      </div>
      <div className="relative z-[1] flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[rgba(245,245,245,0.08)] bg-[rgba(20,20,20,0.3)] px-2 py-1.5">
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(); }
              if (e.key === "Escape") { setValue(subtask.title); setEditing(false); }
            }}
            className="flex-1 min-w-0 bg-transparent text-sm outline-none border-b border-[rgba(245,245,245,0.2)] pb-0.5 text-[#F5F5F5]"
          />
        ) : (
          <span
            onClick={() => setEditing(true)}
            className={cn(
              "flex-1 min-w-0 truncate text-sm cursor-text text-[#F5F5F5]",
              subtask.done && "line-through text-[#F5F5F5]/45"
            )}
          >
            {subtask.title}
          </span>
        )}
        <button
          type="button"
          onClick={() => onRemove(subtask.id)}
          className="shrink-0 text-[#F5F5F5]/45 hover:text-[#F5F5F5]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

export function TaskModal({ open, onClose, onSave, task, allowedSectors }: TaskModalProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    description: "",
    deadline: "",
    sector: allowedSectors[0] ?? "Live",
    subtasks: [],
  });
  const [subtaskInput, setSubtaskInput] = useState("");

  useEffect(() => {
    if (task) {
      const safeSector = allowedSectors.includes(task.sector as TaskSector)
        ? (task.sector as TaskSector)
        : allowedSectors[0] ?? (task.sector as TaskSector);
      setFormData({
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        sector: safeSector,
        subtasks: task.subtasks ?? [],
      });
    } else {
      setFormData({
        title: "",
        description: "",
        deadline: "",
        sector: allowedSectors[0] ?? "Live",
        subtasks: [],
      });
    }
    setSubtaskInput("");
  }, [task, open, allowedSectors]);

  const handleAddSubtask = () => {
    if (!subtaskInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, { id: crypto.randomUUID(), title: subtaskInput.trim(), done: false }],
    }));
    setSubtaskInput("");
  };

  const handleRemoveSubtask = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((s) => s.id !== id),
    }));
  };

  /** Aligné sur Tasks.handleSubtaskSetCurrent — où en est le focus dans la frise */
  const handleSetFocusStep = (subtaskId: string) => {
    setFormData((prev) => {
      const subtasks = prev.subtasks;
      const targetIndex = subtasks.findIndex((step) => step.id === subtaskId);
      if (targetIndex < 0) return prev;
      const currentIndex = subtasks.findIndex((step) => !step.done);
      const shouldCompleteCurrent = currentIndex === targetIndex;
      return {
        ...prev,
        subtasks: subtasks.map((step, index) => ({
          ...step,
          done: shouldCompleteCurrent ? index <= targetIndex : index < targetIndex,
        })),
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task) {
      posthog.capture("task_updated", { sector: formData.sector, has_deadline: !!formData.deadline, subtask_count: formData.subtasks.length });
    } else {
      posthog.capture("task_created", { sector: formData.sector, has_deadline: !!formData.deadline, subtask_count: formData.subtasks.length });
      posthog.capture("item_created", { module: "tasks" });
    }
    onSave(formData);
  };

  const modalFocusIdx = formData.subtasks.findIndex((st) => !st.done);
  const modalFocusStepId =
    modalFocusIdx >= 0 ? formData.subtasks[modalFocusIdx]?.id ?? null : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {task ? "Modifier la tâche" : "Ajouter une nouvelle tâche"}
          </DialogTitle>
          <DialogDescription>
            {task
              ? "Modifiez les détails de la tâche."
              : "Ajoutez une nouvelle tâche à votre liste."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Titre de la tâche"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Description de la tâche"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="sector">Secteur</Label>
                <Select
                  value={formData.sector}
                  onValueChange={(value: TaskSector) =>
                    setFormData({ ...formData, sector: value })
                  }
                >
                  <SelectTrigger
                    id="sector"
                    className={cn(
                      SECTOR_BADGE[formData.sector] ?? SECTOR_BADGE.Autre,
                      "shadow-none focus:ring-[#F0FF00]/45"
                    )}
                  >
                    <SelectValue placeholder="Sélectionner le secteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedSectors.map((sector) => (
                      <SelectItem
                        key={sector}
                        value={sector}
                        className={SECTOR_OPTION[sector]}
                      >
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label>Date limite</Label>
                <DatePicker
                  value={formData.deadline}
                  onChange={(date) =>
                    setFormData({ ...formData, deadline: date })
                  }
                  className="w-full"
                  calendarIconClassName="mr-2.5 h-6 w-6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Étapes</Label>
              {formData.subtasks.length > 0 ? (
                <ul className="list-none space-y-0">
                  {formData.subtasks.map((s, index, arr) => (
                    <ModalSubtaskRow
                      key={s.id}
                      subtask={s}
                      isLast={index === arr.length - 1}
                      isFocusStep={modalFocusStepId !== null && s.id === modalFocusStepId}
                      onSetFocus={() => handleSetFocusStep(s.id)}
                      onRename={(id, title) => {
                        setFormData((prev) => ({
                          ...prev,
                          subtasks: title.trim()
                            ? prev.subtasks.map((t) =>
                                t.id === id ? { ...t, title: title.trim() } : t
                              )
                            : prev.subtasks.filter((t) => t.id !== id),
                        }));
                      }}
                      onRemove={handleRemoveSubtask}
                    />
                  ))}
                </ul>
              ) : null}
              <div className="flex gap-2">
                <Input
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); } }}
                  placeholder="Ajouter une étape..."
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddSubtask}>
                  Ajouter
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

