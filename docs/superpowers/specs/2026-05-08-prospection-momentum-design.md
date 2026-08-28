# Prospection — Refonte momentum & historique de contacts

**Date :** 2026-05-08  
**Module :** `src/modules/live/components/ProspectionPage.tsx`  
**Hook :** `src/hooks/useLiveData.ts`  
**Table Supabase :** `user_live_prospection`

---

## Objectif

Transformer le tableau de prospection en un outil de terrain réaliste : historique complet des prises de contact par canal, signal de momentum caché calculé automatiquement, et tableau simplifié centré sur l'essentiel. Chaque prospect révèle ses détails dans un accordéon inline (comme le module Contacts).

---

## 1. Modèle de données

### Nouveaux champs dans `user_live_prospection`

| Colonne | Type SQL | Défaut | Description |
|---|---|---|---|
| `touchpoints` | `jsonb` | `'[]'` | Tableau des prises de contact |
| `reliability_tier` | `text` | `'neutral'` | Niveau de fiabilité du prospect |

Le champ `last_contact` existant est **conservé** pour compatibilité mais devient calculé — il est toujours mis à jour automatiquement à partir de la date du touchpoint le plus récent lors des mutations Supabase.

### Type TypeScript `ContactTouchpoint`

```ts
type ContactTouchpoint = {
  id: string;
  date: string;          // ISO 8601 (YYYY-MM-DD)
  channel: "mail" | "instagram" | "phone" | "in-person";
  direction?: "outbound" | "inbound" | "no-answer";
  // direction absent pour "in-person" (toujours bilatéral)
  note?: string;
};
```

### Type `ReliabilityTier`

```ts
type ReliabilityTier = "easy" | "neutral" | "hard";
```

### `ProspectionEntry` mis à jour

```ts
export type ProspectionEntry = {
  id: string;
  venueName: string;
  city: string;
  contact: string;
  email: string;
  instagram: string;
  phone: string;
  status: string;
  notes?: string;
  lastContact?: string;        // calculé auto, conservé pour compat
  touchpoints: ContactTouchpoint[];   // NOUVEAU
  reliabilityTier: ReliabilityTier;   // NOUVEAU
};
```

---

## 2. Moteur de momentum

Calculé **côté client** via `useMemo`. Jamais affiché en chiffre — traduit en un état lisible.

### Table de valeurs brutes

| Canal | Direction | Points |
|---|---|---|
| Mail | Envoyé (`outbound`) | 2 |
| Mail | Réponse reçue (`inbound`) | 5 |
| Instagram | DM envoyé (`outbound`) | 1 |
| Instagram | Réponse reçue (`inbound`) | 4 |
| Téléphone | Appel passé avec échange (`outbound`) | 3 |
| Téléphone | Appel reçu (`inbound`) | 5 |
| Téléphone | Pas de réponse (`no-answer`) | 0 |
| En personne | — | 6 |

### Décroissance temporelle

Demi-vie de **14 jours** (exponentielle) :

```
score_effectif(touchpoint) = valeur × 0.5^(jours_depuis_touchpoint / 14)
score_total = Σ score_effectif(tp) pour tous les touchpoints
```

### Seuils par `reliabilityTier`

| État | Label | Icône Lucide | `easy` | `neutral` | `hard` |
|---|---|---|---|---|---|
| Brûlant | Très actif | `Flame` | > 7 | > 9 | > 12 |
| Actif | Actif | `Zap` | > 4 | > 5 | > 7 |
| Tiède | Tiède | `Minus` | > 2 | > 2.5 | > 3 |
| En veille | En veille | `Moon` | > 0.5 | > 0.5 | > 0.5 |
| Inactif | Inactif | `X` | ≤ 0.5 | ≤ 0.5 | ≤ 0.5 |

### Couleurs des états

| État | Couleur texte | Fond |
|---|---|---|
| Brûlant | `#ef4444` | `bg-red-500/15` |
| Actif | `#f97316` | `bg-orange-500/15` |
| Tiède | `#eab308` | `bg-yellow-500/15` |
| En veille | `#60a5fa` | `bg-blue-500/15` |
| Inactif | `rgba(245,245,245,0.35)` | `bg-[rgba(245,245,245,0.06)]` |

---

## 3. Tableau simplifié

### Colonnes (dans l'ordre)

| # | Colonne | Largeur | Contenu |
|---|---|---|---|
| 0 | Expand toggle | 28px | `ChevronRight` rotatif |
| 1 | Lieu | 20% | `venueName` |
| 2 | Ville | 10% | `city` |
| 3 | Momentum | 14% | Icône + label (calculé) |
| 4 | Statut | 13% | Dropdown inline (inchangé) |
| 5 | Dernier contact | 9% | Date du touchpoint le plus récent |
| 6 | Actions | 72px | Éditer · Supprimer |

**Supprimées du tableau :** Contact, Email, Instagram, Téléphone, Notes — toutes dans la ligne dépliante.

Le tri par "Dernier contact" reste disponible (calculé depuis `touchpoints`).
Un nouveau tri par "Momentum" est ajouté (tri par score décroissant).

---

## 4. Ligne dépliante (accordéon)

Même implémentation que `ContactsPage.tsx` :
- `Fragment` avec deux `<tr>` par entrée
- Deuxième `<tr>` : `<td colSpan={7}>` avec animation `grid-rows-[0fr] → grid-rows-[1fr]`
- Bordure gauche `border-l-2 border-[#F0FF00]/40` quand ouvert

### Contenu de l'accordéon

Divisé en deux zones côte à côte (`grid grid-cols-2 gap-6`) :

**Zone gauche — Infos contact**
- Nom complet du contact (depuis `entry.contact`)
- Email (lien `mailto:`, stoppe propagation du clic)
- Instagram (lien `https://instagram.com/...`, stoppe propagation)
- Téléphone (lien `tel:`, stoppe propagation)
- Ville
- Notes (texte préformaté)

**Zone droite — Historique & ajout**
- Timeline des touchpoints triés par date décroissante :
  - Icône du canal (Mail / Instagram / Phone / Users)
  - Date formatée (`dd-mmm`)
  - Direction label (Envoyé / Reçu / Pas de réponse / — pour in-person)
  - Note si présente (texte tronqué)
  - Bouton poubelle pour supprimer le touchpoint
- Formulaire quick-add inline (toujours visible en bas de la zone) :
  - `DatePicker` (défaut : aujourd'hui)
  - Sélecteur canal (4 boutons pill : Mail · Instagram · Téléphone · En personne)
  - Sélecteur direction conditionnel (absent pour in-person) :
    - Mail/Instagram : Envoyé / Réponse reçue
    - Téléphone : Passé (échange) / Reçu / Pas de réponse
  - Input note courte (optionnel, placeholder : "Sujet, contexte…")
  - Bouton "Ajouter"

---

## 5. Niveau de fiabilité (Reliability tier)

Visible uniquement dans le formulaire de création/édition, pas dans le tableau.

Sélecteur à 3 options présentées comme des pills/boutons radio :

| Valeur | Label | Sous-titre |
|---|---|---|
| `easy` | Facile | Contact direct, lieu indépendant |
| `neutral` | Neutre | Cas standard |
| `hard` | Compliqué | Grande structure, contact indirect |

Défaut à la création : `neutral`.

---

## 6. Migration Supabase

Nouveau fichier : `supabase/migrations/TIMESTAMP_add_prospection_touchpoints.sql`

```sql
ALTER TABLE user_live_prospection
  ADD COLUMN IF NOT EXISTS touchpoints jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reliability_tier text NOT NULL DEFAULT 'neutral';
```

---

## 7. Fichiers à modifier

| Fichier | Nature de la modification |
|---|---|
| `supabase/migrations/...sql` | Nouveau — migration |
| `src/hooks/useLiveData.ts` | Ajouter champs types + row mappers |
| `src/modules/live/components/ProspectionPage.tsx` | Refonte complète UI |

Aucun nouveau fichier composant nécessaire — tout reste dans `ProspectionPage.tsx`.

---

## 8. Précisions de coexistence

**Statut vs Momentum — deux systèmes indépendants**
- `status` reste entièrement manuel (dropdown inline inchangé). Il représente l'avancement du deal ("À contacter", "En discussion", "Accepté"…).
- `momentum` est entièrement automatique (calculé, non modifiable). Il représente l'intensité de l'effort de contact récent.
- Le mécanisme d'auto-relance existant (`computeDisplayStatus` → "À relancer" après 21 jours sans `lastContact`) est **conservé** ; il continue de fonctionner car `lastContact` reste mis à jour automatiquement depuis les touchpoints.

**Champ `lastContact` retiré du formulaire d'édition**
Le `DatePicker` de `lastContact` présent dans le dialog create/edit est **supprimé**. La date est désormais entièrement dérivée du touchpoint le plus récent. Si aucun touchpoint n'existe, `lastContact` est `undefined`.

---

## 9. Hors scope

- Sync `touchpoints` → module Contacts (les données restent dans `user_live_prospection`)
- Notifications push de relance (le statut "À relancer" automatique existant couvre ce cas)
- Export CSV des touchpoints
- Scoring multi-prospects / classement global
