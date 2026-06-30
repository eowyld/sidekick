"use client";

import { useState, useEffect } from "react";
import {
  Circle, CircleDot, CheckCircle2, Plus, Trash2, MoreHorizontal,
  ChevronDown, ChevronRight, ExternalLink, Zap, Calendar, User,
} from "lucide-react";
import type { Project, CreationStep, CreationSector, CreationEntityType } from "@/lib/sidekick-store";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useProjectCreationData } from "@/hooks/useProjectCreationData";
import { SECTOR_LABELS } from "@/modules/projects/data/creation-templates";
import { PhonoSection } from "../sections/PhonoSection";
import { EditionSection } from "../sections/EditionSection";
import { LiveSection } from "../sections/LiveSection";
import { WorkTrackLinker } from "../sections/WorkTrackLinker";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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

// ─── StepStatusIcon ────────────────────────────────────────────────────────────

function StepStatusIcon({
  status,
  onClick,
}: {
  status: CreationStep["status"];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 transition-opacity hover:opacity-70"
      title={`Statut : ${status} — clic pour changer`}
    >
      {status === "todo" && (
        <Circle size={16} className="text-[#F5F5F5]/30" />
      )}
      {status === "doing" && (
        <CircleDot size={16} className="text-[#F0FF00]/80" />
      )}
      {status === "done" && (
        <CheckCircle2 size={16} className="text-[#F0FF00]" />
      )}
    </button>
  );
}

// ─── StepDialog ────────────────────────────────────────────────────────────────

function StepDialog({
  step,
  members,
  onSave,
  onClose,
}: {
  step: CreationStep;
  members: Project["members"];
  onSave: (patch: Partial<CreationStep>) => void;
  onClose: () => void;
}) {
  const [targetDate, setTargetDate] = useState(step.targetDate ?? "");
  const [assignee, setAssignee] = useState(step.assignee);
  const [linkedEntityType, setLinkedEntityType] = useState<CreationEntityType>(
    step.linkedEntityType
  );
  const [links, setLinks] = useState(step.links);

  const addLink = () =>
    setLinks((prev) => [...prev, { label: "", url: "" }]);
  const updateLink = (i: number, patch: { label?: string; url?: string }) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLink = (i: number) =>
    setLinks((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    onSave({
      targetDate: targetDate || null,
      assignee,
      linkedEntityType,
      links,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">{step.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#F5F5F5]/60">Date cible</Label>
            <DatePicker
              value={targetDate}
              onChange={(iso) => setTargetDate(iso)}
            />
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
                    <SelectItem key={m.name} value={m.name}>
                      {m.name}
                    </SelectItem>
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
            <Select
              value={linkedEntityType}
              onValueChange={(v) => setLinkedEntityType(v as CreationEntityType)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ENTITY_TYPE_LABELS) as [CreationEntityType, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-[#F5F5F5]/60">Liens</Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={addLink}
                className="h-6 text-[11px]"
              >
                <Plus size={10} className="mr-1" /> Ajouter
              </Button>
            </div>
            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input
                    value={link.label}
                    onChange={(e) => updateLink(i, { label: e.target.value })}
                    placeholder="Label"
                    className="h-7 text-[11px] flex-1"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => updateLink(i, { url: e.target.value })}
                    placeholder="https://…"
                    className="h-7 text-[11px] flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(i)}
                    className="text-[#F5F5F5]/30 hover:text-red-400 shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── StepRow ───────────────────────────────────────────────────────────────────

function StepRow({
  step,
  members,
  onCycleStatus,
  onEdit,
  onDelete,
  onGenerateTask,
}: {
  step: CreationStep;
  members: Project["members"];
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
          step.status === "done"
            ? "line-through text-[#F5F5F5]/40"
            : "text-[#F5F5F5]/90"
        )}
      >
        {step.label}
      </span>

      <div className="flex items-center gap-1.5 shrink-0">
        {step.targetDate && (
          <span className="flex items-center gap-1 text-[10px] text-[#F5F5F5]/40 bg-[rgba(245,245,245,0.06)] rounded px-1.5 py-0.5">
            <Calendar size={9} />
            {step.targetDate}
          </span>
        )}
        {step.assignee && (
          <span className="flex items-center gap-1 text-[10px] text-[#F5F5F5]/40 bg-[rgba(245,245,245,0.06)] rounded px-1.5 py-0.5">
            <User size={9} />
            {step.assignee}
          </span>
        )}
        {step.linkedEntityType && (step.linkedEntityType as string) !== "" && (
          <a
            href={ENTITY_ROUTES[step.linkedEntityType as Exclude<CreationEntityType, "">]}
            className="flex items-center gap-1 text-[10px] text-[#F0FF00]/50 bg-[#F0FF00]/8 hover:text-[#F0FF00] rounded px-1.5 py-0.5 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={9} />
            {ENTITY_TYPE_LABELS[step.linkedEntityType]}
          </a>
        )}
        {step.links.length > 0 && (
          <span className="text-[10px] text-[#F5F5F5]/30 bg-[rgba(245,245,245,0.06)] rounded px-1.5 py-0.5">
            {step.links.length} lien{step.links.length > 1 ? "s" : ""}
          </span>
        )}
        {step.taskId && (
          <a
            href="/tasks"
            className="flex items-center gap-1 text-[10px] text-[#F0FF00]/50 hover:text-[#F0FF00] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Zap size={9} />
            tâche
          </a>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 text-[#F5F5F5]/40 hover:text-[#F5F5F5] transition-all shrink-0"
          >
            <MoreHorizontal size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-[13px]">
          <DropdownMenuItem onSelect={onEdit}>Modifier</DropdownMenuItem>
          {!step.taskId && (
            <DropdownMenuItem onSelect={onGenerateTask}>
              Générer une tâche
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={onDelete}
            className="text-red-400 focus:text-red-400"
          >
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── SectorGroup ───────────────────────────────────────────────────────────────

function SectorGroup({
  sector,
  steps,
  members,
  onCycleStatus,
  onEdit,
  onDelete,
  onGenerateTask,
  onAddStep,
}: {
  sector: CreationSector;
  steps: CreationStep[];
  members: Project["members"];
  onCycleStatus: (step: CreationStep) => void;
  onEdit: (step: CreationStep) => void;
  onDelete: (step: CreationStep) => void;
  onGenerateTask: (step: CreationStep) => void;
  onAddStep: (sector: CreationSector) => void;
}) {
  const done = steps.filter((s) => s.status === "done").length;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between mb-1.5 px-2">
        <span className="text-[11px] uppercase tracking-wider text-[#F5F5F5]/40 font-medium">
          {SECTOR_LABELS[sector]}
        </span>
        {steps.length > 0 && (
          <span className="text-[10px] text-[#F5F5F5]/30">
            {done}/{steps.length}
          </span>
        )}
      </div>

      {steps.map((step) => (
        <StepRow
          key={step.id}
          step={step}
          members={members}
          onCycleStatus={() => onCycleStatus(step)}
          onEdit={() => onEdit(step)}
          onDelete={() => onDelete(step)}
          onGenerateTask={() => onGenerateTask(step)}
        />
      ))}

      <button
        type="button"
        onClick={() => onAddStep(sector)}
        className="flex items-center gap-1.5 px-2 py-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F5F5F5]/60 transition-colors w-full"
      >
        <Plus size={12} />
        Ajouter une étape
      </button>
    </div>
  );
}

// ─── CreationTab ───────────────────────────────────────────────────────────────

export function CreationTab({ project }: { project: Project }) {
  const { setProjects } = useProjectsData();
  const { steps, setSteps, seedSector, generateTask, progress, loading } =
    useProjectCreationData(project.id);

  const [editingStep, setEditingStep] = useState<CreationStep | null>(null);
  const [linkedOpen, setLinkedOpen] = useState(false);
  const [editingBrainstorm, setEditingBrainstorm] = useState(false);
  const [brainstormValue, setBrainstormValue] = useState(project.brainstorm ?? "");

  const updateProject = (updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      )
    );
  };

  useEffect(() => {
    if (loading) return;
    const seeded = project.creationSeededSectors ?? [];
    const activeSectors = project.sectors.filter(
      (s) => !seeded.includes(s as CreationSector)
    ) as Exclude<CreationSector, "general">[];
    for (const sector of activeSectors) {
      seedSector(sector, seeded, (updates) => updateProject(updates));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, project.id]);

  const handleCycleStatus = (step: CreationStep) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === step.id ? { ...s, status: STATUS_CYCLE[s.status] } : s
      )
    );
  };

  const handleSaveStep = (step: CreationStep, patch: Partial<CreationStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === step.id ? { ...s, ...patch } : s))
    );
  };

  const handleDeleteStep = (step: CreationStep) => {
    setSteps((prev) => prev.filter((s) => s.id !== step.id));
  };

  const handleAddStep = (sector: CreationSector) => {
    const sectorSteps = steps.filter((s) => s.sector === sector);
    const newStep: CreationStep = {
      id: crypto.randomUUID(),
      projectId: project.id,
      sector,
      label: "Nouvelle étape",
      status: "todo",
      orderIndex: sectorSteps.length,
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

  const handleGenerateTask = async (step: CreationStep) => {
    await generateTask(step);
  };

  const handleSaveBrainstorm = () => {
    updateProject({ brainstorm: brainstormValue });
    setEditingBrainstorm(false);
  };

  const activeSectors: CreationSector[] = [
    ...(project.sectors as CreationSector[]),
    "general",
  ];

  return (
    <div className="space-y-4">
      {/* 1. Feuille de route */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] uppercase tracking-wider text-[#F5F5F5]/40 font-medium">
            Feuille de route
          </span>
          <span className="text-[13px] font-semibold text-[#F5F5F5]/70">
            {progress.done}/{progress.total} étapes
          </span>
        </div>
        <Progress value={progress.pct} className="h-2" />
        <p className="mt-2 text-[11px] text-[#F5F5F5]/30">
          {progress.pct}% complété
        </p>
      </div>

      {/* 2. Étapes groupées par secteur */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-4 space-y-5">
        {activeSectors.map((sector) => {
          const sectorSteps = steps
            .filter((s) => s.sector === sector)
            .sort((a, b) => a.orderIndex - b.orderIndex);

          return (
            <SectorGroup
              key={sector}
              sector={sector}
              steps={sectorSteps}
              members={project.members}
              onCycleStatus={handleCycleStatus}
              onEdit={setEditingStep}
              onDelete={handleDeleteStep}
              onGenerateTask={handleGenerateTask}
              onAddStep={handleAddStep}
            />
          );
        })}

        {project.sectors.length === 0 && (
          <p className="text-[13px] text-[#F5F5F5]/30 italic py-4 text-center">
            Aucun secteur activé. Modifie le projet pour ajouter Phono, Édition ou Live.
          </p>
        )}
      </div>

      {/* 3. Brainstorming */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] uppercase tracking-wider text-[#F5F5F5]/40 font-medium">
            Brainstorming
          </span>
          {!editingBrainstorm && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-6 text-[11px] text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
              onClick={() => {
                setBrainstormValue(project.brainstorm ?? "");
                setEditingBrainstorm(true);
              }}
            >
              Modifier
            </Button>
          )}
        </div>

        {editingBrainstorm ? (
          <div className="space-y-2">
            <Textarea
              value={brainstormValue}
              onChange={(e) => setBrainstormValue(e.target.value)}
              placeholder="Idées libres, pistes, références…"
              rows={5}
              className="resize-none text-[13px]"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingBrainstorm(false)}
              >
                Annuler
              </Button>
              <Button type="button" size="sm" onClick={handleSaveBrainstorm}>
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-[#F5F5F5]/60 whitespace-pre-wrap leading-relaxed min-h-[40px]">
            {project.brainstorm
              ? project.brainstorm
              : <span className="italic text-[#F5F5F5]/20">Aucune note. Clique sur Modifier pour ajouter des idées.</span>}
          </p>
        )}
      </div>

      {/* 4. Éléments liés — repliable */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setLinkedOpen((v) => !v)}
          className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-[rgba(245,245,245,0.04)] transition-colors"
        >
          <span className="text-[12px] uppercase tracking-wider text-[#F5F5F5]/40 font-medium">
            Éléments liés
          </span>
          {linkedOpen ? (
            <ChevronDown size={14} className="text-[#F5F5F5]/30" />
          ) : (
            <ChevronRight size={14} className="text-[#F5F5F5]/30" />
          )}
        </button>
        {linkedOpen && (
          <div className="px-4 pb-4 space-y-6">
            {project.sectors.includes("phono") && <PhonoSection project={project} />}
            {project.sectors.includes("edition") && <EditionSection project={project} />}
            {project.sectors.includes("live") && <LiveSection project={project} />}
            {project.sectors.includes("phono") && project.sectors.includes("edition") && (
              <WorkTrackLinker project={project} />
            )}
            {project.sectors.length === 0 && (
              <p className="text-[13px] text-[#F5F5F5]/30 italic">
                Aucun secteur activé.
              </p>
            )}
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
