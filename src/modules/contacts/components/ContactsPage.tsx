"use client";

import { useState } from "react";
import { ArrowUpDown, Pencil, Plus, Trash2, Users, ChevronDown } from "lucide-react";
import { useContactsData, type Contact } from "@/hooks/useContactsData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
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
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { EmptyState } from "@/components/ui/empty-state";
import { NoResult } from "@/components/ui/no-result";
import { mutate } from "swr";

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

export function ContactsPage() {
  const { contacts, setContacts, loading, error } = useContactsData();
  const [customRoles, setCustomRoles] = useLocalStorage<string[]>(
    "contacts:customRoles",
    []
  );
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
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
      setContacts((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          ...form,
          createdAt: new Date().toISOString()
        }
      ]);
    } else if (typeof editingId === "string") {
      setContacts((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, ...form } : c))
      );
    }
    closeDialog();
  };

  const handleDelete = (id: string) => {
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
      if (sortKey === "createdAt") return contact.createdAt ?? "";
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

  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-25" />;
    return (
      <span className="ml-1 text-[10px] text-[#F0FF00]">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  if (loading) return <PageLoader />;
  if (error) return (
    <PageError
      title="Impossible de charger tes contacts"
      description="Vérifie ta connexion ou réessaie dans quelques instants."
      onRetry={() => mutate("user_contacts")}
    />
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40 mb-1">
            Organisation
          </p>
          <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">Contacts</h1>
        </div>
        <Button onClick={startCreate} size="sm" className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {/* Dialog */}
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
                      <span className={form.role ? "text-[#F5F5F5]" : "text-[#F5F5F5]/40"}>
                        {form.role && form.role !== "__add__" ? form.role : "Choisir un métier"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-40" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] border border-[rgba(245,245,245,0.15)] bg-[#1a1a1a] p-0 text-[#F5F5F5] shadow-xl"
                    align="start"
                  >
                    <div
                      className="max-h-[280px] overflow-y-auto overflow-x-hidden py-1"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {rolesForSelect.map((role) => (
                        <div
                          key={role}
                          className="flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-[rgba(245,245,245,0.06)] transition-colors"
                          onClick={() => handleRoleSelect(role)}
                        >
                          <span className="min-w-0 flex-1 truncate">{role}</span>
                          {customRoles.includes(role) && (
                            <button
                              type="button"
                              className="shrink-0 text-[#F5F5F5]/30 hover:text-red-400 transition-colors"
                              onClick={(e) => removeCustomRole(e, role)}
                              title="Supprimer ce rôle"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center px-3 py-1.5 text-left text-sm text-[#F0FF00]/70 hover:text-[#F0FF00] transition-colors"
                        onClick={() => handleRoleSelect("__add__")}
                      >
                        + Ajouter un métier…
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
                      placeholder="Nouveau rôle…"
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
                <div className="flex items-center gap-0">
                  <span className="inline-flex h-9 items-center border border-r-0 border-[rgba(245,245,245,0.12)] bg-[rgba(255,255,255,0.03)] px-2.5 text-sm text-[#F5F5F5]/40">
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
                    className="h-9 flex-1"
                  />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={handleChange("notes")}
                  placeholder="Infos importantes à garder en tête…"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annuler
              </Button>
              <Button type="submit">
                {isCreating ? "Enregistrer" : "Sauvegarder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters + table */}
      <div className="border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.3)]">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-[rgba(245,245,245,0.08)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users size={13} className="text-[#F5F5F5]/40 shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/40">
              {sortedContacts.length} contact{sortedContacts.length !== 1 ? "s" : ""}
            </span>
          </div>
          {contacts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher…"
                className="h-7 w-40 text-xs"
              />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-7 w-[160px] text-xs">
                  <SelectValue placeholder="Tous les métiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous les métiers</SelectItem>
                  {roleOptionsForFilter.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Table */}
        {contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Ton carnet d'adresses est vide"
            description="Tourneurs, labels, presse, partenaires : regroupe ici tous tes contacts pro."
            action={{ label: "Ajouter un contact", onClick: startCreate }}
            secondaryAction={{ label: "Importer depuis un CSV", onClick: () => console.warn("Import CSV : fonctionnalité à venir") }}
          />
        ) : sortedContacts.length === 0 ? (
          <NoResult
            query={searchTerm || undefined}
            hasFilters={roleFilter !== "__all__"}
            onReset={() => { setSearchTerm(""); setRoleFilter("__all__"); }}
          />
        ) : (
          <table className="w-full border-collapse text-sm table-fixed">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[17%]" />
              <col className="w-[13%]" />
              <col className="w-[11%]" />
              <col className="w-[8%]" />
              <col className="w-[11%]" />
              <col className="w-[68px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[rgba(245,245,245,0.06)]">
                {(
                  [
                    { key: "firstName", label: "Prénom" },
                    { key: "lastName", label: "Nom" },
                    { key: "role", label: "Métier" },
                    { key: "city", label: "Ville" },
                    { key: "email", label: "Email" },
                    { key: "instagram", label: "Instagram" },
                    { key: "phone", label: "Téléphone" },
                    { key: "createdAt", label: "Ajouté le" },
                  ] as { key: typeof sortKey; label: string }[]
                ).map(({ key, label }) => (
                  <th key={key} className="px-3 py-2 text-left">
                    <button
                      type="button"
                      className="inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/35 hover:text-[#F5F5F5]/60 transition-colors"
                      onClick={() => handleSort(key)}
                    >
                      {label}
                      <SortIcon col={key} />
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/35">
                  Notes
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/35">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(245,245,245,0.05)]">
              {sortedContacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="group transition-colors hover:bg-[rgba(245,245,245,0.02)]"
                >
                  <td className="px-3 py-2.5 align-middle font-medium text-[#F5F5F5] truncate">
                    {contact.firstName}
                  </td>
                  <td className="px-3 py-2.5 align-middle font-medium text-[#F5F5F5] truncate">
                    {contact.lastName}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    {contact.role ? (
                      <span className="block truncate border border-[rgba(245,245,245,0.12)] bg-[rgba(245,245,245,0.05)] px-1.5 py-0.5 text-xs text-[#F5F5F5]/65 text-center whitespace-nowrap overflow-hidden">
                        {contact.role}
                      </span>
                    ) : (
                      <span className="text-[#F5F5F5]/25">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-[#F5F5F5]/60 truncate text-xs">
                    {contact.city || <span className="text-[#F5F5F5]/25">—</span>}
                  </td>
                  <td className="px-3 py-2.5 align-middle truncate">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-[#F0FF00]/70 hover:text-[#F0FF00] transition-colors text-xs truncate block"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-[#F5F5F5]/25">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle truncate">
                    {contact.instagram ? (
                      <a
                        href={`https://instagram.com/${contact.instagram}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#F0FF00]/70 hover:text-[#F0FF00] transition-colors text-xs truncate block"
                      >
                        @{contact.instagram}
                      </a>
                    ) : (
                      <span className="text-[#F5F5F5]/25">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-[#F5F5F5]/60 truncate">
                    {contact.phone || <span className="text-[#F5F5F5]/25">—</span>}
                  </td>
                  <td className="px-3 py-2.5 align-middle whitespace-nowrap text-xs text-[#F5F5F5]/30">
                    {contact.createdAt
                      ? new Date(contact.createdAt).toLocaleDateString("fr-FR")
                      : <span className="text-[#F5F5F5]/25">—</span>}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <p className="line-clamp-2 text-xs text-[#F5F5F5]/40">
                      {contact.notes || <span className="text-[#F5F5F5]/25">—</span>}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
                        onClick={() => startEdit(contact)}
                        title="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400/40 hover:text-red-400"
                        onClick={() => handleDelete(contact.id)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
