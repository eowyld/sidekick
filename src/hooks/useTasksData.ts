"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient, getSessionUser } from "@/lib/supabase";
import type { Todo } from "@/lib/sidekick-store";

const KEY = "user_tasks";

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

async function fetchTasks(): Promise<Todo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_tasks")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToTodo);
}

export function useTasksData() {
  const { data: tasks = [], isLoading, error: swrError, mutate: mutateLocal } = useSWR<Todo[]>(KEY, fetchTasks);

  const error = swrError ? (swrError as Error).message : null;

  const setTasks = useCallback((fn: (prev: Todo[]) => Todo[]) => {
    const snapshot = tasks;
    const next = fn(tasks);

    // Optimistic update
    mutateLocal(next, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await getSessionUser(supabase);
      if (!user) {
        mutateLocal(snapshot, false);
        return;
      }

      const prevMap = new Map(snapshot.map((t) => [t.id, t]));
      const nextMap = new Map(next.map((t) => [t.id, t]));

      const toUpsert = next.filter((t) => {
        const old = prevMap.get(t.id);
        return !old || JSON.stringify(old) !== JSON.stringify(t);
      });
      const toDelete = snapshot.filter((t) => !nextMap.has(t.id)).map((t) => t.id);

      const ops: Array<PromiseLike<{ error: { message: string } | null }>> = [];

      if (toUpsert.length > 0) {
        ops.push(
          supabase
            .from("user_tasks")
            .upsert(toUpsert.map((t) => ({ ...todoToRow(t), user_id: user.id })))
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      if (toDelete.length > 0) {
        ops.push(
          supabase
            .from("user_tasks")
            .delete()
            .in("id", toDelete)
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      const results = await Promise.all(ops);
      const firstError = results.find((r) => r.error);
      if (firstError?.error) {
        mutateLocal(snapshot, false);
      } else {
        mutate(KEY);
      }
    })();
  }, [tasks, mutateLocal]);

  return { tasks, setTasks, loading: isLoading, error };
}
