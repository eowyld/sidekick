"use client";
import Link from "next/link";
import { PackageCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useLiveData } from "@/hooks/useLiveData";
import { Panel } from "./LiveUI";
export function EquipmentPicker({ listIds, onChange, checked, onCheck }: {
    listIds: string[];
    onChange: (ids: string[]) => void;
    checked?: Record<string, boolean>;
    onCheck?: (v: Record<string, boolean>) => void;
}) {
    const { equipmentLists: lists, equipmentInventory: inventory } = useLiveData();
    const itemIds = new Set(lists.filter(l => listIds.includes(l.id)).flatMap(l => l.itemIds));
    const items = inventory.filter(i => itemIds.has(i.id));
    return <Panel title={onCheck ? "Matériel à emporter" : "Listes de matériel"} icon={PackageCheck} color="#34D399" action={<Link href="/live/materiel" className="text-xs text-emerald-300 hover:underline">Gérer</Link>}>
    <div className="flex flex-wrap gap-2">
        {lists.map(l => <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#F5F5F5]/10 px-3 py-2 text-xs hover:border-emerald-400/40">
        <Checkbox checked={listIds.includes(l.id)} onCheckedChange={v => onChange(v ? [...listIds, l.id] : listIds.filter(id => id !== l.id))}/>
        {l.name}
        </label>)}
    {!lists.length && <p className="text-sm text-[#F5F5F5]/55">Crée ta première liste dans Matériel pour la réutiliser ici.</p>}
    </div>
        {onCheck && items.length > 0 && <div className="mt-4 space-y-2 border-t border-[#F5F5F5]/10 pt-4">
        <p className="mb-3 text-xs text-[#F5F5F5]/50">{items.filter(i => checked?.[i.id]).length} / {items.length} vérifiés pour cette date</p>
            {items.map(item => <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-md bg-[#101010]/30 px-3 py-2.5 text-sm">
            <Checkbox checked={!!checked?.[item.id]} onCheckedChange={v => onCheck({ ...checked, [item.id]: !!v })}/>
            <span className="flex-1">
            {item.name}
            </span>
            {item.condition === "A réparer" && <span className="text-xs text-amber-300">À réparer</span>}
            <span className="text-xs text-[#F5F5F5]/50">× {item.quantity}</span>
            </label>)}
        </div>}
    </Panel>;
}
