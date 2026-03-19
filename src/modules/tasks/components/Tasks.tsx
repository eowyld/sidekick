"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  BookOpen,
  Briefcase,
  CalendarClock,
  Check,
  Disc2,
  DollarSign,
  Megaphone,
  Mic2,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";
import type { Todo } from "@/lib/sidekick-store";
import { useSidekickData } from "@/hooks/useSidekickData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { TaskModal, TASK_SECTORS, type TaskFormData, type TaskSector } from "./TaskModal";

type SortColumn = "title" | "sector" | "deadline";
type SortDirection = "asc" | "desc";

const SECTOR_BADGE_CLASS: Record<TaskSector, string> = {
  Live: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  Phono: "bg-red-500/15 text-red-300 border-red-500/40",
  Admin: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  Marketing: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  Edition: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  Revenus: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  Autre: "bg-slate-500/15 text-slate-300 border-slate-500/40"
};

const SECTOR_ICON: Record<TaskSector, React.ComponentType<{ className?: string }>> = {
  Live: Mic2,
  Phono: Disc2,
  Admin: Briefcase,
  Marketing: Megaphone,
  Edition: BookOpen,
  Revenus: DollarSign,
  Autre: Briefcase
};

function formatDeadline(deadline?: string): string {
  if (!deadline) return "Sans date limite";
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return deadline;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(d);
}

export function Tasks() {
  const { data, setData } = useSidekickData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("deadline");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickSector, setQuickSector] = useState<TaskSector>("Live");
  const [quickDeadline, setQuickDeadline] = useState("");
  const enabled = data.preferences?.enabledModules ?? {
    live: true,
    phono: true,
    admin: true,
    marketing: true,
    edition: true,
    revenus: true
  };

  const visibleSectors: TaskSector[] = TASK_SECTORS.filter((sector) => {
    if (sector === "Live") return enabled.live;
    if (sector === "Phono") return enabled.phono;
    if (sector === "Admin") return enabled.admin;
    if (sector === "Marketing") return enabled.marketing;
    if (sector === "Edition") return enabled.edition;
    if (sector === "Revenus") return enabled.revenus;
    return true;
  });

  const todos = (data.tasks ?? []).map((task) => ({
    ...task,
    description: task.description ?? "",
    deadline: task.deadline ?? "",
    sector: (task.sector ?? "Admin") as TaskSector
  }));

  const editingTask = useMemo(() => {
    if (!editingId) return null;
    const task = todos.find((t) => t.id === editingId);
    if (!task) return null;
    return {
      title: task.title,
      description: task.description ?? "",
      deadline: task.deadline ?? "",
      sector: task.sector as TaskSector
    } satisfies TaskFormData;
  }, [editingId, todos]);

  const filteredAndSorted = useMemo(() => {
    const filtered = todos.filter((task) =>
      task.sector ? visibleSectors.includes(task.sector as TaskSector) : true
    );
    const sorted = [...filtered].sort((a, b) => {
      if (sortColumn === "title") {
        return a.title.localeCompare(b.title, "fr");
      }
      if (sortColumn === "sector") {
        const bySector = (a.sector ?? "").localeCompare(b.sector ?? "", "fr");
        if (bySector !== 0) return bySector;
        return a.title.localeCompare(b.title, "fr");
      }
      const aDeadline = a.deadline || "9999-12-31";
      const bDeadline = b.deadline || "9999-12-31";
      const byDeadline = aDeadline.localeCompare(bDeadline);
      if (byDeadline !== 0) return byDeadline;
      return a.title.localeCompare(b.title, "fr");
    });

    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [todos, sortColumn, sortDirection, visibleSectors]);

  const handleSave = (taskData: TaskFormData) => {
    if (!taskData.title.trim()) return;

    if (editingId) {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === editingId
            ? {
                ...task,
                title: taskData.title.trim(),
                description: taskData.description.trim(),
                deadline: taskData.deadline,
                sector: taskData.sector
              }
            : task
        )
      }));
    } else {
      const newTask: Todo = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        title: taskData.title.trim(),
        done: false,
        description: taskData.description.trim(),
        deadline: taskData.deadline,
        sector: taskData.sector,
        createdAt: new Date().toISOString()
      };
      setData((prev) => ({
        ...prev,
        tasks: [...prev.tasks, newTask]
      }));
    }

    setEditingId(null);
    setModalOpen(false);
  };

  const handleQuickAdd = () => {
    const title = quickTitle.trim();
    if (!title) return;
    const newTask: Todo = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      title,
      done: false,
      description: "",
      deadline: quickDeadline,
      sector: quickSector,
      createdAt: new Date().toISOString()
    };
    setData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, newTask]
    }));
    setQuickTitle("");
    setQuickDeadline("");
    setQuickSector("Live");
  };

  const toggleTodo = (id: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
      )
    }));
  };

  const removeTodo = (id: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id)
    }));
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === "deadline" ? "asc" : "desc");
  };

  const SortHeader = ({
    label,
    column,
    className
  }: {
    label: string;
    column: SortColumn;
    className?: string;
  }) => (
    <button
      type="button"
      onClick={() => handleSort(column)}
      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground ${className ?? ""}`}
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Tâches</h1>
        <p className="text-sm text-muted-foreground">
          Gère tes tâches par secteur, date limite, tri et statut.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base">Tableau des tâches</CardTitle>
            <Button
              onClick={() => {
                setEditingId(null);
                setModalOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Ajouter une tâche
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="w-14 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Fait
                  </th>
                  <th className="px-3 py-2 text-left">
                    <SortHeader label="Nom" column="title" />
                  </th>
                  <th className="px-3 py-2 text-left">
                    <SortHeader label="Secteur" column="sector" />
                  </th>
                  <th className="px-3 py-2 text-left">
                    <SortHeader label="Date limite" column="deadline" />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t bg-muted/20">
                  <td className="px-3 py-2 text-muted-foreground">—</td>
                  <td className="px-3 py-2">
                    <Input
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      placeholder="Ajouter une tâche..."
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={quickSector}
                      onValueChange={(value: TaskSector) => setQuickSector(value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {visibleSectors.map((sector) => (
                          <SelectItem key={sector} value={sector}>
                            {sector}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <DatePicker
                      value={quickDeadline}
                      onChange={setQuickDeadline}
                      placeholder="JJ/MM/AAAA"
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Button size="sm" onClick={handleQuickAdd} disabled={!quickTitle.trim()}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Ajouter
                    </Button>
                  </td>
                </tr>

                {filteredAndSorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Aucune tâche avec ce filtre.
                    </td>
                  </tr>
                ) : (
                  filteredAndSorted.map((todo) => {
                    const sector = (todo.sector as TaskSector) ?? "Admin";
                    const SectorIcon = SECTOR_ICON[sector];
                    return (
                      <tr key={todo.id} className="border-t hover:bg-muted/20">
                        <td className="px-3 py-2 align-middle">
                          <button
                            type="button"
                            onClick={() => toggleTodo(todo.id)}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                              todo.done
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-transparent hover:border-primary/50 hover:bg-muted/40"
                            }`}
                            aria-label={todo.done ? "Marquer non faite" : "Marquer faite"}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <p className={todo.done ? "line-through text-muted-foreground" : "font-medium"}>
                            {todo.title}
                          </p>
                          {todo.description ? (
                            <p className="text-xs text-muted-foreground">{todo.description}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${SECTOR_BADGE_CLASS[sector]}`}>
                            <SectorIcon className="h-3 w-3" />
                            {sector}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {formatDeadline(todo.deadline)}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingId(todo.id);
                                setModalOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeTodo(todo.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <TaskModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        onSave={handleSave}
        task={editingTask}
      />
    </div>
  );
}


