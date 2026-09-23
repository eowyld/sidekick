# Refonte Revenus — le registre des revenus, et le compteur d'intermittence

Date : 23/09/2026. Décisions prises avec Eliott en séance de brainstorming.

## Pourquoi

Le module Revenus s'est construit comme un outil d'analyse : quatre parsers de
distributeurs, des graphiques par titre, par store et par pays, un dashboard
SACEM. C'est le terrain sur lequel Spotify for Artists, DistroKid et TuneCore
sont imbattables — ils ont la donnée à la source, à jour, gratuitement.

Ce qu'aucun d'eux ne donne, et que personne d'autre ne peut donner :
**« combien j'ai gagné en tout cette année, toutes sources confondues »** —
royalties, SACEM, cachets et factures dans un seul chiffre. C'est ce qui sert à
la déclaration de revenus, au comptable, au calcul de l'intermittence.

D'où le déplacement : SIDEKICK n'est pas un outil d'analyse de royalties, c'est
**le registre des revenus**. Et l'intermittence, le seul endroit du module où
il y a un vrai calcul à faire que personne ne fait bien.

### Ce qui est cassé aujourd'hui, et qui motive le lot

Trois défauts relevés dans le code, pas supposés :

1. **Les parsers ne tolèrent rien.** `parseTuneCore` exige les colonnes
   anglaises exactes `Start Date`, `Store Name`, `Track Title`, `Quantity`,
   `Net Revenue`, et lève une erreur dure sinon
   (`src/modules/incomes/parsers/tunecore.ts:9`). Une colonne renommée, un
   export localisé, un `.tsv` : « Ce fichier ne ressemble pas à un export
   TuneCore ». Maintenir ça, c'est courir derrière quatre entreprises qui
   changent leurs exports quand elles veulent.

2. **La devise est écrite en dur.** `currency: "USD"` quoi que dise le fichier
   (`tunecore.ts:38`, `distrokid.ts:37`), puis conversion par une constante
   figée `USD_TO_EUR = 0.92` (`src/modules/incomes/overview/types.ts:30`). Le
   total consolidé est faux deux fois : la devise supposée, et le taux gelé.

3. **Un seul import est conservé par distributeur.**
   `ImportsStore = Record<Distributor, DistributorImport | null>` et
   `setImport(distributor, imp)` écrase. Importer le relevé d'octobre efface
   celui de septembre. L'historique annuel — la seule chose dont la vue
   d'ensemble a besoin — est impossible à construire mois par mois.

4. **L'allocation d'intermittence est inventée.**
   `Math.round(totalGross12Months * 0.35)`
   (`src/modules/incomes/components/IntermittenceDashboard.tsx:77`), affiché
   comme « estimation indicative basée sur 35 % des cachets ». Un chiffre faux
   sur le revenu d'un intermittent, c'est le pire endroit du produit pour se
   tromper.

Les points 2 et 4 affichent un chiffre faux à l'écran. Ils commandent l'ordre
du lot.

## 0. Ordre d'implémentation

C'est la partie qui décide de ce qui tombe si la journée déborde. Du plus
structurant au plus sacrifiable :

| # | Chantier | Pourquoi ici |
|---|---|---|
| 1 | Intermittence — modèle et compteur | le socle, tout le reste du module en dépend |
| 2 | Intermittence — indemnité par AJ saisie | fait disparaître le 35 % |
| 3 | Relevés | corrige la devise et l'écrasement d'historique |
| 4 | Vue d'ensemble — bloc état | la page répond enfin à une question |
| 5 | UI/UX — alignement sur Phono | cosmétique, mais visible partout |
| 6 | Facturation — recette scriptée | vérification, pas refonte |
| 7 | Vue d'ensemble — bloc projection | dépend du module Live |
| 8 | Moteur ARE estimé (A + B + C) | le seul dont l'absence ne laisse rien de cassé |

Les 1, 2 et 3 retirent des chiffres faux de l'écran : ils passent avant tout le
reste. Le 8 est en dernier parce que l'étape 2 le rend facultatif — un
intermittent déjà indemnisé connaît son AJ.

## 1. Intermittence — modèle de données

### Les missions (`user_intermittence_missions`)

Migration `20260923100000_intermittence_refonte.sql`, quatre colonnes ajoutées :

| Colonne | Type | Rôle |
|---|---|---|
| `end_date` | `text` nullable | mission sur plusieurs jours (résidence, tournée) |
| `cachets` | `integer` défaut 0 | nombre de cachets déclarés |
| `annexe` | `text` nullable | `8` \| `10`, repli sur l'annexe du statut |

Pas de colonne `cachet_type` : l'équivalence est de 12 h pour un cachet isolé
comme pour un cachet groupé (section 2), la distinction n'a donc aucun effet de
calcul. Un champ qui ne sert à rien finit par mentir.

`hours` **reste la valeur d'autorité** pour tous les calculs, mais elle est
dérivée à la saisie depuis les cachets et reste modifiable. Un intermittent
saisit des cachets, pas des heures ; le formulaire doit parler sa langue et
convertir pour lui.

Colonnes nullables partout : les missions existantes restent valides sans
reprise de données.

### Les paramètres du régime — aucune migration

`user_admin_statuses.data` est un `jsonb` libre
(`supabase/migrations/00000000000000_baseline.sql:436`), et les missions
portent déjà `statut_juridique_id`
(`20260908000000_facturation_supabase.sql:38`). Les paramètres vont donc dans
le `data` du statut intermittent, sans toucher au schéma :

```ts
{
  annexe: "8" | "10",
  ajNotifiee: number | null,        // € — lue sur la notification France Travail
  dateOuvertureDroits: string | null,  // YYYY-MM-DD
  dateAnniversaire: string | null,     // YYYY-MM-DD
  congesSpectaclesAcquis: boolean      // pilote la franchise en annexe 10
}
```

Ils se saisissent depuis Revenus > Intermittence, et s'écrivent sur le statut
Admin. Un seul endroit de vérité, celui qui existait déjà.

## 2. Intermittence — le moteur

Nouveau dossier `src/modules/incomes/intermittence/`, **fonctions pures, zéro
React, zéro réseau**, sur le modèle de `src/modules/tasks/rules/`. Un fichier,
une question :

| Fichier | Répond à |
|---|---|
| `hours.ts` | cachets → heures (12 h, isolé comme groupé), plafond de 28 cachets par mois |
| `counter.ts` | heures sur 12 mois glissants depuis la date anniversaire, reste à parcourir, date d'atteinte projetée au rythme actuel |
| `indemnisation.ts` | jours indemnisables du mois, et montant versé |
| `are.ts` (étape 8) | allocation journalière estimée, `A + B + C` |
| `params.ts` | table des paramètres réglementaires, datée et sourcée |

Cette séparation est ce qui rend le calcul vérifiable : on relit
`indemnisation.ts` seul, sans ouvrir un composant. Aucun nombre réglementaire
n'est écrit dans un composant ni en dur dans une fonction — tout vient de
`params.ts`.

### `indemnisation.ts` — le cœur

```
décalage = plancher( heures travaillées du mois ÷ diviseur × coefficient )

jours indemnisables = jours du mois civil − franchise − décalage
                      mais 0 si le seuil d'activité de l'annexe 10 est atteint

montant du mois = AJ × jours indemnisables
```

Franchise et décalage sont **deux déductions distinctes qui se cumulent**.
C'est l'erreur classique, et elle doit être explicite dans le code et dans les
commentaires.

L'arrondi du décalage se fait **à l'entier inférieur**, et **après** le calcul
complet — jamais sur un résultat intermédiaire.

### `params.ts` — les paramètres, sourcés

Source : règlement annexé à la convention d'assurance chômage du
**15 novembre 2024**, annexes 8 et 10 (unedic.org). Vérifié le 23/09/2026.

| | Annexe 8 (techniciens) | Annexe 10 (artistes) |
|---|---|---|
| Formule | `AJ = A + B + C` | `AJ = A + B + C` |
| A | `[AJmin × (0,42 × SR jusqu'à 14 400 € + 0,05 × SR au-delà)] ÷ 5 000` | `[AJmin × (0,36 × SR jusqu'à 13 700 € + 0,05 × SR au-delà)] ÷ 5 000` |
| B | `[AJmin × (0,26 × NHT jusqu'à 720 h + 0,08 × NHT au-delà)] ÷ 507` | `[AJmin × (0,26 × NHT jusqu'à 690 h + 0,08 × NHT au-delà)] ÷ 507` |
| C | `AJmin × 0,40` | `AJmin × 0,70` |
| AJ minimale | 31,96 € | 31,96 € |
| Minimum servi | 38 € | 44 € |
| Plafond | 34,4 % de 1/365e du plafond annuel des contributions (art. 16) | idem |
| Affiliation | 507 h sur les 12 mois précédant la fin de contrat (art. 3 §1er) | idem |
| Franchise | 2 jours par mois civil (art. 9 §1er e) | 2 à 3 jours selon congés acquis (art. 21) |
| Cachet → heures | sans objet | 1 cachet = 12 h, plafond 28/mois |

Deux articles à ne pas oublier : **art. 19**, déduction de 0,93 % au titre de
la retraite complémentaire ; **art. 20**, revalorisation annuelle du salaire de
référence.

#### Le décalage mensuel — coefficients validés

Confirmés par Eliott le 23/09/2026 sur les textes réglementaires (annexes VIII
et X, art. 32 §1er du règlement général ; fiches techniques UNÉDIC), et
corroborés par recherche indépendante.

| | Annexe 8 (techniciens) | Annexe 10 (artistes) |
|---|---|---|
| Diviseur | 8 h | 10 h |
| Coefficient | 1,4 | 1,34 |
| Par heure travaillée | 0,175 jour | 0,134 jour |
| Arrondi | entier inférieur | entier inférieur |

```ts
// src/modules/incomes/intermittence/params.ts
export const DECALAGE = {
  "8":  { diviseur: 8,  coefficient: 1.4  }, // 0,175 jour par heure
  "10": { diviseur: 10, coefficient: 1.34 }, // 0,134 jour par heure
} as const;

export const CACHET_HEURES = 12;      // isolé comme groupé
export const CACHETS_MAX_MOIS = 28;
```

**Cas de test obligatoires** de `indemnisation.ts` — ils sont la spécification,
pas une illustration :

| Cas | Calcul | Attendu |
|---|---|---|
| Technicien, 80 h dans le mois | `(80 ÷ 8) × 1,4 = 14` | **14 jours** retirés |
| Artiste, 3 cachets dans le mois | `3 × 12 = 36 h`, puis `(36 ÷ 10) × 1,34 = 4,824` | **4 jours** retirés |

Le premier cas dit tout : 10 jours réellement travaillés (base 8 h) retirent
**14 jours** d'allocation. Le rapport jours retirés / jours travaillés vaut 1,4,
strictement supérieur à 1 — c'est là qu'est la sur-pénalisation, et c'est ce
que le calendrier doit rendre visible. (À écrire dans cette unité : rapporté
aux *heures*, le coefficient vaut 0,175, il n'y a rien à y lire.)

#### Le seuil d'activité de l'annexe 10 — implémenté

En annexe 10, **27 jours d'activité ou plus dans le mois civil** (jours déduits
des heures sur une base de 10 h par jour) suppriment toute indemnisation.
Confirmé le 23/09/2026. C'est une troisième déduction, distincte de la
franchise et du décalage, et elle les écrase : quand elle joue, les jours
indemnisables valent zéro quel que soit le reste.

L'écran doit distinguer ce cas d'un mois tombé à zéro par le seul décalage.
Ce sont deux causes différentes et l'utilisateur doit savoir laquelle le
concerne.

#### ⚠️ Conflit non tranché sur le coefficient annexe 10

Le seuil des 27 jours est **arithmétiquement incompatible** avec le coefficient
1,34 ÷ 10 h :

| | à 1,34 / 10 h | à 1 / 12 h |
|---|---|---|
| Décalage à 270 h (27 jours) | 36 jours | 22 jours |
| Jours restants sur un mois de 31, franchise 3 | 0, déjà | 6 |
| Indemnisation tombe à zéro dès | 232 h, soit 23,2 jours | jamais par le seul décalage |
| Le seuil des 27 jours est | inatteignable, donc code mort, et contredit par la formule | nécessaire et utile : il coupe les 6 derniers jours |

Les deux règles ne s'emboîtent qu'à 1/12. Une variante à **1,3** circule par
ailleurs face au 1,34.

**Test décisif**, à faire sur un relevé France Travail réel : un mois à
**3 cachets (36 h)** retire **4 jours** à 1,34/10, et **3 jours** à 1/12.

En attendant l'arbitrage, `params.ts` retient 1,34/10 comme Eliott l'a validé,
documente le conflit en commentaire, et isole la valeur pour que la bascule
tienne en une ligne. Deux assertions du script de vérification dépendent de ce
choix et sont signalées comme telles.

### Les écrans

- **Bandeau compteur**, sur le modèle de
  `src/modules/phono/components/CatalogHeader.tsx` : heures acquises, reste à
  parcourir, date anniversaire, date d'atteinte projetée. Les chiffres servent
  de filtres sur la liste, comme dans Phono.
- **Vue calendrier du mois** : chaque jour porte ses missions. Sous le
  calendrier, la ligne qui fait toute la démonstration :

  > ce mois : 48 h travaillées → 21 jours indemnisés × 52 € = 1 092 €

  Ajouter une date fait bouger le chiffre sous les yeux. C'est la pédagogie que
  le module doit à l'utilisateur, montrée plutôt qu'expliquée.
- **Liste des missions**, conservée, alignée sur le style des listes refondues.

`IntermittenceDashboard.tsx` perd ses 35 % et ses deux graphiques au profit du
bandeau et du calendrier.

## 3. Relevés

### La table (`user_income_statements`, nouvelle)

Même migration que l'intermittence.

| Colonne | Type | Rôle |
|---|---|---|
| `id` | `text` PK | |
| `user_id` | `uuid` | |
| `source_kind` | `text` | `distributor` \| `sacem` \| `other` |
| `source` | `text` | libre : « DistroKid », « SACEM », « Believe » |
| `period_start` | `text` | `YYYY-MM` |
| `period_end` | `text` | `YYYY-MM`, égal à `period_start` pour un relevé mensuel |
| `amount` | `numeric` | montant net, dans sa devise |
| `currency` | `text` défaut `EUR` | |
| `amount_eur` | `numeric` | équivalent euros, **figé à la saisie** |
| `fx_rate` | `numeric` nullable | taux utilisé, conservé pour l'audit |
| `detail` | `jsonb` défaut `[]` | lignes du fichier importé, consultatives |
| `project_id` | `text` nullable | ventilation par projet |
| `created_at` | `timestamptz` | |

RLS et cascade sur `user_id` alignées sur les tables voisines
(`20260915120000_user_fk_cascade.sql`).

**La devise est réglée à la racine** : on stocke le montant dans sa devise et
son équivalent euros figé au taux du jour de saisie. `USD_TO_EUR` disparaît de
`src/modules/incomes/overview/normalize.ts`, et `normalizeRoyalties` lit
`amount_eur`.

### Les écrans

Royalties et Droits d'auteur **restent deux routes** — la fusion a été écartée.
Ils partagent la table, le hook et le composant de liste, filtrés sur
`source_kind`. Pas de changement dans la Sidebar.

Le chemin principal devient la **saisie d'un relevé** : source, période,
montant. Trois champs, dix secondes par mois. C'est le seul chiffre dont la vue
d'ensemble a besoin, et c'est ce qu'un artiste acceptera de saisir — à la
différence de la ligne par titre, par store et par pays que demande
`RoyaltiesManualModal` aujourd'hui, que personne ne saisira jamais.

L'**import CSV survit comme accélérateur** : il produit **un** relevé, le total
du fichier, et range le détail dans `detail` pour qui veut le déplier. En cas
d'échec du parsing, plus d'erreur bloquante : on ouvre la saisie du montant
avec le nom du fichier pré-rempli. Le parsing devient un confort qui peut
échouer sans conséquence, au lieu d'une promesse qui casse.

`RoyaltiesDashboard.tsx` (262 lignes de graphiques par titre et par store) et
`CopyrightDashboard.tsx` (458 lignes) sont retirés : c'est exactement le
terrain où les dashboards des distributeurs gagnent.

### Reprise des données existantes

One-shot, sur le modèle de `src/lib/migrate-facturation-to-supabase.ts` :
idempotente et non destructrice.

- chaque `DistributorImport` de `user_royalties_imports` → un relevé par
  couple (distributeur, période), montant = somme des entrées de la période,
  détail conservé dans `detail` ;
- chaque `ManualEntry` de `user_royalties_manual` → un relevé ;
- chaque relevé SACEM → un relevé `source_kind: "sacem"`.

Les anciennes tables restent en place, en lecture seule. Rien n'est supprimé
tant que la reprise n'a pas tourné sur le compte de captures.

## 4. Vue d'ensemble

Trois blocs, dans cet ordre.

**1. État** — ce qui appelle une action, toujours « maintenant » :

- « On te doit X € » : factures émises non encaissées, dont N en retard.
  Cliquable vers la liste filtrée.
- « 507 h : X h acquises, il te reste Y, anniversaire le Z ».
- « Encaissé en 2026 : X € ».

**2. Projection** — ce qui arrive :

- engagé non encaissé : factures émises + dates Live confirmées non encore
  facturées ;
- indemnité prévisionnelle du mois, depuis `indemnisation.ts`.

**3. Analytics** — les cinq cartes actuelles (`OverviewKpis`,
`MonthlyRevenueChart`, `ModuleBreakdown`, `ProjectBreakdown`,
`YearlyComparison`), conservées et réordonnées. `ProjectBreakdown` et
`YearlyComparison` sont masqués s'ils n'ont pas de données — sur un compte
neuf, ils affichent un cadre vide qui ne dit rien.

**Règle non négociable du bloc : le sélecteur d'année ne pilote que les
analytics.** L'état et la projection sont toujours au présent. Un « on te doit
1 200 € » filtré sur 2024 ne veut rien dire, et c'est le piège naturel de la
page telle qu'elle est construite aujourd'hui.

## 5. UI/UX

`RoyaltiesPage.tsx:59` et `IntermittencePage` portent leur propre
`bg-[#101010] px-2 py-4 md:px-4 md:py-6` **par-dessus** le
`<main className="flex-1 p-6">` du shell, alors que `IncomesOverviewPage` n'a
que `space-y-6`. Résultat : doubles marges et fonds superposés selon l'écran.
On aligne toutes les pages du module sur `IncomesOverviewPage`.

Le reste est déjà largement en place (`EmptyState`, `NoResult`, `PageLoader`,
`PageError` sont utilisés dans six fichiers du module). Il manque le **bandeau
de tête à la Phono** sur chaque sous-écran, dont les stats servent de filtres.

Rappel qui coûte cher quand on l'oublie : `cn()` ne résout pas les conflits
Tailwind. Toute classe de largeur ou de position sur un primitif va sur un
élément englobant, jamais en `className` du primitif.

## 6. Facturation

Pas de refonte : aucun `TODO` dans le module, rien dans `BETA.md` côté dette.
Le besoin est une **vérification**, pas une reconstruction.

Script Playwright dans `scripts/`, sur le modèle de `scripts/shots.mjs` (login
par `SHOT_EMAIL` / `SHOT_PASSWORD`) : création → lignes → PDF → encaissement →
statut → règle `canIssueInvoices`.

⚠️ Le compte de captures est un **compte réel**, seul compte restant du projet
Supabase. Le script supprime sa facture de test en sortie, y compris si une
étape échoue.

## 7. Hors périmètre, et risques assumés

**Hors périmètre, décidé :**

- Pas de `tailwind-merge`, pas de refonte de `cn()` : décision post-alpha actée
  dans `CLAUDE.md`, `input.tsx` est importé par 58 fichiers et `button.tsx` par
  121.
- Pas de fusion Royalties / Droits d'auteur.
- Pas de parsing tolérant (détection automatique, mapping de colonnes
  corrigeable) : l'import n'est plus le chemin principal, il ne mérite plus cet
  investissement.
- Marketing et Comptabilité restent fermés (`coming-soon.ts`).
- Factur-X reste coupé du périmètre alpha.

**Risques assumés :**

- La reprise des relevés tourne sur des données réelles. Elle est idempotente
  et ne supprime rien, mais elle passe sur le compte de captures avant tout
  autre.
- **Le coefficient de décalage de l'annexe 10 n'est pas tranché** (section 2).
  C'est le risque principal du lot : le 1,34/10 retenu est arithmétiquement
  incompatible avec le seuil des 27 jours, et une variante à 1,3 circule par
  ailleurs. Un relevé France Travail réel sur un mois à 3 cachets tranche.
  Tant que ce n'est pas fait, le montant mensuel affiché peut être faux d'un
  jour d'allocation, et la clause de la section 8 est ce qui couvre l'écart.

## 8. La clause de non-responsabilité sur les calculs

Décision d'Eliott, 23/09/2026 : **SIDEKICK ne doit engager sa responsabilité
sur aucun chiffre calculé d'intermittence.** La clause ne se limite pas au
moteur ARE, elle couvre tout montant ou décompte produit par le module — AJ
estimée, décalage, jours indemnisables, montant du mois, compteur des 507 h.

Trois éléments, présents partout où un chiffre calculé s'affiche :

1. Le mot **« estimation »** au contact du chiffre, pas en bas de page.
2. La **date des paramètres réglementaires** utilisés (`params.ts` porte une
   constante `DERNIERE_VERIFICATION`, affichée telle quelle).
3. Un **lien vers le simulateur officiel France Travail**, désigné comme la
   seule référence opposable.

Plus une mention unique sur l'écran Intermittence : les calculs sont indicatifs,
seule France Travail détermine les droits, et l'artiste doit vérifier auprès
d'elle.

Ce qui échappe à la clause : les **totaux déclaratifs**. Le cumul d'heures et
de cachets saisis n'est pas un calcul réglementaire, c'est une addition de ce
que l'utilisateur a entré. Le présenter comme une estimation décrédibiliserait
la partie du module qui est justement fiable.

⚠️ La clause réduit l'exposition, elle ne l'annule pas : une information
erronée mise en avant dans le produit reste opposable côté droit de la
consommation, sujet déjà rencontré sur l'épisode Factur-X (`ALPHA.md`). Le
libellé exact est à faire relire avant la bêta payante.
