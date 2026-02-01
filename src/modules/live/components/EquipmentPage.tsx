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
import { Plus, Pencil, Trash2, List, Package } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Checkbox } from "@/components/ui/checkbox";

const CONDITION_OPTIONS = [
  "A réparer",
  "Moyen",
  "Bon",
  "Neuf"
] as const;

type Condition = (typeof CONDITION_OPTIONS)[number];

type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  condition: Condition;
  comment?: string;
};

const defaultInventory: InventoryItem[] = [];

type MaterialList = {
  id: number;
  name: string;
  description: string;
  itemIds: number[];
};

const defaultLists: MaterialList[] = [];

type TabId = "inventaire" | "liste";

export function EquipmentPage() {
  const [activeTab, setActiveTab] = useState<TabId>("inventaire");
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>(
    "live:equipment-inventory",
    defaultInventory
  );
  const [lists, setLists] = useLocalStorage<MaterialList[]>(
    "live:equipment-lists",
    defaultLists
  );
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const [deleteListConfirmId, setDeleteListConfirmId] = useState<number | null>(null);
  const [listForm, setListForm] = useState<{
    name: string;
    description: string;
    selectedIds: number[];
  }>({ name: "", description: "", selectedIds: [] });

  const [form, setForm] = useState<{
    name: string;
    quantity: string;
    condition: Condition;
    comment: string;
  }>({
    name: "",
    quantity: "1",
    condition: "Bon",
    comment: ""
  });

  const openAdd = () => {
    setForm({
      name: "",
      quantity: "1",
      condition: "Bon",
      comment: ""
    });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      condition: item.condition,
      comment: item.comment ?? ""
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const saveItem = () => {
    const name = form.name.trim();
    const quantity = Math.max(0, parseInt(form.quantity, 10) || 0);
    const condition = form.condition;
    const comment = form.comment.trim() || undefined;

    if (editingId !== null) {
      setInventory((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, name: name || "Sans nom", quantity, condition, comment }
            : item
        )
      );
    } else {
      const nextId =
        inventory.length > 0
          ? Math.max(...inventory.map((x) => x.id)) + 1
          : 1;
      setInventory((prev) => [
        ...prev,
        {
          id: nextId,
          name: name || "Sans nom",
          quantity,
          condition,
          comment
        }
      ]);
    }
    setDialogOpen(false);
  };

  const deleteItem = (id: number) => {
    setInventory((prev) => prev.filter((item) => item.id !== id));
    setDeleteConfirmId(null);
  };

  const openAddList = () => {
    setListForm({ name: "", description: "", selectedIds: [] });
    setEditingListId(null);
    setListDialogOpen(true);
  };

  const openEditList = (list: MaterialList) => {
    setListForm({
      name: list.name,
      description: list.description,
      selectedIds: [...list.itemIds]
    });
    setEditingListId(list.id);
    setListDialogOpen(true);
  };

  const toggleListItem = (itemId: number) => {
    setListForm((prev) =>
      prev.selectedIds.includes(itemId)
        ? { ...prev, selectedIds: prev.selectedIds.filter((id) => id !== itemId) }
        : { ...prev, selectedIds: [...prev.selectedIds, itemId] }
    );
  };

  const saveList = () => {
    const name = listForm.name.trim();
    if (!name) return;
    if (editingListId !== null) {
      setLists((prev) =>
        prev.map((l) =>
          l.id === editingListId
            ? {
                ...l,
                name,
                description: listForm.description.trim(),
                itemIds: listForm.selectedIds
              }
            : l
        )
      );
    } else {
      const nextId =
        lists.length > 0 ? Math.max(...lists.map((l) => l.id)) + 1 : 1;
      setLists((prev) => [
        ...prev,
        {
          id: nextId,
          name,
          description: listForm.description.trim(),
          itemIds: listForm.selectedIds
        }
      ]);
    }
    setListDialogOpen(false);
  };

  const deleteList = (id: number) => {
    setLists((prev) => prev.filter((l) => l.id !== id));
    setDeleteListConfirmId(null);
  };

  const getItemsForList = (itemIds: number[]) =>
    itemIds
      .map((id) => inventory.find((i) => i.id === id))
      .filter((i): i is InventoryItem => i != null);

  if (!isHydrated) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Matériel
        </h1>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          Matériel
        </h1>
        <p className="text-sm text-muted-foreground">
          Inventaire et liste de ton matériel.
        </p>
      </div>

      {/* Onglets */}
      <div className="border-b">
        <nav className="flex gap-1" aria-label="Onglets">
          <button
            type="button"
            onClick={() => setActiveTab("inventaire")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "inventaire"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-4 w-4" />
            Inventaire
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("liste")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "liste"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-4 w-4" />
            Liste de matériel
          </button>
        </nav>
      </div>

      {/* Contenu Inventaire */}
      {activeTab === "inventaire" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter du matériel
            </Button>
          </div>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Nom</th>
                  <th className="px-4 py-3 text-left font-medium">Quantité</th>
                  <th className="px-4 py-3 text-left font-medium">État</th>
                  <th className="px-4 py-3 text-left font-medium">Commentaire</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Aucun matériel.{" "}
                      <Button
                        onClick={openAdd}
                        variant="link"
                        className="p-0 h-auto"
                      >
                        Ajouter du matériel
                      </Button>
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">{item.condition}</td>
                      <td className="max-w-[200px] px-4 py-3 text-muted-foreground">
                        {item.comment || "—"}
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
        </div>
      )}

      {/* Contenu Liste de matériel */}
      {activeTab === "liste" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddList}>
              <List className="mr-2 h-4 w-4" />
              Créer une liste
            </Button>
          </div>
          {lists.length === 0 ? (
            <div className="rounded-md border py-12 text-center text-sm text-muted-foreground">
              Aucune liste. Crée une liste et sélectionne du matériel dans ton
              inventaire.
              <Button
                onClick={openAddList}
                variant="link"
                className="mt-2 block w-full justify-center p-0"
              >
                Créer une liste
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {lists.map((list) => {
                const items = getItemsForList(list.itemIds);
                return (
                  <div
                    key={list.id}
                    className="rounded-md border bg-muted/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">{list.name}</h3>
                        {list.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {list.description}
                          </p>
                        )}
                        {items.length > 0 && (
                          <ul className="mt-3 space-y-1 text-sm">
                            {items.map((item) => (
                              <li key={item.id}>
                                {item.name} — Qté : {item.quantity}, État :{" "}
                                {item.condition}
                              </li>
                            ))}
                          </ul>
                        )}
                        {items.length === 0 && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Aucun matériel sélectionné.
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Modifier"
                          onClick={() => openEditList(list)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Supprimer"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteListConfirmId(list.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dialog Ajouter / Modifier */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            {editingId !== null ? "Modifier le matériel" : "Ajouter du matériel"}
          </DialogTitle>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nom</label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="ex. Ampli guitare"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Quantité</label>
              <Input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, quantity: e.target.value }))
                }
                placeholder="1"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">État</label>
              <Select
                value={form.condition}
                onValueChange={(value: Condition) =>
                  setForm((prev) => ({ ...prev, condition: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Commentaire</label>
              <Textarea
                value={form.comment}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, comment: e.target.value }))
                }
                placeholder="Commentaire..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveItem}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Supprimer ce matériel ?</DialogTitle>
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
                deleteConfirmId !== null && deleteItem(deleteConfirmId)
              }
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Créer / Modifier une liste */}
      <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            {editingListId !== null
              ? "Modifier la liste"
              : "Créer une liste"}
          </DialogTitle>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nom</label>
              <Input
                value={listForm.name}
                onChange={(e) =>
                  setListForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="ex. Tournée été"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={listForm.description}
                onChange={(e) =>
                  setListForm((prev) => ({
                    ...prev,
                    description: e.target.value
                  }))
                }
                placeholder="Description de la liste..."
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                Sélectionner du matériel (inventaire)
              </label>
              {inventory.length === 0 ? (
                <p className="rounded-md border border-dashed py-4 text-center text-sm text-muted-foreground">
                  Aucun matériel dans l’inventaire. Ajoute-en dans l’onglet
                  Inventaire.
                </p>
              ) : (
                <div className="max-h-[200px] space-y-2 overflow-y-auto rounded-md border p-3">
                  {inventory.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={listForm.selectedIds.includes(item.id)}
                        onCheckedChange={() => toggleListItem(item.id)}
                      />
                      <span className="text-sm">
                        {item.name} — Qté : {item.quantity}, État :{" "}
                        {item.condition}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setListDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={saveList}
              disabled={!listForm.name.trim()}
            >
              {editingListId !== null ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression liste */}
      <Dialog
        open={deleteListConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteListConfirmId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Supprimer cette liste ?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteListConfirmId(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteListConfirmId !== null &&
                deleteList(deleteListConfirmId)
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
