"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AudioWaveform, CalendarDays, Plus, Search } from "lucide-react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageError } from "@/components/ui/page-error";
import { PageLoader } from "@/components/ui/page-loader";
import { usePhonoData, type StudioSession } from "@/hooks/usePhonoData";
import { cn, focusRing } from "@/lib/utils";
import {
  isSessionPast,
  monthKeyLabel,
  sessionMonthKey,
  sessionTimestamp,
} from "@/modules/phono/lib/session";
import { SessionsHeader } from "./sessions/SessionsHeader";
import { SessionPanel } from "./sessions/SessionPanel";
import { SessionRow, type SessionThumb } from "./sessions/SessionRow";

type Scope = "all" | "upcoming" | "past";

const SCOPES: Array<[Scope, string]> = [
  ["all", "Toutes"],
  ["upcoming", "À venir"],
  ["past", "Passées"],
];

export function SessionsStudioPage() {
  const router = useRouter();
  const { sessions, setSessions, albums, tracks, mixes, loading, error } =
    usePhonoData();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  /** Session dépliée sur place. `null` = liste entièrement repliée. */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StudioSession | null>(null);

  const filtered = useMemo(
    () =>
      sessions
        .filter((s) => {
          if (scope === "upcoming" && isSessionPast(s)) return false;
          if (scope === "past" && !isSessionPast(s)) return false;
          return `${s.title} ${s.location} ${s.participants
            .map((p) => p.name)
            .join(" ")}`
            .toLowerCase()
            .includes(query.trim().toLowerCase());
        })
        // Les sessions passées se lisent de la plus récente à la plus ancienne,
        // celles à venir dans l'ordre où elles arrivent.
        .sort((a, b) =>
          scope === "past"
            ? sessionTimestamp(b) - sessionTimestamp(a)
            : sessionTimestamp(a) - sessionTimestamp(b)
        ),
    [sessions, query, scope]
  );

  /**
   * Découpage en mois, dans l'ordre déjà décidé par le tri : on parcourt la
   * liste triée et on ouvre un groupe à chaque changement de mois, plutôt que
   * de regrouper puis retrier — les deux ordres ne peuvent pas diverger.
   */
  const months = useMemo(() => {
    const groups: Array<{ key: string; sessions: StudioSession[] }> = [];
    for (const session of filtered) {
      const key = sessionMonthKey(session);
      const current = groups[groups.length - 1];
      if (current && current.key === key) current.sessions.push(session);
      else groups.push({ key, sessions: [session] });
    }
    return groups;
  }, [filtered]);

  /**
   * Tout le catalogue indexé par id. Les sessions ne référencent que des ids :
   * lignes et panneau y puisent titres et pochettes.
   */
  const catalogById = useMemo(() => {
    const byId = new Map<string, SessionThumb>();
    for (const a of albums) byId.set(a.id, { id: a.id, title: a.title, cover: a.cover });
    for (const t of tracks) byId.set(t.id, { id: t.id, title: t.title, cover: t.cover });
    for (const m of mixes) byId.set(m.id, { id: m.id, title: m.title, cover: m.cover });
    return byId;
  }, [albums, tracks, mixes]);

  /** Pochettes des éléments liés, résolues une fois pour toutes les lignes. */
  const thumbsBySession = useMemo(() => {
    const map = new Map<string, SessionThumb[]>();
    for (const s of sessions) {
      const ids = [
        ...(s.albumIds ?? []),
        ...(s.trackIds ?? []),
        ...(s.mixIds ?? []),
      ];
      map.set(
        s.id,
        ids
          .map((id) => catalogById.get(id))
          .filter((thumb): thumb is SessionThumb => thumb !== undefined)
      );
    }
    return map;
  }, [sessions, catalogById]);

  if (loading) return <PageLoader />;
  if (error)
    return (
      <PageError
        title="Impossible de charger tes sessions studio"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
        onRetry={() => mutate("user_phono")}
      />
    );

  /**
   * Déplie une session. Le panneau prend la place de sa ligne : si la portée
   * ou la recherche l'excluent de la liste, il n'aurait nulle part où
   * s'afficher — on lève alors ce qui la masque plutôt que de ne rien faire.
   */
  const openSession = (id: string) => {
    if (!filtered.some((s) => s.id === id)) {
      setQuery("");
      setScope("all");
    }
    setExpandedId(id);
  };

  const editSession = (id: string) =>
    router.push(`/phono/sessions-studio/${id}`);

  const confirmDelete = (session: StudioSession) => {
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    setPendingDelete(null);
    if (expandedId === session.id) setExpandedId(null);
  };

  // Un `expandedId` qui ne correspond plus à rien (session supprimée, ou
  // masquée par un filtre changé depuis) vaut « replié » : pas d'état fantôme
  // à nettoyer dans un effet.
  const expanded = expandedId
    ? filtered.find((s) => s.id === expandedId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40">
            Phono
          </p>
          <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">
            Sessions studio
          </h1>
        </div>
        <Button onClick={() => router.push("/phono/sessions-studio/nouvelle")}>
          <Plus size={16} />
          Planifier une session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={AudioWaveform}
          title="Ton studio est encore silencieux"
          description="Planifie une session, rattache les morceaux enregistrés et prépare une fiche de présence exploitable pour tes droits voisins."
          action={{
            label: "Planifier une session",
            onClick: () => router.push("/phono/sessions-studio/nouvelle"),
          }}
        />
      ) : (
        <>
          <SessionsHeader sessions={sessions} onOpenSession={openSession} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5F5F5]/30"
                size={15}
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une session, un studio…"
                className="pl-9"
              />
            </div>
            <div className="flex rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] p-1">
              {SCOPES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScope(value)}
                  aria-pressed={scope === value}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs transition",
                    focusRing,
                    scope === value
                      ? "bg-[rgba(245,245,245,0.1)] text-[#F5F5F5]"
                      : "text-[#F5F5F5]/40 hover:text-[#F5F5F5]/70"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {months.length > 0 ? (
            <div className="space-y-6">
              {months.map(({ key, sessions: group }) => (
                <section key={key || "sans-date"}>
                  <div className="mb-2 flex items-center gap-3">
                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F5F5F5]/35">
                      {monthKeyLabel(key)}
                    </h2>
                    <span className="text-[10px] tabular-nums text-[#F5F5F5]/25">
                      {group.length}
                    </span>
                    <span className="h-px flex-1 bg-[rgba(245,245,245,0.07)]" />
                  </div>
                  <div className="space-y-2">
                    {group.map((s) =>
                      // Le panneau prend la place de sa ligne, il ne s'ajoute
                      // pas en dessous : la liste garde la même longueur et le
                      // détail s'ouvre exactement là où on a cliqué.
                      expanded?.id === s.id ? (
                        <SessionPanel
                          key={s.id}
                          session={s}
                          catalog={catalogById}
                          onEdit={() => editSession(s.id)}
                          onDelete={() => setPendingDelete(s)}
                          onClose={() => setExpandedId(null)}
                        />
                      ) : (
                        <SessionRow
                          key={s.id}
                          session={s}
                          thumbs={thumbsBySession.get(s.id) ?? []}
                          onOpen={() => openSession(s.id)}
                        />
                      )
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[rgba(245,245,245,0.1)] py-12 text-center text-sm text-[#F5F5F5]/35">
              <CalendarDays className="mx-auto mb-3" size={22} />
              Aucune session ne correspond à cette vue.
            </div>
          )}
        </>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Supprimer « {pendingDelete?.title || "Session sans titre"} » ?
            </DialogTitle>
            <DialogDescription className="text-sm text-[#F5F5F5]/70">
              La session est retirée de ton planning, avec ses participants,
              ses coûts et sa fiche de présence. Les titres, albums et mixes
              qu&apos;elle référence restent dans le catalogue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => pendingDelete && confirmDelete(pendingDelete)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
