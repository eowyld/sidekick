"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Todo } from "@/lib/sidekick-store";
import { useSidekickData } from "@/hooks/useSidekickData";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskModal, type TaskFormData, type TaskSector } from "./TaskModal";
import { TodayPanel } from "./TodayPanel";
import { BacklogPanel } from "./BacklogPanel";
import { TaskCard } from "./TaskCard";

export function Tasks() {
  const { data, setData } = useSidekickData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const todos = useMemo(
    () =>
      (data.tasks ?? []).map((t) => ({
        ...t,
        status: (t.status ?? "todo") as Todo["status"],
        todayFocus: t.todayFocus ?? false,
      })),
    [data.tasks]
  );

  const todayTasks = useMemo(
    () => todos.filter((t) => t.todayFocus),
    [todos]
  );

  const backlogTasks = useMemo(
    () => todos.filter((t) => !t.todayFocus && t.status !== "done"),
    [todos]
  );

  const activeTask = useMemo(
    () => (activeId ? todos.find((t) => t.id === activeId) ?? null : null),
    [activeId, todos]
  );

  const enabledModules = data.preferences?.enabledModules ?? {};
  const aiInstructions = (data.preferences?.aiTaskInstructions ?? {}) as Record<string, string>;
  const calendarEvents = data.calendar?.events ?? [];

  // --- Handlers ---

  const handleStatusChange = (id: string, status: Todo["status"]) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  };

  const handleAddToToday = (id: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, todayFocus: true } : t
      ),
    }));
  };

  const handleRemoveFromToday = (id: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, todayFocus: false } : t
      ),
    }));
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  };

  const handleSave = (taskData: TaskFormData) => {
    if (!taskData.title.trim()) return;
    if (editingId) {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === editingId
            ? {
                ...t,
                title: taskData.title.trim(),
                description: taskData.description.trim(),
                deadline: taskData.deadline,
                sector: taskData.sector,
              }
            : t
        ),
      }));
    } else {
      const newTask: Todo = {
        id: crypto.randomUUID(),
        title: taskData.title.trim(),
        status: "todo",
        todayFocus: false,
        description: taskData.description.trim(),
        deadline: taskData.deadline,
        sector: taskData.sector,
        createdAt: new Date().toISOString(),
      };
      setData((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    }
    setEditingId(null);
    setModalOpen(false);
  };

  const handleAddSuggestion = (title: string, sector: string) => {
    const newTask: Todo = {
      id: crypto.randomUUID(),
      title,
      status: "todo",
      todayFocus: false,
      sector: sector as TaskSector,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
  };

  // --- Drag & Drop ---

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const taskId = active.id as string;
    if (over.id === "today-panel") {
      handleAddToToday(taskId);
    } else if (over.id === "backlog-panel") {
      handleRemoveFromToday(taskId);
    }
  };

  const editingTask = useMemo(() => {
    if (!editingId) return null;
    const t = todos.find((task) => task.id === editingId);
    if (!t) return null;
    return {
      title: t.title,
      description: t.description ?? "",
      deadline: t.deadline ?? "",
      sector: (t.sector ?? "Admin") as TaskSector,
    } satisfies TaskFormData;
  }, [editingId, todos]);

  const allowedSectors: TaskSector[] = useMemo(() => {
    const all: TaskSector[] = [
      "Live",
      "Phono",
      "Admin",
      "Marketing",
      "Edition",
      "Revenus",
      "Autre",
    ];
    return all.filter((s) => {
      if (s === "Live") return enabledModules.live !== false;
      if (s === "Phono") return enabledModules.phono !== false;
      if (s === "Admin") return enabledModules.admin !== false;
      if (s === "Marketing") return enabledModules.marketing !== false;
      if (s === "Edition") return enabledModules.edition !== false;
      if (s === "Revenus") return enabledModules.revenus !== false;
      return true;
    });
  }, [enabledModules]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">Tâches</h1>
          <p className="text-sm text-muted-foreground">
            Organise ton travail par focus quotidien et backlog.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle tâche
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TodayPanel
            tasks={todayTasks}
            onStatusChange={handleStatusChange}
            onRemoveFromToday={handleRemoveFromToday}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          <BacklogPanel
            tasks={backlogTasks}
            userId={userId}
            enabledModules={enabledModules as Record<string, boolean>}
            aiInstructions={aiInstructions}
            calendarEvents={calendarEvents}
            onStatusChange={handleStatusChange}
            onAddToToday={handleAddToToday}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddSuggestion={handleAddSuggestion}
          />
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              context={activeTask.todayFocus ? "today" : "backlog"}
              onStatusChange={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        onSave={handleSave}
        task={editingTask}
        allowedSectors={allowedSectors}
      />

      <details className="rounded-lg border border-border bg-card/40 p-4">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          ⚙️ Instructions IA (personnaliser les suggestions)
        </summary>
        <div className="mt-4 space-y-3">
          {(
            [
              { key: "general", label: "Général" },
              ...(enabledModules.live ? [{ key: "live", label: "Live" }] : []),
              ...(enabledModules.phono ? [{ key: "phono", label: "Phono" }] : []),
              ...(enabledModules.admin ? [{ key: "admin", label: "Admin" }] : []),
              ...(enabledModules.marketing ? [{ key: "marketing", label: "Marketing" }] : []),
              ...(enabledModules.edition ? [{ key: "edition", label: "Édition" }] : []),
              ...(enabledModules.revenus ? [{ key: "revenus", label: "Revenus" }] : []),
            ] as { key: string; label: string }[]
          ).map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {label}
              </label>
              <Input
                placeholder={`Instructions pour ${label}...`}
                value={aiInstructions[key] ?? ""}
                onChange={(e) => {
                  setData((prev) => ({
                    ...prev,
                    preferences: {
                      ...prev.preferences,
                      aiTaskInstructions: {
                        ...prev.preferences.aiTaskInstructions,
                        [key]: e.target.value,
                      },
                    },
                  }));
                }}
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
