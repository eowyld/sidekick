"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CircleDot, CheckCircle2, Plus, Trash2,
  ChevronDown, ChevronRight, ExternalLink, Zap, Calendar, User,
} from "lucide-react";
import type {
  Project, CreationStep, CreationSector, CreationEntityType, CreationPhase, Todo,
} from "@/lib/sidekick-store";
import { CREATION_PHASE_ORDER, CREATION_PHASE_LABELS } from "@/lib/sidekick-store";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useProjectCreationData } from "@/hooks/useProjectCreationData";
import { useTasksData } from "@/hooks/useTasksData";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useEditionData } from "@/hooks/useEditionData";
import { useLiveData } from "@/hooks/useLiveData";
import { SECTOR_LABELS } from "@/modules/projects/data/creation-templates";
import {
  computeActivePhase, isPhaseDone, allPhasesDone, phaseProgress, globalProgress,
  deriveSignals, type CreationSignal,
} from "@/modules/projects/data/creation-logic";
import { PhonoSection } from "../sections/PhonoSection";
import { EditionSection } from "../sections/EditionSection";
import { LiveSection } from "../sections/LiveSection";
import { WorkTrackLinker } from "../sections/WorkTrackLinker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Constantes ────────────────────────────────────────────────────────────────

const STATUS_CYCLE: Record<CreationStep["status"], CreationStep["status"]> = {
  todo: "doing",
  doing: "done",
  done: "todo",
};

const STEP_TO_TASK_STATUS: Record<CreationStep["status"], Todo["status"]> = {
  todo: "todo",
  doing: "in_progress",
  done: "done",
};

const TASK_TO_STEP_STATUS: Record<Todo["status"], CreationStep["status"]> = {
  todo: "todo",
  in_progress: "doing",
  done: "done",
};

const ENTITY_TYPE_LABELS: Record<CreationEntityType, string> = {
  "": "Aucun",
  track: "Titre",
  album: "Album",
  session: "Session studio",
  work: "Œuvre",
  tour_date: "Date de concert",
  rehearsal: "Répétition",
};

const ENTITY_ROUTES: Record<Exclude<CreationEntityType, "">, string> = {
  track: "/phono/catalogue",
  album: "/phono/catalogue",
  session: "/phono/sessions-studio",
  work: "/edition",
  tour_date: "/live/representations",
  rehearsal: "/live/repetitions",
};

const SECTOR_ORDER: CreationSector[] = ["phono", "edition", "live", "general"];

// ─── StepStatusIcon ────────────────────────────────────────────────────────────

function StepStatusIcon({ status, onClick }: { status: CreationStep["status"]; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 transition-opacity hover:opacity-70"
      title={status === "todo" ? "Activer l'étape" : `Statut : ${status} — clic pour changer`}
    >
      {status === "todo" && <Zap size={16} className="text-[#F5F5F5]/30" />}
      {status === "doing" && <CircleDot size={16} className="text-[#F0FF00]/80" />}
      {status === "done" && <CheckCircle2 size={16} className="text-[#F0FF00]" />}
    </button>
  );
}

// ─── StepRow ───────────────────────────────────────────────────────────────────

function StepRow({
  step, isNaming, onCycleStatus, onDelete, onRename, onFinishNaming,
}: {
  step: CreationStep;
  isNaming: boolean;
  onCycleStatus: () => void;
  onDelete: () => void;
  onRename: (label: string) => void;
  onFinishNaming: () => void;
}) {
  const [draft, setDraft] = useState(step.label);

  const commit = () => {
    onRename(draft.trim() || step.label);
    onFinishNaming();
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[rgba(245,245,245,0.04)] group">
      <StepStatusIcon status={step.status} onClick={onCycleStatus} />
      {isNaming ? (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") onFinishNaming();
          }}
          className="flex-1 h-6 text-[13px] px-1.5"
        />
      ) : (
        <span
          className={cn(
            "flex-1 text-[13px] truncate",
            step.status === "done" && "line-through text-[#F5F5F5]/40",
            step.status === "todo" && "text-[#F5F5F5]/35",
            step.status === "doing" && "text-[#F5F5F5]/90"
          )}
        >
          {step.label}
        </span>
      )}
      <div className="flex items-center gap-1.5 shrink-0">
        {step.targetDate && (
          <span className="flex items-center gap-1 text-[10px] text-[#F5F5F5]/40 bg-[rgba(245,245,245,0.06)] rounded px-1.5 py-0.5">
            <Calendar size={9} />{step.targetDate}
          </span>
        )}
        {step.assignee && (
          <span className="flex items-center gap-1 text-[10px] text-[#F5F5F5]/40 bg-[rgba(245,245,245,0.06)] rounded px-1.5 py-0.5">
            <User size={9} />{step.assignee}
          </span>
        )}
        {step.linkedEntityType && (step.linkedEntityType as string) !== "" && (
          <a
            href={ENTITY_ROUTES[step.linkedEntityType as Exclude<CreationEntityType, "">]}
            className="flex items-center gap-1 text-[10px] text-[#F0FF00]/50 bg-[#F0FF00]/8 hover:text-[#F0FF00] rounded px-1.5 py-0.5 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={9} />{ENTITY_TYPE_LABELS[step.linkedEntityType]}
          </a>
        )}
        {step.links.length > 0 && (
          <span className="text-[10px] text-[#F5F5F5]/30 bg-[rgba(245,245,245,0.06)] rounded px-1.5 py-0.5">
            {step.links.length} lien{step.links.length > 1 ? "s" : ""}
          </span>
        )}
        {step.taskId && (
          <a href="/tasks" className="flex items-center gap-1 text-[10px] text-[#F0FF00]/50 hover:text-[#F0FF00] transition-colors" onClick={(e) => e.stopPropagation()}>
            <Zap size={9} />tâche
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        title="Supprimer l'étape"
        className="opacity-0 group-hover:opacity-100 text-[#F5F5F5]/30 hover:text-red-400 transition-all shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── PhaseSignals ──────────────────────────────────────────────────────────────

function PhaseSignals({ signals }: { signals: CreationSignal[] }) {
  if (signals.length === 0) return null;
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {signals.map((s, i) => (
        <span
          key={i}
          className={cn(
            "text-[11px] rounded-full px-2.5 py-1 border",
            s.tone === "accent"
              ? "text-[#F0FF00] bg-[#F0FF00]/8 border-[#F0FF00]/20"
              : "text-[#F5F5F5]/70 bg-[rgba(245,245,245,0.05)] border-[rgba(245,245,245,0.12)]"
          )}
        >
          {s.label}
        </span>
      ))}
    </div>
  );
}

// ─── PhaseCard ─────────────────────────────────────────────────────────────────

function PhaseCard({
  phase, steps, signals, isActive, open, onToggle, namingStepId,
  onCycleStatus, onDelete, onAddStep, onRename, onFinishNaming,
}: {
  phase: CreationPhase;
  steps: CreationStep[];
  signals: CreationSignal[];
  isActive: boolean;
  open: boolean;
  onToggle: () => void;
  namingStepId: string | null;
  onCycleStatus: (step: CreationStep) => void;
  onDelete: (step: CreationStep) => void;
  onAddStep: (phase: CreationPhase) => void;
  onRename: (step: CreationStep, label: string) => void;
  onFinishNaming: () => void;
}) {
  const { done, total } = phaseProgress(steps, phase);
  const phaseSteps = steps.filter((s) => s.phase === phase);
  const isDone = isPhaseDone(steps, phase);
  const stateLabel = isDone ? "terminée" : isActive ? "en cours" : "à venir";

  const sectorsPresent = SECTOR_ORDER.filter((sec) => phaseSteps.some((s) => s.sector === sec));

  return (
    <div
      className={cn(
        "rounded-xl border backdrop-blur-xl overflow-hidden transition-colors",
        isActive
          ? "border-[rgba(240,255,0,0.25)] bg-[rgba(240,255,0,0.03)]"
          : "border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)]",
        !open && !isActive && "opacity-70"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-[rgba(245,245,245,0.03)] transition-colors"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown size={14} className="text-[#F5F5F5]/40" /> : <ChevronRight size={14} className="text-[#F5F5F5]/40" />}
          <span className={cn("text-[13px] font-medium", isActive ? "text-[#F5F5F5]" : "text-[#F5F5F5]/70")}>
            {isDone && "✓ "}{CREATION_PHASE_LABELS[phase]}
          </span>
        </span>
        <span className="text-[11px] text-[#F5F5F5]/40">{done}/{total} · {stateLabel}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <PhaseSignals signals={signals} />

          {sectorsPresent.map((sec) => (
            <div key={sec} className="mb-2">
              <div className="text-[10px] uppercase tracking-[0.12em] text-[#F5F5F5]/35 mb-1 px-2">
                {SECTOR_LABELS[sec]}
              </div>
              {phaseSteps
                .filter((s) => s.sector === sec)
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    isNaming={step.id === namingStepId}
                    onCycleStatus={() => onCycleStatus(step)}
                    onDelete={() => onDelete(step)}
                    onRename={(label) => onRename(step, label)}
                    onFinishNaming={onFinishNaming}
                  />
                ))}
            </div>
          ))}

          <button
            type="button"
            onClick={() => onAddStep(phase)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F5F5F5]/60 transition-colors w-full"
          >
            <Plus size={12} /> Ajouter une étape
          </button>
        </div>
      )}
    </div>
  );
}

// ─── CreationTab ───────────────────────────────────────────────────────────────

export function CreationTab({ project }: { project: Project }) {
  const router = useRouter();
  const { setProjects } = useProjectsData();
  const { tracks: phonoTracks, sessions: phonoSessions } = usePhonoData();
  const { works: editionWorks } = useEditionData();
  const { tourDates: liveTourDates, rehearsals: liveRehearsals } = useLiveData();
  const { steps, setSteps, seedSectors, generateTask, loading } = useProjectCreationData(project.id);
  const { tasks, setTasks } = useTasksData();

  const [namingStepId, setNamingStepId] = useState<string | null>(null);
  const [linkedOpen, setLinkedOpen] = useState(false);
  const [openPhases, setOpenPhases] = useState<Set<CreationPhase>>(new Set());
  const userToggledRef = useRef(false);

  const updateProject = (updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );
  };

  // Seed des secteurs actifs non encore semés.
  useEffect(() => {
    if (loading) return;
    const seeded = project.creationSeededSectors ?? [];
    const activeSectors = project.sectors.filter(
      (s) => !seeded.includes(s as CreationSector)
    ) as Exclude<CreationSector, "general">[];
    if (activeSectors.length === 0) return;
    seedSectors(activeSectors, seeded, updateProject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, project.id]);

  // Synchronisation Tâches → Étapes : répercute un changement de statut fait
  // depuis le module Tâches sur l'étape de création liée.
  useEffect(() => {
    const taskById = new Map(tasks.map((t) => [t.id, t]));
    setSteps((prev) => {
      let changed = false;
      const next = prev.map((s) => {
        if (!s.taskId) return s;
        const task = taskById.get(s.taskId);
        if (!task) return s;
        const mapped = TASK_TO_STEP_STATUS[task.status];
        if (mapped === s.status) return s;
        changed = true;
        return { ...s, status: mapped };
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const active = computeActivePhase(steps);
  const progress = globalProgress(steps);
  const bouclé = allPhasesDone(steps);

  // Ouvre la phase active par défaut tant que l'utilisateur n'a pas interagi.
  useEffect(() => {
    if (!userToggledRef.current) setOpenPhases(new Set([active]));
  }, [active]);

  const togglePhase = (phase: CreationPhase) => {
    userToggledRef.current = true;
    setOpenPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  };

  // Données de modules liées (source des signaux auto).
  const signalCtx = useMemo(
    () => ({
      tracks: phonoTracks.filter((t) => project.linkedTracks.includes(t.id)),
      sessions: phonoSessions.filter((s) => project.linkedSessions.includes(s.id)),
      works: editionWorks.filter((w) => project.linkedWorks.includes(w.id)),
      tourDates: liveTourDates.filter((d) => project.linkedTourDates.includes(String(d.id))),
      rehearsals: liveRehearsals.filter((r) => project.linkedRehearsals.includes(r.id)),
    }),
    [phonoTracks, phonoSessions, editionWorks, liveTourDates, liveRehearsals, project.linkedTracks, project.linkedSessions, project.linkedWorks, project.linkedTourDates, project.linkedRehearsals]
  );

  const handleCycleStatus = (step: CreationStep) => {
    const newStatus = STATUS_CYCLE[step.status];

    if (!step.taskId) {
      // Première activation : crée la tâche AVANT d'écrire, pour combiner statut + taskId
      // en un seul setSteps (deux écritures successives se marcheraient dessus).
      generateTask(step, STEP_TO_TASK_STATUS[newStatus]).then((taskId) => {
        setSteps((prev) =>
          prev.map((s) => (s.id === step.id ? { ...s, status: newStatus, taskId: taskId ?? s.taskId } : s))
        );
        if (taskId) {
          toast.success("Tâche créée", {
            action: { label: "Voir dans Tâches", onClick: () => router.push("/tasks") },
          });
        }
      });
    } else {
      setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, status: newStatus } : s)));
      // Étape déjà liée : répercute le nouveau statut sur la tâche existante.
      setTasks((prev) =>
        prev.map((t) => (t.id === step.taskId ? { ...t, status: STEP_TO_TASK_STATUS[newStatus] } : t))
      );
    }
  };

  const handleRenameStep = (step: CreationStep, label: string) =>
    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, label } : s)));

  const handleDeleteStep = (step: CreationStep) =>
    setSteps((prev) => prev.filter((s) => s.id !== step.id));

  const handleAddStep = (phase: CreationPhase) => {
    const phaseSteps = steps.filter((s) => s.phase === phase);
    const newStep: CreationStep = {
      id: crypto.randomUUID(),
      projectId: project.id,
      phase,
      sector: "general",
      label: "Nouvelle étape",
      status: "todo",
      orderIndex: phaseSteps.length,
      targetDate: null,
      assignee: "",
      linkedEntityType: "",
      linkedEntityId: "",
      links: [],
      taskId: null,
    };
    setSteps((prev) => [...prev, newStep]);
    setNamingStepId(newStep.id);
  };

  const hasSectors = project.sectors.length > 0;

  return (
    <div className="space-y-4">
      {/* 1. Cockpit */}
      <div>
        <div className="flex items-center text-[10px] uppercase tracking-[0.22em] text-[#F5F5F5]/40">
          <span className="mr-2 inline-block h-[6px] w-[6px] rounded-full bg-[#F0FF00] shadow-[0_0_10px_#F0FF00]" />
          Parcours créatif · {project.title}
        </div>

        {/* Stepper 3 phases */}
        <div className="mt-4 flex gap-2">
          {CREATION_PHASE_ORDER.map((phase) => {
            const pp = phaseProgress(steps, phase);
            const done = isPhaseDone(steps, phase);
            const isActive = phase === active && !bouclé;
            return (
              <div key={phase} className="flex-1">
                <div className="h-1 rounded-full bg-[rgba(245,245,245,0.12)] overflow-hidden">
                  <div
                    className="h-1 rounded-full bg-[#F0FF00] transition-all"
                    style={{ width: done ? "100%" : `${pp.pct}%` }}
                  />
                </div>
                <div
                  className={cn(
                    "mt-2 text-[10px] uppercase tracking-[0.08em]",
                    done ? "text-[#F5F5F5]/50" : isActive ? "text-[#F0FF00]" : "text-[#F5F5F5]/40"
                  )}
                >
                  {CREATION_PHASE_LABELS[phase]}{done ? " ✓" : isActive ? " · en cours" : ""}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="mt-6 flex items-baseline gap-12 border-b border-[rgba(245,245,245,0.08)] pb-5">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[28px] font-extralight text-[#F5F5F5]">{progress.total - progress.done}</span>
            <span className="max-w-[90px] text-[11px] text-[#F5F5F5]/55">étapes restantes</span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[28px] font-extralight text-[#F0FF00]">{progress.pct}%</span>
            <span className="max-w-[90px] text-[11px] text-[#F5F5F5]/55">du parcours accompli</span>
          </div>
        </div>
      </div>

      {/* 2. Phases */}
      {hasSectors ? (
        <div className="space-y-2.5">
          {CREATION_PHASE_ORDER.map((phase) => (
            <PhaseCard
              key={phase}
              phase={phase}
              steps={steps}
              signals={deriveSignals(phase, signalCtx)}
              isActive={phase === active && !bouclé}
              open={openPhases.has(phase)}
              onToggle={() => togglePhase(phase)}
              namingStepId={namingStepId}
              onCycleStatus={handleCycleStatus}
              onDelete={handleDeleteStep}
              onAddStep={handleAddStep}
              onRename={handleRenameStep}
              onFinishNaming={() => setNamingStepId(null)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-4">
          <p className="text-[13px] text-[#F5F5F5]/30 italic py-4 text-center">
            Aucun secteur activé. Modifie le projet pour ajouter Phono, Édition ou Live.
          </p>
        </div>
      )}

      {/* 3. Éléments liés — repliable */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setLinkedOpen((v) => !v)}
          className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-[rgba(245,245,245,0.04)] transition-colors"
        >
          <span className="text-[12px] uppercase tracking-wider text-[#F5F5F5]/40 font-medium">Éléments liés</span>
          {linkedOpen ? <ChevronDown size={14} className="text-[#F5F5F5]/30" /> : <ChevronRight size={14} className="text-[#F5F5F5]/30" />}
        </button>
        {linkedOpen && (
          <div className="px-4 pb-4 space-y-6">
            {project.sectors.includes("phono") && <PhonoSection project={project} />}
            {project.sectors.includes("edition") && <EditionSection project={project} />}
            {project.sectors.includes("live") && <LiveSection project={project} />}
            {project.sectors.includes("phono") && project.sectors.includes("edition") && (
              <WorkTrackLinker project={project} />
            )}
            {!hasSectors && <p className="text-[13px] text-[#F5F5F5]/30 italic">Aucun secteur activé.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
