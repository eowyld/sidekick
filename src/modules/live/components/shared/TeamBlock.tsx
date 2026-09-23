"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { Check, Instagram, Mail, Pencil, Phone, Plus, Search, Trash2, UserPlus, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContactsData, type Contact } from "@/hooks/useContactsData";
import { cn } from "@/lib/utils";
import { PERSON_GROUPS, type PersonGroup, type SheetPerson } from "../../lib/live-model";
import { personName } from "../../lib/live-equipment";

/** Suggestions de rôle, propres à chaque groupe. Le champ reste libre. */
const ROLE_SUGGESTIONS: Record<PersonGroup, string[]> = {
    tech: ["Contact technique", "Régie générale", "Son façade", "Son retours", "Régie lumière", "Backline", "Roadie", "Vidéo"],
    artistic: ["Chant", "Chœurs", "Guitare", "Basse", "Batterie", "Claviers", "Machines", "DJ", "Danse"],
    organisation: ["Tour manager", "Booking", "Management", "Programmation", "Production", "Accueil artistes", "Presse"],
    other: [],
};

const norm = (v: string) => v.trim().toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const sameName = (p: Pick<SheetPerson, "firstName" | "lastName">, c: Contact) => norm(p.firstName) === norm(c.firstName) && norm(p.lastName) === norm(c.lastName);

type Fields = Pick<Contact, "firstName" | "lastName" | "role" | "email" | "phone" | "instagram" | "city" | "notes">;
const fieldsOf = (x: Partial<Fields>): Fields => ({ firstName: (x.firstName ?? "").trim(), lastName: (x.lastName ?? "").trim(), role: (x.role ?? "").trim(), email: (x.email ?? "").trim(), phone: (x.phone ?? "").trim(), instagram: (x.instagram ?? "").trim().replace(/^@+/, ""), city: (x.city ?? "").trim(), notes: (x.notes ?? "").trim() });
/** Ce que la fiche garde d'une personne : les champs non vides seulement. */
const toPerson = (base: Pick<SheetPerson, "id" | "group" | "contactId">, f: Fields): SheetPerson => {
    const { firstName, lastName, role, ...rest } = f;
    return { id: base.id, group: base.group, firstName, lastName, role, ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v)), ...(base.contactId ? { contactId: base.contactId } : {}) };
};

/** Champ libre avec suggestions maison : pas de `<datalist>`, dont la flèche native fait croire à un sélecteur. */
function RoleInput({ id, value, suggestions, onChange }: { id: string; value: string; suggestions: string[]; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const listId = useId();
    const q = norm(value);
    const shown = suggestions.filter(s => norm(s) !== q && norm(s).includes(q)).slice(0, 6);
    return <div className="relative">
    <Input id={id} role="combobox" aria-expanded={open && shown.length > 0} aria-controls={listId} placeholder="Son façade, chant, tour manager…" autoComplete="off" value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={e => { if (e.key === "Escape" && open) {
        e.stopPropagation();
        setOpen(false);
    } }}/>
        {open && shown.length > 0 && <div id={listId} role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-[#F5F5F5]/10 bg-[#171717] shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
            {shown.map(s => <button key={s} type="button" role="option" aria-selected={false} onMouseDown={e => e.preventDefault()} onClick={() => { onChange(s); setOpen(false); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-[#F5F5F5]/[.06]">{s}</button>)}
        </div>}
    </div>;
}

/** Même repère que le module Contacts : l'icône s'allume quand la coordonnée est renseignée. */
function Presence({ value, icon: Icon, empty }: { value: string; icon: LucideIcon; empty: string }) {
    return <span title={value || empty} aria-label={value || empty} className={cn("inline-flex h-6 w-6 items-center justify-center rounded transition-colors", value ? "text-[#F0FF00]/70" : "text-[#F5F5F5]/15")}>
    <Icon size={13}/>
    </span>;
}

/** Une personne de la fiche, en lecture : nom, rôle, coordonnées présentes, lien avec les contacts. */
function PersonRow({ person, linked, onEdit, onRemove, onSaveContact }: {
    person: Fields;
    linked: boolean;
    onEdit: () => void;
    onRemove: () => void;
    onSaveContact: () => void;
}) {
    const name = personName(person) || "Sans nom";
    return <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-[#101010]/40 px-3 py-2.5">
    <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
    <span className="block truncate text-sm font-medium hover:text-[#F0FF00]">{name}</span>
    <span className="block truncate text-xs text-[#F5F5F5]/45">{person.role || "Rôle à préciser"}</span>
    </button>
    <div className="flex items-center">
    <Presence value={person.email} icon={Mail} empty="Pas d’email"/>
    <Presence value={person.phone} icon={Phone} empty="Pas de téléphone"/>
    <Presence value={person.instagram ? `@${person.instagram}` : ""} icon={Instagram} empty="Pas d’Instagram"/>
    </div>
    <div className="w-40 text-xs">
        {linked ? <Link href="/contacts" className="inline-flex items-center gap-1.5 text-emerald-300/90 hover:underline"><Check size={12}/>Dans tes contacts</Link> : <button type="button" onClick={onSaveContact} className="inline-flex items-center gap-1.5 text-[#F5F5F5]/55 transition-colors hover:text-[#F0FF00]"><UserPlus size={12}/>Ajouter à mes contacts</button>}
    </div>
    <div className="flex gap-1">
    <Button type="button" variant="ghost" size="icon" aria-label={`Modifier ${name}`} onClick={onEdit}><Pencil size={14}/></Button>
    <Button type="button" variant="ghost" size="icon" aria-label={`Retirer ${name}`} onClick={onRemove}><Trash2 size={14}/></Button>
    </div>
    </div>;
}

/** Ajout dans un groupe : chercher un contact, ou taper un nom et le compléter. */
function PersonAdder({ label, contacts, linked, onPick, onCreate }: {
    label: string;
    contacts: Contact[];
    linked: Set<string>;
    onPick: (c: Contact) => void;
    onCreate: (firstName: string, lastName: string) => void;
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const listId = useId();
    const q = norm(query);
    const matches = q ? contacts.filter(c => !linked.has(c.id) && norm(`${c.firstName} ${c.lastName} ${c.lastName} ${c.firstName} ${c.role}`).includes(q)).slice(0, 6) : [];
    const done = () => {
        setQuery("");
        setOpen(false);
    };
    const pick = (c: Contact) => {
        onPick(c);
        done();
    };
    const create = () => {
        const [firstName = "", ...rest] = query.trim().split(/\s+/);
        onCreate(firstName, rest.join(" "));
        done();
    };
    return <div className="flex items-center gap-2">
    <div className="relative min-w-0 flex-1">
    <Search size={14} aria-hidden className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#F5F5F5]/40"/>
    <div className="[&_input]:pl-9">
    <Input role="combobox" aria-expanded={open && !!q} aria-controls={listId} aria-label={`Ajouter à ${label.toLocaleLowerCase("fr")}`} placeholder="Chercher un contact ou taper un nom" value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={e => {
        if (e.key === "Enter" && q) {
            e.preventDefault();
            if (matches[0])
                pick(matches[0]);
            else
                create();
        }
        if (e.key === "Escape")
            setOpen(false);
    }}/>
    </div>
        {open && q && <div id={listId} role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-[#F5F5F5]/10 bg-[#171717] shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
            {matches.map(c => <button key={c.id} type="button" role="option" aria-selected={false} onMouseDown={e => e.preventDefault()} onClick={() => pick(c)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-[#F5F5F5]/[.06]">
            <span className="truncate">{personName(c) || "Sans nom"}</span>
            {c.role && <span className="shrink-0 text-xs text-[#F5F5F5]/45">{c.role}</span>}
            </button>)}
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={create} className="flex w-full items-center gap-2 border-t border-[#F5F5F5]/[.06] px-3 py-2.5 text-left text-sm text-[#F5F5F5]/70 hover:bg-[#F5F5F5]/[.06] hover:text-[#F0FF00]">
        <Plus size={13}/>Ajouter « {query.trim()} »
        </button>
        </div>}
    </div>
    <Button type="button" size="icon" variant="secondary" aria-label={`Nouvelle personne dans ${label.toLocaleLowerCase("fr")}`} onClick={() => { if (q)
        create();
    else
        onCreate("", ""); }}><Plus size={14}/></Button>
    </div>;
}

type Editing = { base: Pick<SheetPerson, "id" | "group" | "contactId">; fields: Fields; isNew: boolean; addToContacts: boolean };

/** Tout le contact d'une personne. Reliée au module Contacts, l'enregistrement met à jour la fiche et le contact. */
function PersonDialog({ editing, onChange, onClose, onSave }: { editing: Editing | null; onChange: (v: Editing) => void; onClose: () => void; onSave: () => void }) {
    const id = useId();
    if (!editing)
        return <Dialog open={false}/>;
    const f = editing.fields;
    const set = (patch: Partial<Fields>) => onChange({ ...editing, fields: { ...f, ...patch } });
    const field = (key: "firstName" | "lastName" | "city" | "email" | "phone", label: string, placeholder: string, type = "text") => <div className="space-y-1.5">
    <Label htmlFor={`${id}-${key}`} className="text-xs text-[#F5F5F5]/65">{label}</Label>
    <Input id={`${id}-${key}`} type={type} placeholder={placeholder} value={f[key]} onChange={e => set({ [key]: e.target.value })}/>
    </div>;
    const linked = !!editing.base.contactId;
    return <Dialog open onOpenChange={open => !open && onClose()}>
    <DialogContent className="sm:max-w-lg sm:px-8">
    <DialogHeader>
    <DialogTitle>{editing.isNew ? "Nouvelle personne" : "Modifier le contact"}</DialogTitle>
    <DialogDescription>{linked ? "Dans tes contacts : les modifications y sont aussi enregistrées." : "Enregistrée sur cette fiche technique."}</DialogDescription>
    </DialogHeader>
    <form className="space-y-4" onSubmit={e => {
        e.preventDefault();
        onSave();
    }}>
    <div className="grid gap-4 sm:grid-cols-2">
    {field("firstName", "Prénom", "Prénom")}
    {field("lastName", "Nom", "Nom")}
    <div className="space-y-1.5 sm:col-span-2">
    <Label htmlFor={`${id}-role`} className="text-xs text-[#F5F5F5]/65">Rôle</Label>
    <RoleInput id={`${id}-role`} value={f.role} suggestions={ROLE_SUGGESTIONS[editing.base.group]} onChange={role => set({ role })}/>
    </div>
    {field("email", "Email", "contact@exemple.com", "email")}
    {field("phone", "Téléphone", "+33 6 00 00 00 00", "tel")}
    <div className="space-y-1.5">
    <Label htmlFor={`${id}-instagram`} className="text-xs text-[#F5F5F5]/65">Instagram</Label>
    <div className="relative">
    <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm text-[#F5F5F5]/40">@</span>
    <div className="[&_input]:pl-7">
    <Input id={`${id}-instagram`} placeholder="nom_utilisateur" value={f.instagram} onChange={e => set({ instagram: e.target.value.replace(/^@+/, "") })}/>
    </div>
    </div>
    </div>
    {field("city", "Ville", "Paris, Lyon…")}
    <div className="space-y-1.5 sm:col-span-2">
    <Label htmlFor={`${id}-notes`} className="text-xs text-[#F5F5F5]/65">Notes</Label>
    <Textarea id={`${id}-notes`} rows={3} placeholder="Infos importantes à garder en tête…" value={f.notes} onChange={e => set({ notes: e.target.value })}/>
    </div>
    </div>
    {!linked && <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#F5F5F5]/80">
    <Checkbox checked={editing.addToContacts} onCheckedChange={v => onChange({ ...editing, addToContacts: !!v })}/>
    Ajouter aussi à mes contacts
    </label>}
    <DialogFooter>
    <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
    <Button type="submit">Enregistrer</Button>
    </DialogFooter>
    </form>
    </DialogContent>
    </Dialog>;
}

/** Équipe et contacts de la fiche technique, par groupe : une ligne par personne, reliée ou non au module Contacts. */
export function TeamBlock({ people, onChange }: { people: SheetPerson[]; onChange: (v: SheetPerson[]) => void }) {
    const { contacts, setContacts } = useContactsData();
    const [editing, setEditing] = useState<Editing | null>(null);
    const linkedIds = new Set(people.map(p => p.contactId).filter((x): x is string => !!x));
    const contactOf = (p: Pick<SheetPerson, "contactId">) => p.contactId ? contacts.find(c => c.id === p.contactId) : undefined;
    /** Une personne reliée s'affiche avec les données à jour de son contact ; sinon, avec la copie de la fiche. Le rôle reste toujours celui de la fiche : importé du contact à la liaison, il s'édite ensuite indépendamment. */
    const shown = (p: SheetPerson): Fields => { const c = contactOf(p); return fieldsOf(c ? { ...c, role: p.role } : p); };

    /** Relie à un contact du même nom s'il existe (en complétant ses champs vides), sinon le crée. Renvoie son identifiant. */
    const linkContact = (f: Fields): string => {
        const existing = contacts.find(c => sameName(f, c));
        if (existing) {
            const merged = fieldsOf(Object.fromEntries(Object.entries(fieldsOf(existing)).map(([k, v]) => [k, v || f[k as keyof Fields]])));
            setContacts(prev => prev.map(c => c.id === existing.id ? { ...c, ...merged } : c));
            toast.success(`${personName(f)} était déjà dans tes contacts : la ligne y est reliée.`);
            return existing.id;
        }
        const id = crypto.randomUUID();
        setContacts(prev => [...prev, { id, ...f, createdAt: new Date().toISOString() }]);
        toast.success(`${personName(f)} rejoint tes contacts.`);
        return id;
    };
    const quickSave = (p: SheetPerson) => {
        const f = shown(p);
        const contactId = linkContact(f);
        onChange(people.map(x => x.id === p.id ? toPerson({ ...p, contactId }, f) : x));
    };
    const save = () => {
        if (!editing)
            return;
        const f = fieldsOf(editing.fields);
        if (!personName(f)) {
            toast.error("Renseigne au moins un prénom ou un nom.");
            return;
        }
        let contactId = editing.base.contactId;
        if (contactId && contactOf(editing.base))
            setContacts(prev => prev.map(c => c.id === contactId ? { ...c, ...f } : c));
        else if (editing.addToContacts)
            contactId = linkContact(f);
        const next = toPerson({ ...editing.base, contactId }, f);
        onChange(editing.isNew ? [...people, next] : people.map(x => x.id === next.id ? next : x));
        setEditing(null);
    };

    return <section className="space-y-3">
    <div>
    <p className="text-xs font-medium text-[#F5F5F5]/70">Équipe et contacts</p>
    <p className="mt-1 text-xs text-[#F5F5F5]/45">Une ligne par personne. Modifier une personne de tes contacts met aussi à jour le module Contacts.</p>
    </div>
        {PERSON_GROUPS.map(([group, label]) => {
            const rows = people.filter(p => p.group === group);
            return <div key={group} className="rounded-lg border border-[#F5F5F5]/[.08] bg-[#101010]/30 p-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[.14em] text-[#F5F5F5]/55">
            {label}
            {rows.length > 0 && <span className="ml-2 opacity-60">{rows.length}</span>}
            </h3>
            <div className="space-y-2">
                {rows.map(p => <PersonRow key={p.id} person={shown(p)} linked={!!contactOf(p)} onEdit={() => setEditing({ base: p, fields: shown(p), isNew: false, addToContacts: false })} onRemove={() => onChange(people.filter(x => x.id !== p.id))} onSaveContact={() => quickSave(p)}/>)}
            <PersonAdder label={label} contacts={contacts} linked={linkedIds} onPick={c => onChange([...people, toPerson({ id: crypto.randomUUID(), group, contactId: c.id }, fieldsOf(c))])} onCreate={(firstName, lastName) => setEditing({ base: { id: crypto.randomUUID(), group }, fields: fieldsOf({ firstName, lastName }), isNew: true, addToContacts: false })}/>
            </div>
            </div>;
        })}
    <PersonDialog editing={editing} onChange={setEditing} onClose={() => setEditing(null)} onSave={save}/>
    </section>;
}
