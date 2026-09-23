export type LiveKind = "show" | "dj" | "tour";
export type PreparationState = "todo" | "done" | "na";
export type SetlistTrack = {
    id: string;
    title: string;
    artist: string;
    duration: string;
    note: string;
    trackId?: string;
};
export type EquipmentCategory = "sound" | "light" | "stage" | "other";
/** L'ordre est celui de l'affichage, et de tri partout où du matériel est listé. */
export const EQUIPMENT_CATEGORIES: readonly (readonly [
    EquipmentCategory,
    string
])[] = [["sound", "Son"], ["light", "Lumière"], ["stage", "Scène et implantation"], ["other", "Autre matériel"]];
/** Un élément de matériel dans une fiche technique. `itemId` renvoie à l'inventaire quand l'ajout en vient ; nom, quantité et catégorie sont des copies faites à l'ajout. */
export type SheetItem = {
    id: string;
    name: string;
    quantity: number;
    category: EquipmentCategory;
    itemId?: string;
};
export type PersonGroup = "tech" | "artistic" | "organisation" | "other";
/** L'ordre est celui de l'affichage, dans la fiche comme dans le PDF. */
export const PERSON_GROUPS: readonly (readonly [
    PersonGroup,
    string
])[] = [["tech", "Équipe technique"], ["artistic", "Équipe artistique"], ["organisation", "Organisation"], ["other", "Autres"]];
/**
 * Une personne de l'équipe ou un contact du lieu. `contactId` la relie au module
 * Contacts : la fiche affiche alors le contact à jour, et une modification faite
 * depuis la fiche est enregistrée dans les deux. Les champs gardent une copie, qui
 * sert si le contact est supprimé.
 */
export type SheetPerson = {
    id: string;
    group: PersonGroup;
    firstName: string;
    lastName: string;
    role: string;
    email?: string;
    phone?: string;
    instagram?: string;
    city?: string;
    notes?: string;
    contactId?: string;
};
export type TechnicalSheet = {
    /** Équipe sur scène et contacts techniques, une ligne par personne. Remplace les anciens textes `contact` et `team`. */
    people: SheetPerson[];
    /** « Détails » de chaque catégorie. */
    details: Record<EquipmentCategory, string>;
    /** Matériel apporté EN PLUS des listes cochées (`equipmentListIds`). */
    brought: SheetItem[];
    /** Matériel à fournir par la salle. */
    venue: SheetItem[];
};
export type LogisticsEntry = {
    id: string | number;
    type: string;
    amount: string;
    paymentMode: "self" | "reimburse" | "covered";
    details: string;
    nights?: string;
};
export type LiveDetails = {
    productionId?: string;
    tourId?: string;
    setlist?: SetlistTrack[];
    preparation?: Record<string, PreparationState>;
    equipmentListIds?: string[];
    equipmentChecked?: Record<string, boolean>;
    transports?: LogisticsEntry[];
    lodgings?: LogisticsEntry[];
    documents?: {
        id: number;
        type: string;
        note: string;
    }[];
    technical?: TechnicalSheet;
    contact?: string;
    participants?: string;
    goals?: string;
    report?: string;
    endTime?: string;
    location?: string;
    legacyImported?: boolean;
    /** Programme de la représentation déclaré à la SACEM (lu par la vie de l'œuvre, module Édition). */
    sacemProgramDeclared?: boolean;
};
export type LiveProduction = {
    id: string;
    title: string;
    kind: LiveKind;
    description: string;
    projectId?: string;
    productionId?: string;
    setlist: SetlistTrack[];
    technical: TechnicalSheet;
    preparation: Record<string, PreparationState>;
    equipmentListIds: string[];
};
export const KIND_META = {
    show: { label: "Spectacle / concert", plural: "Spectacles & concerts", color: "#F0FF00", hint: "Une identité, une équipe, une scène." },
    dj: { label: "DJ set", plural: "DJ sets", color: "#A78BFA", hint: "Une sélection, une progression, ton univers." },
    tour: { label: "Tournée", plural: "Tournées", color: "#38BDF8", hint: "Des dates, un itinéraire, tout au même endroit." },
} as const;
export const DATE_STEPS = [["schedule", "Horaires validés"], ["transport", "Transport réservé"], ["lodging", "Logement organisé"], ["equipment", "Matériel vérifié"], ["technical", "Fiche technique validée"], ["payment", "Rémunération convenue"]] as const;
export function productionSteps(kind: LiveKind): readonly (readonly [
    string,
    string
])[] {
    if (kind === "tour")
        return [["booking", "Prospection"], ["dates", "Dates confirmées"], ["fees", "Cachets convenus"], ["logistics", "Logistique préparée"]];
    return [["concept", kind === "dj" ? "Ambiance & direction musicale" : "Concept du spectacle"], ["setlist", kind === "dj" ? "Sélection & structure du set" : "Setlist construite"], ["team", "Équipe réunie"], ["equipment", "Matériel préparé"], ["technical", "Fiche technique prête"], ["rehearsal", "Répétitions planifiées"]];
}
export const emptyTechnical = (): TechnicalSheet => ({ people: [], details: { sound: "", light: "", stage: "", other: "" }, brought: [], venue: [] });
export const newProduction = (kind: LiveKind = "show"): LiveProduction => ({ id: crypto.randomUUID(), kind, title: "", description: "", setlist: [], technical: emptyTechnical(), preparation: {}, equipmentListIds: [] });
export function progress(steps: readonly (readonly [
    string,
    string
])[], states: Record<string, PreparationState> = {}) {
    const done = steps.filter(([id]) => isChecked(states[id])).length;
    return { done, total: steps.length, percent: steps.length ? Math.round(done / steps.length * 100) : 100, next: steps.find(([id]) => !isChecked(states[id]))?.[1] };
}
/**
 * Une étape est cochée ou ne l'est pas. `na` (« sans objet ») n'est plus
 * proposé depuis le 22/09 : les étapes ainsi marquées se lisent cochées, ce
 * qui garde leur pourcentage, et se décochent comme les autres.
 */
export const isChecked = (state?: PreparationState) => state === "done" || state === "na";
export function dateISO(value: string): string {
    if (!value.includes("/"))
        return value.slice(0, 10);
    const [d, m, y] = value.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
export function dateFR(value: string): string { if (!value || value.includes("/"))
    return value; const [y, m, d] = value.split("-"); return `${d}/${m}/${y}`; }
export function todayISO(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
export function money(value: string | number): number { return Number(String(value).replace(/\s/g, "").replace(",", ".")) || 0; }
export function durationSeconds(value: string): number { const parts = value.split(":").map(Number); return parts.some(n => !Number.isFinite(n) || n < 0) ? 0 : parts.length === 2 ? parts[0] * 60 + parts[1] : (parts[0] || 0) * 60; }
export function setlistDuration(items: SetlistTrack[]): string { const seconds = items.reduce((n, t) => n + durationSeconds(t.duration), 0); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
