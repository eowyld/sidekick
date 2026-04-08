"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Project, ProjectMember, ProjectStatus } from "@/lib/sidekick-store";
import { useSidekickData } from "@/hooks/useSidekickData";
import { ImagePlus, X, Plus } from "lucide-react";

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  project?: Project; // si défini → mode édition
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idée" },
  { value: "in_progress", label: "En cours" },
  { value: "paused", label: "En pause" },
  { value: "done", label: "Terminé" },
];

const SECTOR_OPTIONS: { value: "phono" | "edition" | "live"; label: string }[] = [
  { value: "phono", label: "Phono" },
  { value: "edition", label: "Édition" },
  { value: "live", label: "Live" },
];

export function ProjectModal({ open, onClose, project }: ProjectModalProps) {
  const { data, setData } = useSidekickData();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("idea");
  const [sectors, setSectors] = useState<("phono" | "edition" | "live")[]>([]);
  const [cover, setCover] = useState("");
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setDescription(project.description);
      setStatus(project.status);
      setSectors(project.sectors);
      setCover(project.cover);
      setMembers(project.members);
      setNotes(project.notes);
    } else {
      setTitle("");
      setDescription("");
      setStatus("idea");
      setSectors([]);
      setCover("");
      setMembers([]);
      setNotes("");
    }
  }, [project, open]);

  const toggleSector = (sector: "phono" | "edition" | "live") => {
    setSectors((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector]
    );
  };

  const addMember = () => {
    if (!newMemberName.trim()) return;
    setMembers((prev) => [
      ...prev,
      { contactId: null, name: newMemberName.trim(), role: newMemberRole.trim() },
    ]);
    setNewMemberName("");
    setNewMemberRole("");
  };

  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCover(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const now = new Date().toISOString();

    if (project) {
      // Mode édition
      setData((prev) => ({
        ...prev,
        projects: {
          projects: prev.projects.projects.map((p) =>
            p.id === project.id
              ? { ...p, title, description, status, sectors, cover, members, notes, updatedAt: now }
              : p
          ),
        },
      }));
    } else {
      // Mode création
      const newProject: Project = {
        id: crypto.randomUUID(),
        title,
        description,
        status,
        cover,
        images: [],
        sectors,
        members,
        linkedAlbums: [],
        linkedTracks: [],
        linkedSessions: [],
        linkedWorks: [],
        linkedTourDates: [],
        linkedRehearsals: [],
        createdAt: now,
        updatedAt: now,
        notes,
      };
      setData((prev) => ({
        ...prev,
        projects: {
          projects: [...prev.projects.projects, newProject],
        },
      }));
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
        <DialogHeader>
          <DialogTitle className="text-[#F5F5F5]">
            {project ? "Modifier le projet" : "Nouveau projet"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Titre */}
          <div className="space-y-1">
            <Label className="text-[#F5F5F5]/70 text-xs">Titre *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Collab avec X, EP été 2026..."
              className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-[#F5F5F5]/70 text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="De quoi parle ce projet ?"
              className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] resize-none"
              rows={3}
            />
          </div>

          {/* Statut */}
          <div className="space-y-1">
            <Label className="text-[#F5F5F5]/70 text-xs">Statut</Label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    status === opt.value
                      ? "border-[#F0FF00] bg-[#F0FF00]/10 text-[#F0FF00]"
                      : "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/50 hover:text-[#F5F5F5]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Secteurs */}
          <div className="space-y-1">
            <Label className="text-[#F5F5F5]/70 text-xs">Secteurs concernés</Label>
            <div className="flex gap-3">
              {SECTOR_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={sectors.includes(opt.value)}
                    onCheckedChange={() => toggleSector(opt.value)}
                  />
                  <span className="text-[13px] text-[#F5F5F5]/70">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Cover */}
          <div className="space-y-1">
            <Label className="text-[#F5F5F5]/70 text-xs">Image de couverture</Label>
            <div className="flex items-center gap-3">
              {cover ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[rgba(245,245,245,0.12)]">
                  <img src={cover} alt="cover" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCover("")}
                    className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[rgba(245,245,245,0.2)] text-[#F5F5F5]/50 text-xs cursor-pointer hover:border-[rgba(245,245,245,0.4)] transition-colors">
                  <ImagePlus size={14} />
                  Choisir une image
                  <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Membres */}
          <div className="space-y-2">
            <Label className="text-[#F5F5F5]/70 text-xs">Membres du projet</Label>
            {members.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px] text-[#F5F5F5]/70">
                <span className="flex-1">{m.name}</span>
                <span className="text-[#F5F5F5]/40 text-xs">{m.role}</span>
                <button type="button" onClick={() => removeMember(i)}>
                  <X size={12} className="text-[#F5F5F5]/40 hover:text-red-400" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Nom"
                className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] text-xs h-8"
              />
              <Input
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                placeholder="Rôle"
                className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] text-xs h-8 w-32"
              />
              <Button type="button" size="icon" variant="ghost" onClick={addMember} className="h-8 w-8">
                <Plus size={14} />
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-[#F5F5F5]/70 text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes libres..."
              className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {project ? "Enregistrer" : "Créer le projet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
