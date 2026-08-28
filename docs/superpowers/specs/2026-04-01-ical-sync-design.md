# Design — Synchronisation iCal SIDEKICK

**Date:** 2026-04-01  
**Statut:** Validé  
**Scope:** Lecture seule, flux iCal abonné, mise à jour automatique via polling smartphone

---

## Résumé

Permettre à l'utilisateur de synchroniser son calendrier SIDEKICK avec Apple Calendar ou Google Calendar via un flux iCal standard (RFC 5545). Les modifications faites dans SIDEKICK apparaissent automatiquement sur le smartphone sans action manuelle (polling ~15min iOS, ~24h Google Calendar).

---

## 1. Base de données Supabase

### Table `calendar_events`

Source de vérité centralisée pour tous les événements de tous les modules.

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id      uuid NOT NULL REFERENCES auth.users(id)
date         date NOT NULL
time         time NULL
label        text NOT NULL
sub_label    text NULL
sector       text NOT NULL  -- live | phono | admin | marketing | edition | other
type         text NOT NULL  -- CalendarEventType
place        text NULL
source_module text NOT NULL  -- live | phono | admin | marketing | edition | custom
source_id    text NULL       -- ID de l'entité source dans son module
created_at   timestamptz DEFAULT now()
updated_at   timestamptz DEFAULT now()
```

`source_module + source_id` servent de clé de déduplication pour les migrations futures.

RLS : un utilisateur ne peut lire/écrire que ses propres événements (`user_id = auth.uid()`).

### Table `ical_tokens`

```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id          uuid NOT NULL REFERENCES auth.users(id) UNIQUE
token            uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE
enabled_sectors  text[] NOT NULL DEFAULT '{live,phono,admin,marketing,edition,other}'
created_at       timestamptz DEFAULT now()
```

Un seul token par utilisateur (UNIQUE sur `user_id`). Révoquer = supprimer la ligne.

---

## 2. Migration initiale des données

### Route `POST /api/calendar/migrate`

- Auth Supabase requise (JWT)
- Lit les événements agrégés depuis le localStorage côté client (passés dans le body)
- Insère dans `calendar_events` via upsert sur `(user_id, source_module, source_id)`
- Idempotente : peut être relancée sans créer de doublons
- Modules couverts : live (concerts, répétitions), phono (sorties, sessions), admin (deadlines, statuts), marketing, edition, custom

### Maintien en temps réel

Une fonction utilitaire `syncEventToSupabase(event: CalendarEvent, action: 'upsert' | 'delete')` :
- Appelée en **fire-and-forget** après chaque action utilisateur modifiant un événement
- Ne bloque pas l'UI — les erreurs sont silencieuses (localStorage reste la source locale)
- Localisation : `src/lib/calendar-sync.ts`

---

## 3. API Route iCal

### `GET /api/calendar/ical/[token]`

- Path param `token` (UUID) — pas de query params pour compatibilité maximale
- Valide le token dans `ical_tokens`, récupère `user_id` et `enabled_sectors`
- Requête `calendar_events` filtrée par `user_id` et `sector IN enabled_sectors`
- Génère un fichier `.ics` via **`ical-generator`** (npm)
- Headers : `Content-Type: text/calendar; charset=utf-8`, `Cache-Control: no-cache`

### Format des VEVENTs

| Champ iCal | Source |
|---|---|
| `SUMMARY` | `label` |
| `DTSTART` | `date` + `time` (si null → événement journée entière) |
| `DTEND` | `time` présent → +1h, sinon même jour (all-day) |
| `DESCRIPTION` | `sub_label` + secteur |
| `LOCATION` | `place` |
| `UID` | `sidekick-{event.id}@sidekick` (stable) |

---

## 4. UI de configuration

Panneau dans **`GlobalCalendarPage`** — accessible via un bouton "Sync" dans le header de la page.

### Contenu du panneau

1. **Checkboxes par secteur** — live, phono, admin, marketing, edition, other. Sauvegardées dans `ical_tokens.enabled_sectors` en base.
2. **Bouton "Générer le lien"** — crée le token en base (INSERT dans `ical_tokens`) si inexistant. Affiche le lien une fois généré.
3. **Affichage du lien** :
   - URL `webcal://` pour iOS/macOS (ouvre directement Apple Calendar)
   - URL `https://` pour Google Calendar (copier-coller)
   - Bouton "Copier"
4. **Instructions contextuelles** :
   - iOS : "Appuie sur le lien webcal pour l'ajouter à Apple Calendar"
   - Google : "Dans Google Calendar > Autres agendas > Depuis l'URL"
5. **Bouton "Révoquer"** — supprime le token, invalide immédiatement le lien

### Composant

`src/modules/calendar/components/ICalSyncPanel.tsx` — panneau latéral ou modal dans `GlobalCalendarPage`.

---

## 5. Mise à jour en temps réel

| Client | Fréquence de polling |
|---|---|
| iOS / macOS | ~15 minutes (système, non configurable) |
| Google Calendar | ~24h (limitation Google) |

Aucun mécanisme push nécessaire. Le polling est suffisant pour un usage solo.

---

## Dépendances

- **`ical-generator`** — génération .ics (npm, à installer)
- Supabase client existant (`src/lib/supabase.ts` et `src/lib/supabase-server.ts`)
- Migration SQL : nouvelle migration dans `supabase/migrations/`

---

## Ce qui est hors scope

- Synchronisation bidirectionnelle
- Notifications push
- Support multi-utilisateurs
- Gestion des fuseaux horaires (Europe/Paris hardcodé pour l'instant)
