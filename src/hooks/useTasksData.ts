"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Todo } from "@/lib/sidekick-store";

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

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    supabase
      .from("user_tasks")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error: err }) => {
        if (!alive) return;
        if (err) {
          setError(err.message);
        } else {
          setTasksState((data ?? []).map(rowToTodo));
        }
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const setTasks = useCallback((fn: (prev: Todo[]) => Todo[]) => {
    let snapshot: Todo[] = [];
    let next: Todo[] = [];

    setTasksState((prev) => {
      snapshot = prev;
      next = fn(prev);
      return next;
    });

    (async () => {
      setError(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setTasksState(() => snapshot);
        return;
      }

      const prevMap = new Map(snapshot.map((t) => [t.id, t]));
      const nextMap = new Map(next.map((t) => [t.id, t]));

      const toUpsert = next.filter((t) => {
        const old = prevMap.get(t.id);
        return !old || JSON.stringify(old) !== JSON.stringify(t);
      });
      const toDelete = snapshot.filter((t) => !nextMap.has(t.id)).map((t) => t.id);

      const ops: Array<Promise<{ error: { message: string } | null }>> = [];

      if (toUpsert.length > 0) {
        ops.push(
          Promise.resolve(
            supabase
              .from("user_tasks")
              .upsert(toUpsert.map((t) => ({ ...todoToRow(t), user_id: user.id })))
          ).then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      if (toDelete.length > 0) {
        ops.push(
          Promise.resolve(
            supabase
              .from("user_tasks")
              .delete()
              .in("id", toDelete)
          ).then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      const results = await Promise.all(ops);
      const firstError = results.find((r) => r.error);
      if (firstError?.error) {
        setError(firstError.error.message);
        setTasksState(() => snapshot);
      }
    })();
  }, []);

  return { tasks, setTasks, loading, error };
}
