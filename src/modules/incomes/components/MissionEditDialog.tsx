"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { IntermittenceMission } from "@/hooks/useIncomesData";

const MISSION_TYPES = [
  "Spectacle",
  "Répétition rémunérée",
  "Enregistrement",
  "Autre",
] as const;

export interface MissionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission?: IntermittenceMission;
  defaults?: {
    date?: string;
    employer?: string;
  };
  onSave: (mission: IntermittenceMission) => void;
}

export function MissionEditDialog({
  open,
  onOpenChange,
  mission,
  defaults,
  onSave,
}: MissionEditDialogProps) {
  const blank = () => ({
    date: defaults?.date ?? "",
    employer: defaults?.employer ?? "",
    type: "Spectacle" as IntermittenceMission["type"],
    hours: "",
    grossAmount: "",
    charges: "",
    netAmount: "",
    notes: "",
  });

  const fromMission = (m: IntermittenceMission) => ({
    date: m.date,
    employer: m.employer,
    type: m.type,
    hours: String(m.hours),
    grossAmount: String(m.grossAmount),
    charges: String(m.charges),
    netAmount: String(m.netAmount),
    notes: m.notes,
  });

  const [form, setForm] = useState(() => (mission ? fromMission(mission) : blank()));

  useEffect(() => {
    if (!open) return;
    setForm(mission ? fromMission(mission) : blank());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = () => {
    if (!form.date || !form.employer) return;

    const saved: IntermittenceMission = {
      id: mission?.id ?? crypto.randomUUID(),
      date: form.date,
      employer: form.employer.trim(),
      type: form.type,
      hours: Number(form.hours) || 0,
      grossAmount: Number(form.grossAmount) || 0,
      charges: Number(form.charges) || 0,
      netAmount: Number(form.netAmount) || 0,
      notes: form.notes.trim(),
    };

    onSave(saved);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[rgba(245,245,245,0.18)] bg-[rgba(44,44,46,0.84)] text-[#F5F5F5]">
        <DialogHeader>
          <DialogTitle>
            {mission ? "Modifier le cachet" : "Nouveau cachet"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Date</p>
              <DatePicker
                value={form.date}
                onChange={(v) => setForm((p) => ({ ...p, date: v }))}
                placeholder="Choisir une date"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Type</p>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, type: e.target.value as IntermittenceMission["type"] }))
                }
              >
                {MISSION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Employeur</p>
            <Input
              value={form.employer}
              onChange={(e) => setForm((p) => ({ ...p, employer: e.target.value }))}
              placeholder="Nom de l'organisateur / employeur"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Heures</p>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.hours}
                onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Brut (€)</p>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.grossAmount}
                onChange={(e) => setForm((p) => ({ ...p, grossAmount: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Charges (€)</p>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.charges}
                onChange={(e) => setForm((p) => ({ ...p, charges: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Net (€)</p>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.netAmount}
              onChange={(e) => setForm((p) => ({ ...p, netAmount: e.target.value }))}
              placeholder="0"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Notes</p>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Informations complémentaires…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!form.date || !form.employer.trim()}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
