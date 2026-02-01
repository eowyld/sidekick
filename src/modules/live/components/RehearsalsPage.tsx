"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type RemunerationEntry = {
  id: number;
  label: string;
  amount?: string;
};

type EquipmentEntry = {
  id: number;
  label: string;
};

type RehearsalItem = {
  id: number;
  label?: string;
  date: string;
  time: string;
  location: string;
  address?: string;
  note?: string;
  remunerations: RemunerationEntry[];
  equipments: EquipmentEntry[];
};

const defaultRehearsals: RehearsalItem[] = [
  {
    id: 1,
    label: "Répétition set festival",
    date: "10/03/2025",
    time: "14:00",
    location: "Studio Bleu",
    address: "Studio Bleu, Paris",
    note: "Prévoir 2h, backline fournie.",
    remunerations: [],
    equipments: []
  }
];

function buildGoogleMapsUrl(location: string, address?: string): string {
  const query = (address || location || "").trim();
  if (!query) return "https://www.google.com/maps";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function frToIso(frDate: string): string {
  if (!frDate) return "";
  const parts = frDate.split("/");
  if (parts.length !== 3) return frDate;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function isoToFr(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function parseFrDate(frDate: string): Date | null {
  if (!frDate) return null;
  const parts = frDate.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  return isNaN(date.getTime()) ? null : date;
}

function isRehearsalPast(dateStr: string): boolean {
  const d = parseFrDate(dateStr);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

export function RehearsalsPage() {
  const [rehearsals, setRehearsals] = useLocalStorage<RehearsalItem[]>(
    "live:rehearsals",
    defaultRehearsals
  );
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [remunerationDialog, setRemunerationDialog] = useState<{
    rehearsalId: number | null;
  }>({ rehearsalId: null });
  const [equipmentDialog, setEquipmentDialog] = useState<{
    rehearsalId: number | null;
  }>({ rehearsalId: null });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [form, setForm] = useState<{
    label: string;
    date: string;
    time: string;
    location: string;
    address: string;
    note: string;
  }>({
    label: "",
    date: "",
    time: "",
    location: "",
    address: "",
    note: ""
  });

  const [remunerationForm, setRemunerationForm] = useState<{
    label: string;
    amount: string;
  }>({ label: "", amount: "" });
  const [equipmentForm, setEquipmentForm] = useState<{ label: string }>({
    label: ""
  });

  const [openSection, setOpenSection] = useState<"past" | "upcoming" | null>("upcoming");

  const pastRehearsals = useMemo(
    () => (isHydrated ? rehearsals.filter((r) => isRehearsalPast(r.date)) : []),
    [rehearsals, isHydrated]
  );
  const upcomingRehearsals = useMemo(
    () => (isHydrated ? rehearsals.filter((r) => !isRehearsalPast(r.date)) : []),
    [rehearsals, isHydrated]
  );

  const toggleSection = (section: "past" | "upcoming") => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const openAdd = () => {
    setForm({
      label: "",
      date: "",
      time: "",
      location: "",
      address: "",
      note: ""
    });
    setEditingId(null);
    setAddDialogOpen(true);
  };

  const openEdit = (r: RehearsalItem) => {
    setForm({
      label: r.label ?? "",
      date: r.date ? frToIso(r.date) : "",
      time: r.time,
      location: r.location,
      address: r.address ?? "",
      note: r.note ?? ""
    });
    setEditingId(r.id);
    setAddDialogOpen(true);
  };

  const saveRehearsal = () => {
    const trimmedLocation = form.location.trim();
    if (!trimmedLocation) return;
    const defaultDate = new Date();
    const frDefault =
      String(defaultDate.getDate()).padStart(2, "0") +
      "/" +
      String(defaultDate.getMonth() + 1).padStart(2, "0") +
      "/" +
      defaultDate.getFullYear();
    const date = form.date.trim() ? isoToFr(form.date.trim()) : frDefault;
    const time = form.time.trim() || "14:00";

    if (editingId !== null) {
      setRehearsals((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                label: form.label.trim() || undefined,
                date,
                time,
                location: trimmedLocation,
                address: form.address.trim() || undefined,
                note: form.note.trim() || undefined
              }
            : r
        )
      );
    } else {
      const nextId =
        rehearsals.length > 0
          ? Math.max(...rehearsals.map((x) => x.id)) + 1
          : 1;
      setRehearsals((prev) => [
        {
          id: nextId,
          label: form.label.trim() || undefined,
          date,
          time,
          location: trimmedLocation,
          address: form.address.trim() || undefined,
          note: form.note.trim() || undefined,
          remunerations: [],
          equipments: []
        },
        ...prev
      ]);
    }
    setAddDialogOpen(false);
  };

  const deleteRehearsal = (id: number) => {
    setRehearsals((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirmId(null);
  };

  const addRemuneration = () => {
    if (remunerationDialog.rehearsalId == null) return;
    const label = remunerationForm.label.trim();
    if (!label) return;
    setRehearsals((prev) =>
      prev.map((r) => {
        if (r.id !== remunerationDialog.rehearsalId) return r;
        return {
          ...r,
          remunerations: [
            ...r.remunerations,
            {
              id: Date.now(),
              label,
              amount: remunerationForm.amount.trim() || undefined
            }
          ]
        };
      })
    );
    setRemunerationForm({ label: "", amount: "" });
    setRemunerationDialog({ rehearsalId: null });
  };

  const removeRemuneration = (rehearsalId: number, entryId: number) => {
    setRehearsals((prev) =>
      prev.map((r) => {
        if (r.id !== rehearsalId) return r;
        return {
          ...r,
          remunerations: r.remunerations.filter((e) => e.id !== entryId)
        };
      })
    );
  };

  const addEquipment = () => {
    if (equipmentDialog.rehearsalId == null) return;
    const label = equipmentForm.label.trim();
    if (!label) return;
    setRehearsals((prev) =>
      prev.map((r) => {
        if (r.id !== equipmentDialog.rehearsalId) return r;
        return {
          ...r,
          equipments: [
            ...r.equipments,
            { id: Date.now(), label }
          ]
        };
      })
    );
    setEquipmentForm({ label: "" });
    setEquipmentDialog({ rehearsalId: null });
  };

  const removeEquipment = (rehearsalId: number, entryId: number) => {
    setRehearsals((prev) =>
      prev.map((r) => {
        if (r.id !== rehearsalId) return r;
        return {
          ...r,
          equipments: r.equipments.filter((e) => e.id !== entryId)
        };
      })
    );
  };

  if (!isHydrated) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Répétitions
        </h1>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">
            Répétitions
          </h1>
          <p className="text-sm text-muted-foreground">
            Liste des prochaines répétitions : date, heure, lieu, rémunération et
            matériel.
          </p>
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une nouvelle répétition
        </Button>
      </div>

      <div className="space-y-4">
        {/* Section Passées */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => toggleSection("past")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {openSection === "past" ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                Passées
              </CardTitle>
            </div>
          </CardHeader>
          {openSection === "past" && (
            <CardContent className="pt-0">
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Heure</th>
                      <th className="px-4 py-3 text-left font-medium">Lieu</th>
                      <th className="px-4 py-3 text-left font-medium">Rémunération</th>
                      <th className="px-4 py-3 text-left font-medium">Matériel</th>
                      <th className="px-4 py-3 text-left font-medium">Note</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastRehearsals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                          Aucune répétition passée.
                        </td>
                      </tr>
                    ) : (
                      pastRehearsals.map((r) => (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3">{r.date}</td>
                          <td className="px-4 py-3">{r.time}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1">
                              {r.location}
                              <a
                                href={buildGoogleMapsUrl(r.location, r.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                                title="Voir sur Google Maps"
                              >
                                <MapPin className="h-3.5 w-3.5" />
                              </a>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {r.remunerations.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                r.remunerations.map((e) => (
                                  <div key={e.id} className="flex items-center gap-1">
                                    <span>
                                      {e.label}
                                      {e.amount ? ` — ${e.amount} €` : ""}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeRemuneration(r.id, e.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rehearsal-add-btn h-6 text-xs text-muted-foreground"
                                onClick={() => setRemunerationDialog({ rehearsalId: r.id })}
                              >
                                <Plus className="mr-1 h-3 w-3" /> ajouter
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {r.equipments.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                r.equipments.map((e) => (
                                  <div key={e.id} className="flex items-center gap-1">
                                    <span>{e.label}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeEquipment(r.id, e.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rehearsal-add-btn h-6 text-xs text-muted-foreground"
                                onClick={() => setEquipmentDialog({ rehearsalId: r.id })}
                              >
                                <Plus className="mr-1 h-3 w-3" /> ajouter
                              </Button>
                            </div>
                          </td>
                          <td className="max-w-[200px] px-4 py-3 text-muted-foreground">
                            {r.note || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" title="Modifier" onClick={() => openEdit(r)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Supprimer"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirmId(r.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Section A venir */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => toggleSection("upcoming")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {openSection === "upcoming" ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                A venir
                {upcomingRehearsals.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 text-xs font-normal">
                    {upcomingRehearsals.length}
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          {openSection === "upcoming" && (
            <CardContent className="pt-0">
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Heure</th>
                      <th className="px-4 py-3 text-left font-medium">Lieu</th>
                      <th className="px-4 py-3 text-left font-medium">Rémunération</th>
                      <th className="px-4 py-3 text-left font-medium">Matériel</th>
                      <th className="px-4 py-3 text-left font-medium">Note</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingRehearsals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                          Aucune répétition à venir.{" "}
                          <Button onClick={openAdd} variant="link" className="p-0 h-auto">
                            Ajouter une répétition
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      upcomingRehearsals.map((r) => (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3">{r.date}</td>
                          <td className="px-4 py-3">{r.time}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1">
                              {r.location}
                              <a
                                href={buildGoogleMapsUrl(r.location, r.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                                title="Voir sur Google Maps"
                              >
                                <MapPin className="h-3.5 w-3.5" />
                              </a>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {r.remunerations.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                r.remunerations.map((e) => (
                                  <div key={e.id} className="flex items-center gap-1">
                                    <span>
                                      {e.label}
                                      {e.amount ? ` — ${e.amount} €` : ""}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeRemuneration(r.id, e.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rehearsal-add-btn h-6 text-xs text-muted-foreground"
                                onClick={() => setRemunerationDialog({ rehearsalId: r.id })}
                              >
                                <Plus className="mr-1 h-3 w-3" /> ajouter
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {r.equipments.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                r.equipments.map((e) => (
                                  <div key={e.id} className="flex items-center gap-1">
                                    <span>{e.label}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeEquipment(r.id, e.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rehearsal-add-btn h-6 text-xs text-muted-foreground"
                                onClick={() => setEquipmentDialog({ rehearsalId: r.id })}
                              >
                                <Plus className="mr-1 h-3 w-3" /> ajouter
                              </Button>
                            </div>
                          </td>
                          <td className="max-w-[200px] px-4 py-3 text-muted-foreground">
                            {r.note || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" title="Modifier" onClick={() => openEdit(r)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Supprimer"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirmId(r.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Dialog Ajouter / Modifier répétition */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            {editingId !== null ? "Modifier la répétition" : "Nouvelle répétition"}
          </DialogTitle>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Titre (optionnel)</label>
              <Input
                value={form.label}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="ex. Répétition set festival"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Date</label>
                <DatePicker
                  value={form.date}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, date: value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Heure</label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, time: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Lieu</label>
              <Input
                value={form.location}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="ex. Studio Bleu"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                Adresse (optionnel, pour la carte)
              </label>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Adresse complète pour Google Maps"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Note (optionnel)</label>
              <Textarea
                value={form.note}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder="Note personnelle"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={saveRehearsal}
              disabled={!form.location.trim()}
            >
              {editingId !== null ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Rémunération — design à affiner plus tard */}
      <Dialog
        open={remunerationDialog.rehearsalId !== null}
        onOpenChange={(open) =>
          !open && setRemunerationDialog({ rehearsalId: null })
        }
      >
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Ajouter une rémunération</DialogTitle>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Libellé</label>
              <Input
                value={remunerationForm.label}
                onChange={(e) =>
                  setRemunerationForm((prev) => ({
                    ...prev,
                    label: e.target.value
                  }))
                }
                placeholder="ex. Cachet groupe"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Montant (€, optionnel)</label>
              <Input
                value={remunerationForm.amount}
                onChange={(e) =>
                  setRemunerationForm((prev) => ({
                    ...prev,
                    amount: e.target.value
                  }))
                }
                placeholder="0,00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemunerationDialog({ rehearsalId: null })}
            >
              Annuler
            </Button>
            <Button onClick={addRemuneration} disabled={!remunerationForm.label.trim()}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Matériel — design à affiner plus tard */}
      <Dialog
        open={equipmentDialog.rehearsalId !== null}
        onOpenChange={(open) =>
          !open && setEquipmentDialog({ rehearsalId: null })
        }
      >
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Ajouter du matériel</DialogTitle>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Libellé</label>
              <Input
                value={equipmentForm.label}
                onChange={(e) =>
                  setEquipmentForm((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="ex. Ampli, câbles"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEquipmentDialog({ rehearsalId: null })}
            >
              Annuler
            </Button>
            <Button onClick={addEquipment} disabled={!equipmentForm.label.trim()}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Supprimer cette répétition ?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmId !== null && deleteRehearsal(deleteConfirmId)
              }
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
