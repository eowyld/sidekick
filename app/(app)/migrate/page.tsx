"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  getStorageKey,
  mergeWithDefaults,
  type SidekickData,
  type Todo,
} from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function todoToRow(todo: Todo, userId: string): Record<string, unknown> {
  return {
    id: todo.id,
    user_id: userId,
    title: todo.title,
    status: todo.status ?? "todo",
    today_focus: todo.todayFocus ?? false,
    description: todo.description ?? null,
    deadline: todo.deadline ?? null,
    sector: todo.sector ?? null,
    created_at: todo.createdAt ?? null,
    subtasks: todo.subtasks ?? [],
  };
}

type MigrationStatus = "idle" | "checking" | "ready" | "already_migrated" | "migrating" | "done" | "error";

export default function MigratePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<Todo[]>([]);
  const [existingCount, setExistingCount] = useState(0);
  const [status, setStatus] = useState<MigrationStatus>("checking");
  const [migratedCount, setMigratedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);

      // Lire localStorage
      const key = getStorageKey(user.id);
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      const parsed = raw ? (JSON.parse(raw) as Partial<SidekickData>) : null;
      const merged = mergeWithDefaults(parsed);
      setLocalTasks(merged.tasks ?? []);

      // Vérifier Supabase
      const { count } = await supabase
        .from("user_tasks")
        .select("id", { count: "exact", head: true });
      setExistingCount(count ?? 0);

      if ((count ?? 0) > 0) {
        setStatus("already_migrated");
      } else {
        setStatus("ready");
      }
    });
  }, []);

  const handleMigrate = async () => {
    if (!userId || localTasks.length === 0) return;
    setStatus("migrating");
    const supabase = createClient();
    const rows = localTasks.map((t) => todoToRow(t, userId));
    const { error } = await supabase.from("user_tasks").insert(rows);
    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
    } else {
      setMigratedCount(localTasks.length);
      setStatus("done");
    }
  };

  const handleCleanLocalStorage = () => {
    if (!userId) return;
    const key = getStorageKey(userId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as SidekickData;
    parsed.tasks = [];
    window.localStorage.setItem(key, JSON.stringify(parsed));
    alert("localStorage nettoyé — tasks vidées.");
  };

  return (
    <div className="space-y-6 p-6 max-w-xl">
      <div>
        <h1 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40 mb-1">
          Admin
        </h1>
        <p className="text-xl font-bold tracking-tight text-[#F5F5F5]">Migration des données</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Tasks → Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "checking" && (
            <p className="text-sm text-[#F5F5F5]/60">Vérification en cours…</p>
          )}

          {status === "already_migrated" && (
            <div className="space-y-2">
              <p className="text-sm text-amber-400">
                Déjà migré — {existingCount} task{existingCount > 1 ? "s" : ""} trouvée{existingCount > 1 ? "s" : ""} en base.
              </p>
              <p className="text-xs text-[#F5F5F5]/40">
                La migration a déjà été effectuée. Relancer écraserait les données existantes.
              </p>
            </div>
          )}

          {status === "ready" && (
            <div className="space-y-4">
              <p className="text-sm text-[#F5F5F5]/70">
                {localTasks.length} task{localTasks.length > 1 ? "s" : ""} trouvée{localTasks.length > 1 ? "s" : ""} en localStorage, prête{localTasks.length > 1 ? "s" : ""} à migrer.
              </p>
              {localTasks.length === 0 ? (
                <p className="text-xs text-[#F5F5F5]/40">Aucune donnée à migrer.</p>
              ) : (
                <Button onClick={handleMigrate}>Lancer la migration</Button>
              )}
            </div>
          )}

          {status === "migrating" && (
            <p className="text-sm text-[#F5F5F5]/60">Migration en cours…</p>
          )}

          {status === "done" && (
            <div className="space-y-4">
              <p className="text-sm text-green-400">
                ✓ {migratedCount} task{migratedCount > 1 ? "s" : ""} migrée{migratedCount > 1 ? "s" : ""} avec succès.
              </p>
              <Button variant="outline" onClick={handleCleanLocalStorage}>
                Nettoyer le localStorage
              </Button>
            </div>
          )}

          {status === "error" && (
            <p className="text-sm text-red-400">
              Erreur : {errorMessage}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
