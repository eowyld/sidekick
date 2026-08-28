# Projets Hub — Phase 3 : Campagne marketing

Date: 2026-06-03
Statut: design validé (brainstorming)
Dépend de: Phase 1 (socle données & navigation)

## Contexte

Voir la « Vision d'ensemble » dans `2026-06-03-projects-hub-1-socle-donnees-design.md`.

Chaque projet pilote sa propre campagne marketing. La campagne n'est **pas** un nouvel objet first-class : elle se matérialise par un **rattachement** (publications du calendrier éditorial + campagnes mailing taguées sur le projet) **organisé autour d'un ou plusieurs *temps forts***. Un temps fort n'est pas forcément une sortie — ça peut être un concert, une annonce, un clip… (un artiste 100 % live n'a que des dates de concert).

## Modèle de données

### Temps forts

Déjà introduits en phase 1 : `key_dates jsonb` sur `user_projects`.

```typescript
interface KeyDate {
  id: string;
  label: string;   // "Concert release", "Sortie clip"...
  type: string;    // "concert" | "sortie" | "clip" | "annonce" | ... (libre)
  date: string;    // ISO YYYY-MM-DD
}
```

### Rattachement des éléments marketing

Colonnes `project_id` déjà créées en phase 1 sur :
- `user_marketing_events` (publications / calendrier éditorial)
- `user_mailing_campaigns` (campagnes mailing)

Aucune nouvelle table. La campagne = l'ensemble des `user_marketing_events` + `user_mailing_campaigns` où `project_id = projet`.

### Hook

Étendre `useMarketingData` (ou ajouter une lecture dérivée dans les composants projet) pour filtrer events + campaigns par `project_id`. Setter d'un `project_id` sur un event/campagne existant suit le pattern optimiste standard.

## UI — Onglet Campagne marketing

1. **Rangée de temps forts** (en haut) :
   - Chaque temps fort : carte compacte avec label, type, date, et compte à rebours (J−X) si futur.
   - Ajout / édition / suppression inline (bouton « + »). Édite `key_dates` du projet.

2. **Timeline** (sous les temps forts) :
   - Axe vertical chronologique plaçant les publications (calendrier éditorial) et mailings rattachés, relatifs aux temps forts.
   - Chaque entrée : date, icône type (📸 publication / ✉️ mailing), titre, et tag source (« calendrier éditorial » / « campagne mailing »).
   - Actions :
     - **« Rattacher un existant »** → sélecteur des publications/mailings non encore tagués → set `project_id`.
     - **« Créer »** → redirige vers le module Marketing (`/marketing/publications` ou `/marketing/mailing`) avec `?projectId=xxx` pré-rempli ; à la sauvegarde, l'élément reçoit `project_id` et l'utilisateur revient au projet (même mécanique `?projectId=` que pour Phono/Édition/Live).

## Cockpit (Vue d'ensemble) — carte Campagne marketing

Remplit la carte validée :
- Titre : « Prochain temps fort : <label> » + type en accent + date + « J−X ».
- Sous-texte : « N autres temps forts · P publications · M mailings ».
- État vide si aucun temps fort : « Ajouter un temps fort ».
- Clic → onglet Campagne marketing.

## Touchpoints inter-modules

Sur une publication (calendrier éditorial) et une campagne mailing rattachées, afficher un **badge « Projet » cliquable** renvoyant au dashboard projet (cohérent avec les badges titres/œuvres/dates). Détail d'implémentation partagé avec la phase 4 (badges) — peut être fait ici pour les éléments marketing.

## Hors scope (phase 3)

- Objet « Campagne » first-class réutilisable hors projet.
- Automatisations (programmation d'envoi, rappels) au-delà de l'affichage de la timeline.
- Métriques de performance des publications/mailings.

## Dépendances

Phase 1 (table `user_projects` + `key_dates`, colonnes `project_id` sur `user_marketing_events` et `user_mailing_campaigns`, mécanique `?projectId=`, coquille à onglets, cockpit). Indépendante des phases 2 et 4.
