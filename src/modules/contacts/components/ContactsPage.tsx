"use client";

import { useState } from "react";
import { ArrowUpDown, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";

const BASE_ROLES = [
  "Musicien",
  "Chanteur",
  "DJ",
  "Beatmaker",
  "Ingé Mixage",
  "Ingé Mastering",
  "Réalisateur",
  "Manager",
  "Label",
  "Tourneur",
  "Salle",
  "Editeur",
] as const;

type Contact = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  city: string;
  email: string;
  instagram: string;
  phone: string;
  notes: string;
  createdAt?: string;
};

const emptyForm: Omit<Contact, "id" | "createdAt"> = {
  firstName: "",
  lastName: "",
  role: "",
  city: "",
  email: "",
  instagram: "",
  phone: "",
  notes: ""
};

const initialContacts: Contact[] = [
  {
    id: 1,
    firstName: "Théo",
    lastName: "Martin",
    instagram: "@theo.martin",
    createdAt: "2025-01-01T10:00:00.000Z",
    role: "Tourneur",
    city: "Paris",
    email: "theo@agence-live.fr",
    phone: "+33 6 12 34 56 78",
    notes: "Préfère être contacté le matin. A booké la dernière tournée."
  },
  {
    id: 2,
    firstName: "Sarah",
    lastName: "Dupont",
    instagram: "@sarah.dupont",
    createdAt: "2025-01-05T15:30:00.000Z",
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
  const [customRoles, setCustomRoles] = useLocalStorage<string[]>(
    "contacts:customRoles",
    []
  );
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<Omit<Contact, "id">>(emptyForm);
  const [roleFilter, setRoleFilter] = useState<string>("__all__");
  const [newRoleInput, setNewRoleInput] = useState("");
  const [showAddRoleInput, setShowAddRoleInput] = useState(false);
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<
    "firstName" | "lastName" | "role" | "city" | "email" | "instagram" | "phone" | "createdAt"
  >("firstName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const allRoles = [...BASE_ROLES, ...customRoles];
  const rolesForSelect =
    form.role && !allRoles.includes(form.role)
      ? [form.role, ...allRoles]
      : allRoles;
  const isCreating = editingId === "new";
  const dialogOpen = editingId !== null;

  const startCreate = () => {
    setEditingId("new");
    setForm(emptyForm);
  };

  const startEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      instagram: contact.instagram ?? "",
      role: contact.role,
      city: contact.city,
      email: contact.email,
      phone: contact.phone,
      notes: contact.notes
    });
  };

  const closeDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setNewRoleInput("");
    setShowAddRoleInput(false);
  };

  const addCustomRole = () => {
    const role = newRoleInput.trim();
    if (!role) return;
    if (allRoles.includes(role)) {
      setForm((prev) => ({ ...prev, role }));
      setNewRoleInput("");
      setShowAddRoleInput(false);
      return;
    }
    setCustomRoles((prev) => [...prev, role].sort((a, b) => a.localeCompare(b)));
    setForm((prev) => ({ ...prev, role }));
    setNewRoleInput("");
    setShowAddRoleInput(false);
  };

  const handleRoleSelect = (value: string) => {
    if (value === "__add__") {
      setShowAddRoleInput(true);
      setRolePopoverOpen(false);
      return;
    }
    setForm((prev) => ({ ...prev, role: value }));
    setRolePopoverOpen(false);
  };

  const removeCustomRole = (e: React.MouseEvent, role: string) => {
    e.stopPropagation();
    setCustomRoles((prev) => prev.filter((r) => r !== role));
  };

  const handleChange =
    (field: keyof Omit<Contact, "id">) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return;

    if (editingId === "new") {
      const nextId = contacts.length ? Math.max(...contacts.map((c) => c.id)) + 1 : 1;
      setContacts((prev) => [
        ...prev,
        {
          id: nextId,
          ...form,
          createdAt: new Date().toISOString()
        }
      ]);
    } else if (typeof editingId === "number") {
      setContacts((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, ...form } : c))
      );
    }
    closeDialog();
  };

  const handleDelete = (id: number) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (editingId === id) closeDialog();
  };

  const filteredByRole =
    roleFilter === "__all__" ? contacts : contacts.filter((c) => c.role === roleFilter);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredBySearch =
    normalizedSearch === ""
      ? filteredByRole
      : filteredByRole.filter((c) => {
          const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
          return (
            c.firstName.toLowerCase().includes(normalizedSearch) ||
            c.lastName.toLowerCase().includes(normalizedSearch) ||
            fullName.includes(normalizedSearch)
          );
        });

  const sortedContacts = [...filteredBySearch].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    const getValue = (contact: Contact) => {
      if (sortKey === "createdAt") {
        return contact.createdAt ?? "";
      }
      return (contact[sortKey] as string) ?? "";
    };
    const aVal = getValue(a).toLowerCase();
    const bVal = getValue(b).toLowerCase();
    if (aVal < bVal) return -1 * dir;
    if (aVal > bVal) return 1 * dir;
    return 0;
  });

  const roleOptionsForFilter = Array.from(
    new Set(contacts.map((c) => c.role).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const handleSort = (key: typeof sortKey) => {
    setSortKey((currentKey) => {
      if (currentKey === key) {
        setSortDirection((currentDir) => (currentDir === "asc" ? "desc" : "asc"));
        return currentKey;
      }
      setSortDirection("asc");
      return key;
    });
  };

  const renderSortIcon = (key: typeof sortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    }
    return (
      <span className="ml-1 text-[10px] opacity-70">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
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
        <Button onClick={startCreate} size="sm" className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          Ajouter un contact
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? "Nouveau contact" : "Modifier le contact"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={handleChange("firstName")}
                  placeholder="Prénom"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={handleChange("lastName")}
                  placeholder="Nom"
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Métier</Label>
                <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-full justify-between font-normal"
                    >
                      <span className={form.role ? "" : "text-muted-foreground"}>
                        {form.role && form.role !== "__add__"
                          ? form.role
                          : "Choisir un métier"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] border border-[rgba(245,245,245,0.2)] bg-[rgba(15,23,42,0.96)] p-0 text-[#F5F5F5] shadow-md"
                    align="start"
                  >
                    <div
                      className="max-h-[280px] overflow-y-auto overflow-x-hidden py-1"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {rolesForSelect.map((role) => (
                        <div
                          key={role}
                          className="flex cursor-pointer items-center justify-between gap-2 px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                          onClick={() => handleRoleSelect(role)}
                        >
                          <span className="min-w-0 flex-1 truncate">{role}</span>
                          {customRoles.includes(role) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={(e) => removeCustomRole(e, role)}
                              title="Supprimer ce rôle"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center px-2 py-1.5 text-left text-sm text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleRoleSelect("__add__")}
                      >
                        ＋ Ajouter un métier…
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
                {showAddRoleInput && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      id="newRole"
                      value={newRoleInput}
                      onChange={(e) => setNewRoleInput(e.target.value)}
                      placeholder="Nouveau rôle (sauvegardé pour réutilisation)"
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addCustomRole())
                      }
                      autoFocus
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={addCustomRole}>
                      Ajouter
                    </Button>
                  </div>
                )}
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={handleChange("phone")}
                  placeholder="+33 6 00 00 00 00"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="instagram">Instagram</Label>
                <div className="flex items-center gap-1">
                  <span className="inline-flex h-9 items-center rounded-md border border-input bg-muted px-2 text-sm text-muted-foreground">
                    @
                  </span>
                  <Input
                    id="instagram"
                    value={form.instagram}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        instagram: e.target.value.replace(/^@+/, "")
                      }))
                    }
                    placeholder="nom_utilisateur"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={handleChange("notes")}
                  placeholder="Infos importantes à garder en tête (préférences, historique, etc.)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annuler
              </Button>
              <Button type="submit">
                {isCreating ? "Enregistrer le contact" : "Enregistrer les modifications"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <CardTitle className="text-base">Liste des contacts</CardTitle>
          {contacts.length > 0 && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="searchContacts" className="text-xs text-muted-foreground whitespace-nowrap">
                  Rechercher
                </Label>
                <Input
                  id="searchContacts"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Prénom ou nom..."
                  className="h-8 w-full min-w-[180px] sm:w-48"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="roleFilter" className="text-xs text-muted-foreground whitespace-nowrap">
                  Filtrer par métier
                </Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger id="roleFilter" className="h-8 w-[180px]">
                    <SelectValue placeholder="Tous les rôles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tous les rôles</SelectItem>
                    {roleOptionsForFilter.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
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
                    <th className="px-3 py-2 text-left font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => handleSort("firstName")}
                      >
                        Prénom
                        {renderSortIcon("firstName")}
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => handleSort("lastName")}
                      >
                        Nom
                        {renderSortIcon("lastName")}
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => handleSort("role")}
                      >
                        Métier
                        {renderSortIcon("role")}
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => handleSort("city")}
                      >
                        Ville
                        {renderSortIcon("city")}
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => handleSort("email")}
                      >
                        Email
                        {renderSortIcon("email")}
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => handleSort("instagram")}
                      >
                        Instagram
                        {renderSortIcon("instagram")}
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => handleSort("phone")}
                      >
                        Téléphone
                        {renderSortIcon("phone")}
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => handleSort("createdAt")}
                      >
                        Ajouté le
                        {renderSortIcon("createdAt")}
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Notes</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedContacts.map((contact) => (
                    <tr key={contact.id} className="border-b last:border-0">
                      <td className="px-3 py-2 align-top font-medium">{contact.firstName}</td>
                      <td className="px-3 py-2 align-top font-medium">{contact.lastName}</td>
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
                      <td className="px-3 py-2 align-top">
                        {contact.instagram ? (
                          <a
                            href={`https://instagram.com/${contact.instagram}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            @{contact.instagram}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">{contact.phone}</td>
                      <td className="px-3 py-2 align-top">
                        {contact.createdAt ? (
                          <span className="whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(contact.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top max-w-xs">
                        <p className="line-clamp-3 text-xs text-muted-foreground">
                          {contact.notes || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => startEdit(contact)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={() => handleDelete(contact.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
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

