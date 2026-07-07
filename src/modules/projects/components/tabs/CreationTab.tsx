"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Circle, CircleDot, CheckCircle2, Plus, Trash2, MoreHorizontal,
  ChevronDown, ChevronRight, ExternalLink, Zap, Calendar, User,
} from "lucide-react";
import type {
  Project, CreationStep, CreationSector, CreationEntityType, CreationPhase,
} from "@/lib/sidekick-store";
import { CREATION_PHASE_ORDER, CREATION_PHASE_LABELS } from "@/lib/sidekick-store";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useProjectCreationData } from "@/hooks/useProjectCreationData";
import { useSidekickData } from "@/hooks/useSidekickData";
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
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Constantes ────────────────────────────────────────────────────────────────

const STATUS_CYCLE: Record<CreationStep["status"], CreationStep["status"]> = {
  todo: "doing",
  doing: "done",
  done: "todo",
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
      title={`Statut : ${status} — clic pour changer`}
    >
      {status === "todo" && <Circle size={16} className="text-[#F5F5F5]/30" />}
      {status === "doing" && <CircleDot size={16} className="text-[#F0FF00]/80" />}
      {status === "done" && <CheckCircle2 size={16} className="text-[#F0FF00]" />}
    </button>
  );
}

// ─── StepDialog ────────────────────────────────────────────────────────────────

function StepDialog({
  step, members, onSave, onClose,
}: {
  step: CreationStep;
  members: Project["members"];
  onSave: (patch: Partial<CreationStep>) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(step.label);
  const [targetDate, setTargetDate] = useState(step.targetDate ?? "");
  const [assignee, setAssignee] = useState(step.assignee);
  const [linkedEntityType, setLinkedEntityType] = useState<CreationEntityType>(step.linkedEntityType);
  const [links, setLinks] = useState(step.links);

  const addLink = () => setLinks((prev) => [...prev, { label: "", url: "" }]);
  const updateLink = (i: number, patch: { label?: string; url?: string }) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLink = (i: number) => setLinks((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    onSave({ label: label.trim() || step.label, targetDate: targetDate || null, assignee, linkedEntityType, links });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Modifier l&apos;étape</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#F5F5F5]/60">Intitulé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#F5F5F5]/60">Date cible</Label>
            <DatePicker value={targetDate} onChange={(iso) => setTargetDate(iso)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#F5F5F5]/60">Responsable</Label>
            {members.length > 0 ? (
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choisir un membre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Nom du responsable"
                className="h-8 text-xs"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#F5F5F5]/60">Type de livrable</Label>
            <Select value={linkedEntityType} onValueChange={(v) => setLinkedEntityType(v as CreationEntityType)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ENTITY_TYPE_LABELS) as [CreationEntityType, string][]).map(([value, lbl]) => (
                  <SelectItem key={value} value={value}>{lbl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-[#F5F5F5]/60">Liens</Label>
              <Button type="button" variant="ghost" size="xs" onClick={addLink} className="h-6 text-[11px]">
                <Plus size={10} className="mr-1" /> Ajouter
              </Button>
            </div>
            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input value={link.label} onChange={(e) => updateLink(i, { label: e.target.value })} placeholder="Label" className="h-7 text-[11px] flex-1" />
                  <Input value={link.url} onChange={(e) => updateLink(i, { url: e.target.value })} placeholder="https://…" className="h-7 text-[11px] flex-1" />
                  <button type="button" onClick={() => removeLink(i)} className="text-[#F5F5F5]/30 hover:text-red-400 shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
          <Button type="button" size="sm" onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── StepRow ───────────────────────────────────────────────────────────────────

function StepRow({
  step, onCycleStatus, onEdit, onDelete, onGenerateTask,
}: {
  step: CreationStep;
  onCycleStatus: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onGenerateTask: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[rgba(245,245,245,0.04)] group">
      <StepStatusIcon status={step.status} onClick={onCycleStatus} />
      <span
        className={cn(
          "flex-1 text-[13px] truncate",
          step.status === "done" ? "line-through text-[#F5F5F5]/40" : "text-[#F5F5F5]/90"
        )}
      >
        {step.label}
      </span>
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="opacity-0 group-hover:opacity-100 text-[#F5F5F5]/40 hover:text-[#F5F5F5] transition-all shrink-0">
            <MoreHorizontal size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-[13px]">
          <DropdownMenuItem onSelect={onEdit}>Modifier</DropdownMenuItem>
          {!step.taskId && <DropdownMenuItem onSelect={onGenerateTask}>Générer une tâche</DropdownMenuItem>}
          <DropdownMenuItem onSelect={onDelete} className="text-red-400 focus:text-red-400">Supprimer</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
  phase, steps, signals, isActive, open, onToggle,
  onCycleStatus, onEdit, onDelete, onGenerateTask, onAddStep,
}: {
  phase: CreationPhase;
  steps: CreationStep[];
  signals: CreationSignal[];
  isActive: boolean;
  open: boolean;
  onToggle: () => void;
  onCycleStatus: (step: CreationStep) => void;
  onEdit: (step: CreationStep) => void;
  onDelete: (step: CreationStep) => void;
  onGenerateTask: (step: CreationStep) => void;
  onAddStep: (phase: CreationPhase) => void;
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
                    onCycleStatus={() => onCycleStatus(step)}
                    onEdit={() => onEdit(step)}
                    onDelete={() => onDelete(step)}
                    onGenerateTask={() => onGenerateTask(step)}
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
  const { setProjects } = useProjectsData();
  const { data } = useSidekickData();
  const { steps, setSteps, seedSectors, generateTask, loading } = useProjectCreationData(project.id);

  const [editingStep, setEditingStep] = useState<CreationStep | null>(null);
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
      tracks: (data.phono?.tracks ?? []).filter((t) => project.linkedTracks.includes(t.id)),
      sessions: (data.phono?.sessions ?? []).filter((s) => project.linkedSessions.includes(s.id)),
      works: (data.edition?.works ?? []).filter((w) => project.linkedWorks.includes(w.id)),
      tourDates: (data.live?.tourDates ?? []).filter((d) => project.linkedTourDates.includes(d.id)),
      rehearsals: (data.live?.rehearsals ?? []).filter((r) => project.linkedRehearsals.includes(r.id)),
    }),
    [data.phono, data.edition, data.live, project.linkedTracks, project.linkedSessions, project.linkedWorks, project.linkedTourDates, project.linkedRehearsals]
  );

  const handleCycleStatus = (step: CreationStep) =>
    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, status: STATUS_CYCLE[s.status] } : s)));

  const handleSaveStep = (step: CreationStep, patch: Partial<CreationStep>) =>
    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, ...patch } : s)));

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
    setEditingStep(newStep);
  };

  const handleGenerateTask = async (step: CreationStep) => { await generateTask(step); };

  const hasSectors = project.sectors.length > 0;

  return (
    <div className="space-y-4">
      {/* 1. Cockpit */}
      <div>
        <div className="flex items-center text-[10px] uppercase tracking-[0.22em] text-[#F5F5F5]/40">
          <span className="mr-2 inline-block h-[6px] w-[6px] rounded-full bg-[#F0FF00] shadow-[0_0_10px_#F0FF00]" />
          Parcours créatif · {project.title}
        </div>

        <h1 className="mt-4 text-[34px] font-extralight leading-[1.1] tracking-[-0.02em] text-[#F5F5F5]">
          {bouclé ? (
            "Projet bouclé."
          ) : (
            <>Tu es en <em className="not-italic font-light text-[#F0FF00]">{CREATION_PHASE_LABELS[active]}</em>.</>
          )}
        </h1>

        {/* Stepper 3 phases */}
        <div className="mt-6 flex gap-2">
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
              onCycleStatus={handleCycleStatus}
              onEdit={setEditingStep}
              onDelete={handleDeleteStep}
              onGenerateTask={handleGenerateTask}
              onAddStep={handleAddStep}
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

      {editingStep && (
        <StepDialog
          step={editingStep}
          members={project.members}
          onSave={(patch) => handleSaveStep(editingStep, patch)}
          onClose={() => setEditingStep(null)}
        />
      )}
    </div>
  );
}
