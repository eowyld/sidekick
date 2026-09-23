import type { EquipmentInventoryItem, EquipmentList } from "@/hooks/useLiveData";
import { EQUIPMENT_CATEGORIES, PERSON_GROUPS, type EquipmentCategory, type PersonGroup, type SheetItem, type SheetPerson, type TechnicalSheet } from "./live-model";

export const categoryLabel = (category: EquipmentCategory): string => EQUIPMENT_CATEGORIES.find(([key]) => key === category)?.[1] ?? "Autre matériel";

export function categoryRank(category: EquipmentCategory): number {
    const index = EQUIPMENT_CATEGORIES.findIndex(([key]) => key === category);
    return index < 0 ? EQUIPMENT_CATEGORIES.length : index;
}

/** Toute valeur inconnue (ligne d'avant la colonne, donnée corrompue) retombe sur « Autre matériel ». */
export function normalizeCategory(value: unknown): EquipmentCategory {
    return EQUIPMENT_CATEGORIES.some(([key]) => key === value) ? value as EquipmentCategory : "other";
}

/** Ordre du module Matériel : par catégorie, puis par nom. */
export function compareByCategory<T extends { category: EquipmentCategory; name: string }>(a: T, b: T): number {
    return categoryRank(a.category) - categoryRank(b.category) || a.name.localeCompare(b.name, "fr");
}

/** Code couleur des catégories, commun à Matériel et à la fiche technique. Distinct des couleurs d'état (Neuf, Bon, Moyen, À réparer). */
export const CATEGORY_COLOR: Record<EquipmentCategory, string> = {
    sound: "#818CF8",
    light: "#FBBF24",
    stage: "#2DD4BF",
    other: "#A1A1AA",
};

export const DETAIL_PLACEHOLDER: Record<EquipmentCategory, string> = {
    sound: "Entrées, micros, DI, retours, régie ou configuration DJ",
    light: "Ambiances, conduite, besoins spécifiques",
    stage: "Dimensions, disposition, alimentation électrique",
    other: "Tout ce qui ne rentre pas dans les autres catégories",
};

const text = (value: unknown): string => typeof value === "string" ? value : "";

/** Ancien format : une ligne de texte = un élément. Identifiants déterministes, pour ne pas changer d'un chargement à l'autre. */
const linesToItems = (raw: unknown, prefix: string): SheetItem[] => text(raw).split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((name, index) => ({ id: `${prefix}-${index}`, name, quantity: 1, category: "other" as const }));

function cleanItems(raw: unknown[]): SheetItem[] {
    return raw.flatMap((entry, index) => {
        const r = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
        const name = text(r.name).trim();
        if (!name)
            return [];
        const quantity = Number(r.quantity);
        return [{ id: text(r.id) || `item-${index}`, name, quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1, category: normalizeCategory(r.category), ...(text(r.itemId) ? { itemId: text(r.itemId) } : {}) }];
    });
}

const normalizeGroup = (value: unknown): PersonGroup => PERSON_GROUPS.some(([key]) => key === value) ? value as PersonGroup : "other";

function cleanPeople(raw: unknown[]): SheetPerson[] {
    return raw.flatMap((entry, index) => {
        const r = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
        const optional = Object.fromEntries((["email", "phone", "instagram", "city", "notes", "contactId"] as const).filter(k => text(r[k])).map(k => [k, text(r[k])]));
        const person: SheetPerson = { id: text(r.id) || `person-${index}`, group: normalizeGroup(r.group), firstName: text(r.firstName), lastName: text(r.lastName), role: text(r.role), ...optional };
        return person.firstName.trim() || person.lastName.trim() || person.role.trim() ? [person] : [];
    });
}

/** Ancien format : textes libres « Contact technique » (→ équipe technique) et « Équipe sur scène » (→ équipe artistique). Une ligne de texte = une personne, le texte gardé tel quel dans le nom. */
const legacyPeople = (contact: unknown, team: unknown): SheetPerson[] => [
    ...text(contact).split(/\r?\n/).map(l => l.trim()).filter(Boolean).map((line, i) => ({ id: `legacy-contact-${i}`, group: "tech" as const, firstName: "", lastName: line, role: "Contact technique" })),
    ...text(team).split(/\r?\n/).map(l => l.trim()).filter(Boolean).map((line, i) => ({ id: `legacy-team-${i}`, group: "artistic" as const, firstName: "", lastName: line, role: "" })),
];

/** « Prénom Nom », ou ce qui est renseigné. */
export const personName = (p: Pick<SheetPerson, "firstName" | "lastName">): string => [p.firstName.trim(), p.lastName.trim()].filter(Boolean).join(" ");

/**
 * Lit une fiche technique, quelle que soit sa forme. Une fiche de l'ancienne forme
 * (textes `stage`, `sound`, `lights`, `supplied`, `provided`) est convertie ; la
 * nouvelle forme est écrite au prochain enregistrement. Une fiche déjà à la nouvelle
 * forme n'est jamais reconvertie. Même règle pour l'équipe : les textes `contact` et
 * `team` deviennent des lignes `people` tant que `people` n'existe pas.
 */
export function normalizeTechnical(raw: unknown): TechnicalSheet {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const d = (r.details && typeof r.details === "object" ? r.details : null) as Record<string, unknown> | null;
    return {
        people: Array.isArray(r.people) ? cleanPeople(r.people) : legacyPeople(r.contact, r.team),
        details: d ? { sound: text(d.sound), light: text(d.light), stage: text(d.stage), other: text(d.other) } : { sound: text(r.sound), light: text(r.lights), stage: text(r.stage), other: "" },
        brought: Array.isArray(r.brought) ? cleanItems(r.brought) : linesToItems(r.supplied, "legacy-brought"),
        venue: Array.isArray(r.venue) ? cleanItems(r.venue) : linesToItems(r.provided, "legacy-venue"),
    };
}

export const cloneTechnical = (sheet: TechnicalSheet): TechnicalSheet => structuredClone(sheet);

/** Une fiche sans rien : ni contact, ni équipe, ni liste, ni ligne, ni détail. */
export function technicalIsEmpty(sheet: TechnicalSheet, listIds: string[] = []): boolean {
    return !sheet.people.length && !listIds.length && !sheet.brought.length && !sheet.venue.length && Object.values(sheet.details).every(v => !v.trim());
}

export type BroughtLine = {
    /** Identifiant de l'inventaire, ou de la ligne libre : c'est la clé de `equipmentChecked`. */
    key: string;
    name: string;
    quantity: number;
    category: EquipmentCategory;
    /** Nom de la liste d'où vient l'élément ; absent pour un ajout. */
    listName?: string;
    needsRepair?: boolean;
};

/**
 * Tout le matériel apporté : éléments des listes cochées, puis ajouts. Un ajout
 * tiré de l'inventaire ne double pas la ligne d'une liste qui le contient déjà.
 * Rangé par catégorie, puis par nom.
 */
export function resolveBrought(sheet: TechnicalSheet, listIds: string[], lists: EquipmentList[], inventory: EquipmentInventoryItem[]): BroughtLine[] {
    const lines = new Map<string, BroughtLine>();
    for (const listId of listIds) {
        const list = lists.find(l => l.id === listId);
        if (!list)
            continue;
        for (const itemId of list.itemIds) {
            const item = inventory.find(i => i.id === itemId);
            if (item && !lines.has(item.id))
                lines.set(item.id, { key: item.id, name: item.name, quantity: item.quantity, category: item.category, listName: list.name, needsRepair: item.condition === "A réparer" });
        }
    }
    for (const extra of sheet.brought) {
        const key = extra.itemId ?? extra.id;
        if (!lines.has(key))
            lines.set(key, { key, name: extra.name, quantity: extra.quantity, category: extra.category });
    }
    return [...lines.values()].sort((a, b) => categoryRank(a.category) - categoryRank(b.category) || a.name.localeCompare(b.name, "fr"));
}
