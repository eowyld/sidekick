"use client";
import { Fragment, useState } from "react";
import { Boxes, CheckCircle2, ClipboardList, Package, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { EmptyState } from "@/components/ui/empty-state";
import { useLiveData, type EquipmentInventoryItem, type EquipmentList } from "@/hooks/useLiveData";
import { CategoryTag, Choice, LiveHeader, Segments, TextField } from "./shared/LiveUI";
import { EQUIPMENT_CATEGORIES } from "../lib/live-model";
import { CATEGORY_COLOR, compareByCategory, normalizeCategory } from "../lib/live-equipment";
const conditions = ["Neuf", "Bon", "Moyen", "A réparer"];
const colors: Record<string, string> = { Neuf: "#34D399", Bon: "#38BDF8", Moyen: "#FB923C", "A réparer": "#FB7185" };
/** Choix exclusif en pastilles colorées : les catégories et les états se lisent d'un coup d'œil. */
function PillGroup({ label, value, onChange, options }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string; color: string }[];
}) {
    return <div role="radiogroup" aria-label={label}>
    <p className="mb-2 text-xs font-medium leading-none text-[#F5F5F5]/65">{label}</p>
    <div className="flex flex-wrap gap-2">
        {options.map(o => {
            const on = o.value === value;
            return <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)} className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00]/70" style={on ? { borderColor: `${o.color}99`, background: `${o.color}1f`, color: "#F5F5F5" } : { borderColor: "rgba(245,245,245,.12)", color: "rgba(245,245,245,.6)" }}>
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: o.color, opacity: on ? 1 : 0.5 }}/>
            {o.label}
            </button>;
        })}
    </div>
    </div>;
}
export function EquipmentPage() {
    const live = useLiveData();
    const { equipmentInventory: inventory, equipmentLists: lists } = live;
    const [tab, setTab] = useState("inventory");
    const [search, setSearch] = useState("");
    const [condition, setCondition] = useState("");
    const [item, setItem] = useState<EquipmentInventoryItem | null>(null);
    const [list, setList] = useState<EquipmentList | null>(null);
    const [saving, setSaving] = useState(false);
    const [remove, setRemove] = useState<{
        id: string;
        kind: "item" | "list";
    } | null>(null);
    const saveItem = async () => { if (!item)
        return; if (!item.name.trim() || !Number.isInteger(item.quantity) || item.quantity < 1) {
        toast.error("Renseigne un nom et une quantité entière supérieure à zéro.");
        return;
    } setSaving(true); if (await live.setEquipmentInventory(prev => prev.some(i => i.id === item.id) ? prev.map(i => i.id === item.id ? item : i) : [...prev, item])) {
        setItem(null);
        toast.success("Matériel enregistré");
    } setSaving(false); };
    const saveList = async () => { if (!list)
        return; if (!list.name.trim()) {
        toast.error("Donne un nom à la liste.");
        return;
    } setSaving(true); if (await live.setEquipmentLists(prev => prev.some(l => l.id === list.id) ? prev.map(l => l.id === list.id ? list : l) : [...prev, list])) {
        setList(null);
        toast.success("Liste enregistrée");
    } setSaving(false); };
    const used = remove?.kind === "item" ? lists.some(l => l.itemIds.includes(remove.id)) : remove?.kind === "list" && (live.productions.some(p => p.equipmentListIds.includes(remove.id)) || live.tourDates.some(d => d.details?.equipmentListIds?.includes(remove.id)) || live.rehearsals.some(r => r.details?.equipmentListIds?.includes(remove.id)));
    const confirmRemove = async () => { if (!remove)
        return; setSaving(true); const ok = remove.kind === "item" ? await live.setEquipmentInventory(prev => prev.filter(i => i.id !== remove.id)) : await live.setEquipmentLists(prev => prev.filter(l => l.id !== remove.id)); if (ok)
        setRemove(null); setSaving(false); };
    if (live.loading)
        return <PageLoader />;
    const loadError = live.sliceError("inventory", "lists");
    if (loadError && !item && !list && !remove)
        return <PageError title="Impossible de charger le matériel" description={loadError} onRetry={() => mutate("user_live")}/>;
    const shown = inventory.filter(i => i.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!condition || i.condition === condition)).sort(compareByCategory);
    const shownLists = lists.filter(l => l.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    return <div>
    <LiveHeader title="Matériel" description="Ton équipement, tes listes, tes départs sans oubli."/>
    <div className="mb-6 grid grid-cols-3 gap-4">
        {[{ label: "références", value: inventory.length, Icon: Boxes, color: "#34D399" }, { label: "listes prêtes à utiliser", value: lists.length, Icon: ClipboardList, color: "#A78BFA" }, { label: "à réparer", value: inventory.filter(i => i.condition === "A réparer").length, Icon: Wrench, color: "#FB923C" }].map(({ label, value, Icon, color }) => <div key={label} className="rounded-xl border border-[#F5F5F5]/10 p-5" style={{ background: `linear-gradient(130deg, ${color}10, rgba(44,44,46,.4))` }}>
        <div className="flex items-center justify-between">
        <Icon size={19} style={{ color }}/>
        <span className="text-3xl font-light tabular-nums">
        {value}
        </span>
        </div>
        <p className="mt-4 text-xs text-[#F5F5F5]/50">
        {label}
        </p>
        </div>)}
    </div>
    <Segments value={tab} onChange={setTab} items={[{ id: "inventory", label: "Inventaire", count: inventory.length }, { id: "lists", label: "Listes de matériel", count: lists.length }]}/>
    <div className="my-5 flex items-end gap-3">
    <Input aria-label="Rechercher du matériel ou une liste" placeholder="Rechercher…" className="max-w-sm" value={search} onChange={e => setSearch(e.target.value)}/>
        {tab === "inventory" && <div className="w-44">
        <Choice label="État" optional value={condition} onChange={setCondition} options={conditions.map(value => ({ value, label: value === "A réparer" ? "À réparer" : value }))}/>
        </div>}
    <Button className="ml-auto" onClick={() => tab === "inventory" ? setItem({ id: crypto.randomUUID(), name: "", quantity: 1, condition: "Bon", category: "other", comment: "" }) : setList({ id: crypto.randomUUID(), name: "", description: "", itemIds: [] })}>
        <Plus size={14} className="mr-2"/>
        {tab === "inventory" ? "Ajouter du matériel" : "Nouvelle liste"}
        </Button>
    </div>
        {tab === "inventory" ? <div className="overflow-hidden rounded-xl border border-[#F5F5F5]/10">
        <table className="w-full text-left text-sm">
        <thead className="bg-[#F5F5F5]/[.03] text-[10px] uppercase tracking-widest text-[#F5F5F5]/45">
        <tr>
        <th className="px-5 py-3">Matériel</th>
        <th className="px-4 py-3">Quantité</th>
        <th className="px-4 py-3">État</th>
        <th className="px-4 py-3">Listes</th>
        <th className="px-4 py-3">
        <span className="sr-only">Actions</span>
        </th>
        </tr>
        </thead>
        <tbody>
            {EQUIPMENT_CATEGORIES.map(([cat, label]) => {
                const rows = shown.filter(i => i.category === cat);
                if (!rows.length)
                    return null;
                return <Fragment key={cat}>
                <tr className="border-t border-[#F5F5F5]/[.06] bg-[#F5F5F5]/[.04]">
                <td colSpan={5} className="px-5 py-2" style={{ boxShadow: `inset 3px 0 0 ${CATEGORY_COLOR[cat]}` }}>
                <CategoryTag category={cat} label={label} count={rows.length}/>
                </td>
                </tr>
                {rows.map(i => <tr key={i.id} className="border-t border-[#F5F5F5]/[.06] bg-[rgba(44,44,46,.3)] transition-colors hover:bg-[rgba(44,44,46,.7)]">
            <td className="px-5 py-4" style={{ boxShadow: `inset 3px 0 0 ${CATEGORY_COLOR[cat]}55` }}>
            <button className="text-left font-medium hover:text-[#F0FF00]" onClick={() => setItem({ ...i })}>
            {i.name}
            </button>
                {i.comment && <p className="mt-1 max-w-sm truncate text-xs text-[#F5F5F5]/45">
                {i.comment}
                </p>}
            </td>
            <td className="px-4 py-4 tabular-nums text-[#F5F5F5]/65">
            {i.quantity}
            </td>
            <td className="px-4 py-4">
            <span className="rounded-md px-2 py-1 text-[11px]" style={{ color: colors[i.condition] ?? "#888888", background: `${colors[i.condition] ?? "#888888"}12` }}>
            {i.condition === "A réparer" ? "À réparer" : i.condition}
            </span>
            </td>
            <td className="px-4 py-4 text-xs text-[#F5F5F5]/50">
            {lists.filter(l => l.itemIds.includes(i.id)).map(l => l.name).join(", ") || "—"}
            </td>
            <td className="px-4 py-4">
            <div className="flex justify-end gap-1">
            <Button variant="ghost" size="xs" aria-label={`Modifier ${i.name}`} onClick={() => setItem({ ...i })}>
            <Pencil size={13}/>
            </Button>
            <Button variant="ghost" size="xs" aria-label={`Supprimer ${i.name}`} onClick={() => setRemove({ id: i.id, kind: "item" })}>
            <Trash2 size={13}/>
            </Button>
            </div>
            </td>
            </tr>)}
                </Fragment>;
            })}
        </tbody>
        </table>
        {!shown.length && <EmptyState icon={Package} title="Aucun matériel à afficher" description="Ajoute tes instruments, ton backline ou ton équipement DJ, puis compose tes listes."/>}
        </div> : <div className="grid gap-4 lg:grid-cols-2">
            {shownLists.map(l => <div key={l.id} className="rounded-xl border border-[#F5F5F5]/10 bg-[rgba(44,44,46,.45)] p-5">
            <div className="flex items-start justify-between">
            <ClipboardList size={20} className="text-violet-400"/>
            <div className="flex gap-1">
            <Button size="xs" variant="ghost" aria-label={`Modifier ${l.name}`} onClick={() => setList({ ...l, itemIds: [...l.itemIds] })}>
            <Pencil size={13}/>
            </Button>
            <Button size="xs" variant="ghost" aria-label={`Supprimer ${l.name}`} onClick={() => setRemove({ id: l.id, kind: "list" })}>
            <Trash2 size={13}/>
            </Button>
            </div>
            </div>
            <button className="mt-4 text-base font-semibold hover:text-[#F0FF00]" onClick={() => setList({ ...l, itemIds: [...l.itemIds] })}>
            {l.name}
            </button>
            <p className="mt-1 text-xs text-[#F5F5F5]/50">
            {l.description || "Une liste à emporter sur scène."}
            </p>
            <div className="mt-4 space-y-3">
            {EQUIPMENT_CATEGORIES.map(([cat, label]) => {
                const rows = inventory.filter(i => l.itemIds.includes(i.id) && i.category === cat).sort(compareByCategory);
                if (!rows.length)
                    return null;
                return <div key={cat}>
                <CategoryTag category={cat} label={label} count={rows.length} className="mb-1.5"/>
                <div className="flex flex-wrap gap-1.5">
                {rows.map(i => <span key={i.id} className="rounded-md border px-2 py-1 text-[11px] text-[#F5F5F5]/70" style={{ borderColor: `${CATEGORY_COLOR[cat]}40`, background: `${CATEGORY_COLOR[cat]}0d` }}>{i.name} × {i.quantity}</span>)}
                </div>
                </div>;
            })}
            </div>
            <p className="mt-5 flex items-center gap-1.5 text-[10px] text-emerald-300/80"><CheckCircle2 size={12}/>Checklist disponible sur chaque date</p>
            </div>)}
        {!shownLists.length && <EmptyState icon={ClipboardList} title="Prépare ta première liste" description="Un set acoustique, un DJ set, une tournée : compose des listes réutilisables pour chaque configuration."/>}
        </div>}
    <Dialog open={!!item} onOpenChange={open => !open && !saving && setItem(null)}>
    <DialogContent className="sm:max-w-lg sm:px-8">
    <DialogHeader>
    <DialogTitle>
    {inventory.some(i => i.id === item?.id) ? "Modifier le matériel" : "Ajouter du matériel"}
    </DialogTitle>
    <DialogDescription>Rangé dans ton inventaire, prêt pour tes listes et tes fiches techniques.</DialogDescription>
    </DialogHeader>
        {item && <div className="space-y-5">
        <TextField label="Nom" value={item.name} onChange={name => setItem({ ...item, name })} required/>
        <PillGroup label="Catégorie" value={item.category} onChange={category => setItem({ ...item, category: normalizeCategory(category) })} options={EQUIPMENT_CATEGORIES.map(([value, label]) => ({ value, label, color: CATEGORY_COLOR[value] }))}/>
        <div className="flex items-start gap-4">
        <div className="w-24 shrink-0">
        <TextField label="Quantité" type="number" min="1" value={String(item.quantity)} onChange={quantity => setItem({ ...item, quantity: Number(quantity) })}/>
        </div>
        <div className="min-w-0 flex-1">
        <PillGroup label="État" value={item.condition} onChange={condition => setItem({ ...item, condition })} options={conditions.map(value => ({ value, label: value === "A réparer" ? "À réparer" : value, color: colors[value] }))}/>
        </div>
        </div>
        <TextField label="Notes" area placeholder="Numéro de série, réglages, à racheter…" value={item.comment ?? ""} onChange={comment => setItem({ ...item, comment })}/>
        </div>}
        {live.error && <p role="alert" className="text-xs text-rose-300">
        {live.error}
        </p>}
    <DialogFooter>
    <Button variant="outline" onClick={() => setItem(null)} disabled={saving}>Annuler</Button>
    <Button disabled={saving} onClick={() => void saveItem()}>Enregistrer</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    <Dialog open={!!list} onOpenChange={open => !open && !saving && setList(null)}>
    <DialogContent className="sm:max-w-lg sm:px-8">
    <DialogHeader>
    <DialogTitle>Liste de matériel</DialogTitle>
    </DialogHeader>
        {list && <div className="space-y-4">
        <TextField label="Nom de la liste" value={list.name} onChange={name => setList({ ...list, name })} required/>
        <TextField label="Description" value={list.description} onChange={description => setList({ ...list, description })}/>
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-[#F5F5F5]/10 p-3">
            {EQUIPMENT_CATEGORIES.map(([cat, label]) => {
                const rows = inventory.filter(i => i.category === cat).sort(compareByCategory);
                if (!rows.length)
                    return null;
                return <div key={cat}>
                <CategoryTag category={cat} label={label} className="px-1 pb-1 pt-2"/>
                {rows.map(i => <label key={i.id} className="flex cursor-pointer items-center gap-3 px-1 py-2 text-sm">
            <Checkbox checked={list.itemIds.includes(i.id)} onCheckedChange={checked => setList({ ...list, itemIds: checked ? [...list.itemIds, i.id] : list.itemIds.filter(id => id !== i.id) })}/>
            <span className="flex-1">
            {i.name}
            </span>
            <span className="text-xs text-[#F5F5F5]/50">× {i.quantity}</span>
            </label>)}
                </div>;
            })}
        {!inventory.length && <p className="text-xs text-[#F5F5F5]/50">Ajoute d’abord du matériel à ton inventaire.</p>}
        </div>
        </div>}
        {live.error && <p role="alert" className="text-xs text-rose-300">
        {live.error}
        </p>}
    <DialogFooter>
    <Button variant="outline" onClick={() => setList(null)} disabled={saving}>Annuler</Button>
    <Button disabled={saving} onClick={() => void saveList()}>Enregistrer</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    <Dialog open={!!remove} onOpenChange={open => !open && setRemove(null)}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Supprimer {remove?.kind === "item" ? "ce matériel" : "cette liste"} ?</DialogTitle>
    <DialogDescription>
    {used ? "Cet élément est encore utilisé. Retire ses associations avant de le supprimer." : "Cette suppression est définitive."}
    </DialogDescription>
    </DialogHeader>
        {live.error && <p role="alert" className="text-xs text-rose-300">
        {live.error}
        </p>}
    <DialogFooter>
    <Button variant="outline" onClick={() => setRemove(null)}>Annuler</Button>
    <Button variant="destructive" disabled={saving || !!used} onClick={() => void confirmRemove()}>Supprimer</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    </div>;
}
