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
export type TechnicalSheet = {
    team: string;
    stage: string;
    sound: string;
    lights: string;
    supplied: string;
    provided: string;
    contact: string;
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
    return [["concept", kind === "dj" ? "Ambiance & direction musicale" : "Concept du spectacle"], ["setlist", kind === "dj" ? "Sélection & structure du set" : "Setlist construite"], ["team", "Équipe réunie"], ["equipment", "Matériel préparé"], ["rehearsal", "Répétitions effectuées"], ["technical", "Fiche technique prête"]];
}
export const emptyTechnical = (): TechnicalSheet => ({ team: "", stage: "", sound: "", lights: "", supplied: "", provided: "", contact: "" });
export const newProduction = (kind: LiveKind = "show"): LiveProduction => ({ id: crypto.randomUUID(), kind, title: "", description: "", setlist: [], technical: emptyTechnical(), preparation: {}, equipmentListIds: [] });
export function progress(steps: readonly (readonly [
    string,
    string
])[], states: Record<string, PreparationState> = {}) {
    const required = steps.filter(([id]) => states[id] !== "na");
    const done = required.filter(([id]) => states[id] === "done").length;
    return { done, total: required.length, percent: required.length ? Math.round(done / required.length * 100) : 100, next: required.find(([id]) => states[id] !== "done")?.[1] };
}
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
export const TECHNICAL_FIELDS: readonly (readonly [
    keyof TechnicalSheet,
    string,
    string
])[] = [
    ["contact", "Contact technique", "Nom, téléphone, email"], ["team", "Équipe sur scène", "Artistes, instruments, techniciens"], ["stage", "Scène & implantation", "Dimensions, disposition, alimentation électrique"], ["sound", "Son & retours", "Entrées, micros, DI, retours, régie ou configuration DJ"], ["lights", "Lumière", "Ambiances, conduite, besoins spécifiques"], ["supplied", "Matériel apporté", "Ce que tu apportes"], ["provided", "Matériel à fournir par le lieu", "Backline, platines, table de mixage…"]
];
