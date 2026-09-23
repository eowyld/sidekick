// scripts/check-live-progress.ts — règles de progression et de rattachement Live.
//
//   npx --yes tsx scripts/check-live-progress.ts
//
// Pas de suite de tests dans le projet : ce script tient lieu de spécification
// exécutable pour live-progress.ts et live-links.ts.
import assert from "node:assert/strict";
import type { TourDate } from "../src/modules/live/data/defaultRepresentations";
import type { ProspectionEntry, RehearsalItem } from "../src/hooks/useLiveData";
import { emptyTechnical, newProduction, type LiveProduction } from "../src/modules/live/lib/live-model";
import { productionProgress, withStep, type ProgressContext } from "../src/modules/live/lib/live-progress";
import { linkIssues, nextUp, relativeDay, tourOptions } from "../src/modules/live/lib/live-links";
import { compareByCategory, normalizeCategory, normalizeTechnical, resolveBrought } from "../src/modules/live/lib/live-equipment";
import type { EquipmentInventoryItem, EquipmentList } from "../src/hooks/useLiveData";

const today = "2026-09-21";
const show: LiveProduction = { ...newProduction("show"), id: "show", title: "Le live" };
const tour: LiveProduction = { ...newProduction("tour"), id: "tour", title: "Automne", productionId: "show" };
const date = (id: number, over: Partial<TourDate> = {}): TourDate => ({ id, city: "Nantes", venue: `Salle ${id}`, date: "01/10/2026", status: "Confirmée", address: "", timetable: [], transport: false, lodging: false, remuneration: false, equipment: false, details: { productionId: "show", tourId: "tour" }, ...over });
const rehearsal = (over: Partial<RehearsalItem> = {}): RehearsalItem => ({ id: "r", date: "10/09/2026", time: "", location: "", remunerations: [], equipments: [], details: { productionId: "show" }, ...over });
const prospect = (status: string): ProspectionEntry => ({ id: status, venueName: "Lieu", city: "", contact: "", email: "", instagram: "", facebook: "", phone: "", status, touchpoints: [], reliabilityTier: "neutral", tourId: "tour" });
const ctx = (tourDates: TourDate[], rehearsals: RehearsalItem[] = [], prospection: ProspectionEntry[] = []): ProgressContext => ({ tourDates, rehearsals, prospection, today });
const step = (p: LiveProduction, c: ProgressContext, id: string) => productionProgress(p, c).steps.find(s => s.id === id)!;

// Dates confirmées : une date en option bloque, une date passée ne compte pas.
assert.equal(step(tour, ctx([date(1), date(2, { status: "En option" })]), "dates").state, "todo");
assert.equal(step(tour, ctx([date(1), date(2, { status: "En option" })]), "dates").blockers.length, 1);
assert.equal(step(tour, ctx([date(1)]), "dates").state, "done");
assert.equal(step(tour, ctx([date(1), date(2, { status: "En option", date: "01/09/2026" })]), "dates").state, "done");
assert.equal(step(tour, ctx([]), "dates").state, "todo");

// Logistique et cachets : « sans objet » sur la date ne bloque pas.
const prepared = date(1, { details: { productionId: "show", tourId: "tour", preparation: { transport: "done", lodging: "na", payment: "done" } } });
assert.equal(step(tour, ctx([prepared]), "logistics").state, "done");
assert.equal(step(tour, ctx([prepared]), "fees").state, "done");
assert.equal(step(tour, ctx([date(1)]), "logistics").blockers.length, 1);
assert.equal(step(tour, ctx([]), "fees").state, "todo");
// Une date en option n'est pas exigée pour la logistique.
assert.equal(step(tour, ctx([prepared, date(2, { status: "En option" })]), "logistics").state, "done");

// Forçage : l'étape est faite, mais ce qui bloque reste visible.
const forced = step({ ...tour, preparation: { logistics: "done" } }, ctx([date(1)]), "logistics");
assert.equal(forced.state, "done");
assert.equal(forced.computed, false);
assert.equal(forced.blockers.length, 1);
// « todo » enregistré avant la refonte = pas de forçage.
assert.equal(step({ ...tour, preparation: { dates: "todo" } }, ctx([date(1)]), "dates").state, "done");
// « Revenir au calcul » supprime la clé.
assert.deepEqual(withStep({ dates: "done", fees: "na" }, "dates", undefined), { fees: "na" });

// Prospection : faite dès qu'un lieu rattaché est accepté.
assert.equal(step(tour, ctx([], [], [prospect("En discussion")]), "booking").state, "todo");
assert.equal(step(tour, ctx([], [], [prospect("Accepté")]), "booking").state, "done");
assert.equal(step(tour, ctx([], [], [{ ...prospect("Accepté"), tourId: "autre" }]), "booking").state, "todo");

// Spectacle : quatre étapes calculées, deux manuelles.
const full: LiveProduction = { ...show, setlist: [{ id: "a", title: "A", artist: "", duration: "3:00", note: "" }], equipmentListIds: ["kit"], technical: { ...emptyTechnical(), people: [{ id: "p1", group: "tech" as const, firstName: "", lastName: "Régie", role: "Contact technique" }], venue: [{ id: "v1", name: "Retours", quantity: 2, category: "sound" }] } };
const pr = productionProgress(full, ctx([], [rehearsal()]));
assert.deepEqual(pr.steps.filter(s => s.state === "done").map(s => s.id), ["setlist", "equipment", "rehearsal", "technical"]);
assert.deepEqual(pr.steps.filter(s => s.manual).map(s => s.id), ["concept", "team"]);
assert.equal(pr.next, "Concept du spectacle");
assert.equal(pr.percent, 67);
// Une répétition à venir ne compte pas comme effectuée.
assert.equal(step(full, ctx([], [rehearsal({ date: "30/09/2026" })]), "rehearsal").state, "todo");
// Étape manuelle cochée.
assert.equal(step({ ...full, preparation: { concept: "done" } }, ctx([]), "concept").state, "done");

// Matériel préparé : une liste cochée OU un ajout suffit ; rien = à faire.
const brought = { ...emptyTechnical(), brought: [{ id: "b", name: "Guitare", quantity: 1, category: "other" as const }] };
assert.equal(step({ ...full, equipmentListIds: [], technical: brought }, ctx([]), "equipment").state, "done");
assert.equal(step({ ...full, equipmentListIds: [], technical: emptyTechnical() }, ctx([]), "equipment").state, "todo");
// Fiche technique prête : une personne dans l'équipe ET quelque chose (matériel ou détail).
const contactOnly = { ...emptyTechnical(), people: [{ id: "p1", group: "tech" as const, firstName: "", lastName: "Régie", role: "Contact technique" }] };
assert.equal(step({ ...full, equipmentListIds: [], technical: contactOnly }, ctx([]), "technical").state, "todo");
assert.deepEqual(step({ ...full, equipmentListIds: [], technical: contactOnly }, ctx([]), "technical").blockers.map(b => b.label), ["Matériel ou détails à renseigner"]);
assert.equal(step({ ...full, equipmentListIds: [], technical: { ...contactOnly, details: { ...emptyTechnical().details, stage: "5 x 4 m" } } }, ctx([]), "technical").state, "done");
assert.equal(step({ ...full, technical: { ...emptyTechnical(), details: { ...emptyTechnical().details, sound: "2 DI" } } }, ctx([]), "technical").state, "todo");

// Ancienne fiche convertie à la lecture : textes conservés, lignes en éléments.
const legacy = normalizeTechnical({ contact: "C", team: "T", stage: "5x4 m", sound: "2 DI", lights: "Ambiance", supplied: "Guitare\nPédalier", provided: "Diffusion" });
assert.deepEqual(legacy.details, { sound: "2 DI", light: "Ambiance", stage: "5x4 m", other: "" });
assert.deepEqual(legacy.brought.map(i => i.name), ["Guitare", "Pédalier"]);
assert.equal(legacy.brought[0].category, "other");
assert.equal(legacy.venue[0].id, "legacy-venue-0");
assert.deepEqual(normalizeTechnical(legacy), legacy, "la conversion doit être idempotente");
assert.equal(normalizeTechnical({ ...legacy, supplied: "Ignoré" }).brought.length, 2, "une fiche déjà à la nouvelle forme n'est pas reconvertie");
assert.deepEqual(normalizeTechnical(undefined), emptyTechnical());
assert.equal(normalizeCategory("n'importe quoi"), "other");

// Matériel apporté : listes cochées d'abord, ajout doublon ignoré, rangé par catégorie puis par nom.
const inventory = [{ id: "i1", name: "Micro", quantity: 2, condition: "Bon", category: "sound" }, { id: "i2", name: "Projecteur", quantity: 1, condition: "A réparer", category: "light" }] as EquipmentInventoryItem[];
const lists = [{ id: "L", name: "Kit", description: "", itemIds: ["i2", "i1"] }] as EquipmentList[];
const resolved = resolveBrought({ ...emptyTechnical(), brought: [{ id: "x", name: "Câble", quantity: 3, category: "other" }, { id: "y", itemId: "i1", name: "Micro", quantity: 2, category: "sound" }] }, ["L"], lists, inventory);
assert.deepEqual(resolved.map(l => l.name), ["Micro", "Projecteur", "Câble"]);
assert.equal(resolved[0].listName, "Kit");
assert.equal(resolved[1].needsRepair, true);
assert.equal(resolved.length, 3);
assert.ok(compareByCategory({ category: "sound", name: "Z" }, { category: "light", name: "A" }) < 0);

// Rattachements à reprendre.
const other: LiveProduction = { ...newProduction("show"), id: "other", title: "Autre" };
const orphan: LiveProduction = { ...newProduction("tour"), id: "orphan", title: "Orpheline" };
const issues = linkIssues([show, other, tour, orphan], [date(3, { details: { productionId: "other", tourId: "tour" } }), date(4, { details: {} }), date(5, { details: {}, date: "01/01/2026" })], [], today);
assert.deepEqual(issues.map(i => i.type).sort(), ["date-without-show", "mismatch", "tour-without-show"]);

// Choix de tournée filtré sur le spectacle, libellé désambiguïsé.
assert.deepEqual(tourOptions([show, other, tour, orphan], "show").map(o => o.label), ["Automne · Le live"]);

// Prochaine échéance, toutes sortes confondues.
assert.equal(nextUp([date(1, { date: "05/10/2026" })], [rehearsal({ date: "25/09/2026" })], today)?.kind, "rehearsal");
assert.equal(relativeDay("22/09/2026", today), "demain");

console.log("✓ live-progress / live-links : toutes les règles tiennent");
