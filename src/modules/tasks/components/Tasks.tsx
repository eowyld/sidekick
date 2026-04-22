"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useTasksData } from "@/hooks/useTasksData";
import { createClient } from "@/lib/supabase";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskModal, type TaskFormData, type TaskSector } from "./TaskModal";
import { TodayPanel } from "./TodayPanel";
import { BacklogPanel } from "./BacklogPanel";
import { TaskCard } from "./TaskCard";

export function Tasks() {
  const { data, setData } = useSidekickData();
  const { tasks, setTasks, loading, error } = useTasksData();

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

  // Auto-promote overdue/due-today tasks — runs once after tasks are loaded
  const promotedRef = useRef(false);
  useEffect(() => {
    if (promotedRef.current || tasks.length === 0 || loading) return;
    promotedRef.current = true;
    const today = new Date().toISOString().slice(0, 10);
    setTasks((prev) =>
      prev.map((t) =>
        t.deadline && t.deadline <= today && !t.todayFocus && t.status !== "done"
          ? { ...t, todayFocus: true }
          : t
      )
    );
  }, [tasks, loading, setTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const todos = useMemo(
    () =>
      tasks.map((t) => ({
        ...t,
        status: (t.status ?? "todo") as Todo["status"],
        todayFocus: t.todayFocus ?? false,
      })),
    [tasks]
  );

  const todayTasks = useMemo(
    () => todos.filter((t) => t.todayFocus),
    [todos]
  );

  const backlogTasks = useMemo(
    () => todos.filter((t) => !t.todayFocus && t.status !== "done"),
    [todos]
  );

  const doneTasks = useMemo(
    () => todos.filter((t) => t.status === "done"),
    [todos]
  );

  const activeTask = useMemo(
    () => (activeId ? todos.find((t) => t.id === activeId) ?? null : null),
    [activeId, todos]
  );

  if (loading) return <PageLoader />;
  if (error) return (
    <PageError
      title="Impossible de charger tes tâches"
      description="Vérifie ta connexion ou réessaie dans quelques instants."
      onRetry={() => mutate("user_tasks")}
    />
  );

  const enabledModules = data.preferences?.enabledModules ?? {};
  const aiInstructions = (data.preferences?.aiTaskInstructions ?? {}) as Record<string, string>;
  const calendarEvents = data.calendar?.events ?? [];

  // --- Handlers ---

  const handleStatusChange = (id: string, status: Todo["status"]) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const handleAddToToday = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, todayFocus: true } : t)));
  };

  const handleRemoveFromToday = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, todayFocus: false } : t)));
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSave = (taskData: TaskFormData) => {
    if (!taskData.title.trim()) return;
    if (editingId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                title: taskData.title.trim(),
                description: taskData.description.trim(),
                deadline: taskData.deadline,
                sector: taskData.sector,
                subtasks: taskData.subtasks,
              }
            : t
        )
      );
    } else {
      const newTask: Todo = {
        id: crypto.randomUUID(),
        title: taskData.title.trim(),
        status: "todo",
        todayFocus: false,
        description: taskData.description.trim(),
        deadline: taskData.deadline,
        sector: taskData.sector,
        subtasks: taskData.subtasks,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, newTask]);
    }
    setEditingId(null);
    setModalOpen(false);
  };

  const handleSubtaskToggle = (taskId: string, subtaskId: string, done: boolean) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: (t.subtasks ?? []).map((s) => s.id === subtaskId ? { ...s, done } : s) }
          : t
      )
    );
  };

  const handleSubtaskAdd = (taskId: string, title: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: [...(t.subtasks ?? []), { id: crypto.randomUUID(), title, done: false }] }
          : t
      )
    );
  };

  const handleSubtaskRename = (taskId: string, subtaskId: string, title: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: title.trim()
                ? (t.subtasks ?? []).map((s) => s.id === subtaskId ? { ...s, title: title.trim() } : s)
                : (t.subtasks ?? []).filter((s) => s.id !== subtaskId),
            }
          : t
      )
    );
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
    setTasks((prev) => [...prev, newTask]);
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
      subtasks: t.subtasks ?? [],
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
          <h1 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40 mb-1">
            Organisation
          </h1>
          <p className="text-xl font-bold tracking-tight text-[#F5F5F5]">Tâches</p>
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
            onSubtaskToggle={handleSubtaskToggle}
            onSubtaskAdd={handleSubtaskAdd}
            onSubtaskRename={handleSubtaskRename}
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
            onAddTask={() => setModalOpen(true)}
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

      {doneTasks.length > 0 ? (
        <details className="border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.3)] p-4">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/40 hover:text-[#F5F5F5]/60 transition-colors">
            Terminées — {doneTasks.length}
          </summary>
          <div className="mt-3 flex flex-col divide-y divide-[rgba(245,245,245,0.05)]">
            {doneTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                context="done"
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </details>
      ) : null}

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

      <details className="border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.3)] p-4">
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/40 hover:text-[#F5F5F5]/60 transition-colors">
          Instructions IA — personnaliser les suggestions
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
              <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#F5F5F5]/40">
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
