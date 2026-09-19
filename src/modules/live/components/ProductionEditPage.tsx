"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ClipboardCheck, FileDown, Mic2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useLiveData } from "@/hooks/useLiveData";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { KIND_META, newProduction, productionSteps, dateISO, type LiveKind, type LiveProduction } from "../lib/live-model";
import { LiveHeader, Panel, TextField, Choice, Preparation } from "./shared/LiveUI";
import { SetlistEditor } from "./shared/SetlistEditor";
import { TechnicalEditor } from "./shared/TechnicalEditor";
import { EquipmentPicker } from "./shared/EquipmentPicker";
import { exportLivePDF, technicalSections } from "../lib/live-pdf";
export function ProductionEditPage({ id }: {
    id: string | null;
}) {
    const data = useLiveData();
    const { projects, loading: projectsLoading } = useProjectsData();
    const query = useSearchParams();
    const [blank] = useState(() => newProduction());
    if (data.loading || projectsLoading)
        return <PageLoader />;
    const existing = data.productions.find(p => p.id === id);
    if (id && !existing)
        return <PageError title="Spectacle introuvable" description={data.error || "Ce spectacle a peut-être été supprimé."} onRetry={() => mutate("user_live")}/>;
    if (!id && data.error)
        return <PageError title="Impossible de charger Live" description={data.error} onRetry={() => mutate("user_live")}/>;
    const project = projects.find(p => p.id === query.get("projectId"));
    const rawKind = query.get("kind");
    const kind: LiveKind = rawKind === "dj" || rawKind === "tour" ? rawKind : "show";
    const initial = existing ?? { ...blank, kind, title: project?.title ?? "", description: project?.description ?? "", projectId: project?.id, preparation: project ? { concept: project.manualMilestones.liveConceptDone ? "done" as const : "todo" as const, setlist: project.manualMilestones.liveSetlistDone ? "done" as const : "todo" as const, team: project.manualMilestones.liveTeamDone ? "done" as const : "todo" as const } : {} };
    return <ProductionForm key={id ?? "new"} initial={initial} isNew={!id}/>;
}
function ProductionForm({ initial, isNew }: {
    initial: LiveProduction;
    isNew: boolean;
}) {
    const router = useRouter();
    const { productions, setProductions, tourDates, rehearsals, error } = useLiveData();
    const [form, setForm] = useState(initial);
    const [baseline, setBaseline] = useState(JSON.stringify(initial));
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [created, setCreated] = useState(!isNew);
    const dirty = JSON.stringify(form) !== baseline;
    useUnsavedChangesGuard(dirty);
    const patch = (value: Partial<LiveProduction>) => setForm(prev => ({ ...prev, ...value }));
    const meta = KIND_META[form.kind];
    const save = async () => { if (!form.title.trim()) {
        toast.error("Donne un nom à ton live.");
        return;
    } if (form.setlist.some(t => !t.title.trim() || (t.duration && !/^\d+(:[0-5]\d)?$/.test(t.duration)))) {
        toast.error("Chaque morceau doit avoir un titre et une durée au format 3:30, si renseignée.");
        return;
    } setSaving(true); const next = { ...form, title: form.title.trim() }; const ok = await setProductions(prev => prev.some(p => p.id === form.id) ? prev.map(p => p.id === form.id ? next : p) : [...prev, next]); setSaving(false); if (ok) {
        setForm(next);
        setBaseline(JSON.stringify(next));
        setCreated(true);
        toast.success("Live enregistré");
        router.replace(`/live/spectacles/${form.id}`);
    } };
    const dates = tourDates.filter(d => d.details?.productionId === form.id || d.details?.tourId === form.id).sort((a, b) => dateISO(a.date).localeCompare(dateISO(b.date)));
    const used = dates.length + rehearsals.filter(r => r.details?.productionId === form.id).length + productions.filter(p => p.productionId === form.id).length;
    const remove = async () => { setSaving(true); if (await setProductions(prev => prev.filter(p => p.id !== form.id))) {
        setBaseline(JSON.stringify(form));
        router.push("/live/spectacles");
    } setSaving(false); };
    return <div>
    <LiveHeader title={form.title || `Nouveau ${form.kind === "dj" ? "DJ set" : form.kind === "tour" ? "projet de tournée" : "spectacle"}`} eyebrow={`LIVE / ${meta.label}`} back="/live/spectacles" actions={<><Button variant="outline" onClick={() => void exportLivePDF(`Fiche technique — ${form.title || "Live"}`, meta.label, technicalSections(form.technical))}><FileDown size={14} className="mr-2"/>Fiche technique PDF</Button><Button disabled={saving} onClick={() => void save()}>
        <Save size={14} className="mr-2"/>
        {saving ? "Enregistrement…" : "Enregistrer"}
        </Button></>}/>
        {error && <p role="alert" className="mb-4 text-sm text-rose-300">
        {error}
        </p>}
    <fieldset disabled={saving} className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
    <div className="space-y-5">
    <Panel title="Identité du live" icon={Mic2} color={meta.color}>
    <div className="space-y-4">
    <TextField label="Nom" value={form.title} onChange={title => patch({ title })} placeholder={form.kind === "dj" ? "Club session — autumn set" : "Le nom de ton spectacle"} required/>
    <TextField label={form.kind === "dj" ? "Ambiance & intention musicale" : "Concept & intention"} value={form.description} onChange={description => patch({ description })} area/>
    {form.kind === "tour" && <Choice label="Spectacle ou DJ set de la tournée" value={form.productionId} optional onChange={productionId => patch({ productionId })} options={productions.filter(p => p.kind !== "tour").map(p => ({ value: p.id, label: p.title }))}/>}
    </div>
    </Panel>
    {form.kind !== "tour" && <SetlistEditor value={form.setlist} onChange={setlist => patch({ setlist })} dj={form.kind === "dj"}/>}
    <EquipmentPicker listIds={form.equipmentListIds} onChange={equipmentListIds => patch({ equipmentListIds })}/>
    <TechnicalEditor value={form.technical} onChange={technical => patch({ technical })}/>
        {created && <Panel title="Dates associées" icon={Mic2} color="#38BDF8" action={<Button asChild size="xs" variant="secondary">
            <Link href={`/live/representations/nouvelle?${form.kind === "tour" ? "tourId" : "productionId"}=${form.id}`}><Plus size={12} className="mr-1"/>Ajouter une date</Link>
            </Button>}>
        <div className="space-y-2">
            {dates.map(d => <Link key={d.id} href={`/live/representations/${d.id}`} className="flex justify-between rounded-lg bg-[#101010]/40 p-3 text-sm hover:text-[#F0FF00]">
            <span>{d.venue} · {d.city}</span>
            <span className="text-xs text-[#F5F5F5]/50">
            {d.date}
            </span>
            </Link>)}
        {!dates.length && <p className="text-sm text-[#F5F5F5]/50">Aucune date associée pour l’instant.</p>}
        </div>
        </Panel>}
    </div>
    <aside className="space-y-4 xl:sticky xl:top-6">
    <Panel title="Préparation" icon={ClipboardCheck} color={meta.color}>
    <Preparation steps={productionSteps(form.kind)} value={form.preparation} onChange={preparation => patch({ preparation })} color={meta.color}/>
    </Panel>
        {created && form.kind !== "tour" && <Button asChild variant="secondary" className="w-full">
        <Link href={`/live/repetitions/nouvelle?productionId=${form.id}`}>Travailler cette setlist</Link>
        </Button>}
    <p className="px-1 text-xs text-[#F5F5F5]/45">
    {dirty ? "Modifications non enregistrées" : "Toutes les modifications sont enregistrées"}
    </p>
    {created && <Button variant="ghost" size="sm" className="text-rose-300" onClick={() => setDeleting(true)}><Trash2 size={13} className="mr-2"/>Supprimer</Button>}
    </aside>
    </fieldset>
    <Dialog open={deleting} onOpenChange={setDeleting}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Supprimer « {form.title} » ?</DialogTitle>
    <DialogDescription>
    {used ? "Ce live est encore utilisé. Détache-le des dates, répétitions ou tournées avant de le supprimer." : "La setlist et la fiche technique de ce live seront supprimées."}
    </DialogDescription>
    </DialogHeader>
    <DialogFooter>
    <Button variant="outline" onClick={() => setDeleting(false)}>Annuler</Button>
    <Button variant="destructive" disabled={!!used || saving} onClick={() => void remove()}>Supprimer</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    </div>;
}
