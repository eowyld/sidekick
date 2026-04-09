"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Todo } from "@/lib/sidekick-store";

// Mapping Supabase row → Todo
function rowToTodo(row: Record<string, unknown>): Todo {
  return {
    id: row.id as string,
    title: row.title as string,
    status: (row.status as Todo["status"]) ?? "todo",
    todayFocus: (row.today_focus as boolean) ?? false,
    description: (row.description as string) ?? undefined,
    deadline: (row.deadline as string) ?? undefined,
    sector: (row.sector as Todo["sector"]) ?? undefined,
    createdAt: (row.created_at as string) ?? undefined,
    subtasks: (row.subtasks as Todo["subtasks"]) ?? [],
  };
}

// Mapping Todo → Supabase row (sans user_id — ajouté à l'insert)
function todoToRow(todo: Todo): Record<string, unknown> {
  return {
    id: todo.id,
    title: todo.title,
    status: todo.status,
    today_focus: todo.todayFocus,
    description: todo.description ?? null,
    deadline: todo.deadline ?? null,
    sector: todo.sector ?? null,
    created_at: todo.createdAt ?? null,
    subtasks: todo.subtasks ?? [],
  };
}

export function useTasksData() {
  const [tasks, setTasksState] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chargement initial
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("user_tasks")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else {
          setTasksState((data ?? []).map(rowToTodo));
        }
        setLoading(false);
      });
  }, []);

  // Écriture optimiste avec diff et rollback
  const setTasks = useCallback((fn: (prev: Todo[]) => Todo[]) => {
    setTasksState((prev) => {
      const next = fn(prev);

      const prevMap = new Map(prev.map((t) => [t.id, t]));
      const nextMap = new Map(next.map((t) => [t.id, t]));

      const toUpsert = next.filter((t) => {
        const old = prevMap.get(t.id);
        return !old || JSON.stringify(old) !== JSON.stringify(t);
      });
      const toDelete = prev.filter((t) => !nextMap.has(t.id)).map((t) => t.id);

      (async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const ops: Promise<{ error: string | null }>[] = [];

        if (toUpsert.length > 0) {
          ops.push(
            (async () => {
              const { error } = await supabase
                .from("user_tasks")
                .upsert(toUpsert.map((t) => ({ ...todoToRow(t), user_id: user.id })));
              return { error: error?.message ?? null };
            })()
          );
        }

        if (toDelete.length > 0) {
          ops.push(
            (async () => {
              const { error } = await supabase
                .from("user_tasks")
                .delete()
                .in("id", toDelete);
              return { error: error?.message ?? null };
            })()
          );
        }

        const results = await Promise.all(ops);
        const firstError = results.find((r) => r.error);
        if (firstError?.error) {
          setError(firstError.error);
          setTasksState(prev); // rollback
        }
      })();

      return next;
    });
  }, []);

  return { tasks, setTasks, loading, error };
}
