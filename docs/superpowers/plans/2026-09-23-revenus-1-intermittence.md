# Refonte Revenus, lot 1 — Intermittence : compteur et indemnité

> **Pour un agent d'exécution :** SOUS-SKILL REQUISE — `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Les étapes utilisent des cases (`- [ ]`).

**Objectif :** remplacer l'allocation inventée (`grossAmount × 0,35`) par un
compteur d'heures fiable et un montant mensuel calculé à partir de l'allocation
journalière réelle de l'utilisateur.

**Architecture :** toute la règle métier vit dans `src/modules/incomes/intermittence/`,
en fonctions pures sans React ni réseau, vérifiées par un script Node. Les
composants ne font que lire ces fonctions. Les paramètres du régime se rangent
dans le `data` jsonb du statut Admin, qui existe déjà.

**Stack :** Next.js 16 (App Router), Supabase, TypeScript, Tailwind, Recharts,
Lucide. Source : `docs/superpowers/specs/2026-09-23-revenus-refonte-design.md`.

---

## Contraintes du dépôt — à lire avant de commencer

1. **Aucun `git add` ni `git commit`.** `CLAUDE.md` l'interdit hors demande
   explicite d'Eliott. Ce plan ne contient donc aucune étape de commit ; il se
   vérifie par `npx tsc --noEmit`, par le script Node, et par capture Playwright.
2. **Aucun runner de test n'est configuré.** Les cas de test de la spec
   deviennent des assertions dans `scripts/check-intermittence.mjs`, lancé par
   `node`. Ne pas installer Vitest ni Jest.
3. **`cn()` ne résout pas les conflits Tailwind.** Toute classe de largeur ou de
   position sur un primitif (`Input`, `Button`…) va sur un élément englobant,
   jamais en `className` du primitif.
4. **Design dark-only.** Fond `#101010`, texte `#f5f5f5`, accent `#F0FF00`,
   carte `rgba(44,44,46,0.72)`, bordure `rgba(245,245,245,0.12)`. Jamais de
   `bg-white` ni de variante claire.
5. **Pas de tiret cadratin dans les textes affichés** (libellés, descriptions,
   aides). Les commentaires de code ne sont pas concernés.
6. Le compte de `.env.local` (`SHOT_EMAIL` / `SHOT_PASSWORD`) est un **compte
   réel**, le seul du projet Supabase. Toute donnée créée pour vérifier est
   supprimée ensuite.

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/20260923100000_intermittence_refonte.sql` | 3 colonnes sur `user_intermittence_missions` |
| `src/modules/incomes/intermittence/params.ts` | constantes réglementaires, datées et sourcées. Aucun nombre du régime ailleurs. |
| `src/modules/incomes/intermittence/hours.ts` | cachets → heures, plafond mensuel |
| `src/modules/incomes/intermittence/counter.ts` | heures sur 12 mois glissants, reste à parcourir |
| `src/modules/incomes/intermittence/indemnisation.ts` | décalage, jours indemnisables, montant du mois |
| `src/modules/incomes/intermittence/statut-params.ts` | lecture/écriture typée du `data` jsonb du statut |
| `scripts/check-intermittence.mjs` | assertions sur les 4 fichiers ci-dessus |
| `src/modules/incomes/components/IntermittenceParamsCard.tsx` | saisie annexe, AJ, dates |
| `src/modules/incomes/components/IntermittenceHeader.tsx` | bandeau compteur, sur le modèle de `CatalogHeader` |
| `src/modules/incomes/components/IntermittenceMonth.tsx` | calendrier du mois + ligne de démonstration |
| `src/hooks/useIncomesData.ts` (modifié) | mapping des 3 nouvelles colonnes |
| `src/modules/incomes/components/intermittence-types.tsx` (modifié) | 3 champs sur le type |

Découpage voulu : une question par fichier. `indemnisation.ts` se relit seul,
sans ouvrir un composant. C'est ce qui rend le calcul vérifiable.

---

## Task 1 : les paramètres réglementaires

**Fichiers :**
- Créer : `src/modules/incomes/intermittence/params.ts`

- [ ] **Étape 1 : écrire le fichier**

```ts
// src/modules/incomes/intermittence/params.ts
//
// Constantes du régime d'assurance chômage des intermittents du spectacle.
// SEUL endroit du dépôt où un nombre réglementaire est écrit. Ni composant ni
// fonction de calcul ne doit en redéfinir un.
//
// Source : règlement annexé à la convention d'assurance chômage du 15/11/2024,
// annexes VIII (techniciens) et X (artistes). Coefficients de décalage :
// annexes VIII et X, art. 32 §1er, et fiches techniques UNÉDIC.

/** Date de dernière vérification des valeurs ci-dessous. Affichée à l'écran. */
export const DERNIERE_VERIFICATION = "2026-09-23";

export type Annexe = "8" | "10";

/**
 * Décalage mensuel : chaque heure travaillée dans le mois retire une fraction
 * de jour d'allocation. C'est la mécanique du « plus tu travailles, moins tu
 * touches ». Distincte de la franchise, et cumulative avec elle.
 *
 * Annexe 8  : heures / 8  × 1,4  = 0,175 jour par heure
 * Annexe 10 : heures / 10 × 1,34 = 0,134 jour par heure
 */
export const DECALAGE: Record<Annexe, { diviseur: number; coefficient: number }> = {
  "8": { diviseur: 8, coefficient: 1.4 },
  "10": { diviseur: 10, coefficient: 1.34 },
};

/** Franchise mensuelle, en jours. Annexe 10 : 3 jours si congés spectacles acquis. */
export const FRANCHISE: Record<Annexe, { base: number; avecConges: number }> = {
  "8": { base: 2, avecConges: 2 },
  "10": { base: 2, avecConges: 3 },
};

/**
 * ⚠️ CONFLIT NON TRANCHÉ sur le coefficient annexe 10.
 *
 * Deux valeurs circulent : 1,34 / 10 h (retenue ci-dessus) et 1 / 12 h.
 * Elles ne sont pas compatibles avec la règle des 27 jours (`JOURS_ACTIVITE_MAX`) :
 *
 *   - à 1,34/10 : 27 jours = 270 h → décalage 36 > 31 jours. L'indemnisation
 *     tombe à zéro dès 232 h (23,2 jours), donc AVANT le seuil des 27 jours,
 *     qui devient inatteignable et contredit le texte.
 *   - à 1/12   : 270 h → décalage 22, il reste ~6 jours que le seuil des
 *     27 jours vient couper. Les deux règles s'emboîtent.
 *
 * Test décisif sur un relevé France Travail réel : un mois à 3 cachets (36 h)
 * retire 4 jours à 1,34/10, et 3 jours à 1/12.
 *
 * Basculer = changer la seule ligne `"10"` de DECALAGE ci-dessus en
 * `{ diviseur: 12, coefficient: 1 }`, puis relancer `npm run check:intermittence`.
 */

/** Équivalence d'un cachet en heures. Identique pour un cachet isolé ou groupé. */
export const CACHET_HEURES = 12;

/**
 * Annexe 10 : à partir de ce nombre de jours d'activité dans le mois civil,
 * aucune indemnisation n'est versée. Les jours d'activité se déduisent des
 * heures sur une base de 10 h par jour.
 * Pas d'équivalent connu en annexe 8, d'où `null`.
 */
export const JOURS_ACTIVITE_MAX: Record<Annexe, number | null> = { "8": null, "10": 27 };

/** Base de conversion heures → jours d'activité, pour le seuil ci-dessus. */
export const HEURES_PAR_JOUR_ACTIVITE: Record<Annexe, number> = { "8": 8, "10": 10 };

/** Plafond du nombre de cachets pris en compte dans un mois civil. */
export const CACHETS_MAX_MOIS = 28;

/** Heures requises pour l'ouverture de droits, sur 12 mois. */
export const HEURES_REQUISES = 507;

/** Montant minimum servi, en euros. */
export const AJ_MINIMUM_SERVI: Record<Annexe, number> = { "8": 38, "10": 44 };

/** Lien officiel, cité partout où un montant calculé s'affiche. */
export const SIMULATEUR_FRANCE_TRAVAIL = "https://simucalcul.pole-emploi-services.fr/";
```

- [ ] **Étape 2 : vérifier la compilation**

Lancer : `npx tsc --noEmit`
Attendu : aucune erreur.

---

## Task 2 : cachets → heures

**Fichiers :**
- Créer : `src/modules/incomes/intermittence/hours.ts`

- [ ] **Étape 1 : écrire le fichier**

```ts
// src/modules/incomes/intermittence/hours.ts
import { CACHET_HEURES, CACHETS_MAX_MOIS } from "./params";

/**
 * Heures correspondant à un nombre de cachets. Un intermittent saisit des
 * cachets, le régime compte des heures : la conversion est faite pour lui.
 */
export function heuresPourCachets(cachets: number): number {
  if (!Number.isFinite(cachets) || cachets <= 0) return 0;
  return cachets * CACHET_HEURES;
}

/**
 * Nombre de cachets retenus dans un mois civil, plafond compris.
 * Au-delà du plafond, les cachets supplémentaires ne comptent pas.
 */
export function cachetsRetenus(cachets: number): number {
  if (!Number.isFinite(cachets) || cachets <= 0) return 0;
  return Math.min(Math.floor(cachets), CACHETS_MAX_MOIS);
}
```

- [ ] **Étape 2 : vérifier la compilation**

Lancer : `npx tsc --noEmit`
Attendu : aucune erreur.

---

## Task 3 : le décalage et les jours indemnisables

C'est le cœur du lot. À relire deux fois.

**Fichiers :**
- Créer : `src/modules/incomes/intermittence/indemnisation.ts`

- [ ] **Étape 1 : écrire le fichier**

```ts
// src/modules/incomes/intermittence/indemnisation.ts
import {
  type Annexe,
  DECALAGE,
  FRANCHISE,
  HEURES_PAR_JOUR_ACTIVITE,
  JOURS_ACTIVITE_MAX,
} from "./params";

/** Nombre de jours du mois civil. `mois` est 1-12. */
export function joursDuMois(annee: number, mois: number): number {
  return new Date(annee, mois, 0).getDate();
}

/**
 * Jours d'allocation retirés par le travail du mois.
 * Arrondi à l'entier INFÉRIEUR, et seulement à la fin : jamais sur un
 * résultat intermédiaire.
 *
 * 80 h en annexe 8  → (80 / 8)  × 1,4  = 14 jours
 * 36 h en annexe 10 → (36 / 10) × 1,34 = 4,824 → 4 jours
 */
export function decalage(heures: number, annexe: Annexe): number {
  if (!Number.isFinite(heures) || heures <= 0) return 0;
  const { diviseur, coefficient } = DECALAGE[annexe];
  return Math.floor((heures / diviseur) * coefficient);
}

/** Franchise du mois, en jours. */
export function franchise(annexe: Annexe, congesSpectaclesAcquis: boolean): number {
  const f = FRANCHISE[annexe];
  return congesSpectaclesAcquis ? f.avecConges : f.base;
}

export interface MoisIndemniseParams {
  annee: number;
  mois: number;               // 1-12
  heuresTravaillees: number;
  annexe: Annexe;
  congesSpectaclesAcquis: boolean;
  /** Allocation journalière notifiée par France Travail. null = inconnue. */
  aj: number | null;
}

/**
 * Jours d'activité du mois, déduits des heures. Sert au seuil de l'annexe 10.
 * Arrondi à l'entier inférieur : une journée entamée n'est pas une journée.
 */
export function joursActivite(heures: number, annexe: Annexe): number {
  if (!Number.isFinite(heures) || heures <= 0) return 0;
  return Math.floor(heures / HEURES_PAR_JOUR_ACTIVITE[annexe]);
}

/**
 * Annexe 10 : au-delà d'un certain nombre de jours d'activité dans le mois,
 * aucune indemnisation. Règle distincte du décalage, qui s'applique par-dessus.
 */
export function activiteBloquante(heures: number, annexe: Annexe): boolean {
  const seuil = JOURS_ACTIVITE_MAX[annexe];
  if (seuil === null) return false;
  return joursActivite(heures, annexe) >= seuil;
}

export interface MoisIndemnise {
  joursDuMois: number;
  franchise: number;
  decalage: number;
  joursActivite: number;
  /** true quand le seuil d'activité de l'annexe 10 coupe toute indemnisation. */
  activiteBloquante: boolean;
  /** Jamais négatif : un mois très travaillé plafonne à zéro jour indemnisé. */
  joursIndemnisables: number;
  /** null quand l'AJ n'est pas connue. Le montant n'est alors pas affiché. */
  montant: number | null;
}

/**
 * Décompte du mois. Trois déductions DISTINCTES, dans cet ordre :
 * la franchise, le décalage — leur cumul est l'erreur classique du domaine —
 * puis le seuil d'activité de l'annexe 10, qui écrase tout le reste.
 */
export function moisIndemnise(p: MoisIndemniseParams): MoisIndemnise {
  const jours = joursDuMois(p.annee, p.mois);
  const f = franchise(p.annexe, p.congesSpectaclesAcquis);
  const d = decalage(p.heuresTravaillees, p.annexe);
  const ja = joursActivite(p.heuresTravaillees, p.annexe);
  const bloquante = activiteBloquante(p.heuresTravaillees, p.annexe);

  const joursIndemnisables = bloquante ? 0 : Math.max(0, jours - f - d);

  return {
    joursDuMois: jours,
    franchise: f,
    decalage: d,
    joursActivite: ja,
    activiteBloquante: bloquante,
    joursIndemnisables,
    montant: p.aj === null ? null : Math.round(p.aj * joursIndemnisables * 100) / 100,
  };
}
```

- [ ] **Étape 2 : vérifier la compilation**

Lancer : `npx tsc --noEmit`
Attendu : aucune erreur.

---

## Task 4 : le compteur des 507 heures

**Fichiers :**
- Créer : `src/modules/incomes/intermittence/counter.ts`

- [ ] **Étape 1 : écrire le fichier**

```ts
// src/modules/incomes/intermittence/counter.ts
import { HEURES_REQUISES } from "./params";

export interface MissionComptee {
  /** YYYY-MM-DD */
  date: string;
  heures: number;
}

export interface Compteur {
  heuresAcquises: number;
  heuresRequises: number;
  heuresRestantes: number;
  droitsOuverts: boolean;
  /** Début de la fenêtre de 12 mois, YYYY-MM-DD. */
  debutFenetre: string;
  /** Fin de la fenêtre, YYYY-MM-DD. */
  finFenetre: string;
  /** Rythme observé sur la fenêtre, en heures par mois. */
  rythmeMensuel: number;
  /**
   * Mois estimés avant d'atteindre 507 h au rythme observé.
   * null si les droits sont ouverts, ou si le rythme est nul.
   */
  moisAvantOuverture: number | null;
}

function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${j}`;
}

/**
 * Compteur sur les 12 mois glissants s'achevant à `finFenetre`.
 * `finFenetre` est la date anniversaire quand elle est connue, sinon aujourd'hui.
 */
export function compteur(missions: MissionComptee[], finFenetre: Date): Compteur {
  const debut = new Date(finFenetre);
  debut.setFullYear(debut.getFullYear() - 1);
  debut.setDate(debut.getDate() + 1);

  const debutISO = toISO(debut);
  const finISO = toISO(finFenetre);

  const heuresAcquises = missions
    .filter((m) => m.date >= debutISO && m.date <= finISO)
    .reduce((total, m) => total + (Number.isFinite(m.heures) ? m.heures : 0), 0);

  const heuresRestantes = Math.max(0, HEURES_REQUISES - heuresAcquises);
  const rythmeMensuel = heuresAcquises / 12;

  return {
    heuresAcquises,
    heuresRequises: HEURES_REQUISES,
    heuresRestantes,
    droitsOuverts: heuresAcquises >= HEURES_REQUISES,
    debutFenetre: debutISO,
    finFenetre: finISO,
    rythmeMensuel,
    moisAvantOuverture:
      heuresAcquises >= HEURES_REQUISES || rythmeMensuel <= 0
        ? null
        : Math.ceil(heuresRestantes / rythmeMensuel),
  };
}
```

- [ ] **Étape 2 : vérifier la compilation**

Lancer : `npx tsc --noEmit`
Attendu : aucune erreur.

---

## Task 5 : le script de vérification

Les cas de test de la spec deviennent des assertions exécutables. Ce script est
la seule garantie de non-régression du calcul : il doit rester vert.

**Fichiers :**
- Créer : `scripts/check-intermittence.mjs`
- Modifier : `package.json` (ajout d'un script npm)

- [ ] **Étape 1 : écrire le script**

Le script importe les sources TypeScript via `tsx`, déjà présent ou installable
sans risque. Vérifier d'abord : `npx tsx --version`. S'il n'est pas disponible,
utiliser `npx tsx` qui le télécharge à la volée.

```js
// scripts/check-intermittence.mjs
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
```

- [ ] **Étape 2 : ajouter le script npm**

Dans `package.json`, section `scripts`, ajouter :

```json
"check:intermittence": "tsx scripts/check-intermittence.mjs"
```

- [ ] **Étape 3 : lancer et vérifier que tout passe**

Lancer : `npm run check:intermittence`
Attendu : toutes les lignes préfixées `✓`, aucune `✗`, code de sortie 0.

Si une assertion échoue, **ne pas modifier l'assertion pour la faire passer** :
les cas de test viennent de la spec et d'une vérification réglementaire. C'est
l'implémentation qui est fausse.

⚠️ **Deux assertions dépendent du coefficient annexe 10 non tranché** (voir le
bloc CONFLIT dans `params.ts`) : « artiste, 3 cachets → 4 jours retirés » et
« franchise et décalage se cumulent ». Si Eliott bascule le coefficient sur
1/12, ces deux attendus passent respectivement à **3 jours** et à
`decalage: 4, joursIndemnisables: 24, montant: 1248`. Les mettre à jour en même
temps que `params.ts`, jamais séparément.

---

## Task 6 : les paramètres du statut

**Fichiers :**
- Créer : `src/modules/incomes/intermittence/statut-params.ts`

Le `data` d'un `AdminStatus` est un `Record<string, unknown>` libre
(`src/lib/sidekick-store.ts:58`). Ce fichier est le seul point de lecture et
d'écriture typé de ce blob pour l'intermittence.

- [ ] **Étape 1 : écrire le fichier**

```ts
// src/modules/incomes/intermittence/statut-params.ts
import type { AdminStatus } from "@/lib/sidekick-store";
import type { Annexe } from "./params";

export interface IntermittenceParams {
  annexe: Annexe;
  /** Allocation journalière notifiée par France Travail, en euros. */
  ajNotifiee: number | null;
  /** YYYY-MM-DD */
  dateOuvertureDroits: string | null;
  /** YYYY-MM-DD. Fin de la fenêtre de 12 mois glissants. */
  dateAnniversaire: string | null;
  congesSpectaclesAcquis: boolean;
}

export const PARAMS_DEFAUT: IntermittenceParams = {
  annexe: "10",
  ajNotifiee: null,
  dateOuvertureDroits: null,
  dateAnniversaire: null,
  congesSpectaclesAcquis: false,
};

function nombreOuNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function texteOuNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/** Lecture tolérante : un statut sans paramètres renvoie les valeurs par défaut. */
export function lireParams(statut: AdminStatus | null | undefined): IntermittenceParams {
  const brut = (statut?.data?.intermittence ?? {}) as Record<string, unknown>;
  return {
    annexe: brut.annexe === "8" ? "8" : "10",
    ajNotifiee: nombreOuNull(brut.ajNotifiee),
    dateOuvertureDroits: texteOuNull(brut.dateOuvertureDroits),
    dateAnniversaire: texteOuNull(brut.dateAnniversaire),
    congesSpectaclesAcquis: brut.congesSpectaclesAcquis === true,
  };
}

/**
 * Écriture non destructive : le reste du `data` du statut est préservé.
 * Admin y range d'autres clés, les écraser casserait le module Statuts.
 */
export function ecrireParams(statut: AdminStatus, params: IntermittenceParams): AdminStatus {
  return { ...statut, data: { ...(statut.data ?? {}), intermittence: params } };
}
```

- [ ] **Étape 2 : vérifier la compilation**

Lancer : `npx tsc --noEmit`
Attendu : aucune erreur.

---

## Task 7 : la migration

**Fichiers :**
- Créer : `supabase/migrations/20260923100000_intermittence_refonte.sql`

- [ ] **Étape 1 : écrire la migration**

```sql
-- Refonte Revenus, lot 1 : intermittence.
-- Colonnes nullables : les missions existantes restent valides sans reprise.
-- Pas de colonne `cachet_type` : un cachet vaut 12 h qu'il soit isolé ou
-- groupé, la distinction n'a aucun effet de calcul.

alter table public.user_intermittence_missions
  add column if not exists end_date text;

alter table public.user_intermittence_missions
  add column if not exists cachets integer not null default 0;

alter table public.user_intermittence_missions
  add column if not exists annexe text;

-- La fenêtre de 12 mois glissants filtre systématiquement sur la date.
create index if not exists user_intermittence_missions_user_date_idx
  on public.user_intermittence_missions (user_id, date);
```

- [ ] **Étape 2 : appliquer sur Supabase**

Appliquer la migration sur le projet Supabase cloud par la méthode habituelle du
dépôt. **Demander à Eliott avant d'appliquer** : la base porte le seul compte
réel du projet.

- [ ] **Étape 3 : vérifier les colonnes**

Vérifier dans l'éditeur Supabase que `user_intermittence_missions` porte bien
`end_date`, `cachets` et `annexe`, et que les missions existantes ont
`cachets = 0` et `annexe = null`.

---

## Task 8 : brancher le type et le hook

**Fichiers :**
- Modifier : `src/modules/incomes/components/intermittence-types.tsx`
- Modifier : `src/hooks/useIncomesData.ts:154-182` (`missionToRow`, `rowToMission`)

- [ ] **Étape 1 : étendre le type**

Dans `src/modules/incomes/components/intermittence-types.tsx`, ajouter les trois
champs à `IntermittenceMission`, après `statutJuridiqueId` :

```ts
  /** Fin d'une mission sur plusieurs jours. Absent = mission d'un seul jour. */
  endDate?: string;
  /** Nombre de cachets déclarés. `hours` en est dérivé à la saisie. */
  cachets?: number;
  /** Annexe applicable. Absent = celle du statut rattaché. */
  annexe?: "8" | "10";
```

- [ ] **Étape 2 : étendre `missionToRow`**

Dans `src/hooks/useIncomesData.ts`, dans `missionToRow`, ajouter après
`statut_juridique_id` :

```ts
    end_date: m.endDate ?? null,
    cachets: m.cachets ?? 0,
    annexe: m.annexe ?? null,
```

- [ ] **Étape 3 : étendre `rowToMission`**

Dans le même fichier, dans `rowToMission`, ajouter après `statutJuridiqueId` :

```ts
    endDate: (row.end_date as string) ?? undefined,
    cachets: (row.cachets as number) ?? 0,
    annexe: (row.annexe as "8" | "10") ?? undefined,
```

- [ ] **Étape 4 : vérifier la compilation**

Lancer : `npx tsc --noEmit`
Attendu : aucune erreur.

---

## Task 9 : la carte des paramètres

**Fichiers :**
- Créer : `src/modules/incomes/components/IntermittenceParamsCard.tsx`

- [ ] **Étape 1 : écrire le composant**

Contrat :
- Props : `statut: AdminStatus`, `onSave: (next: AdminStatus) => void`.
- État local initialisé par `lireParams(statut)`, écrit par `ecrireParams`.
- Champs : annexe (`Select`, « Annexe 10, artistes » / « Annexe 8, techniciens »),
  allocation journalière (`Input type="number"`, en euros), date d'ouverture de
  droits (`DatePicker`), date anniversaire (`DatePicker`), congés spectacles
  acquis (`Switch`).
- Texte d'aide sous le champ d'allocation, sans tiret cadratin :
  « Le montant inscrit sur ta notification France Travail. Laisse vide si tu ne
  l'as pas encore. »
- Primitives de `src/components/ui/`. Toute contrainte de largeur va sur un
  élément englobant, jamais en `className` d'un primitif.
- Carte : `rounded-xl border border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5`.

- [ ] **Étape 2 : vérifier la compilation**

Lancer : `npx tsc --noEmit`
Attendu : aucune erreur.

---

## Task 10 : le bandeau compteur

**Fichiers :**
- Créer : `src/modules/incomes/components/IntermittenceHeader.tsx`

Modèle visuel : `src/modules/phono/components/CatalogHeader.tsx`. Le lire avant
d'écrire, et en reprendre la structure et les classes.

- [ ] **Étape 1 : écrire le composant**

Contrat :
- Props : `compteur: Compteur` (de `counter.ts`), `params: IntermittenceParams`.
- Quatre chiffres : heures acquises sur 507, heures restantes, date
  anniversaire, mois estimés avant ouverture (masqué si `moisAvantOuverture`
  vaut `null`).
- Barre de progression `Progress` sur `heuresAcquises / 507`, plafonnée à 100 %.
- Droits ouverts : accent `#F0FF00` et mention « Droits ouverts ».
- **Aucune mention « estimation » sur ce bandeau** : ce sont des totaux
  déclaratifs, pas un calcul réglementaire. La spec (section 8) l'exclut
  explicitement de la clause.

- [ ] **Étape 2 : vérifier la compilation**

Lancer : `npx tsc --noEmit`
Attendu : aucune erreur.

---

## Task 11 : le calendrier du mois

C'est l'écran qui porte la démonstration. Ne pas extraire la grille de
`GlobalCalendarPage.tsx` (984 lignes, en service) : écrire une grille dédiée,
plus petite et sans dépendance.

**Fichiers :**
- Créer : `src/modules/incomes/components/IntermittenceMonth.tsx`

- [ ] **Étape 1 : écrire le composant**

Contrat :
- Props : `missions: IntermittenceMission[]`, `params: IntermittenceParams`,
  `annee: number`, `mois: number` (1-12), `onMoisChange: (annee: number, mois: number) => void`.
- Grille de 7 colonnes, lundi en première colonne, cases vides avant le 1er.
- Chaque jour affiche ses missions (employeur tronqué + heures). Un jour
  travaillé prend une bordure accent.
- Une mission avec `endDate` marque tous les jours de `date` à `endDate`.
- Sous la grille, la ligne de démonstration, calculée par `moisIndemnise` :

  > ce mois : 48 h travaillées → 6 jours retirés, 3 de franchise → 22 jours
  > indemnisés × 52 € = 1 144 €

  Sans AJ connue, la phrase s'arrête aux jours indemnisés et invite à saisir
  l'allocation.
- Quand `activiteBloquante` vaut `true`, la ligne est remplacée par une mention
  distincte, sans tiret cadratin : « 27 jours d'activité ou plus dans le mois :
  aucune indemnisation ce mois-ci. » Ne pas la confondre avec un mois à zéro
  jour par le seul effet du décalage : ce sont deux causes différentes, et
  l'utilisateur doit savoir laquelle le concerne.
- **Mention obligatoire sous cette ligne** (spec, section 8), sans tiret
  cadratin : « Estimation, calculée avec les paramètres en vigueur au
  {DERNIERE_VERIFICATION}. Seule France Travail détermine tes droits. »
  suivie d'un lien vers `SIMULATEUR_FRANCE_TRAVAIL`.

- [ ] **Étape 2 : vérifier la compilation**

Lancer : `npx tsc --noEmit`
Attendu : aucune erreur.

---

## Task 12 : retirer le 35 % et recomposer la page

**Fichiers :**
- Modifier : `src/modules/incomes/components/IntermittenceDashboard.tsx`
- Modifier : `src/modules/incomes/components/IntermittencePage.tsx`

- [ ] **Étape 1 : supprimer le calcul inventé**

Dans `IntermittenceDashboard.tsx`, supprimer la ligne 77
(`const allocationEstimee = Math.round(totalGross12Months * 0.35);`), la carte
« Allocation ARE estimée » qui l'affiche, et la mention « Estimation indicative
basée sur 35 % des cachets. »

Supprimer aussi la barre de progression des 507 h et son bloc de rappel
réglementaire : ils sont repris par `IntermittenceHeader`.

Ce qui reste du fichier : les deux graphiques (cachets par mois, heures
cumulées) et les cartes de totaux.

- [ ] **Étape 2 : recomposer la page**

Dans `IntermittencePage.tsx`, vue `dashboard`, empiler dans cet ordre :
`IntermittenceHeader`, `IntermittenceMonth`, `IntermittenceParamsCard`, puis
`IntermittenceDashboard` allégé.

Le compteur se construit ainsi :

```tsx
const params = useMemo(() => lireParams(selectedStatut), [selectedStatut]);
const fin = useMemo(
  () => (params.dateAnniversaire ? new Date(params.dateAnniversaire) : new Date()),
  [params.dateAnniversaire]
);
const compteurValeurs = useMemo(
  () => compteur(missions.map((m) => ({ date: m.date, heures: m.hours })), fin),
  [missions, fin]
);
```

`onSave` de `IntermittenceParamsCard` appelle `setStatuses` de `useAdminData`
en remplaçant le statut par celui que renvoie `ecrireParams`.

- [ ] **Étape 3 : vérifier la compilation et le lint**

Lancer : `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur.

- [ ] **Étape 4 : vérifier qu'aucun 0,35 ne subsiste**

Lancer : `grep -rn "0\.35\|35 %\|35%" src/modules/incomes/`
Attendu : aucune occurrence.

---

## Task 13 : vérification à l'écran

**Fichiers :**
- Créer : `scripts/check-intermittence-ui.mjs`

- [ ] **Étape 1 : écrire le script de capture**

Sur le modèle de `scripts/shots.mjs` : login Playwright avec `SHOT_EMAIL` /
`SHOT_PASSWORD`, navigation vers `/incomes/intermittence`, capture du bandeau,
du calendrier et de la carte de paramètres.

⚠️ Compte réel. Le script **lit seulement**, il ne crée ni ne modifie aucune
mission. Les paramètres du statut se saisissent à la main pour la vérification,
puis se remettent à leur valeur d'origine.

- [ ] **Étape 2 : lancer le serveur et capturer**

Lancer : `npm run dev` dans un terminal, puis `node scripts/check-intermittence-ui.mjs`.

- [ ] **Étape 3 : contrôler les captures**

Vérifier point par point :
- le bandeau affiche les heures réelles du compte, pas un chiffre rond suspect ;
- le calendrier place les missions au bon jour, lundi en première colonne ;
- la ligne de démonstration bouge quand on change de mois ;
- la mention « Estimation » et le lien France Travail sont présents sous la
  ligne de démonstration ;
- plus aucune « Allocation ARE estimée » nulle part ;
- pas de double marge ni de fond superposé.

---

## Vérification finale du lot

- [ ] `npm run check:intermittence` — toutes les assertions passent
- [ ] `npx tsc --noEmit` — aucune erreur
- [ ] `npm run lint` — aucune erreur
- [ ] `grep -rn "0\.35" src/modules/incomes/` — aucune occurrence
- [ ] Captures d'écran contrôlées (Task 13)
- [ ] Les missions existantes du compte réel s'affichent toujours, avec leurs
      heures inchangées
- [ ] `ALPHA.md` mis à jour en fin de journée

**Aucun commit.** Eliott commite lui-même après vérification en dev local.

---

## Lots suivants

- **Lot 2 — Relevés** : table `user_income_statements`, reprise des imports,
  correction de la devise, retrait des deux dashboards d'analyse.
- **Lot 3 — Vue d'ensemble, UI/UX et recette facturation** : bloc état, bloc
  projection, coquilles de page homogènes, script de recette.
- **Lot 4 — Moteur ARE estimé** : `are.ts`, formule `A + B + C`, pour les
  primo-accédants qui n'ont pas encore d'allocation notifiée.
