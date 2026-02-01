"use client";

import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Contact = {
  id: number;
  name: string;
  role: string;
  city: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyForm: Omit<Contact, "id"> = {
  name: "",
  role: "",
  city: "",
  email: "",
  phone: "",
  notes: ""
};

const initialContacts: Contact[] = [
  {
    id: 1,
    name: "Théo Martin",
    role: "Tourneur",
    city: "Paris",
    email: "theo@agence-live.fr",
    phone: "+33 6 12 34 56 78",
    notes: "Préfère être contacté le matin. A booké la dernière tournée."
  },
  {
    id: 2,
    name: "Sarah Dupont",
    role: "Attachée de presse",
    city: "Lyon",
    email: "sarah@pr-horizon.com",
    phone: "+33 6 98 76 54 32",
    notes: "Partenaire presse prioritaire sur les sorties single."
  }
];

export function ContactsPage() {
  const [contacts, setContacts] = useLocalStorage<Contact[]>(
    "contacts:list",
    initialContacts
  );
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<Omit<Contact, "id">>(emptyForm);

  const isEditing = editingId !== null;
  const isCreating = editingId === "new";

  const startCreate = () => {
    setEditingId("new");
    setForm(emptyForm);
  };

  const startEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      role: contact.role,
      city: contact.city,
      email: contact.email,
      phone: contact.phone,
      notes: contact.notes
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleChange =
    (field: keyof Omit<Contact, "id">) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    if (editingId === "new") {
      const nextId = contacts.length ? Math.max(...contacts.map((c) => c.id)) + 1 : 1;
      setContacts((prev) => [...prev, { id: nextId, ...form }]);
    } else if (typeof editingId === "number") {
      setContacts((prev) =>
        prev.map((contact) =>
          contact.id === editingId ? { ...contact, ...form } : contact
        )
      );
    }

    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = (id: number) => {
    setContacts((prev) => prev.filter((contact) => contact.id !== id));
    if (editingId === id) {
      cancelEdit();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Gère simplement ton carnet de contacts : tourneurs, managers, attaché·es de
            presse, salles, etc.
          </p>
        </div>
        <Button onClick={startCreate} size="sm" className="shrink-0">
          Ajouter un contact
        </Button>
      </div>

      {isEditing && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {isCreating ? "Nouveau contact" : "Modifier le contact"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nom</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={handleChange("name")}
                    placeholder="Prénom Nom"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role">Rôle</Label>
                  <Input
                    id="role"
                    value={form.role}
                    onChange={handleChange("role")}
                    placeholder="Tourneur, manager, salle, label..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={handleChange("city")}
                    placeholder="Paris, Lyon..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                    placeholder="contact@exemple.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={handleChange("phone")}
                    placeholder="+33 6 00 00 00 00"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={handleChange("notes")}
                  placeholder="Infos importantes à garder en tête (préférences, historique, etc.)"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                  Annuler
                </Button>
                <Button type="submit" size="sm">
                  {isCreating ? "Enregistrer le contact" : "Enregistrer les modifications"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liste des contacts</CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun contact pour le moment. Clique sur &quot;Ajouter un contact&quot; pour
              commencer ton carnet d&apos;adresses.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Nom</th>
                    <th className="px-3 py-2 text-left font-medium">Rôle</th>
                    <th className="px-3 py-2 text-left font-medium">Ville</th>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                    <th className="px-3 py-2 text-left font-medium">Téléphone</th>
                    <th className="px-3 py-2 text-left font-medium">Notes</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="border-b last:border-0">
                      <td className="px-3 py-2 align-top font-medium">{contact.name}</td>
                      <td className="px-3 py-2 align-top">{contact.role}</td>
                      <td className="px-3 py-2 align-top">{contact.city}</td>
                      <td className="px-3 py-2 align-top">
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-primary hover:underline"
                          >
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">{contact.phone}</td>
                      <td className="px-3 py-2 align-top max-w-xs">
                        <p className="line-clamp-3 text-xs text-muted-foreground">
                          {contact.notes || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => startEdit(contact)}
                          >
                            Modifier
                          </Button>
                          <Button
                            size="xs"
                            variant="destructive"
                            onClick={() => handleDelete(contact.id)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

