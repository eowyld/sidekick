# Dashboard redesign — Cockpit poétique

**Date:** 2026-04-26
**Status:** Brainstorm validé, en attente de plan d'implémentation
**Scope:** Refonte UI/UX de `/dashboard` — la première page de l'app

## Problème

Le dashboard actuel est trop brut : informations alignées sans hiérarchie émotionnelle, ton formel, peu engageant. C'est la première page après le login, elle doit donner envie d'utiliser l'outil.

## Direction artistique : Cockpit poétique

Une seule phrase forte change selon le contexte de l'utilisateur. Le reste de la page est en murmure : beaucoup d'air, typographie ultra-light, neon yellow `#F0FF00` réservé aux accents qui méritent l'attention.

**Pas de rupture de design system.** On garde le stack système, le `#101010` de fond, le `#F0FF00` accent. La poésie passe par poids ultra-light (`font-weight: 200`), espace généreux, et l'usage très parcimonieux du yellow.

## Composition de la page

```
┌─────────────────────────────────────────────────────────┐
│ ● Mardi · 14h32                                         │
│                                                         │
│ Trois jours avant le Trianon.                           │
│ Et 2 factures qui dorment.                              │
│                                                         │
│  4   tâches à faire     2   tâches urgentes     7  …    │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│ CETTE SEMAINE                          calendrier →     │
│ ┌────┬────┬────┬────┬────┬────┬────┐                    │
│ │ lun│ mar│ mer│ jeu│ ven│ sam│ dim│                    │
│ │ 28 │ 29 │ 30 │  1 │  2 │  3 │  4 │                    │
│ │ ●  │    │    │ ●  │    │ ●● │    │                    │
│ └────┴────┴────┴────┴────┴────┴────┘                    │
│                                                         │
│ AUJOURD'HUI                            tout voir →      │
│ ─ Confirmer la setlist Trianon       avant ce soir      │
│ ─ Relancer Universal pour le contrat en retard          │
│ ─ Envoyer les stems à Mathieu        demain             │
│ ─ Mise à jour presskit               cette semaine      │
└─────────────────────────────────────────────────────────┘
```

### 1. Header contextuel
- Un pulse `●` neon yellow + `{Jour} · {HH:hMM}` en label uppercase fin
- Pas de label de contexte ("En route", "Calme") — la phrase hero porte le sens à elle seule

### 2. Phrase hero
- Générée par **Claude Haiku** côté serveur, cachée 1×/jour par utilisateur
- Une seule phrase, ≤ 15 mots, ton tutoiement, FR
- Police système, `font-weight: 200`, `font-size: ~44px`, `line-height: 1.08`
- Mots-clés mis en valeur : `<em>` colorés en `#F0FF00`, `font-style: normal`, `font-weight: 300`

### 3. Stats inline (3 chiffres)
| Chiffre | Calcul | Couleur |
|---|---|---|
| Tâches à faire | `tasks.filter(t => t.todayFocus && t.status !== 'done').length` | Blanc |
| Tâches urgentes | `tasks.filter(t => t.status !== 'done' && deadline <= today + 1)` (en retard, aujourd'hui, ou demain — même définition que la règle d'urgence du hero) | Yellow si > 0, blanc sinon |
| Événements cette semaine | `buildWeekEvents(...).length` sur `[lundi, dimanche]` | Blanc |

Disposition horizontale, `gap: 56px`, chiffre `font-size: 36px font-weight: 200` à côté d'un label `font-size: 11px` en deux lignes max.

### 4. Bandeau semaine
- Grille 7 colonnes, gap 1px sur fond `rgba(245,245,245,0.08)` (technique des bordures)
- Chaque jour : label uppercase `lun/mar/...` + numéro de jour `font-size: 24px font-weight: 200`
- Jour actif : fond `rgba(240,255,0,0.04)`, label et numéro en yellow
- Événements : pastille couleur par secteur (live=blue, phono=red, revenus=orange, admin=violet, marketing=emerald, edition=cyan) + titre tronqué (max 2 lignes par jour, plus → `+N`)
- Lien `calendrier →` en haut à droite

### 5. Tâches du jour
- Section `AUJOURD'HUI`, lien `tout voir →`
- Liste en **2 colonnes pleine largeur** (gap 64px), tâches `todayFocus` non terminées
- Chaque ligne : dot yellow `4px` + titre + label "quand" à droite
- Si en retard : label "en retard" passé en `#F0FF00` (au lieu d'une couleur rose)
- Pas de bouton edit individuel (l'utilisateur clique le lien `tout voir →`)

### Éléments retirés
- La `Card` serveur (email + user id) actuellement en haut de `app/(app)/dashboard/page.tsx`
- La barre XP et le système niveau (`sidekickLevel`, `XpBar`)
- Le bouton `SignOutButton` est **déplacé dans le Header** (`src/components/layout/Header.tsx`)
- Le greeting `getGreeting()` (matin/après-midi/soir) — remplacé par la phrase hero

## Hero phrase — logique de génération

### Source
Route serveur `app/api/dashboard/hero-phrase/route.ts`, **POST**, calquée sur `app/api/tasks/ai-suggestions/route.ts` :
- Auth via `createServerSupabase`
- Le client envoie dans le body la liste minimale nécessaire : `{ tasks, events, projects }` (titres, dates, secteurs uniquement — pas de PII inutile). C'est nécessaire car `data.projects` vit encore en localStorage et n'est pas accessible côté serveur.
- Cache dans Supabase : table `user_dashboard_hero` (`user_id`, `phrase`, `accent`, `kind`, `generated_at`)
- Invalidation : si `generated_at` < début du jour courant en `Europe/Paris` → on régénère, sinon on retourne le cache directement (sans regarder le payload)
- Modèle : `claude-haiku-4-5-20251001`

### Sélection du contexte (côté serveur, avant l'appel modèle)
Règle de priorité :

1. **Urgence** — s'il existe au moins une tâche `status !== 'done'` avec `deadline ≤ today + 1 jour` (dépassée, aujourd'hui, ou demain), on prend la plus en retard. Contexte injecté : `{ kind: 'urgence', task: { title, deadline, sector, daysOverdue } }`.

2. **Événement <7j** — sinon, s'il y a un événement quelconque (live, phono, admin, revenus, marketing, edition, custom) dont la date tombe dans `[today, today+7j]`, on prend le plus proche. Contexte : `{ kind: 'event', event: { title, type, sector, date, daysUntil } }`.

3. **Question ouverte** — sinon, on tire **au hasard** 1 élément parmi : tâches non terminées, événements futurs (>7j), projets actifs (`data.projects` localStorage). Contexte : `{ kind: 'question', subject: { title, kind: 'task'|'event'|'project' } }`. Le prompt force le format `"Et si on travaillait {sur X} aujourd'hui ?"`.

4. **Fallback** — si zéro donnée : on saute Claude et on retourne directement `"Bonne {matinée|après-midi|soirée}."` (pas d'appel API, pas de cache).

### Format de sortie
Le modèle renvoie `{ phrase: string, accent: string }` :
- `phrase` : la phrase complète
- `accent` : un fragment de la phrase à mettre en `<em>` (le mot/groupe qui passe en yellow). Doit être une sous-chaîne de `phrase`.

Exemples attendus :
- Urgence : `phrase: "Une facture dort depuis 12 jours.", accent: "12 jours"`
- Événement : `phrase: "Trois jours avant le Trianon.", accent: "le Trianon"`
- Question : `phrase: "Et si on finissait le mix aujourd'hui ?", accent: "le mix"`

### Côté client
Le composant `DashboardPage` consomme la phrase via SWR : `useSWR('dashboard-hero', fetcher)`. Pendant le chargement initial, on affiche un placeholder ultra-discret (la phrase fallback du moment de la journée).

## Schéma Supabase

Nouvelle migration `supabase/migrations/<timestamp>_dashboard_hero.sql` :

```sql
create table user_dashboard_hero (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phrase text not null,
  accent text,
  kind text not null check (kind in ('urgence','event','question','fallback')),
  generated_at timestamptz not null default now()
);

alter table user_dashboard_hero enable row level security;

create policy "Users manage their own hero phrase"
  on user_dashboard_hero for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Fichiers touchés

| Fichier | Action |
|---|---|
| `src/modules/dashboard/components/DashboardPage.tsx` | Refonte complète — remplace contenu, garde le path |
| `app/(app)/dashboard/page.tsx` | Retirer la `Card` (email + user id) + `SignOutButton`, garder juste `<DashboardPageContent />` |
| `src/components/layout/Header.tsx` | Ajouter le `SignOutButton` (ou son équivalent menu) |
| `app/(app)/dashboard/sign-out-button.tsx` | À déplacer / réutiliser dans le Header (composant existant) |
| `app/api/dashboard/hero-phrase/route.ts` | **Nouveau** — route GET, génère ou retourne le cache |
| `supabase/migrations/<timestamp>_dashboard_hero.sql` | **Nouveau** — table `user_dashboard_hero` |
| `src/hooks/useDashboardHero.ts` | **Nouveau** — hook SWR qui appelle la route et gère le fallback |

## Hors scope
- Pas de changement sur les pages enfants (`/tasks`, `/calendar`, etc.) — les liens `tout voir →` pointent vers les routes existantes
- Pas de migration Supabase pour `data.projects` (toujours localStorage, hors scope ici)
- Pas de modification du `Sidebar` ni du `Header` au-delà de l'ajout du `SignOutButton`
- Pas de gamification (niveau, XP) — retirée volontairement, pourra revenir plus tard si besoin
