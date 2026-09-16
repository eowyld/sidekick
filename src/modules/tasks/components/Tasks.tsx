"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { usePreferencesData } from "@/hooks/usePreferencesData";
import { useTasksData } from "@/hooks/useTasksData";
import { useLiveData } from "@/hooks/useLiveData";
import { useAdminData } from "@/hooks/useAdminData";
import { useIncomesData } from "@/hooks/useIncomesData";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useListeningData, useListeningInvites } from "@/hooks/useListeningData";
import { allRules } from "../rules";
import type { RuleContext, RuleSuggestion } from "../rules/types";
import { createClient, getSessionUser } from "@/lib/supabase";

const isAbortError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AbortError" || error.message.toLowerCase().includes("signal is aborted"));
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { TaskModal, type TaskFormData, type TaskSector } from "./TaskModal";
import { TodayPanel } from "./TodayPanel";
import { BacklogPanel } from "./BacklogPanel";
import { TaskCard } from "./TaskCard";
import { DayStartDialog } from "./DayStartDialog";

export function Tasks() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editTaskId = searchParams.get("editTask");
  const { data } = useSidekickData();
  const { tasks, setTasks, loading, error } = useTasksData();
  const { tourDates, rehearsals } = useLiveData();
  const { structures, procedures } = useAdminData();
  const { invoices, imports } = useIncomesData();
  const { projects } = useProjectsData();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [dayStartOpen, setDayStartOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    getSessionUser(supabase)
      .then(({ data: { user } }) => setUserId(user?.id ?? null))
      .catch((authError) => {
        if (!isAbortError(authError)) console.error("[Tasks] Auth échouée:", authError);
      });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { enabledModules } = usePreferencesData();

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

  const backlogTasks = useMemo(() => {
    const list = todos.filter((t) => !t.todayFocus && t.status !== "done");
    const deadlineKey = (deadline: string | null | undefined) => {
      if (!deadline) return Number.POSITIVE_INFINITY;
      const ts = new Date(`${deadline}T12:00:00`).getTime();
      return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
    };
    return [...list].sort((a, b) => {
      const da = deadlineKey(a.deadline ?? null);
      const db = deadlineKey(b.deadline ?? null);
      const aMissing = da === Number.POSITIVE_INFINITY;
      const bMissing = db === Number.POSITIVE_INFINITY;
      if (!aMissing && !bMissing && da !== db) return da - db;
      if (!aMissing && bMissing) return -1;
      if (aMissing && !bMissing) return 1;
      return a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
    });
  }, [todos]);

  const doneTasks = useMemo(
    () => todos.filter((t) => t.status === "done"),
    [todos]
  );

  const activeTask = useMemo(
    () => (activeId ? todos.find((t) => t.id === activeId) ?? null : null),
    [activeId, todos]
  );

  // Les invitations ne sont pas exposées par le hook des liens : elles ne
  // servent qu'à la règle de relance, on les charge donc à part.
  const { links: listeningLinks } = useListeningData();
  const listeningInvites = useListeningInvites(
    useMemo(() => listeningLinks.map((l) => l.id), [listeningLinks])
  );

  const ruleSuggestions = useMemo<RuleSuggestion[]>(() => {
    const importsList = Object.values(imports).filter(Boolean) as import("@/hooks/useIncomesData").DistributorImport[];
    const ctx: RuleContext = {
      tasks,
      live: enabledModules.live !== false ? { tourDates, rehearsals } : null,
      admin: enabledModules.admin !== false ? { structures, procedures } : null,
      incomes: enabledModules.revenus !== false ? { invoices, imports: importsList } : null,
      projects: projects.length > 0 ? projects : null,
      phono:
        enabledModules.phono !== false
          ? { links: listeningLinks, invites: listeningInvites }
          : null,
    };
    return allRules.map((rule) => rule(ctx)).filter((s): s is RuleSuggestion => s !== null);
  }, [tasks, tourDates, rehearsals, structures, procedures, invoices, imports, enabledModules, projects, listeningLinks, listeningInvites]);

  const calendarEvents = data.calendar?.events ?? [];

  // --- Handlers ---

  const clearEditTaskParam = useCallback(() => {
    if (!searchParams.has("editTask")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("editTask");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!editTaskId || loading) return;
    if (modalOpen && editingId === editTaskId) return;
    if (!todos.some((task) => task.id === editTaskId)) return;
    setEditingId(editTaskId);
    setModalOpen(true);
  }, [editTaskId, editingId, loading, modalOpen, todos]);

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
    clearEditTaskParam();
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

  const handleSubtaskReorder = (taskId: string, fromIndex: number, toIndex: number) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = [...(t.subtasks ?? [])];
        const [moved] = subtasks.splice(fromIndex, 1);
        if (!moved) return t;
        subtasks.splice(toIndex, 0, moved);
        return { ...t, subtasks };
      })
    );
  };

  const handleSubtaskSetCurrent = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const subtasks = task.subtasks ?? [];
        const targetIndex = subtasks.findIndex((step) => step.id === subtaskId);
        if (targetIndex < 0) return task;
        const currentIndex = subtasks.findIndex((step) => !step.done);
        const shouldCompleteCurrent = currentIndex === targetIndex;
        return {
          ...task,
          subtasks: subtasks.map((step, index) => ({
            ...step,
            done: shouldCompleteCurrent ? index <= targetIndex : index < targetIndex,
          })),
        };
      })
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

  const handleStartDayConfirm = (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    const idsSet = new Set(selectedIds);
    setTasks((prev) =>
      prev.map((t) => (idsSet.has(t.id) ? { ...t, todayFocus: true } : t))
    );
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

  if (loading) return <PageLoader />;
  if (error) return (
    <PageError
      title="Impossible de charger tes tâches"
      description="Vérifie ta connexion ou réessaie dans quelques instants."
      onRetry={() => mutate("user_tasks")}
    />
  );

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
            hasBacklog={backlogTasks.length > 0}
            onStartDay={() => setDayStartOpen(true)}
            onStatusChange={handleStatusChange}
            onRemoveFromToday={handleRemoveFromToday}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSubtaskToggle={handleSubtaskToggle}
            onSubtaskAdd={handleSubtaskAdd}
            onSubtaskRename={handleSubtaskRename}
            onSubtaskReorder={handleSubtaskReorder}
            onSubtaskSetCurrent={handleSubtaskSetCurrent}
          />
          <BacklogPanel
            tasks={backlogTasks}
            userId={userId}
            enabledModules={enabledModules as Record<string, boolean>}
            calendarEvents={calendarEvents}
            ruleSuggestions={ruleSuggestions}
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
          clearEditTaskParam();
        }}
        onSave={handleSave}
        task={editingTask}
        allowedSectors={allowedSectors}
      />

      <DayStartDialog
        open={dayStartOpen}
        onClose={() => setDayStartOpen(false)}
        backlogTasks={backlogTasks}
        onConfirm={handleStartDayConfirm}
      />
    </div>
  );
}
