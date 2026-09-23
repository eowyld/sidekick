// Vérifie les règles d'intermittence. Aucun runner de test dans ce dépôt :
// ce script EST la suite de tests du calcul. Lancer : npm run check:intermittence
import assert from "node:assert/strict";
import { decalage, moisIndemnise, joursDuMois } from "../src/modules/incomes/intermittence/indemnisation.ts";
import { heuresPourCachets, cachetsRetenus } from "../src/modules/incomes/intermittence/hours.ts";
import { compteur } from "../src/modules/incomes/intermittence/counter.ts";

let ok = 0;
function check(nom, fn) {
  try {
    fn();
    ok += 1;
    console.log(`  ✓ ${nom}`);
  } catch (e) {
    console.error(`  ✗ ${nom}\n    ${e.message}`);
    process.exitCode = 1;
  }
}

console.log("\nDécalage mensuel");

// Cas de test de la spec, section 2. Ils SONT la spécification.
check("technicien, 80 h → 14 jours retirés", () => {
  assert.equal(decalage(80, "8"), 14);
});
check("artiste, 3 cachets (36 h) → 4 jours retirés", () => {
  assert.equal(heuresPourCachets(3), 36);
  assert.equal(decalage(36, "10"), 4); // 4,824 arrondi à l'inférieur
});
check("arrondi à l'entier inférieur, jamais au plus proche", () => {
  assert.equal(decalage(37, "10"), 4); // 4,958 → 4, pas 5
});
check("zéro heure → zéro jour retiré", () => {
  assert.equal(decalage(0, "8"), 0);
  assert.equal(decalage(-5, "10"), 0);
});

console.log("\nCachets");

check("un cachet vaut 12 h, isolé comme groupé", () => {
  assert.equal(heuresPourCachets(1), 12);
});
check("plafond de 28 cachets par mois", () => {
  assert.equal(cachetsRetenus(30), 28);
  assert.equal(cachetsRetenus(12), 12);
});

console.log("\nMois indemnisé");

check("franchise et décalage se cumulent", () => {
  // Mars 2026 : 31 jours. Annexe 10, congés acquis → franchise 3.
  // 48 h → décalage floor(48 / 10 × 1,34) = floor(6,432) = 6.
  // 31 − 3 − 6 = 22 jours indemnisés.
  const r = moisIndemnise({
    annee: 2026, mois: 3, heuresTravaillees: 48,
    annexe: "10", congesSpectaclesAcquis: true, aj: 52,
  });
  assert.equal(r.joursDuMois, 31);
  assert.equal(r.franchise, 3);
  assert.equal(r.decalage, 6);
  assert.equal(r.joursIndemnisables, 22);
  assert.equal(r.montant, 1144);
});
check("un mois très travaillé plafonne à zéro, jamais négatif", () => {
  const r = moisIndemnise({
    annee: 2026, mois: 2, heuresTravaillees: 400,
    annexe: "8", congesSpectaclesAcquis: false, aj: 52,
  });
  assert.equal(r.joursIndemnisables, 0);
  assert.equal(r.montant, 0);
});
check("sans AJ connue, aucun montant n'est produit", () => {
  const r = moisIndemnise({
    annee: 2026, mois: 3, heuresTravaillees: 48,
    annexe: "10", congesSpectaclesAcquis: false, aj: null,
  });
  assert.equal(r.montant, null);
  assert.equal(r.joursIndemnisables, 23); // franchise 2, décalage 6
});
check("février 2028 compte 29 jours", () => {
  assert.equal(joursDuMois(2028, 2), 29);
});

console.log("\nSeuil d'activité de l'annexe 10");

check("27 jours d'activité coupent toute indemnisation", () => {
  const r = moisIndemnise({
    annee: 2026, mois: 3, heuresTravaillees: 270, // 27 jours à 10 h
    annexe: "10", congesSpectaclesAcquis: false, aj: 52,
  });
  assert.equal(r.joursActivite, 27);
  assert.equal(r.activiteBloquante, true);
  assert.equal(r.joursIndemnisables, 0);
  assert.equal(r.montant, 0);
});
check("26 jours d'activité ne déclenchent pas le seuil", () => {
  const r = moisIndemnise({
    annee: 2026, mois: 3, heuresTravaillees: 260,
    annexe: "10", congesSpectaclesAcquis: false, aj: 52,
  });
  assert.equal(r.joursActivite, 26);
  assert.equal(r.activiteBloquante, false);
});
check("l'annexe 8 n'a pas de seuil d'activité", () => {
  const r = moisIndemnise({
    annee: 2026, mois: 3, heuresTravaillees: 400,
    annexe: "8", congesSpectaclesAcquis: false, aj: 52,
  });
  assert.equal(r.activiteBloquante, false);
  assert.equal(r.joursIndemnisables, 0); // zéro par le décalage seul, pas par le seuil
});

console.log("\nPlus tu travailles, moins tu touches");

check("doubler les heures réduit strictement les jours indemnisés", () => {
  const base = { annee: 2026, mois: 3, annexe: "10", congesSpectaclesAcquis: false, aj: 52 };
  const peu = moisIndemnise({ ...base, heuresTravaillees: 36 });
  const beaucoup = moisIndemnise({ ...base, heuresTravaillees: 72 });
  assert.ok(beaucoup.joursIndemnisables < peu.joursIndemnisables);
});
check("10 jours travaillés en annexe 8 retirent 14 jours : le rapport vaut 1,4", () => {
  const joursTravailles = 10;       // base 8 h par jour
  const joursRetires = decalage(joursTravailles * 8, "8");
  assert.equal(joursRetires, 14);
  assert.ok(joursRetires / joursTravailles > 1);
});

console.log("\nCompteur des 507 heures");

check("seules les missions de la fenêtre de 12 mois comptent", () => {
  const c = compteur(
    [
      { date: "2026-09-01", heures: 100 },
      { date: "2026-01-15", heures: 200 },
      { date: "2024-05-01", heures: 999 }, // hors fenêtre
    ],
    new Date(2026, 8, 23)
  );
  assert.equal(c.heuresAcquises, 300);
  assert.equal(c.droitsOuverts, false);
  assert.equal(c.heuresRestantes, 207);
});
check("507 h atteintes ouvrent les droits", () => {
  const c = compteur([{ date: "2026-09-01", heures: 507 }], new Date(2026, 8, 23));
  assert.equal(c.droitsOuverts, true);
  assert.equal(c.heuresRestantes, 0);
  assert.equal(c.moisAvantOuverture, null);
});
check("aucune mission : pas de projection d'ouverture", () => {
  const c = compteur([], new Date(2026, 8, 23));
  assert.equal(c.heuresAcquises, 0);
  assert.equal(c.moisAvantOuverture, null);
});

console.log(`\n${ok} vérifications passées.\n`);
