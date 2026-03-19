"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export type TaskSector =
  | "Live"
  | "Phono"
  | "Admin"
  | "Marketing"
  | "Edition"
  | "Revenus"
  | "Autre";

export const TASK_SECTORS: TaskSector[] = [
  "Live",
  "Phono",
  "Admin",
  "Marketing",
  "Edition",
  "Revenus",
  "Autre"
];

export interface TaskFormData {
  title: string;
  description: string;
  deadline: string;
  sector: TaskSector;
}

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: TaskFormData) => void;
  task: TaskFormData | null;
}

export function TaskModal({ open, onClose, onSave, task }: TaskModalProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    description: "",
    deadline: "",
    sector: "Live"
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        sector: task.sector
      });
    } else {
      setFormData({
        title: "",
        description: "",
        deadline: "",
        sector: "Live"
      });
    }
  }, [task, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {task ? "Modifier la tâche" : "Ajouter une nouvelle tâche"}
          </DialogTitle>
          <DialogDescription>
            {task
              ? "Modifiez les détails de la tâche."
              : "Ajoutez une nouvelle tâche à votre liste."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Titre de la tâche"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Description de la tâche"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Date limite</Label>
              <DatePicker
                value={formData.deadline}
                onChange={(date) =>
                  setFormData({ ...formData, deadline: date })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Secteur</Label>
              <Select
                value={formData.sector}
                onValueChange={(
                  value: TaskSector
                ) =>
                  setFormData({ ...formData, sector: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le secteur" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_SECTORS.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

