"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, UserPlus } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type ContactFromModule = {
  id: number;
  name: string;
  role: string;
  city: string;
  email: string;
  phone: string;
  notes: string;
};

const defaultContactsForImport: ContactFromModule[] = [
  {
    id: 1,
    name: "Théo Martin",
    role: "Tourneur",
    city: "Paris",
    email: "theo@agence-live.fr",
    phone: "+33 6 12 34 56 78",
    notes: ""
  },
  {
    id: 2,
    name: "Sarah Dupont",
    role: "Attachée de presse",
    city: "Lyon",
    email: "sarah@pr-horizon.com",
    phone: "+33 6 98 76 54 32",
    notes: ""
  }
];

const STATUS_OPTIONS = [
  "À contacter",
  "En attente",
  "En discussion",
  "Accepté"
] as const;

type Status = (typeof STATUS_OPTIONS)[number];

type ProspectionEntry = {
  id: number;
  venueName: string;
  city: string;
  contact: string;
  email: string;
  phone: string;
  status: Status;
  notes?: string;
};

const defaultEntries: ProspectionEntry[] = [
  {
    id: 1,
    venueName: "La Cigale",
    city: "Paris",
    contact: "Jean Dupont",
    email: "contact@lacigale.fr",
    phone: "01 49 25 81 75",
    status: "En discussion",
    notes: "Réponse attendue sous 2 semaines."
  }
];

export function ProspectionPage() {
  const [entries, setEntries] = useLocalStorage<ProspectionEntry[]>(
    "live:prospection",
    defaultEntries
  );
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [contactAddedNotification, setContactAddedNotification] = useState<{
    name: string;
  } | null>(null);

  const [contactsList, setContactsList] = useLocalStorage<ContactFromModule[]>(
    "contacts:list",
    defaultContactsForImport
  );

  useEffect(() => {
    if (contactAddedNotification === null) return;
    const t = setTimeout(() => setContactAddedNotification(null), 4000);
    return () => clearTimeout(t);
  }, [contactAddedNotification]);

  const [form, setForm] = useState<{
    venueName: string;
    city: string;
    contact: string;
    email: string;
    phone: string;
    status: Status;
    notes: string;
  }>({
    venueName: "",
    city: "",
    contact: "",
    email: "",
    phone: "",
    status: "À contacter",
    notes: ""
  });

  const openAdd = () => {
    setForm({
      venueName: "",
      city: "",
      contact: "",
      email: "",
      phone: "",
      status: "À contacter",
      notes: ""
    });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (e: ProspectionEntry) => {
    setForm({
      venueName: e.venueName,
      city: e.city,
      contact: e.contact,
      email: e.email,
      phone: e.phone,
      status: e.status,
      notes: e.notes ?? ""
    });
    setEditingId(e.id);
    setDialogOpen(true);
  };

  const saveEntry = () => {
    const venueName = form.venueName.trim();
    const city = form.city.trim();
    const contact = form.contact.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const notes = form.notes.trim();

    if (editingId !== null) {
      setEntries((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                venueName: venueName || "Sans nom",
                city: city || "",
                contact: contact || "",
                email: email || "",
                phone: phone || "",
                status: form.status,
                notes: notes || undefined
              }
            : item
        )
      );
    } else {
      const nextId =
        entries.length > 0 ? Math.max(...entries.map((x) => x.id)) + 1 : 1;
      setEntries((prev) => [
        {
          id: nextId,
          venueName: venueName || "Sans nom",
          city: city || "",
          contact: contact || "",
          email: email || "",
          phone: phone || "",
          status: form.status,
          notes: notes || undefined
        },
        ...prev
      ]);

      // Tâche intelligente : ajouter le contact au module Contacts s'il n'existe pas
      const contactName = contact;
      if (contactName) {
        const nameNormalized = contactName.toLowerCase().trim();
        const alreadyExists = contactsList.some(
          (c) => c.name.toLowerCase().trim() === nameNormalized
        );
        if (!alreadyExists) {
          const nextContactId =
            contactsList.length > 0
              ? Math.max(...contactsList.map((c) => c.id)) + 1
              : 1;
          setContactsList((prev) => [
            ...prev,
            {
              id: nextContactId,
              name: contactName,
              role: "Programmateur de salle",
              city: city || "",
              email: email || "",
              phone: phone || "",
              notes: ""
            }
          ]);
          setContactAddedNotification({ name: contactName });
        }
      }
    }
    setDialogOpen(false);
  };

  const deleteEntry = (id: number) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
    setDeleteConfirmId(null);
  };

  const selectContactFromImport = (contact: ContactFromModule) => {
    setForm((prev) => ({
      ...prev,
      contact: contact.name,
      email: contact.email,
      phone: contact.phone
    }));
    setImportDialogOpen(false);
  };

  if (!isHydrated) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Prospection
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
            Prospection
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos contacts avec les salles et lieux de spectacle.
          </p>
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un lieu
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Nom du lieu</th>
              <th className="px-4 py-3 text-left font-medium">Ville</th>
              <th className="px-4 py-3 text-left font-medium">Contact</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Téléphone</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
              <th className="px-4 py-3 text-left font-medium">Notes</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun lieu.{" "}
                  <Button onClick={openAdd} variant="link" className="p-0 h-auto">
                    Ajouter un lieu
                  </Button>
                </td>
              </tr>
            ) : (
              entries.map((item) => (
                <tr
                  key={item.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">{item.venueName}</td>
                  <td className="px-4 py-3">{item.city || "—"}</td>
                  <td className="px-4 py-3">{item.contact || "—"}</td>
                  <td className="px-4 py-3">{item.email || "—"}</td>
                  <td className="px-4 py-3">{item.phone || "—"}</td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="max-w-[200px] px-4 py-3 text-muted-foreground">
                    {item.notes || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Modifier"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Supprimer"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(item.id)}
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

      {/* Dialog Ajouter / Modifier */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            {editingId !== null ? "Modifier le lieu" : "Nouveau lieu"}
          </DialogTitle>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nom du lieu</label>
              <Input
                value={form.venueName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, venueName: e.target.value }))
                }
                placeholder="ex. La Cigale"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Ville</label>
              <Input
                value={form.city}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, city: e.target.value }))
                }
                placeholder="ex. Paris"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">Contact</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <UserPlus className="mr-1 h-3 w-3" />
                  Importer
                </Button>
              </div>
              <Input
                value={form.contact}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contact: e.target.value }))
                }
                placeholder="Nom du contact"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="contact@exemple.fr"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Téléphone</label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="01 23 45 67 89"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Statut</label>
              <Select
                value={form.status}
                onValueChange={(value: Status) =>
                  setForm((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveEntry}>
              {editingId !== null ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Importer un contact (liste des contacts du module Contacts) */}
      <Dialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Choisir un contact</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Sélectionnez un contact pour remplir Nom, Email et Téléphone.
          </p>
          <div className="max-h-[320px] overflow-y-auto rounded-md border py-2">
            {contactsList.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun contact. Ajoutez-en dans le module Contacts.
              </p>
            ) : (
              <ul className="divide-y">
                {contactsList.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/50">
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">{c.name}</p>
                      <p className="truncate text-muted-foreground">{c.email || "—"}</p>
                      <p className="text-muted-foreground">{c.phone || "—"}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => selectContactFromImport(c)}
                    >
                      Sélectionner
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Fermer
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
          <DialogTitle>Supprimer ce lieu ?</DialogTitle>
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
                deleteConfirmId !== null && deleteEntry(deleteConfirmId)
              }
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info popup : contact ajouté au module Contacts */}
      {contactAddedNotification && (
        <div
          className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-gray-900">
            Contact ajouté à la liste
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{contactAddedNotification.name}</span> a été ajouté au module Contacts.
          </p>
        </div>
      )}
    </div>
  );
}
