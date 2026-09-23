"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ClipboardCheck, FileDown, Mic2, Palette, Plus, Route, Save, Trash2 } from "lucide-react";
import { personalizationHref } from "@/modules/settings/components/PersonalizationPage";
import { toast } from "sonner";
import { mutate } from "swr";
import { useLiveData } from "@/hooks/useLiveData";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { KIND_META, newProduction, todayISO, type LiveKind, type LiveProduction } from "../lib/live-model";
import { byDate, looseDatesOf, showsOf, toursOf } from "../lib/live-links";
import { productionProgress, withStep, type ProgressContext } from "../lib/live-progress";
import { LiveHeader, Panel, TextField, Choice } from "./shared/LiveUI";
import { ComputedPreparation } from "./shared/ComputedPreparation";
import { SetlistEditor } from "./shared/SetlistEditor";
import { TechnicalEditor } from "./shared/TechnicalEditor";
import { useTechnicalPdf } from "./shared/useTechnicalPdf";
import { TourRow } from "./spectacles/TourRow";
import { EventLine, TourSections } from "./spectacles/TourSections";
import { RehearsalsPanel } from "./spectacles/RehearsalsPanel";
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
    // Même précaution que sur la fiche événement : distinguer « pas chargé » de
    // « supprimé », sinon la panne d'une table se lit comme une disparition.
    // Le garde de suppression compte dates, répétitions et lieux démarchés : une
    // tranche en panne se lirait « aucun usage » et laisserait supprimer un live
    // encore rattaché.
    const loadError = data.sliceError("productions", "tourDates", "rehearsals", "prospection");
    if (loadError)
        return <PageError title="Impossible de charger Live" description={loadError} onRetry={() => mutate("user_live")}/>;
    if (id && !existing)
        return <PageError title="Spectacle introuvable" description="Ce spectacle a peut-être été supprimé." onRetry={() => mutate("user_live")}/>;
    const project = projects.find(p => p.id === query.get("projectId"));
    const rawKind = query.get("kind");
    const kind: LiveKind = rawKind === "dj" || rawKind === "tour" ? rawKind : "show";
    // Une tournée se monte depuis un spectacle : il arrive pré-rempli.
    const parent = kind === "tour" ? data.productions.find(p => p.id === query.get("productionId") && p.kind !== "tour") : undefined;
    const initial = existing ?? { ...blank, kind, title: project?.title ?? "", description: project?.description ?? "", projectId: project?.id, productionId: parent?.id, preparation: project ? { concept: project.manualMilestones.liveConceptDone ? "done" as const : "todo" as const, setlist: project.manualMilestones.liveSetlistDone ? "done" as const : "todo" as const, team: project.manualMilestones.liveTeamDone ? "done" as const : "todo" as const } : {} };
    return <ProductionForm key={id ?? "new"} initial={initial} isNew={!id}/>;
}
function ProductionForm({ initial, isNew }: {
    initial: LiveProduction;
    isNew: boolean;
}) {
    const router = useRouter();
    const { productions, setProductions, tourDates, rehearsals, prospection, error } = useLiveData();
    const technicalPdf = useTechnicalPdf();
    const [form, setForm] = useState(initial);
    const [baseline, setBaseline] = useState(JSON.stringify(initial));
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [created, setCreated] = useState(!isNew);
    const dirty = JSON.stringify(form) !== baseline;
    const leaveDialog = useUnsavedChangesGuard(dirty, { onSave: () => save(false) });
    const canSave = !saving && (dirty || !created);
    const patch = (value: Partial<LiveProduction>) => setForm(prev => ({ ...prev, ...value }));
    const meta = KIND_META[form.kind];
    const downloadTechnical = () => void technicalPdf({ title: form.title || "Live", meta: [{ label: "Format", value: meta.label }], setlist: form.setlist, sheet: form.technical, listIds: form.equipmentListIds });
    const isTour = form.kind === "tour";
    const show = isTour ? productions.find(p => p.id === form.productionId && p.kind !== "tour") : undefined;
    const ctx: ProgressContext = { tourDates, rehearsals, prospection, today: todayISO() };
    const summary = productionProgress(form, ctx);
    /** `stay = false` : enregistrer avant de quitter la page, sans y revenir. */
    const save = async (stay = true): Promise<boolean> => { if (!form.title.trim()) {
        toast.error("Donne un nom à ton live.");
        return false;
    } if (isTour && !form.productionId) {
        toast.error("Choisis le spectacle ou le DJ set que cette tournée emmène.");
        return false;
    } if (form.setlist.some(t => !t.title.trim() || (t.duration && !/^\d+(:[0-5]\d)?$/.test(t.duration)))) {
        toast.error("Chaque morceau doit avoir un titre et une durée au format 3:30, si renseignée.");
        return false;
    } setSaving(true); const next = { ...form, title: form.title.trim() }; const ok = await setProductions(prev => prev.some(p => p.id === form.id) ? prev.map(p => p.id === form.id ? next : p) : [...prev, next]); setSaving(false); if (ok) {
        setForm(next);
        setBaseline(JSON.stringify(next));
        setCreated(true);
        toast.success(isTour ? "Tournée enregistrée" : "Live enregistré");
        if (stay)
            router.replace(`/live/spectacles/${form.id}`);
    } return ok; };
    const linked = (d: { details?: { productionId?: string; tourId?: string } }) => d.details?.productionId === form.id || d.details?.tourId === form.id;
    const used = tourDates.filter(linked).length + rehearsals.filter(linked).length + productions.filter(p => p.productionId === form.id).length + prospection.filter(p => p.tourId === form.id).length;
    const remove = async () => { setSaving(true); if (await setProductions(prev => prev.filter(p => p.id !== form.id))) {
        setBaseline(JSON.stringify(form));
        router.push("/live");
    } setSaving(false); };
    const saveButton = <Button disabled={!canSave} onClick={() => void save()}>
        <Save size={14} className="mr-2"/>
        {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>;
    const tours = toursOf(form.id, productions);
    const loose = byDate(looseDatesOf(form.id, tourDates));
    return <div>
    <LiveHeader title={form.title || (form.kind === "dj" ? "Nouveau DJ set" : isTour ? "Nouvelle tournée" : "Nouveau spectacle")} eyebrow={`LIVE / ${meta.label}`} back="/live" description={isTour && show ? `Tournée de « ${show.title} »` : undefined} actions={<><Button variant="outline" asChild><Link href={personalizationHref("fiche-technique")}><Palette size={14} className="mr-2"/>Personnaliser</Link></Button><Button variant="outline" onClick={downloadTechnical}><FileDown size={14} className="mr-2"/>Fiche technique PDF</Button>{canSave || saving ? saveButton : <TooltipProvider delayDuration={150}><Tooltip>
        {/* Un bouton désactivé ne reçoit pas le survol : l'infobulle s'accroche à l'enveloppe. */}
        <TooltipTrigger asChild><span tabIndex={0}>{saveButton}</span></TooltipTrigger>
        <TooltipContent>Toutes les modifications sont enregistrées</TooltipContent>
        </Tooltip></TooltipProvider>}</>}/>
        {error && <p role="alert" className="mb-4 text-sm text-rose-300">
        {error}
        </p>}
    <fieldset disabled={saving} className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
    <div className="space-y-5">
    <Panel title={isTour ? "La tournée" : "Identité du live"} icon={isTour ? Route : Mic2} color={meta.color}>
    <div className="space-y-4">
    <TextField label="Nom" value={form.title} onChange={title => patch({ title })} placeholder={form.kind === "dj" ? "Club session, autumn set" : isTour ? "Tournée d’automne 2026" : "Le nom de ton spectacle"} required/>
    {isTour && (created && show
        ? <div className="space-y-2">
        <p className="text-xs text-[#F5F5F5]/65">Spectacle ou DJ set de la tournée</p>
        <Link href={`/live/spectacles/${show.id}`} className="text-sm text-[#F0FF00] hover:underline">{show.title}</Link>
        </div>
        : <Choice label="Spectacle ou DJ set de la tournée *" value={form.productionId} placeholder="Choisir le live à emmener" onChange={productionId => patch({ productionId: productionId || undefined })} options={showsOf(productions).map(p => ({ value: p.id, label: p.title }))}/>)}
    <TextField label={form.kind === "dj" ? "Ambiance & intention musicale" : isTour ? "Intention de la tournée" : "Concept & intention"} value={form.description} onChange={description => patch({ description })} area/>
    </div>
    </Panel>
    {isTour && created && <TourSections tour={form} ctx={ctx}/>}
    {!isTour && <SetlistEditor value={form.setlist} onChange={setlist => patch({ setlist })} dj={form.kind === "dj"}/>}
    <TechnicalEditor value={form.technical} listIds={form.equipmentListIds} excludeId={form.id} onChange={({ technical, listIds }) => patch({ technical, equipmentListIds: listIds })} onDownload={downloadTechnical}/>
        {created && !isTour && <RehearsalsPanel owner={form}/>}
        {created && !isTour && <><Panel title="Tournées" icon={Route} color="#38BDF8" action={<Button asChild size="xs" variant="secondary">
            <Link href={`/live/spectacles/nouveau?kind=tour&productionId=${form.id}`}><Plus size={12} className="mr-1"/>Monter une tournée</Link>
            </Button>}>
        <div className="space-y-2">
            {tours.map(t => <TourRow key={t.id} tour={t} ctx={ctx}/>)}
            {!tours.length && <p className="text-sm text-[#F5F5F5]/50">Pas encore de tournée. Monte-en une quand ce live est prêt à prendre la route.</p>}
        </div>
        </Panel><Panel title="Dates hors tournée" icon={CalendarDays} action={<Button asChild size="xs" variant="secondary">
            <Link href={`/live/representations/nouvelle?productionId=${form.id}`}><Plus size={12} className="mr-1"/>Ajouter une date</Link>
            </Button>}>
        <div className="space-y-2">
            {loose.map(d => <EventLine key={d.id} href={`/live/representations/${d.id}`} title={[d.venue || "Lieu à préciser", d.city].filter(Boolean).join(" · ")} date={d.date}/>)}
            {!loose.length && <p className="text-sm text-[#F5F5F5]/50">Aucune date isolée pour l’instant.</p>}
        </div>
        </Panel></>}
    </div>
    <aside className="space-y-4 xl:sticky xl:top-6">
    <Panel title="Préparation" icon={ClipboardCheck} color={meta.color}>
    <ComputedPreparation summary={summary} color={meta.color} onChange={(stepId, state) => patch({ preparation: withStep(form.preparation, stepId, state) })}/>
    </Panel>
    <Button className="w-full" disabled={!canSave} onClick={() => void save()}><Save size={14} className="mr-2"/>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
    <p className="px-1 text-xs text-[#F5F5F5]/45">
    {dirty ? "Modifications non enregistrées" : "Toutes les modifications sont enregistrées"}
    </p>
    {created && <Button variant="ghost" size="sm" className="text-rose-300" onClick={() => setDeleting(true)}><Trash2 size={13} className="mr-2"/>Supprimer</Button>}
    </aside>
    </fieldset>
    {leaveDialog}
    <Dialog open={deleting} onOpenChange={setDeleting}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Supprimer « {form.title} » ?</DialogTitle>
    <DialogDescription>
    {used ? `${isTour ? "Cette tournée" : "Ce live"} est encore utilisé. Détache-le des dates, répétitions, tournées ou lieux démarchés avant de le supprimer.` : "La setlist et la fiche technique seront supprimées."}
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
