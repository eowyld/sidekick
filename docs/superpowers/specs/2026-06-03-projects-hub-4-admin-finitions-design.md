# Projets Hub — Phase 4 : Admin (statuts & contrats) & finitions

Date: 2026-06-03
Statut: design validé (brainstorming)
Dépend de: Phase 1 (socle données & navigation)

## Contexte

Voir la « Vision d'ensemble » dans `2026-06-03-projects-hub-1-socle-donnees-design.md`.

Dernière dimension du hub + finitions transversales. Le projet référence un ou plusieurs **statuts juridiques** (sous quelle structure il est mené) et agrège les **contrats** rattachés. Niveau **rattachement + lecture** : la création et la signature des contrats restent dans le module Admin ; le projet les liste et y renvoie.

## Modèle de données

### Statuts juridiques rattachés

Déjà introduit en phase 1 : `linked_statut_ids jsonb` (tableau d'IDs) sur `user_projects`, référençant `user_admin_statuses.id`. Relation plusieurs-à-plusieurs côté projet.

### Contrats rattachés

Colonne `project_id` déjà créée en phase 1 sur la table `contracts`. Un contrat appartient à au plus un projet.

### Hooks

- Lecture des statuts via `useAdminData` (filtrer `statuses` par `linked_statut_ids`).
- Lecture des contrats via `useContractsData` filtré par `project_id`. Le set d'un `project_id` sur un contrat existant suit le pattern de mise à jour de `contracts-db.ts`.

## UI — Onglet Admin

1. **Statuts juridiques** :
   - Liste des statuts rattachés (nom, type, actif/inactif) — **lecture**.
   - Bouton « Rattacher un statut » → sélecteur multi parmi `user_admin_statuses` → met à jour `linked_statut_ids`.
   - Renvoi cliquable vers `/admin/statuts`.

2. **Contrats** :
   - Liste des contrats rattachés avec leur statut (`draft` / `sent` / `signed`), date.
   - Mise en avant des contrats **à signer** (non `signed`).
   - Bouton « Rattacher un contrat existant » → sélecteur parmi les contrats non tagués → set `project_id`.
   - Renvoi vers `/admin/contrats` pour créer/signer (pas de création depuis le projet — décision brainstorming « rattachement + lecture »).

## Cockpit (Vue d'ensemble) — carte Admin

Remplit la carte validée :
- « Statut : <nom du/des statut(s) rattaché(s)> ».
- « N contrats · X à signer » (X en accent si > 0).
- État vide : « Rattacher un statut / contrat ».
- Clic → onglet Admin.

## Finitions transversales

### Badges « Projet » inter-modules

Sur les fiches des entités rattachées, afficher un badge « Projet » cliquable renvoyant au dashboard projet, cohérent avec l'existant (titres/œuvres/dates) :
- Factures (Revenus) — phase 2 a posé `project_id`.
- Saisies royalties manuelles (Revenus).
- Publications & mailings (Marketing) — éventuellement déjà fait en phase 3.
- Contrats (Admin).

Un util partagé `ProjectBadge` (lit le projet par id, rend un chip cliquable) dans `src/modules/projects/components/`.

### Suggestions de tâches propres au projet

Réutiliser le moteur de règles algorithmiques (`src/modules/tasks/rules/`) pour produire des suggestions **contextualisées au projet**, affichées dans le bandeau bas du cockpit (Vue d'ensemble). Exemples :
- « Déposer le titre X à la SACEM avant le temps fort Y » (titre lié non déposé + temps fort futur).
- « Dépense réelle dépasse le prévisionnel sur le poste Z ».
- « Contrat en attente de signature avant le temps fort Y ».

Ajouter un `RuleContext` projet (ou un sous-ensemble de règles filtrées par `projectId`). Détail d'implémentation : suivre le pattern d'ajout de règle décrit dans `CLAUDE.md` (section « Task suggestions »).

### Archives

Finaliser l'accès aux anciens projets : petit bouton « Anciens projets » sur `/projects` (posé en phase 1), vérifier que `/projects/archives` lit bien depuis Supabase (`useProjectsData`, statut `archived`).

## Hors scope (phase 4)

- Création/signature de contrats depuis le projet (reste dans Admin).
- Génération automatique de contrats pré-remplis avec le contexte projet (envisagé puis écarté : « rattachement + lecture »).
- Suggestions IA dédiées projet (on réutilise seulement la couche de règles algorithmiques).

## Dépendances

Phase 1 (table `user_projects` + `linked_statut_ids`, colonne `project_id` sur `contracts`, coquille à onglets, cockpit). Les badges/suggestions touchent des entités posées en phases 2-3 : idéalement exécuter la phase 4 en dernier. Indépendante des phases 2 et 3 pour la partie Admin elle-même.
