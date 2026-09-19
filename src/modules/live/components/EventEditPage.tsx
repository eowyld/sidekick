"use client";
import { isValidDateFr } from "@/lib/date-format";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ClipboardCheck, Clock3, FileDown, FileText, MapPin, Mic2, Plus, Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { useLiveData, type RehearsalItem, type TourDate } from "@/hooks/useLiveData";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useContactsData } from "@/hooks/useContactsData";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { createDefaultRepresentationTimetable, type TourStatus } from "../data/defaultRepresentations";
import { STATUS_META } from "../data/statusMeta";
import { DATE_STEPS, dateFR, dateISO, emptyTechnical, money, newProduction, type LiveDetails, type LiveProduction } from "../lib/live-model";
import { exportLivePDF, setlistSection, technicalSections, type DocumentSection } from "../lib/live-pdf";
import { Choice, LiveHeader, Panel, Preparation, Segments, TextField } from "./shared/LiveUI";
import { SetlistEditor } from "./shared/SetlistEditor";
import { TechnicalEditor } from "./shared/TechnicalEditor";
import { EquipmentPicker } from "./shared/EquipmentPicker";
import { LogisticsEditor } from "./shared/LogisticsEditor";
import { LiveIncomePanel } from "./shared/LiveIncomePanel";
type EventDraft = {
    id: string;
    title: string;
    city: string;
    date: string;
    address: string;
    organiser: string;
    time: string;
    note: string;
    status: TourStatus;
    details: LiveDetails;
    timetable: TourDate["timetable"];
    invoiceIds: string[];
    missionIds: string[];
    remunerations: RehearsalItem["remunerations"];
    equipments: RehearsalItem["equipments"];
};
export function EventEditPage({ id, rehearsal = false }: {
    id: string | null;
    rehearsal?: boolean;
}) {
    const live = useLiveData();
    const params = useSearchParams();
    const [newId] = useState(() => rehearsal ? crypto.randomUUID() : String(Date.now()));
    if (live.loading)
        return <PageLoader />;
    const source = rehearsal ? live.rehearsals.find(r => String(r.id) === id) : live.tourDates.find(d => String(d.id) === id);
    if ((id && !source) || (!id && live.error))
        return <PageError title={id ? "Événement introuvable" : "Impossible de charger Live"} description={live.error || "Cet événement a peut-être été supprimé."} onRetry={() => mutate("user_live")}/>;
    const tour = live.productions.find(p => p.id === params.get("tourId"));
    const show = live.productions.find(p => p.id === (params.get("productionId") || tour?.productionId));
    const initialDetails: LiveDetails = { productionId: show?.id, tourId: tour?.id, setlist: show?.setlist.map(t => ({ ...t })) ?? [], technical: show?.technical ?? emptyTechnical(), equipmentListIds: [...new Set([...(show?.equipmentListIds ?? []), ...(tour?.equipmentListIds ?? [])])] };
    const r = source as RehearsalItem | undefined;
    const d = source as TourDate | undefined;
    const prospect = live.prospection.find(p => p.id === params.get("prospectId"));
    if (prospect) initialDetails.contact = [prospect.contact, prospect.phone, prospect.email].filter(Boolean).join(" · ");
    const initial: EventDraft = { id: source ? String(source.id) : newId, title: source ? (rehearsal ? r?.label ?? "" : d?.venue ?? "") : prospect?.venueName ?? "", city: source?.city ?? prospect?.city ?? "", date: source?.date ?? "", address: source?.address ?? "", organiser: rehearsal ? "" : d?.organisateur ?? prospect?.contact ?? "", time: rehearsal ? r?.time ?? "18:00" : "", note: source?.note ?? "", status: rehearsal ? "Confirmée" : d?.status ?? "En option", details: source?.details ?? initialDetails, timetable: rehearsal ? [] : d?.timetable?.length ? d.timetable : createDefaultRepresentationTimetable(), invoiceIds: d?.invoiceIds ?? [], missionIds: d?.missionIds ?? [], remunerations: rehearsal ? r?.remunerations ?? [] : [], equipments: rehearsal ? r?.equipments ?? [] : [] };
    return <EventForm key={id ?? "new"} initial={initial} rehearsal={rehearsal} isNew={!id} projectId={params.get("projectId") ?? undefined} source={source}/>;
}
function EventForm({ initial, rehearsal, isNew, projectId, source }: {
    initial: EventDraft;
    rehearsal: boolean;
    isNew: boolean;
    projectId?: string;
    source?: TourDate | RehearsalItem;
}) {
    const router = useRouter();
    const live = useLiveData();
    const { projects, setProjects } = useProjectsData();
    const { contacts } = useContactsData();
    const [form, setForm] = useState(initial);
    const [baseline, setBaseline] = useState(JSON.stringify(initial));
    const [tab, setTab] = useState("essential");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [created, setCreated] = useState(!isNew);
    const [templateName, setTemplateName] = useState("");
    const [templateOpen, setTemplateOpen] = useState(false);
    const [templateKind, setTemplateKind] = useState<"show" | "dj">("show");
    const dirty = JSON.stringify(form) !== baseline;
    useUnsavedChangesGuard(dirty);
    const patch = (v: Partial<EventDraft>) => setForm(prev => ({ ...prev, ...v }));
    const details = (v: Partial<LiveDetails>) => setForm(prev => ({ ...prev, details: { ...prev.details, ...v } }));
    const base = rehearsal ? "/live/repetitions" : "/live/representations";
    const production = live.productions.find(p => p.id === form.details.productionId);
    const linkedProjects = projects.filter(p => p.id === projectId || (rehearsal ? p.linkedRehearsals.includes(form.id) : p.linkedTourDates.includes(form.id)) || p.id === production?.projectId || p.id === live.productions.find(t => t.id === form.details.tourId)?.projectId);
    const applyShow = (id: string) => { const p = live.productions.find(x => x.id === id); if (id && form.details.setlist?.length && id !== form.details.productionId && !window.confirm("Remplacer la setlist de cet événement par celle du spectacle ?"))
        return; details({ productionId: id || undefined, ...(p ? { setlist: p.setlist.map(t => ({ ...t })), technical: { ...p.technical }, equipmentListIds: [...new Set([...(form.details.equipmentListIds ?? []), ...p.equipmentListIds])] } : {}) }); };
    const applyTour = (id: string) => {
        const tour = live.productions.find(p => p.id === id);
        const show = !form.details.productionId ? live.productions.find(p => p.id === tour?.productionId) : undefined;
        details({
            tourId: id || undefined,
            ...(show ? { productionId: show.id, setlist: show.setlist.map(t => ({ ...t })), technical: { ...show.technical } } : {}),
            equipmentListIds: [...new Set([...(form.details.equipmentListIds ?? []), ...(tour?.equipmentListIds ?? []), ...(show?.equipmentListIds ?? [])])],
        });
    };
    const save = async () => {
        if (!form.title.trim() || !isValidDateFr(dateFR(form.date))) {
            toast.error(rehearsal ? "Renseigne le nom et la date de la répétition." : "Renseigne le lieu et la date de la représentation.");
            setTab("essential");
            return;
        }
        if ((form.details.setlist ?? []).some(t => !t.title.trim() || (t.duration && !/^\d+(:[0-5]\d)?$/.test(t.duration)))) {
            toast.error("Vérifie les titres et les durées de la setlist (format 3:30).");
            setTab("setlist");
            return;
        }
        if ([...(form.details.transports ?? []), ...(form.details.lodgings ?? [])].some(e => money(e.amount) < 0)) {
            toast.error("Les montants ne peuvent pas être négatifs.");
            return;
        }
        setSaving(true);
        let ok = false;
        if (rehearsal) {
            const next: RehearsalItem = { ...(source as RehearsalItem), id: form.id, label: form.title.trim(), date: dateFR(form.date), time: form.time, location: form.details.location ?? (source as RehearsalItem)?.location ?? "", city: form.city, address: form.address, note: form.note, details: form.details, remunerations: form.remunerations, equipments: form.equipments };
            ok = await live.setRehearsals(prev => prev.some(r => String(r.id) === form.id) ? prev.map(r => String(r.id) === form.id ? next : r) : [...prev, next]);
        }
        else {
            const next: TourDate = { ...(source as TourDate), id: (source as TourDate)?.id ?? Number(form.id), venue: form.title.trim(), date: dateFR(form.date), city: form.city, address: form.address, organisateur: form.organiser, note: form.note, status: form.status, details: form.details, timetable: form.timetable, invoiceIds: form.invoiceIds, missionIds: form.missionIds, transport: !!form.details.transports?.length, lodging: !!form.details.lodgings?.length, remuneration: !!(form.invoiceIds.length + form.missionIds.length), equipment: !!form.details.equipmentListIds?.length };
            ok = await live.setTourDates(prev => prev.some(d => String(d.id) === form.id) ? prev.map(d => String(d.id) === form.id ? next : d) : [...prev, next]);
        }
        setSaving(false);
        if (ok) {
            if (projectId)
                setProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, ...(rehearsal ? { linkedRehearsals: [...new Set([...p.linkedRehearsals, form.id])] } : { linkedTourDates: [...new Set([...p.linkedTourDates, form.id])] }) }));
            setBaseline(JSON.stringify(form));
            setCreated(true);
            toast.success(rehearsal ? "Répétition enregistrée" : "Date enregistrée");
            router.replace(`${base}/${form.id}`);
        }
    };
    const roadmap = () => { const sections: DocumentSection[] = [{ title: "Lieu & contact", lines: [form.title, [form.address, form.city].filter(Boolean).join(", "), form.organiser, form.details.contact ?? ""] }, { title: "Horaires", lines: rehearsal ? [`${form.time} — ${form.details.endTime ?? ""}`] : form.timetable.map(t => `${t.time}  ${t.activity}`) }, { title: "Transport", lines: (form.details.transports ?? []).map(t => `${t.type} — ${t.details}`) }, { title: "Logement", lines: (form.details.lodgings ?? []).map(t => `${t.type} — ${t.details}`) }, { title: "Matériel", lines: live.equipmentInventory.filter(i => live.equipmentLists.filter(l => form.details.equipmentListIds?.includes(l.id)).some(l => l.itemIds.includes(i.id))).map(i => `${form.details.equipmentChecked?.[i.id] ? "[OK]" : "[  ]"} ${i.quantity} × ${i.name}`) }, setlistSection(form.details.setlist ?? []), { title: "Notes", lines: [form.note] }]; void exportLivePDF(`Feuille de route — ${form.title}`, `${dateFR(form.date)} · ${form.city}`, sections); };
    const publishSetlist = async () => { if (!templateName.trim()) {
        toast.error("Donne un nom au spectacle.");
        return;
    } const p: LiveProduction = { ...newProduction(production?.kind === "dj" ? "dj" : templateKind), title: templateName.trim(), setlist: (form.details.setlist ?? []).map(t => ({ ...t })), technical: form.details.technical ?? emptyTechnical(), equipmentListIds: form.details.equipmentListIds ?? [] }; setSaving(true); if (await live.setProductions(prev => [...prev, p])) {
        details({ productionId: p.id });
        setTemplateOpen(false);
        toast.success("Spectacle créé. Enregistre l’événement pour conserver son association.");
    } setSaving(false); };
    const remove = async () => { setSaving(true); const ok = rehearsal ? await live.setRehearsals(prev => prev.filter(r => String(r.id) !== form.id)) : await live.setTourDates(prev => prev.filter(d => String(d.id) !== form.id)); if (ok) {
        setProjects(prev => prev.map(p => ({ ...p, linkedTourDates: rehearsal ? p.linkedTourDates : p.linkedTourDates.filter(id => id !== form.id), linkedRehearsals: rehearsal ? p.linkedRehearsals.filter(id => id !== form.id) : p.linkedRehearsals })));
        setBaseline(JSON.stringify(form));
        router.push(base);
    } setSaving(false); };
    return <div>
    <LiveHeader title={form.title || (rehearsal ? "Nouvelle répétition" : "Nouvelle représentation")} eyebrow={rehearsal ? "LIVE / RÉPÉTITIONS" : "LIVE / REPRÉSENTATIONS"} back={base} description={[dateFR(form.date), form.city, production?.title].filter(Boolean).join(" · ")} actions={<><Button variant="outline" onClick={roadmap}><FileDown size={14} className="mr-2"/>Feuille de route</Button><Button disabled={saving} onClick={() => void save()}>
        <Save size={14} className="mr-2"/>
        {saving ? "Enregistrement…" : "Enregistrer"}
        </Button></>}/>
        {live.error && <p role="alert" className="mb-4 text-sm text-rose-300">
        {live.error}
        </p>}
    <div className="mb-5">
    <Segments value={tab} onChange={setTab} items={[{ id: "essential", label: rehearsal ? "La séance" : "La date" }, { id: "setlist", label: "Setlist", count: form.details.setlist?.length ?? 0 }, ...(!rehearsal ? [{ id: "logistics", label: "Logistique" }, { id: "income", label: "Rémunération" }] : []), { id: "technical", label: "Fiche technique" }]}/>
    </div>
    <fieldset disabled={saving} className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
    <div className="space-y-5">
        {tab === "essential" && <><Panel title={rehearsal ? "Organiser la répétition" : "Informations de la date"} icon={rehearsal ? Mic2 : CalendarDays} color={rehearsal ? "#38BDF8" : "#F0FF00"}>
        <div className="grid gap-4 md:grid-cols-2">
        <TextField label={rehearsal ? "Nom de la répétition" : "Lieu / salle"} value={form.title} onChange={title => patch({ title })} required/>
        <div className="space-y-2">
        <Label htmlFor="live-event-date" className="text-xs text-[#F5F5F5]/65">Date *</Label>
        <DatePicker id="live-event-date" value={dateISO(form.date)} onChange={date => patch({ date: dateFR(date) })}/>
        </div>
        {rehearsal ? <><TextField label="Début" type="time" value={form.time} onChange={time => patch({ time })}/><TextField label="Fin" type="time" value={form.details.endTime ?? ""} onChange={endTime => details({ endTime })}/><TextField label="Lieu de répétition" value={form.details.location ?? (source as RehearsalItem)?.location ?? ""} onChange={location => details({ location })}/></> : <><Choice label="Statut commercial" value={form.status} onChange={status => patch({ status: status as TourStatus })} options={Object.keys(STATUS_META).map(value => ({ value, label: value }))}/><TextField label="Organisateur" value={form.organiser} onChange={organiser => patch({ organiser })}/></>}
        <TextField label="Ville" value={form.city} onChange={city => patch({ city })}/>
        <div className="md:col-span-2">
        <TextField label="Adresse" value={form.address} onChange={address => patch({ address })}/>
        </div>
        <Choice label="Spectacle / DJ set" value={form.details.productionId} optional onChange={applyShow} options={live.productions.filter(p => p.kind !== "tour").map(p => ({ value: p.id, label: p.title }))}/>
        {!rehearsal && <Choice label="Tournée" value={form.details.tourId} optional onChange={applyTour} options={live.productions.filter(p => p.kind === "tour").map(p => ({ value: p.id, label: p.title }))}/>}
        </div>
        </Panel>{!rehearsal && <Panel title="Déroulé de la journée" icon={Clock3} color="#38BDF8" action={<Button size="xs" variant="secondary" onClick={() => { const t = [...form.timetable]; t.splice(Math.max(0, t.length - 1), 0, { time: "", activity: "", kind: "step" }); patch({ timetable: t }); }}><Plus size={12} className="mr-1"/>Étape</Button>}>
            <div className="space-y-3">
                {form.timetable.map((t, i) => <div key={i} className="flex items-end gap-3">
                <div className="w-32">
                <TextField label={i === 0 ? "Début du concert" : i === form.timetable.length - 1 ? "Fin du concert" : "Horaire"} type="time" value={t.time} onChange={time => patch({ timetable: form.timetable.map((v, j) => j === i ? { ...v, time } : v) })}/>
                </div>
                <div className="flex-1">
                <TextField label="Étape" value={t.activity} onChange={activity => patch({ timetable: form.timetable.map((v, j) => j === i ? { ...v, activity } : v) })}/>
                </div>
                    {i > 0 && i < form.timetable.length - 1 && <Button size="icon" variant="ghost" aria-label={`Supprimer l’étape ${i + 1}`} onClick={() => patch({ timetable: form.timetable.filter((_, j) => j !== i) })}>
                    <Trash2 size={13}/>
                    </Button>}
                </div>)}
            </div>
            </Panel>}<Panel title={rehearsal ? "Équipe & objectifs" : "Contacts & notes"} icon={Users} color="#A78BFA">
        <div className="space-y-4">
        <Choice label="Reprendre un contact" value="" onChange={id => { const c = contacts.find(c => c.id === id); if (c)
            details({ contact: [form.details.contact, `${c.firstName} ${c.lastName} · ${c.phone} · ${c.email}`].filter(Boolean).join("\n") }); }} options={contacts.map(c => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))}/>
        <TextField label={rehearsal ? "Participants & contacts" : "Contacts sur place"} area value={form.details.contact ?? ""} onChange={contact => details({ contact })}/>
        {rehearsal && <><TextField label="Objectifs de la séance" area value={form.details.goals ?? ""} onChange={goals => details({ goals })} placeholder="Transitions à travailler, morceaux à reprendre…"/><TextField label="Compte rendu" area value={form.details.report ?? ""} onChange={report => details({ report })}/></>}
        <TextField label="Notes" area value={form.note} onChange={note => patch({ note })}/>
        </div>
        </Panel>{rehearsal && <><EquipmentPicker listIds={form.details.equipmentListIds ?? []} onChange={equipmentListIds => details({ equipmentListIds })} checked={form.details.equipmentChecked ?? {}} onCheck={equipmentChecked => details({ equipmentChecked })}/><Panel title="Rémunérations de la séance" icon={Users} color="#34D399" action={<Button size="xs" variant="secondary" onClick={() => patch({ remunerations: [...form.remunerations, { id: Date.now(), label: "", amount: "" }] })}>Ajouter</Button>}>
            <div className="space-y-3">
                {form.remunerations.map(r => <div key={r.id} className="flex items-end gap-2">
                <div className="flex-1">
                <TextField label="Bénéficiaire / libellé" value={r.label} onChange={label => patch({ remunerations: form.remunerations.map(x => x.id === r.id ? { ...x, label } : x) })}/>
                </div>
                <div className="w-32">
                <TextField label="Montant (€)" type="number" min="0" value={r.amount ?? ""} onChange={amount => patch({ remunerations: form.remunerations.map(x => x.id === r.id ? { ...x, amount } : x) })}/>
                </div>
                <Button variant="ghost" size="icon" aria-label="Supprimer cette rémunération" onClick={() => patch({ remunerations: form.remunerations.filter(x => x.id !== r.id) })}>
                <Trash2 size={13}/>
                </Button>
                </div>)}
            {!form.remunerations.length && <p className="text-sm text-[#F5F5F5]/50">Ajoute les rémunérations prévues pour cette séance.</p>}
            </div>
            </Panel>{form.equipments.length > 0 && <Panel title="Matériel complémentaire" icon={Mic2}>
                <div className="space-y-2">
                {form.equipments.map(e => <TextField key={e.id} label="Matériel" value={e.label} onChange={label => patch({ equipments: form.equipments.map(x => x.id === e.id ? { ...x, label } : x) })}/>)}
                </div>
                </Panel>}</>}</>}
        {tab === "setlist" && <><div className="flex items-center justify-between gap-4 rounded-lg border border-[#F5F5F5]/10 p-4">
        <p className="text-xs text-[#F5F5F5]/55">Cette setlist appartient à {rehearsal ? "la répétition" : "la date"}. Tes adaptations ne modifient pas le spectacle.</p>
        <Button variant="secondary" size="sm" onClick={() => setTemplateOpen(true)}>Créer un spectacle à partir de cette setlist</Button>
        </div><SetlistEditor value={form.details.setlist ?? []} onChange={setlist => details({ setlist })} dj={production?.kind === "dj"}/></>}
        {tab === "logistics" && <><LogisticsEditor value={form.details.transports ?? []} onChange={transports => details({ transports })}/><LogisticsEditor lodging value={form.details.lodgings ?? []} onChange={lodgings => details({ lodgings })}/><EquipmentPicker listIds={form.details.equipmentListIds ?? []} onChange={equipmentListIds => details({ equipmentListIds })} checked={form.details.equipmentChecked ?? {}} onCheck={equipmentChecked => details({ equipmentChecked })}/><Panel title="Documents & références" icon={FileText} action={<Button size="xs" variant="secondary" onClick={() => details({ documents: [...(form.details.documents ?? []), { id: Date.now(), type: "other", note: "" }] })}>Ajouter</Button>}>
        <div className="space-y-3">
            {(form.details.documents ?? []).map(d => <div key={d.id} className="flex items-end gap-2">
            <div className="flex-1">
            <TextField label={d.type === "contract" ? "Référence de contrat" : d.type === "tech" ? "Document technique" : "Document / lien"} value={d.note} area onChange={note => details({ documents: form.details.documents?.map(x => x.id === d.id ? { ...x, note } : x) })}/>
            </div>
            <Button variant="ghost" size="icon" aria-label="Supprimer la référence" onClick={() => details({ documents: form.details.documents?.filter(x => x.id !== d.id) })}>
            <Trash2 size={13}/>
            </Button>
            </div>)}
        </div>
        </Panel><Button variant="outline" onClick={() => void exportLivePDF(`Note de frais — ${form.title}`, dateFR(form.date), [{ title: "Frais à rembourser", lines: [...(form.details.transports ?? []), ...(form.details.lodgings ?? [])].filter(e => e.paymentMode === "reimburse").map(e => `${e.type} · ${e.details} · ${e.amount} €`) }, { title: "Total", lines: [`${[...(form.details.transports ?? []), ...(form.details.lodgings ?? [])].filter(e => e.paymentMode === "reimburse").reduce((n, e) => n + money(e.amount), 0).toLocaleString("fr-FR")} €`] }])}>Exporter la note de frais</Button></>}
        {tab === "income" && <><LiveIncomePanel dateId={form.id} invoiceIds={form.invoiceIds} missionIds={form.missionIds} onChange={(invoiceIds, missionIds) => patch({ invoiceIds, missionIds })} title={form.title} date={form.date} organiser={form.organiser} projectId={linkedProjects[0]?.id}/><Panel title="Budget projet" icon={FileText}>
        <p className="mb-3 text-xs text-[#F5F5F5]/50">Les frais à ta charge et les rémunérations de cette date alimentent le budget des projets qui l’associent.</p>
            {linkedProjects.map(p => <Button key={p.id} asChild variant="outline" size="sm">
            <Link href={`/projects/${p.id}?tab=budget`}>
            {p.title}
            </Link>
            </Button>)}
        {!linkedProjects.length && <p className="text-sm text-[#F5F5F5]/50">Cette date est indépendante. Tu peux l’associer depuis un projet.</p>}
        </Panel></>}
        {tab === "technical" && <><div className="flex justify-end">
        <Button variant="outline" onClick={() => void exportLivePDF(`Fiche technique — ${form.title}`, `${dateFR(form.date)} · ${form.city}`, technicalSections(form.details.technical ?? emptyTechnical()))}><FileDown size={14} className="mr-2"/>Exporter en PDF</Button>
        </div><TechnicalEditor value={form.details.technical ?? emptyTechnical()} onChange={technical => details({ technical })}/></>}
    </div>
    <aside className="space-y-4 xl:sticky xl:top-6">
        {!rehearsal && <Panel title="Préparation de la date" icon={ClipboardCheck}>
        <Preparation steps={DATE_STEPS} value={form.details.preparation ?? {}} onChange={preparation => details({ preparation })}/>
        </Panel>}
    <Panel title="En un coup d’œil" icon={MapPin} color="#38BDF8">
    <div className="space-y-3 text-xs text-[#F5F5F5]/60">
    <p>
    {dateFR(form.date) || "Date à choisir"}
    </p>
    <p>
    {form.city || "Ville à préciser"}
    </p>
        {production && <Link href={`/live/spectacles/${production.id}`} className="block text-[#F0FF00] hover:underline">
        {production.title}
        </Link>}
    {form.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${form.address} ${form.city}`)}`} target="_blank" rel="noopener noreferrer" className="block hover:text-[#F0FF00]">Ouvrir l’itinéraire ↗</a>}
    <p>
    {dirty ? "Modifications non enregistrées" : "Toutes les modifications sont enregistrées"}
    </p>
    </div>
    </Panel>
    {created && <Button variant="ghost" size="sm" className="text-rose-300" onClick={() => setDeleting(true)}><Trash2 size={13} className="mr-2"/>Supprimer {rehearsal ? "la répétition" : "la date"}</Button>}
    </aside>
    </fieldset>
    <Dialog open={deleting} onOpenChange={setDeleting}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Supprimer cet événement ?</DialogTitle>
    <DialogDescription>La préparation de cet événement sera supprimée. Les spectacles, factures et cachets associés seront conservés.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
    <Button variant="outline" onClick={() => setDeleting(false)}>Annuler</Button>
    <Button variant="destructive" disabled={saving} onClick={() => void remove()}>Supprimer</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Conserver cette setlist dans un spectacle</DialogTitle>
    <DialogDescription>Tu pourras la réutiliser pour d’autres dates et répétitions.</DialogDescription>
    </DialogHeader>
    <Choice label="Type de live" value={templateKind} onChange={value => setTemplateKind(value as "show" | "dj")} options={[{ value: "show", label: "Spectacle / concert" }, { value: "dj", label: "DJ set" }]}/>
    <TextField label="Nom du spectacle / DJ set" value={templateName} onChange={setTemplateName}/>
    <DialogFooter>
    <Button variant="outline" onClick={() => setTemplateOpen(false)}>Annuler</Button>
    <Button disabled={saving} onClick={() => void publishSetlist()}>Créer le spectacle</Button>
    </DialogFooter>
    </DialogContent>
    </Dialog>
    </div>;
}
