"use client";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLiveData } from "@/hooks/useLiveData";
import { EQUIPMENT_CATEGORIES, type TechnicalSheet } from "../../lib/live-model";
import { resolveBrought } from "../../lib/live-equipment";
import { CategoryTag, Panel } from "./LiveUI";

/** « Matériel à emporter » d'une date ou d'une répétition : le matériel apporté de la fiche technique, avec ses cases à cocher. */
export function EquipmentChecklist({ sheet, listIds, checked, onCheck, onOpenTechnical }: {
    sheet: TechnicalSheet;
    listIds: string[];
    checked: Record<string, boolean>;
    onCheck: (v: Record<string, boolean>) => void;
    onOpenTechnical?: () => void;
}) {
    const { equipmentLists, equipmentInventory } = useLiveData();
    const lines = resolveBrought(sheet, listIds, equipmentLists, equipmentInventory);
    const done = lines.filter(l => checked[l.key]).length;
    return <Panel title="Matériel à emporter" icon={PackageCheck} color="#34D399" action={onOpenTechnical && <Button type="button" size="xs" variant="secondary" onClick={onOpenTechnical}>Modifier dans la fiche technique</Button>}>
    {!lines.length ? <p className="text-sm text-[#F5F5F5]/55">Aucun matériel apporté pour l’instant. Il se choisit dans la fiche technique.</p> : <div className="space-y-4">
        <p className="text-xs text-[#F5F5F5]/50">{done} / {lines.length} vérifiés pour cette date</p>
        {EQUIPMENT_CATEGORIES.map(([category, label]) => {
            const rows = lines.filter(l => l.category === category);
            if (!rows.length)
                return null;
            return <div key={category} className="space-y-2">
            <CategoryTag category={category} label={label}/>
            {rows.map(line => <label key={line.key} className="flex cursor-pointer items-center gap-3 rounded-md bg-[#101010]/30 px-3 py-2.5 text-sm">
                <Checkbox checked={!!checked[line.key]} onCheckedChange={v => onCheck({ ...checked, [line.key]: !!v })}/>
                <span className="flex-1">{line.name}</span>
                {line.needsRepair && <span className="text-xs text-amber-300">À réparer</span>}
                <span className="text-xs text-[#F5F5F5]/50">× {line.quantity}</span>
                </label>)}
            </div>;
        })}
    </div>}
    </Panel>;
}
