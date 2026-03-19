import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import type { IntermittenceMission } from "./intermittence-types";

interface IntermittenceModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (mission: Omit<IntermittenceMission, "id">) => void;
  mission: IntermittenceMission | null;
}

type MissionFormData = Omit<IntermittenceMission, "id">;

const EMPTY_FORM: MissionFormData = {
  date: new Date().toISOString().slice(0, 10),
  employer: "",
  type: "Spectacle",
  hours: 0,
  grossAmount: 0,
  charges: 0,
  netAmount: 0,
  notes: ""
};

export function IntermittenceModal({
  open,
  onClose,
  onSave,
  mission
}: IntermittenceModalProps) {
  const [formData, setFormData] = useState<MissionFormData>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      if (mission) {
        const { id: _id, ...rest } = mission;
        setFormData(rest);
      } else {
        setFormData(EMPTY_FORM);
      }
    }
  }, [open, mission]);

  const handleGrossAmountChange = (value: number) => {
    const charges = Math.round(value * 0.2);
    const netAmount = value - charges;
    setFormData((prev) => ({
      ...prev,
      grossAmount: value,
      charges,
      netAmount
    }));
  };

  const handleChargesChange = (value: number) => {
    setFormData((prev) => ({
      ...prev,
      charges: value,
      netAmount: Math.max(0, prev.grossAmount - value)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.employer || !formData.type || !formData.hours) {
      return;
    }
    onSave(formData);
  };

  const title = mission ? "Mettre à jour la mission" : "Ajouter une mission";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl border border-[rgba(245,245,245,0.12)] bg-[#101010] text-[#F5F5F5] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#F5F5F5]">
            {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-xs uppercase tracking-wide text-[#F5F5F5]/70">
                Type de mission *
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value as MissionFormData["type"] }))
                }
              >
                <SelectTrigger className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-xs text-[#F5F5F5]">
                  <SelectValue placeholder="Choisir un type" />
                </SelectTrigger>
                <SelectContent className="border-[rgba(245,245,245,0.16)] bg-[#101010] text-[#F5F5F5]">
                  <SelectItem value="Spectacle">Spectacle</SelectItem>
                  <SelectItem value="Répétition rémunérée">Répétition rémunérée</SelectItem>
                  <SelectItem value="Enregistrement">Enregistrement</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-[#F5F5F5]/70">
                Date *
              </Label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData((prev) => ({ ...prev, date }))}
                placeholder="Sélectionner une date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employer" className="text-xs uppercase tracking-wide text-[#F5F5F5]/70">
                Employeur *
              </Label>
              <Input
                id="employer"
                value={formData.employer}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, employer: e.target.value }))
                }
                placeholder="Ex: Théâtre Municipal"
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours" className="text-xs uppercase tracking-wide text-[#F5F5F5]/70">
                Heures travaillées *
              </Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0"
                value={formData.hours}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    hours: Number(e.target.value) || 0
                  }))
                }
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grossAmount" className="text-xs uppercase tracking-wide text-[#F5F5F5]/70">
                Montant brut (€) *
              </Label>
              <Input
                id="grossAmount"
                type="number"
                min="0"
                value={formData.grossAmount}
                onChange={(e) => handleGrossAmountChange(Number(e.target.value) || 0)}
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="charges" className="text-xs uppercase tracking-wide text-[#F5F5F5]/70">
                Charges sociales (€)
              </Label>
              <Input
                id="charges"
                type="number"
                min="0"
                value={formData.charges}
                onChange={(e) => handleChargesChange(Number(e.target.value) || 0)}
                className="border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="netAmount" className="text-xs uppercase tracking-wide text-[#F5F5F5]/70">
                Net perçu (€)
              </Label>
              <Input
                id="netAmount"
                type="number"
                value={formData.netAmount}
                disabled
                className="cursor-not-allowed border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.4)] text-sm text-[#F5F5F5]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs uppercase tracking-wide text-[#F5F5F5]/70">
              Notes (optionnel)
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Détails complémentaires, conditions particulières, etc."
              className="min-h-[80px] border-[rgba(245,245,245,0.16)] bg-[rgba(44,44,46,0.9)] text-sm text-[#F5F5F5]"
            />
          </div>

          <div className="rounded-lg border border-[rgba(56,189,248,0.4)] bg-[rgba(56,189,248,0.12)] px-4 py-3 text-xs text-[#E0F2FE]">
            <span className="mr-1">💡</span>
            Calcul automatique : les charges sociales sont estimées à 20 % du brut par
            défaut. Vous pouvez ajuster ce montant manuellement si nécessaire, le net
            sera recalculé automatiquement.
          </div>

          <DialogFooter className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[rgba(245,245,245,0.3)] bg-transparent text-[#F5F5F5] hover:bg-[rgba(245,245,245,0.08)]"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-[#F0FF00] px-6 text-[#101010] hover:bg-[#F0FF00]/90"
            >
              {mission ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

