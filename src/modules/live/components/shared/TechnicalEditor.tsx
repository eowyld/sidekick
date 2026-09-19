"use client";
import { SlidersHorizontal } from "lucide-react";
import { Panel, TextField } from "./LiveUI";
import { TECHNICAL_FIELDS, type TechnicalSheet } from "../../lib/live-model";
export function TechnicalEditor({ value, onChange }: {
    value: TechnicalSheet;
    onChange: (v: TechnicalSheet) => void;
}) {
    return <Panel title="Fiche technique" icon={SlidersHorizontal} color="#A78BFA" description="Les informations à transmettre au lieu et à son équipe technique.">
    <div className="grid gap-5 md:grid-cols-2">
    {TECHNICAL_FIELDS.map(([key, label, placeholder]) => <TextField key={key} label={label} placeholder={placeholder} area value={value[key]} onChange={text => onChange({ ...value, [key]: text })}/>)}
    </div>
    </Panel>;
}
