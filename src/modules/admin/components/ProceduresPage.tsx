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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useSidekickData } from "@/hooks/useSidekickData";
import { toDisplayDate, isoToFr, frToIso } from "@/lib/date-format";
import type { AdminProcedure } from "@/lib/sidekick-store";

const PROCEDURE_STATUS = [
  { value: "a_faire", label: "À faire" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" }
] as const;

export function ProceduresPage() {
  const { data, setData } = useSidekickData();
  const procedures = data.admin.procedures;
  const statuses = data.admin.statuses;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formLabel, setFormLabel] = useState("");
  const [formStatus, setFormStatus] = useState<string>("a_faire");
  const [formStatutJuridiqueId, setFormStatutJuridiqueId] = useState<string>("");
  const [formOrganisme, setFormOrganisme] = useState("");
  const [formDateLimite, setFormDateLimite] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const resetForm = () => {
    setFormLabel("");
    setFormStatus("a_faire");
    setFormStatutJuridiqueId("");
    setFormOrganisme("");
    setFormDateLimite("");
    setFormNotes("");
    setEditingId(null);
    setIsAddOpen(false);
  };

  const openEdit = (p: AdminProcedure) => {
    setEditingId(p.id);
    setFormLabel(p.label);
    setFormStatus((p as { status?: string }).status ?? "a_faire");
    setFormStatutJuridiqueId((p as { statutJuridiqueId?: string }).statutJuridiqueId ?? "");
    setFormOrganisme((p as { organisme?: string }).organisme ?? "");
    setFormDateLimite((p as { dateLimite?: string }).dateLimite ?? "");
    setFormNotes((p as { notes?: string }).notes ?? "");
  };

  const saveEdit = () => {
    if (!formLabel.trim()) return;
    const payload = {
      label: formLabel.trim(),
      status: formStatus,
      statutJuridiqueId: formStatutJuridiqueId || undefined,
      organisme: formOrganisme.trim() || undefined,
      dateLimite: formDateLimite || undefined,
      notes: formNotes.trim() || undefined
    };
    if (editingId) {
      setData((prev) => ({
        ...prev,
        admin: {
          ...prev.admin,
          procedures: prev.admin.procedures.map((p) =>
            p.id === editingId ? { ...p, ...payload } : p
          )
        }
      }));
    } else {
      setData((prev) => ({
        ...prev,
        admin: {
          ...prev.admin,
          procedures: [
            ...prev.admin.procedures,
            { id: crypto.randomUUID(), ...payload }
          ]
        }
      }));
    }
    resetForm();
  };

  const deleteProcedure = (id: string) => {
    setData((prev) => ({
      ...prev,
      admin: {
        ...prev.admin,
        procedures: prev.admin.procedures.filter((p) => p.id !== id)
      }
    }));
    resetForm();
  };

  const statusLabel = (value: string) =>
    PROCEDURE_STATUS.find((s) => s.value === value)?.label ?? value;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes démarches</h1>
          <p className="text-sm text-muted-foreground">
            Suivi de tes démarches administratives : carte d&apos;intermittent,
            déclarations, dossiers en cours.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Ajouter une démarche
        </Button>
      </div>

      {procedures.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Aucune démarche enregistrée. Ajoute une démarche (ex. renouvellement
              intermittent, déclaration AGESSA) pour garder le suivi.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {procedures.map((p) => {
            const status = (p as { status?: string }).status ?? "a_faire";
            const statutJuridiqueId = (p as { statutJuridiqueId?: string }).statutJuridiqueId;
            const statutJuridique = statutJuridiqueId
              ? statuses.find((s) => s.id === statutJuridiqueId)?.nom ?? "—"
              : "—";
            return (
              <Card key={p.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{p.label}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Badge
                          variant={
                            status === "termine"
                              ? "default"
                              : status === "en_cours"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {statusLabel(status)}
                        </Badge>
                        {statutJuridique !== "—" && (
                          <Badge variant="secondary" className="text-xs">
                            {statutJuridique}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                        {(p as { organisme?: string }).organisme && (
                          <span>Organisme : {(p as { organisme?: string }).organisme}</span>
                        )}
                        {(p as { dateLimite?: string }).dateLimite && (
                          <span>Date limite : {toDisplayDate((p as { dateLimite?: string }).dateLimite)}</span>
                        )}
                      </div>
                      {(p as { notes?: string }).notes && (
                        <p className="mt-1 text-sm text-muted-foreground">{(p as { notes?: string }).notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteProcedure(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
            <DialogTitle>
              {editingId ? "Modifier la démarche" : "Ajouter une démarche"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Libellé</label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="Ex. Renouvellement carte intermittente 2025"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Statut</label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROCEDURE_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Statut juridique concerné</label>
              <Select
                value={formStatutJuridiqueId || "_none"}
                onValueChange={(v) => setFormStatutJuridiqueId(v === "_none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Aucun</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nom || "Sans nom"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Organisme</label>
              <Input
                value={formOrganisme}
                onChange={(e) => setFormOrganisme(e.target.value)}
                placeholder="Ex. Pôle Emploi, URSSAF, préfecture..."
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Date limite</label>
              <Input
                type="date"
                value={formDateLimite?.includes("-") ? formDateLimite : frToIso(formDateLimite) || formDateLimite}
                onChange={(e) => setFormDateLimite(isoToFr(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Notes (optionnel)</label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Échéance, référence..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            {editingId && (
              <Button variant="destructive" onClick={() => editingId && deleteProcedure(editingId)}>
                Supprimer
              </Button>
            )}
            <Button variant="outline" onClick={resetForm}>Annuler</Button>
            <Button onClick={saveEdit} disabled={!formLabel.trim()}>
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
