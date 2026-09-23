"use client";
import { useState } from "react";
import Link from "next/link";
import { FileDown, Import, Palette, SlidersHorizontal } from "lucide-react";
import { personalizationHref } from "@/modules/settings/components/PersonalizationPage";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { LiveProduction, TechnicalSheet } from "../../lib/live-model";
import { cloneTechnical, technicalIsEmpty } from "../../lib/live-equipment";
import { Panel } from "./LiveUI";
import { CopyTechnicalDialog } from "./CopyTechnicalDialog";
import { EquipmentBlock, type SheetChange } from "./EquipmentBlock";
import { TeamBlock } from "./TeamBlock";

/**
 * Fiche technique : le matériel en tête, puis l'équipe et les contacts. `listIds`
 * (les listes de matériel cochées) voyage avec la fiche : un seul `onChange` pour
 * les deux, afin qu'une copie de fiche remplace tout d'un geste.
 */
export function TechnicalEditor({ value, listIds, onChange, excludeId, onDownload }: {
    value: TechnicalSheet;
    listIds: string[];
    onChange: (v: SheetChange) => void;
    /** Le live en cours d'édition : on ne se copie pas soi-même. */
    excludeId?: string;
    /** Télécharge la fiche en PDF : proposé en haut et en bas du bloc. */
    onDownload: () => void;
}) {
    const [copying, setCopying] = useState(false);
    const { confirm, confirmDialog } = useConfirm();
    const pick = async (source: LiveProduction) => {
        setCopying(false);
        if (!technicalIsEmpty(value, listIds) && !(await confirm({ title: "Remplacer la fiche technique ?", description: `La fiche actuelle sera remplacée par celle de « ${source.title} ».`, confirmLabel: "Remplacer" })))
            return;
        onChange({ technical: cloneTechnical(source.technical), listIds: [...source.equipmentListIds] });
    };
    return <Panel title="Fiche technique" icon={SlidersHorizontal} color="#A78BFA" description="Le matériel à emporter et à demander, puis l’équipe et les contacts à transmettre au lieu." action={<div className="flex shrink-0 gap-2"><Button type="button" size="xs" variant="secondary" onClick={() => setCopying(true)}><Import size={12} className="mr-1"/>Importer une fiche technique</Button><Button size="xs" variant="outline" asChild><Link href={personalizationHref("fiche-technique")}><Palette size={12} className="mr-1"/>Personnaliser</Link></Button><Button type="button" size="xs" variant="outline" onClick={onDownload}><FileDown size={12} className="mr-1"/>Télécharger en PDF</Button></div>}>
    <div className="space-y-6">
    <EquipmentBlock sheet={value} listIds={listIds} onChange={onChange}/>
    <div className="border-t border-[#F5F5F5]/[.08] pt-6">
    <TeamBlock people={value.people} onChange={people => onChange({ technical: { ...value, people }, listIds })}/>
    </div>
    <div className="flex justify-end border-t border-[#F5F5F5]/[.08] pt-5">
    <Button type="button" variant="outline" onClick={onDownload}><FileDown size={14} className="mr-2"/>Télécharger la fiche technique en PDF</Button>
    </div>
    </div>
    <CopyTechnicalDialog open={copying} onOpenChange={setCopying} excludeId={excludeId} onPick={pick}/>
    {confirmDialog}
    </Panel>;
}
