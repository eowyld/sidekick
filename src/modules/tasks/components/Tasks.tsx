"use client";

import { useState } from "react";
import type { Todo } from "@/lib/sidekick-store";
import { useSidekickData } from "@/hooks/useSidekickData";

export function Tasks() {
  const [input, setInput] = useState("");
  const { data, setData } = useSidekickData();
  const todos = data.tasks;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setData((prev) => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        { id: Date.now().toString(), title: trimmed, done: false }
      ]
    }));
    setInput("");
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

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Tâches</h1>
        <p className="text-sm text-muted-foreground">
          Liste de tâches basique : ajoute, coche, supprime.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          placeholder="Ajouter une tâche…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Ajouter
        </button>
      </form>

      <div className="space-y-2">
        {todos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune tâche pour l’instant. Commence par en ajouter une.
          </p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
            >
              <button
                type="button"
                onClick={() => toggleTodo(todo.id)}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                    todo.done ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  {todo.done ? "✓" : ""}
                </span>
                <span
                  className={todo.done ? "line-through text-muted-foreground" : ""}
                >
                  {todo.title}
                </span>
              </button>
              <button
                type="button"
                onClick={() => removeTodo(todo.id)}
                className="ml-3 text-xs text-destructive hover:underline"
              >
                Supprimer
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


