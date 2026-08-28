"use client";

import { useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { Plus, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Todo } from "@/lib/sidekick-store";
import type { RuleSuggestion } from "../rules/types";

interface Suggestion {
  title: string;
  sector: string;
  reason: string;
}

interface AiSuggestionsProps {
  userId: string | null;
  tasks: Todo[];
  calendarEvents: Array<{ title: string; start: string }>;
  enabledModules: Record<string, boolean>;
  onAdd: (title: string, sector: string) => void;
  ruleSuggestions: RuleSuggestion[];
}

export function AiSuggestions({
  userId,
  tasks,
  calendarEvents,
  enabledModules,
  onAdd,
  ruleSuggestions,
}: AiSuggestionsProps) {
  const posthog = usePostHog();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const fetchSuggestions = async (force = false) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      const upcomingEvents = calendarEvents
        .filter((e) => {
          const d = new Date(e.start);
          return d >= today && d <= in14Days;
        })
        .map((e) => ({ title: e.title, date: e.start.slice(0, 10) }));

      const activeTasks = tasks.map((t) => ({
        title: t.title,
        sector: t.sector ?? "Autre",
        status: t.status,
      }));

      const activeModuleNames = Object.entries(enabledModules)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const res = await fetch("/api/tasks/ai-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: activeTasks,
          calendarEvents: upcomingEvents,
          enabledModules: activeModuleNames,
          aiInstructions: {},
          force,
          ruleSuggestions: ruleSuggestions.map((s) => ({ title: s.title, sector: s.sector })),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json() as { suggestions: Suggestion[] };
      setSuggestions(json.suggestions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les suggestions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleAdd = (s: Suggestion) => {
    posthog?.capture("ai_suggestion_converted", { module: "tasks" });
    onAdd(s.title, s.sector);
    setAdded((prev) => new Set(prev).add(s.title));
  };

  const algoAsSuggestions: Suggestion[] = ruleSuggestions.map((s) => ({
    title: s.title,
    sector: s.sector,
    reason: s.reason,
  }));

  const allSuggestions: Suggestion[] = [...algoAsSuggestions, ...suggestions];

  return (
    <div className="rounded-md border border-border/60 bg-muted/10 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          Suggestions IA
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          title="Regénérer"
          onClick={() => fetchSuggestions(true)}
          disabled={loading}
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-md bg-muted/30"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : allSuggestions.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Pas encore de suggestions"
          description="Ajoute quelques tâches, l'IA te proposera ensuite comment les organiser dans ta semaine."
        />
      ) : (
        <div className="space-y-1.5">
          {allSuggestions.map((s, i) => {
            const isAdded = added.has(s.title);
            return (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 rounded-md border border-border/40 bg-card/40 px-2.5 py-2",
                  isAdded && "opacity-40"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">{s.reason}</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  disabled={isAdded}
                  onClick={() => handleAdd(s)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
