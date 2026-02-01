"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { frToIso, isoToFr } from "@/lib/date-format";

type SessionType = "prise" | "essai" | "mix" | "mastering" | "autre";

type ParticipantRole =
  | "artiste_principal"
  | "artiste_secondaire"
  | "musicien"
  | "chanteur"
  | "ingenieur_du_son";

type ParticipantEntry = {
  id: number;
  name: string;
  role: ParticipantRole;
};

type SessionItem = {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  address?: string;
  sessionType: SessionType;
  sessionTypeOther?: string;
  participants: ParticipantEntry[];
  note?: string;
};

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: "prise", label: "Prise" },
  { value: "essai", label: "Essai" },
  { value: "mix", label: "Mix" },
  { value: "mastering", label: "Mastering" },
  { value: "autre", label: "Autre" },
];

const PARTICIPANT_ROLES: { value: ParticipantRole; label: string }[] = [
  { value: "artiste_principal", label: "Artiste principal" },
  { value: "artiste_secondaire", label: "Artiste secondaire" },
  { value: "musicien", label: "Musicien" },
  { value: "chanteur", label: "Chanteur" },
  { value: "ingenieur_du_son", label: "Ingénieur du son" },
];

function sessionTypeLabel(type: SessionType, other?: string): string {
  if (type === "autre" && other?.trim()) return other.trim();
  return SESSION_TYPES.find((t) => t.value === type)?.label ?? type;
}

function participantRoleLabel(role: ParticipantRole): string {
  return PARTICIPANT_ROLES.find((r) => r.value === role)?.label ?? role;
}

function parseFrDate(frDate: string): Date | null {
  if (!frDate) return null;
  const parts = frDate.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  return isNaN(date.getTime()) ? null : date;
}

function isSessionPast(dateStr: string): boolean {
  const d = parseFrDate(dateStr);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function buildGoogleMapsUrl(location: string, address?: string): string {
  const query = (address || location || "").trim();
  if (!query) return "https://www.google.com/maps";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const defaultSessions: SessionItem[] = [];

export function SessionsStudioPage() {
  const [sessions, setSessions] = useLocalStorage<SessionItem[]>(
    "phono:sessions-studio",
    defaultSessions
  );
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [form, setForm] = useState<{
    title: string;
    date: string;
    time: string;
    location: string;
    address: string;
    sessionType: SessionType;
    sessionTypeOther: string;
    participants: ParticipantEntry[];
    note: string;
  }>({
    title: "",
    date: "",
    time: "",
    location: "",
    address: "",
    sessionType: "prise",
    sessionTypeOther: "",
    participants: [],
    note: "",
  });

  const [openSection, setOpenSection] = useState<"past" | "upcoming" | null>(
    "upcoming"
  );

  const pastSessions = useMemo(
    () => (isHydrated ? sessions.filter((s) => isSessionPast(s.date)) : []),
    [sessions, isHydrated]
  );
  const upcomingSessions = useMemo(
    () => (isHydrated ? sessions.filter((s) => !isSessionPast(s.date)) : []),
    [sessions, isHydrated]
  );

  const toggleSection = (section: "past" | "upcoming") => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const openAdd = () => {
    setForm({
      title: "",
      date: "",
      time: "",
      location: "",
      address: "",
      sessionType: "prise",
      sessionTypeOther: "",
      participants: [],
      note: "",
    });
    setEditingId(null);
    setAddDialogOpen(true);
  };

  const openEdit = (s: SessionItem) => {
    setForm({
      title: s.title ?? "",
      date: s.date ? frToIso(s.date) : "",
      time: s.time ?? "",
      location: s.location ?? "",
      address: s.address ?? "",
      sessionType: s.sessionType ?? "prise",
      sessionTypeOther: s.sessionTypeOther ?? "",
      participants: s.participants?.length ? [...s.participants] : [],
      note: s.note ?? "",
    });
    setEditingId(s.id);
    setAddDialogOpen(true);
  };

  const saveSession = () => {
    const defaultDate = new Date();
    const frDefault =
      String(defaultDate.getDate()).padStart(2, "0") +
      "/" +
      String(defaultDate.getMonth() + 1).padStart(2, "0") +
      "/" +
      defaultDate.getFullYear();
    const date = form.date.trim() ? isoToFr(form.date.trim()) : frDefault;
    const time = form.time.trim() || "14:00";

    const payload = {
      title: form.title.trim() || "",
      date,
      time,
      location: form.location.trim() || "",
      address: form.address.trim() || undefined,
      sessionType: form.sessionType,
      sessionTypeOther:
        form.sessionType === "autre" ? form.sessionTypeOther.trim() : undefined,
      participants: form.participants,
      note: form.note.trim() || undefined,
    };

    if (editingId !== null) {
      setSessions((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, ...payload } : s))
      );
    } else {
      const nextId =
        sessions.length > 0 ? Math.max(...sessions.map((x) => x.id)) + 1 : 1;
      setSessions((prev) => [{ id: nextId, ...payload }, ...prev]);
    }
    setAddDialogOpen(false);
  };

  const deleteSession = (id: number) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeleteConfirmId(null);
  };

  const addParticipant = () => {
    setForm((prev) => ({
      ...prev,
      participants: [
        ...prev.participants,
        {
          id: Date.now(),
          name: "",
          role: "artiste_principal",
        },
      ],
    }));
  };

  const updateParticipant = (index: number, patch: Partial<ParticipantEntry>) => {
    setForm((prev) => {
      const next = [...prev.participants];
      next[index] = { ...next[index], ...patch };
      return { ...prev, participants: next };
    });
  };

  const removeParticipant = (index: number) => {
    setForm((prev) => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index),
    }));
  };

  if (!isHydrated) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Sessions Studio
        </h1>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  const tableHeaders = (
    <tr className="border-b bg-muted/50">
      <th className="px-4 py-3 text-left font-medium">Titre</th>
      <th className="px-4 py-3 text-left font-medium">Type</th>
      <th className="px-4 py-3 text-left font-medium">Date</th>
      <th className="px-4 py-3 text-left font-medium">Heure</th>
      <th className="px-4 py-3 text-left font-medium">Lieu</th>
      <th className="px-4 py-3 text-left font-medium">Participants</th>
      <th className="px-4 py-3 text-left font-medium">Note</th>
      <th className="px-4 py-3 text-right font-medium">Actions</th>
    </tr>
  );

  const renderRow = (s: SessionItem) => (
    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-4 py-3 font-medium">{s.title || "—"}</td>
      <td className="px-4 py-3 text-sm">
        {sessionTypeLabel(s.sessionType, s.sessionTypeOther)}
      </td>
      <td className="px-4 py-3">{s.date}</td>
      <td className="px-4 py-3">{s.time}</td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1">
          {s.location || "—"}
          {(s.location || s.address) && (
            <a
              href={buildGoogleMapsUrl(s.location, s.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              title="Voir sur Google Maps"
            >
              <MapPin className="h-3.5 w-3.5" />
            </a>
          )}
        </span>
      </td>
      <td className="px-4 py-3">
        {s.participants?.length ? (
          <div className="space-y-0.5 text-xs">
            {s.participants.map((p) => (
              <div key={p.id}>{p.name || "—"}</div>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="max-w-[200px] px-4 py-3 text-muted-foreground">
        {s.note || "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="Modifier"
            onClick={() => openEdit(s)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Supprimer"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteConfirmId(s.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">
            Sessions Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestion des sessions d&apos;enregistrement en studio : type, titre,
            participants et notes.
          </p>
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une session
        </Button>
      </div>

      <div className="space-y-4">
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
                  <thead>{tableHeaders}</thead>
                  <tbody>
                    {pastSessions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-6 text-center text-muted-foreground"
                        >
                          Aucune session passée.
                        </td>
                      </tr>
                    ) : (
                      pastSessions.map(renderRow)
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>

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
                {upcomingSessions.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 text-xs font-normal">
                    {upcomingSessions.length}
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          {openSection === "upcoming" && (
            <CardContent className="pt-0">
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>{tableHeaders}</thead>
                  <tbody>
                    {upcomingSessions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-6 text-center text-muted-foreground"
                        >
                          Aucune session à venir.{" "}
                          <Button
                            onClick={openAdd}
                            variant="link"
                            className="h-auto p-0"
                          >
                            Ajouter une session
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      upcomingSessions.map(renderRow)
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null
                ? "Modifier la session"
                : "Nouvelle session"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Type de session</Label>
              <Select
                value={form.sessionType}
                onValueChange={(v: SessionType) =>
                  setForm((prev) => ({ ...prev, sessionType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.sessionType === "autre" && (
                <Input
                  value={form.sessionTypeOther}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sessionTypeOther: e.target.value,
                    }))
                  }
                  placeholder="Précisez le type"
                  className="mt-2"
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label>Titre</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="ex. Session voix chœur"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Date</Label>
                <DatePicker
                  value={form.date}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, date: value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Heure</Label>
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
              <Label>Lieu (optionnel)</Label>
              <Input
                value={form.location}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="ex. Studio Bleu"
              />
            </div>
            <div className="grid gap-2">
              <Label>Adresse (optionnel, pour la carte)</Label>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Adresse complète pour Google Maps"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Participants</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={addParticipant}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Ajouter
                </Button>
              </div>
              <div className="space-y-2 rounded-md border bg-muted/20 p-2">
                {form.participants.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    Aucun participant
                  </p>
                ) : (
                  form.participants.map((p, i) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-2">
                      <Input
                        value={p.name}
                        onChange={(e) =>
                          updateParticipant(i, { name: e.target.value })
                        }
                        placeholder="Nom"
                        className="h-8 flex-1 min-w-[100px]"
                      />
                      <Select
                        value={p.role}
                        onValueChange={(v: ParticipantRole) =>
                          updateParticipant(i, { role: v })
                        }
                      >
                        <SelectTrigger className="h-8 w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PARTICIPANT_ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeParticipant(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
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
            <Button onClick={saveSession}>
              {editingId !== null ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Supprimer cette session ?</DialogTitle>
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
                deleteConfirmId !== null && deleteSession(deleteConfirmId)
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
