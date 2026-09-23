// scripts/check-edition-life.ts — clés SACEM, cycle de vie et vie de l'œuvre.
//
//   npx --yes tsx scripts/check-edition-life.ts
//
// Pas de suite de tests dans le projet : ce script tient lieu de spécification
// exécutable pour src/modules/edition/lib/.
import assert from "node:assert/strict";
import type { Person, Track, Work } from "../src/lib/sidekick-store";
import type { TourDate } from "../src/modules/live/data/defaultRepresentations";
import { computeKey } from "../src/modules/edition/lib/sacem-keys";
import { rightsShares, splitsValid } from "../src/modules/edition/lib/rights-shares";
import { agreementStatusFromSigners, buildSnapshot, type AgreementSummary } from "../src/modules/edition/lib/agreement-types";
import { declaredWithoutAgreement, lifecycleStep, manualStatus, storedStatus } from "../src/modules/edition/lib/work-lifecycle";
import { undeclaredProgramDates, workLife } from "../src/modules/edition/lib/work-life";
import { DEFAULT_WORK } from "../src/modules/edition/lib/work-fields";

const today = "2026-09-21";
const person = (id: string, roles: Person["roles"], pseudonym = ""): Person => ({ id, firstName: id.toUpperCase(), name: "Nom", pseudonym, roles });
const work = (over: Partial<Work> = {}): Work => ({ ...DEFAULT_WORK, id: "w", title: "Nuit blanche", ...over });
const sum = (k: { authors: number; composers: number; arrangers: number; publishers: number }) => Math.round((k.authors + k.composers + k.arrangers + k.publishers) * 100) / 100;

// ─── Clés SACEM : chaque combinaison totalise 100 ────────────────────────────
const combos: Person["roles"][][] = [
  [["author"]], [["composer"]], [["author", "composer"]], [["author"], ["composer"]],
  [["author"], ["composer"], ["arranger"]], [["composer"], ["arranger"]], [["adapter"], ["composer"]],
];
for (const roles of combos) {
  const persons = roles.map((r, i) => person(`p${i}`, r));
  for (const pub of [false, true]) {
    for (const kind of ["dep", "drm"] as const) {
      assert.equal(sum(computeKey(kind, persons, pub)), 100, `${kind} ${JSON.stringify(roles)} éditeur=${pub}`);
    }
  }
}
// Barème de référence.
const rounded = (k: object) => Object.fromEntries(Object.entries(k as Record<string, number>).map(([key, v]) => [key, Math.round(v * 100) / 100]));
assert.deepEqual(rounded(computeKey("dep", [person("a", ["author"]), person("c", ["composer"])], true)), { authors: 33.33, composers: 33.33, arrangers: 0, publishers: 33.33 });
assert.deepEqual(rounded(computeKey("drm", [person("a", ["author"]), person("c", ["composer"])], true)), { authors: 25, composers: 25, arrangers: 0, publishers: 50 });
assert.deepEqual(rounded(computeKey("drm", [person("a", ["author"]), person("c", ["composer"]), person("r", ["arranger"])], true)), { authors: 21.88, composers: 21.88, arrangers: 6.25, publishers: 50 });
assert.equal(rounded(computeKey("dep", [person("a", ["author"]), person("c", ["composer"]), person("r", ["arranger"])], false)).arrangers, 8.33);

// ─── Parts par personne : le mode équitable n'est plus vide ──────────────────
{
  const w = work({ persons: [person("a", ["author", "composer"]), person("b", ["author", "composer"])] });
  const shares = rightsShares(w);
  assert.equal(shares.length, 2);
  assert.equal(shares[0].depPct, 50);
  assert.equal(shares[1].drmPct, 50);
}
{
  const w = work({
    persons: [person("a", ["author"]), person("c", ["composer"])],
    selfPublished: false,
    externalPublishers: [{ id: "e", name: "Éditions X", coad: "", pct: 0 }],
  });
  const shares = rightsShares(w);
  assert.equal(shares.find((s) => s.key === "pub:e")?.drmPct, 50);
  assert.equal(Math.round(shares.reduce((s, x) => s + x.depPct, 0)), 100);
}
{
  const w = work({ persons: [person("a", ["author"]), person("b", ["author"])], splitsAuthors: [{ personId: "a", pct: 70 }, { personId: "b", pct: 30 }] });
  assert.equal(rightsShares(w).find((s) => s.key === "a")?.depPct, 70);
  assert.ok(splitsValid(w));
  assert.ok(!splitsValid({ ...w, splitsAuthors: [{ personId: "a", pct: 70 }, { personId: "b", pct: 20 }] }));
}

// ─── Cycle de vie ─────────────────────────────────────────────────────────────
assert.equal(manualStatus("finalized"), "draft");
assert.equal(manualStatus("registered-sacem"), "declared");
assert.equal(storedStatus("draft"), "in-progress");
const duo = work({ persons: [person("a", ["author"]), person("c", ["composer"])] });
const summary = (status: AgreementSummary["status"], validated = 1): AgreementSummary => ({ status, version: 1, validated, total: 2, contested: status === "contested" ? 1 : 0 });
assert.equal(lifecycleStep(work({ persons: [person("a", ["author"])] }), null), "draft");
assert.equal(lifecycleStep(duo, null), "draft");
assert.equal(lifecycleStep(duo, summary("pending")), "agreement-pending");
assert.equal(lifecycleStep(duo, summary("contested")), "agreement-contested");
assert.equal(lifecycleStep(duo, summary("validated", 2)), "agreement-validated");
assert.equal(lifecycleStep({ ...duo, status: "registered-sacem" }, summary("pending")), "declared");
assert.ok(declaredWithoutAgreement({ ...duo, status: "registered-sacem" }, null));
assert.ok(!declaredWithoutAgreement({ ...duo, status: "registered-sacem" }, summary("validated", 2)));
assert.ok(!declaredWithoutAgreement({ ...work({ persons: [person("a", ["author"])] }), status: "registered-sacem" }, null));

assert.equal(agreementStatusFromSigners([{ status: "validated" }, { status: "pending" }]), "pending");
assert.equal(agreementStatusFromSigners([{ status: "validated" }, { status: "validated" }]), "validated");
assert.equal(agreementStatusFromSigners([{ status: "validated" }, { status: "contested" }]), "contested");

// Le snapshot porte les parts par personne.
assert.equal(buildSnapshot(duo, "YOTON").persons.find((p) => p.id === "a")?.depPct, 50);

// ─── Vie de l'œuvre ───────────────────────────────────────────────────────────
const track = (id: string, over: Partial<Track> = {}): Track => ({ id, title: "Nuit blanche", mainArtist: "YOTON", role: "main" as Track["role"], guestArtists: [], isrc: "", releaseDate: "", selfProduced: true, versions: [], notes: "", ...over });
const date = (id: number, day: string, setlist: NonNullable<TourDate["details"]>["setlist"], over: Partial<TourDate> = {}): TourDate => ({ id, city: "Nantes", venue: "Salle", date: day, status: "Passée", address: "", timetable: [], transport: false, lodging: false, remuneration: false, equipment: false, details: { setlist }, ...over });
const item = (over: { title?: string; artist?: string; trackId?: string }) => ({ id: Math.random().toString(), title: "", artist: "", duration: "", note: "", ...over });

const w = work({ linkedTrackIds: ["t1"] });
const tracks = [track("t1", { status: "publie" }), track("t2", { linkedWorkId: "w", releaseDate: "2026-12-01" }), track("t3")];
const dates = [
  date(1, "10/09/2026", [item({ trackId: "t1" })]),
  date(2, "12/09/2026", [item({ title: "Nuit Blanche", artist: "" })], { details: { setlist: [item({ title: "Nuit Blanche" })], sacemProgramDeclared: true } }),
  date(3, "13/09/2026", [item({ title: "Nuit blanche", artist: "Quelqu'un d'autre" })]),
  date(4, "14/09/2026", [item({ trackId: "t3" })]),
  date(5, "01/10/2026", [item({ trackId: "t1" })]),
  date(6, "15/09/2026", [item({ trackId: "t1" })], { status: "En option" }),
];
const life = workLife(w, tracks, dates, "YOTON", today);
assert.deepEqual(life.tracks.map((t) => t.id), ["t1", "t2"]);
assert.deepEqual(life.released.map((t) => t.id), ["t1"]);
assert.deepEqual(life.performances.map((d) => d.id), [2, 1]);
assert.deepEqual(life.undeclaredPrograms.map((d) => d.id), [1]);
assert.ok(life.releasedUndeclared);
assert.ok(!workLife({ ...w, status: "registered-sacem" }, tracks, dates, "YOTON", today).releasedUndeclared);
assert.deepEqual(undeclaredProgramDates([w], dates, tracks, "YOTON", today).map((d) => d.id), [1]);

console.log("check-edition-life : toutes les règles passent.");
