"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLiveData, type EquipmentInventoryItem } from "@/hooks/useLiveData";
import { EQUIPMENT_CATEGORIES, type EquipmentCategory, type SheetItem, type TechnicalSheet } from "../../lib/live-model";
import { CATEGORY_COLOR, DETAIL_PLACEHOLDER, resolveBrought, type BroughtLine } from "../../lib/live-equipment";
import { CategoryTag, Choice } from "./LiveUI";

export type SheetChange = { technical: TechnicalSheet; listIds: string[] };

/** Une ligne d'ajout ou de matériel salle : nom et quantité modifiables. */
function ItemRow({ item, onChange, onRemove }: { item: SheetItem; onChange: (v: SheetItem) => void; onRemove: () => void }) {
    return <div className="flex items-center gap-2">
    <div className="min-w-0 flex-1">
    <Input aria-label="Nom du matériel" value={item.name} onChange={e => onChange({ ...item, name: e.target.value })}/>
    </div>
    <div className="w-16 shrink-0">
    <Input aria-label={`Quantité de ${item.name || "ce matériel"}`} type="number" min="1" value={String(item.quantity)} onChange={e => onChange({ ...item, quantity: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })}/>
    </div>
    <Button type="button" variant="ghost" size="icon" aria-label={`Retirer ${item.name || "ce matériel"}`} onClick={onRemove}><Trash2 size={14}/></Button>
    </div>;
}

/** Saisie d'une ligne libre : nom, quantité, Entrée ou « + ». */
function LineAdder({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string, quantity: number) => void }) {
    const [name, setName] = useState("");
    const [quantity, setQuantity] = useState("1");
    const submit = () => {
        const clean = name.trim();
        if (!clean)
            return;
        const parsed = Number.parseInt(quantity, 10);
        onAdd(clean, Number.isInteger(parsed) && parsed > 0 ? parsed : 1);
        setName("");
        setQuantity("1");
    };
    return <div className="flex items-center gap-2">
    <div className="min-w-0 flex-1">
    <Input aria-label={placeholder} placeholder={placeholder} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") {
        e.preventDefault();
        submit();
    } }}/>
    </div>
    <div className="w-16 shrink-0">
    <Input aria-label="Quantité" type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)}/>
    </div>
    <Button type="button" size="icon" variant="secondary" aria-label="Ajouter la ligne" disabled={!name.trim()} onClick={submit}><Plus size={14}/></Button>
    </div>;
}

function CategoryRow({ category, label, sheet, listLines, taken, inventory, patch }: {
    category: EquipmentCategory;
    label: string;
    sheet: TechnicalSheet;
    listLines: BroughtLine[];
    taken: Set<string>;
    inventory: EquipmentInventoryItem[];
    patch: (next: Partial<TechnicalSheet>) => void;
}) {
    const fromLists = listLines.filter(l => l.category === category);
    const extras = sheet.brought.filter(b => b.category === category);
    const venue = sheet.venue.filter(v => v.category === category);
    const pickable = inventory.filter(i => i.category === category && !taken.has(i.id)).sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const id = `details-${category}`;
    return <section className="rounded-lg border border-[#F5F5F5]/[.08] bg-[#101010]/30 p-4" style={{ boxShadow: `inset 3px 0 0 ${CATEGORY_COLOR[category]}` }}>
    <h3 className="mb-3"><CategoryTag category={category} label={label} className="text-[11px]"/></h3>
    <div className="grid gap-5 md:grid-cols-2">
    <div className="space-y-2">
    <p className="text-xs text-[#F5F5F5]/50">Apporté</p>
    {fromLists.map(line => <div key={line.key} className="flex items-center justify-between gap-3 rounded-md bg-[#101010]/40 px-3 py-2 text-sm">
        <span className="min-w-0 truncate">{line.name}<span className="ml-2 text-xs text-[#F5F5F5]/40">liste {line.listName}</span></span>
        <span className="shrink-0 text-xs text-[#F5F5F5]/50">× {line.quantity}</span>
        </div>)}
    {extras.map(item => <ItemRow key={item.id} item={item} onChange={next => patch({ brought: sheet.brought.map(b => b.id === item.id ? next : b) })} onRemove={() => patch({ brought: sheet.brought.filter(b => b.id !== item.id) })}/>)}
        {pickable.length > 0 && <Choice label="Depuis l’inventaire" placeholder="Choisir un matériel" value="" onChange={itemId => {
        const found = inventory.find(i => i.id === itemId);
        if (found)
            patch({ brought: [...sheet.brought, { id: crypto.randomUUID(), itemId: found.id, name: found.name, quantity: found.quantity, category }] });
    }} options={pickable.map(i => ({ value: i.id, label: `${i.name} × ${i.quantity}` }))}/>}
    <LineAdder placeholder="Autre matériel apporté" onAdd={(name, quantity) => patch({ brought: [...sheet.brought, { id: crypto.randomUUID(), name, quantity, category }] })}/>
    </div>
    <div className="space-y-2">
    <p className="text-xs text-[#F5F5F5]/50">À fournir par la salle</p>
    {venue.map(item => <ItemRow key={item.id} item={item} onChange={next => patch({ venue: sheet.venue.map(v => v.id === item.id ? next : v) })} onRemove={() => patch({ venue: sheet.venue.filter(v => v.id !== item.id) })}/>)}
    <LineAdder placeholder="Matériel demandé à la salle" onAdd={(name, quantity) => patch({ venue: [...sheet.venue, { id: crypto.randomUUID(), name, quantity, category }] })}/>
    </div>
    </div>
    <div className="mt-4 space-y-2">
    <Label htmlFor={id} className="text-xs text-[#F5F5F5]/65">Détails</Label>
    <Textarea id={id} rows={3} placeholder={DETAIL_PLACEHOLDER[category]} value={sheet.details[category]} onChange={e => patch({ details: { ...sheet.details, [category]: e.target.value } })}/>
    </div>
    </section>;
}

/** Le bloc Matériel de la fiche technique : listes cochées, ajouts, matériel demandé à la salle, par catégorie. */
export function EquipmentBlock({ sheet, listIds, onChange }: { sheet: TechnicalSheet; listIds: string[]; onChange: (v: SheetChange) => void }) {
    const { equipmentLists: lists, equipmentInventory: inventory } = useLiveData();
    const patch = (next: Partial<TechnicalSheet>) => onChange({ technical: { ...sheet, ...next }, listIds });
    // Les éléments des listes s'affichent seuls (lecture seule) ; les ajouts gardent leur ordre de saisie.
    const listLines = resolveBrought({ ...sheet, brought: [] }, listIds, lists, inventory);
    const taken = new Set([...listLines.map(l => l.key), ...sheet.brought.map(b => b.itemId).filter((x): x is string => !!x)]);
    return <div className="space-y-4">
    <div>
    <div className="mb-2 flex items-center justify-between">
    <p className="text-xs font-medium text-[#F5F5F5]/70">Listes de matériel</p>
    <Link href="/live/materiel" className="text-xs text-emerald-300 hover:underline">Gérer</Link>
    </div>
    <div className="flex flex-wrap gap-2">
        {lists.map(l => <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#F5F5F5]/10 px-3 py-2 text-xs hover:border-emerald-400/40">
        <Checkbox checked={listIds.includes(l.id)} onCheckedChange={v => onChange({ technical: sheet, listIds: v ? [...listIds, l.id] : listIds.filter(x => x !== l.id) })}/>
        {l.name}
        </label>)}
        {!lists.length && <p className="text-sm text-[#F5F5F5]/55">Crée une liste dans Matériel pour l’emporter d’un clic.</p>}
    </div>
    </div>
        {EQUIPMENT_CATEGORIES.map(([category, label]) => <CategoryRow key={category} category={category} label={label} sheet={sheet} listLines={listLines} taken={taken} inventory={inventory} patch={patch}/>)}
    </div>;
}
