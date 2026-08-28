# Event Dialog Redesign — Spec

**Date:** 2026-05-06  
**Scope:** Refonte de la fenêtre de dialogue des événements du calendrier et du dashboard  
**Status:** Approved ✓

---

## Contexte

Les dialogs d'événements actuels (calendrier et dashboard) sont trop textuels et uniformes — un bloc `<p>Label : valeur</p>` dans un conteneur gris générique. Il n'y a pas de hiérarchie visuelle forte ni de sentiment de "moment" associé à l'événement.

---

## Décisions de design

| Question | Décision |
|---|---|
| Direction visuelle | **B — Format ticket/billet** : bloc date à gauche, badge secteur, champs tabulaires |
| Hiérarchie par tier | **Uniforme** — même gabarit pour tous les types d'événements |
| Actions | **CTA jaune "Voir dans [Module] →"** + bouton "Fermer" ghost |
| Composant partagé | Oui — même `EventDialog` utilisé par le calendrier et le dashboard |

---

## Anatomie du dialog

```
┌──────────────────────────────────────────────────────┐
│ [DATE BLOCK]    │  [Badge secteur + icône]            │
│   JJ (gros)     │  [Titre de l'événement]             │
│   MMM (caps)    │  [Sous-label / type d'événement]    │
├────────────────────────────────────────────────────────┤
│  Clé          Valeur                                   │
│  Clé          Valeur                                   │
│  ...                                                   │
├────────────────────────────────────────────────────────┤
│                          [Fermer]  [Voir dans X →]     │
└──────────────────────────────────────────────────────┘
```

### 1. Bloc date (gauche)

- Fond : couleur du secteur (ex. `bg-blue-400/80` pour Live)
- Jour : `text-[30px] font-extralight text-white`
- Mois : `text-[9px] font-bold tracking-[0.12em] uppercase text-white/55`
- Largeur fixe `w-16`, hauteur s'adapte au contenu
- **Événement passé** : opacité réduite sur le bloc date (`opacity-50`) + légère désaturation visuelle

### 2. Zone meta (droite du bloc date)

- Badge secteur : `inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold tracking-[0.07em] uppercase` avec bg coloré semi-transparent + border coloré
  - Ex. Live : `bg-blue-400/12 border border-blue-400/25 text-blue-400`
- Badge contient : icône Lucide `w-3 h-3` + label secteur
- Titre : `text-[14px] font-semibold text-[#F5F5F5]`
- Sous-label (type) : `text-[11px] text-[#F5F5F5]/40`

### 3. Corps — champs tabulaires

- Séparateur horizontal `h-px bg-[rgba(245,245,245,0.07)]` entre header et champs
- Chaque ligne : `flex gap-2 py-[6px] border-b border-[rgba(245,245,245,0.05)] text-[12px]`
- Clé : `text-[11px] text-[#F5F5F5]/33 min-w-[80px] shrink-0`
- Valeur : `text-[#F5F5F5]/82`
- Cas particulier — timetable : liste interne `flex gap-2 text-[11px]` avec l'heure en `text-[#F5F5F5]/35 tabular-nums min-w-[38px]`

### 4. Footer

- `flex justify-end items-center gap-2 px-4 py-[10px] border-t border-[rgba(245,245,245,0.08)]`
- Bouton "Fermer" : `variant="ghost" size="sm"`
- CTA "Voir dans [Module] →" : `variant="default" size="sm"` (jaune #F0FF00)
- **Cas spécial — événement custom** : pas de CTA, mais `variant="outline" size="sm"` Modifier + `variant="destructive" size="sm"` Supprimer

---

## Couleurs par secteur

| Secteur | Fond bloc date | Badge bg | Badge border | Badge text |
|---|---|---|---|---|
| live | `bg-blue-800` | `bg-blue-400/12` | `border-blue-400/25` | `text-blue-400` |
| phono | `bg-red-900` | `bg-red-400/12` | `border-red-400/25` | `text-red-400` |
| admin | `bg-violet-900` | `bg-violet-400/12` | `border-violet-400/25` | `text-violet-400` |
| marketing | `bg-emerald-900` | `bg-emerald-400/12` | `border-emerald-400/25` | `text-emerald-400` |
| edition | `bg-cyan-900` | `bg-cyan-400/12` | `border-cyan-400/25` | `text-cyan-400` |
| revenus | `bg-orange-900` | `bg-orange-400/12` | `border-orange-400/25` | `text-orange-400` |
| other | `bg-[rgba(245,245,245,0.06)] border-r border-[rgba(245,245,245,0.08)]` | `bg-white/8` | `border-white/12` | `text-[#F5F5F5]/55` |

---

## Champs affichés par type d'événement

### `representation` (Live)
- Salle, Ville, Adresse (optionnel), Organisateur (optionnel), Statut (optionnel)
- Horaires : timetable si présente
- Note (optionnel)
- **CTA :** "Voir dans Live →" → `/live`

### `rehearsal` (Live)
- Lieu, Heure (optionnel), Adresse (optionnel), Note (optionnel)
- **CTA :** "Voir dans Live →" → `/live`

### `session` (Phono)
- Studio/Lieu, Heure (optionnel), Type (optionnel)
- **CTA :** "Voir dans Phono →" → `/phono`

### `album_release` / `track_release` (Phono)
- Artiste (optionnel), Type (EP/Single/Album/Titre)
- **CTA :** "Voir dans Phono →" → `/phono`

### `invoice` (Revenus)
- N° facture, Client, Objet (optionnel), Montant (optionnel), Statut
- **CTA :** "Voir dans Revenus →" → `/revenus`

### `task_deadline` (variable)
- Tâche, Statut (À faire / Terminée), Description (optionnel)
- **CTA :** "Voir les tâches →" → `/tasks`

### `marketing_content` (Marketing)
- Titre, Statut (optionnel), Plateformes (optionnel), Types (optionnel)
- **CTA :** "Voir dans Marketing →" → `/marketing`

### `admin_procedure` (Admin)
- Démarche, Organisme (optionnel), Statut (optionnel), Notes (optionnel)
- **CTA :** "Voir dans Admin →" → `/admin`

### `admin_status_start` / `admin_status_end` (Admin)
- Statut, Type (optionnel), Actif (oui/non), Notes (optionnel)
- **CTA :** "Voir dans Admin →" → `/admin`

### `edition_event` (Édition)
- Événement, Début, Fin (optionnel)
- **CTA :** "Voir dans Édition →" → `/edition`

### `custom` (any sector)
- Heure (optionnel), Lieu (optionnel)
- **Footer :** Supprimer (destructive) + Modifier (outline) — pas de CTA

---

## Composant partagé

Créer `src/components/ui/event-dialog.tsx` qui exporte :

```ts
<EventDialog
  event={CalendarEvent | null}          // null = dialog fermé
  source={SourceData | null}            // données source enrichies
  onClose={() => void}
  onEdit?: (id: string) => void         // custom events seulement
  onDelete?: (id: string) => void       // custom events seulement
/>
```

Ce composant remplace :
- Le Dialog d'événement dans `GlobalCalendarPage.tsx` (lignes 1305–1679)
- Le Dialog d'événement dans `DashboardPage.tsx` (lignes 304–347)

Le `DashboardPage` devra adapter son type `RibbonEvent` pour passer un objet compatible `CalendarEvent` (ou enrichir `EventDialog` pour accepter les deux formes).

---

## Ce qui ne change pas

- Le Dialog de **création/modification d'événement custom** (`customDialogOpen`) reste inchangé — ce n'est pas dans le scope.
- La logique de `buildCalendarEvents()` et `selectedEventDetails` reste inchangée.
- Aucune modification du schéma Supabase.

---

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/components/ui/event-dialog.tsx` | **Créer** — nouveau composant partagé |
| `src/modules/calendar/components/GlobalCalendarPage.tsx` | Remplacer le Dialog d'événement par `<EventDialog>` |
| `src/modules/dashboard/components/DashboardPage.tsx` | Remplacer le Dialog d'événement par `<EventDialog>` |
| `src/modules/dashboard/components/DashboardWeekRibbon.tsx` | Aucun changement (passe juste les events au parent) |
