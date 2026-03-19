"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useSidekickData } from "@/hooks/useSidekickData";
import { toDisplayDate, isoToFr, frToIso } from "@/lib/date-format";
import type { AdminStatus, AdminStatusType } from "@/lib/sidekick-store";

const STATUS_TYPES: { value: AdminStatusType; label: string }[] = [
  { value: "auto_entrepreneur", label: "Auto-Entrepreneur" },
  { value: "association_1901", label: "Association 1901" },
  { value: "intermittent", label: "Intermittent du spectacle" },
  { value: "artiste_auteur", label: "Artiste-Auteur" },
  { value: "sas_sasu", label: "SAS / SASU" },
  { value: "sarl_eurl", label: "SARL / EURL" },
  { value: "salarie", label: "Salarié" },
  { value: "autre", label: "Autre" }
];

export function StatutsPage() {
  const { data, setData } = useSidekickData();
  const statuses = data.admin.statuses;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formNom, setFormNom] = useState("");
  const [formType, setFormType] = useState<AdminStatusType>("auto_entrepreneur");
  const [formActif, setFormActif] = useState(true);
  const [formDateDebut, setFormDateDebut] = useState("");
  const [formDateFin, setFormDateFin] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const resetForm = () => {
    setFormNom("");
    setFormType("auto_entrepreneur");
    setFormActif(true);
    setFormDateDebut("");
    setFormDateFin("");
    setFormNotes("");
    setEditingId(null);
    setIsAddOpen(false);
  };

  const openEdit = (s: AdminStatus) => {
    setEditingId(s.id);
    setFormNom(s.nom ?? "");
    setFormType((s.type ?? "autre") as AdminStatusType);
    setFormActif(s.actif ?? true);
    setFormDateDebut(s.dateDebut ?? "");
    setFormDateFin(s.dateFin ?? "");
    setFormNotes(s.notes ?? "");
  };

  const saveEdit = () => {
    if (!formNom.trim()) return;
    const payload: AdminStatus = {
      id: editingId ?? crypto.randomUUID(),
      nom: formNom.trim(),
      type: formType,
      actif: formActif,
      dateDebut: formDateDebut || undefined,
      dateFin: formDateFin || undefined,
      notes: formNotes.trim() || undefined
    };
    if (editingId) {
      setData((prev) => ({
        ...prev,
        admin: {
          ...prev.admin,
          statuses: prev.admin.statuses.map((s) => (s.id === editingId ? payload : s))
        }
      }));
    } else {
      setData((prev) => ({
        ...prev,
        admin: {
          ...prev.admin,
          statuses: [...prev.admin.statuses, payload]
        }
      }));
    }
    resetForm();
  };

  const deleteStatus = (id: string) => {
    setData((prev) => ({
      ...prev,
      admin: {
        ...prev.admin,
        statuses: prev.admin.statuses.filter((s) => s.id !== id)
      }
    }));
    resetForm();
  };

  const typeLabel = (value: string) => STATUS_TYPES.find((t) => t.value === value)?.label ?? value;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes statuts</h1>
          <p className="text-sm text-muted-foreground">
            Gère tes statuts : auto-entrepreneur, association, intermittence, SAS, SARL…
          </p>
        </div>
        <Button className="shrink-0" onClick={() => { resetForm(); setIsAddOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" />
          Ajouter un statut
        </Button>
      </div>

      {statuses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Aucun statut. Clique sur « Ajouter un statut » pour en créer un.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {statuses.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{s.nom}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {typeLabel(s.type ?? "autre")}
                      </Badge>
                      <Badge variant={s.actif ? "default" : "outline"} className="text-xs">
                        {s.actif ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    {(s.dateDebut || s.dateFin) && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {s.dateDebut && toDisplayDate(s.dateDebut)}
                        {s.dateDebut && s.dateFin && " → "}
                        {s.dateFin && toDisplayDate(s.dateFin)}
                      </p>
                    )}
                    {s.notes && (
                      <p className="mt-1 text-sm text-muted-foreground">{s.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteStatus(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <Link href="/admin" className="underline hover:text-foreground">
          Retour à la vue d&apos;ensemble Admin
        </Link>
      </p>

      <Dialog open={isAddOpen || !!editingId} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le statut" : "Ajouter un statut"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nom du statut</label>
              <Input
                value={formNom}
                onChange={(e) => setFormNom(e.target.value)}
                placeholder="Ex. Mon auto-entreprise"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Type de statut</label>
              <Select value={formType} onValueChange={(v) => setFormType(v as AdminStatusType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="actif"
                checked={formActif}
                onCheckedChange={(c) => setFormActif(c === true)}
              />
              <label htmlFor="actif" className="text-sm font-medium">Actif</label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Date de début</label>
                <Input
                  type="date"
                  value={formDateDebut?.includes("-") ? formDateDebut : frToIso(formDateDebut) || formDateDebut}
                  onChange={(e) => setFormDateDebut(isoToFr(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Date de fin (opt.)</label>
                <Input
                  type="date"
                  value={formDateFin?.includes("-") ? formDateFin : frToIso(formDateFin) || formDateFin}
                  onChange={(e) => setFormDateFin(isoToFr(e.target.value))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Remarques…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            {editingId && (
              <Button variant="destructive" onClick={() => editingId && deleteStatus(editingId)}>
                Supprimer
              </Button>
            )}
            <Button variant="outline" onClick={resetForm}>Annuler</Button>
            <Button onClick={saveEdit} disabled={!formNom.trim()}>
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
