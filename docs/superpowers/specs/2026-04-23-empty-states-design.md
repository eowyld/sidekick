# Empty states — design spec

**Date** : 2026-04-23
**Statut** : validé — prêt pour planning
**Scope** : pages-feuilles de tous les modules

## Contexte

SIDEKICK n'a aujourd'hui pas de pattern unifié pour les états vides. Le code actuel mélange :

- Des petits textes gris discrets (`Aucun contact pour le moment…`)
- Des `<Card>` avec texte centré + hint ("Clique sur "Ajouter un titre" pour commencer.")
- Parfois aucun état vide du tout

Objectif : livrer **deux primitives partagées** et les appliquer sur toutes les pages-feuilles identifiées, avec une copy chaleureuse + pro qui explique à l'utilisateur ce que fait chaque page et comment démarrer.

## Périmètre

**In scope :**
- Deux composants UI partagés : `EmptyState`, `NoResult`
- Application sur 29 pages-feuilles (liste section §4)
- Copy validée par page (section §5)

**Hors scope (follow-up) :**
- Pages-hub / overviews (Dashboard, overview Phono, overview Live, overview Incomes…)
- Illustrations custom sur modules clés
- Variantes "minimal" / "inline" pour sous-sections internes
- Admin > Documents (jamais vide dans l'usage réel)

Les **sous-sections internes** d'une page (ex: "Dates passées" sur `TourDatesPage`, "Transports/Logements" dans le détail d'une date, sous-listes dans les modales) **gardent le pattern actuel** (petit texte gris discret). `EmptyState` est réservé aux pages entièrement vides.

Les **pickers dans les modales** (ex: ajouter une track à un album) **gardent aussi le petit texte gris**. `NoResult` est réservé aux recherches/filtres de pages principales.

## 1. Composant `EmptyState`

**Fichier** : `src/components/ui/empty-state.tsx`

### API

```tsx
import type { LucideIcon } from "lucide-react";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}
```

### Layout visuel

Pattern identique à `PageError` (`src/components/ui/page-error.tsx`) et `PageLoader`, centré plein écran dans la zone de contenu restante :

```tsx
<div className="flex flex-col items-center justify-center flex-1 gap-4 py-24 text-center">
  <Icon size={48} style={{ color: "rgba(245,245,245,0.4)" }} />
  <div className="flex flex-col gap-1">
    <p className="text-sm font-medium" style={{ color: "rgba(245,245,245,0.9)" }}>
      {title}
    </p>
    <p className="text-sm max-w-md" style={{ color: "rgba(245,245,245,0.7)" }}>
      {description}
    </p>
  </div>
  {action && (
    <Button variant="default" size="sm" onClick={action.onClick}>
      {action.label}
    </Button>
  )}
  {secondaryAction && (
    <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
      {secondaryAction.label}
    </Button>
  )}
</div>
```

**Notes visuelles :**
- Icône Lucide 48px, couleur `rgba(245,245,245,0.4)` (muted)
- Titre : `text-sm font-medium`, `rgba(245,245,245,0.9)`
- Description : `text-sm`, `rgba(245,245,245,0.7)`, `max-w-md`
- CTA principal : `Button variant="default"` (jaune néon `#F0FF00`)
- CTA secondaire : `Button variant="ghost"`
- Centré vertical via `flex-1` — l'en-tête de page reste visible au-dessus

### Placement dans la page

L'en-tête de page (titre + actions globales) reste visible. L'`EmptyState` occupe la zone de contenu restante.

Pour les pages à tabs (Phono Catalogue), l'`EmptyState` s'affiche **sous la barre de tabs** (les tabs restent visibles pour permettre le switch).

## 2. Composant `NoResult`

**Fichier** : `src/components/ui/no-result.tsx`

### API

```tsx
interface NoResultProps {
  query?: string;
  hasFilters?: boolean;
  onReset?: () => void;
  className?: string;
}
```

### Layout visuel

Plus compact que `EmptyState` — reste intégré dans la page.

```tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <SearchX size={32} style={{ color: "rgba(245,245,245,0.4)" }} />
  <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
    {message}
  </p>
  {onReset && (
    <Button variant="ghost" size="sm" onClick={onReset}>
      Réinitialiser les filtres
    </Button>
  )}
</div>
```

### Logique du message

| `query` | `hasFilters` | Message |
|---|---|---|
| défini | `true` | `Aucun résultat pour «{query}» avec ces filtres.` |
| défini | `false` | `Aucun résultat pour «{query}».` |
| `undefined` | `true` | `Aucun résultat avec ces filtres.` |
| `undefined` | `false` | `Aucun résultat.` |

Le bouton "Réinitialiser les filtres" s'affiche uniquement si `onReset` est fourni.

### Pages concernées

| Page | Query | Filtres |
|---|---|---|
| `ContactsPage` | oui | possibles |
| `CatalogPage` (par tab) | oui | non |
| `TourDatesPage` | — | oui |
| `GlobalCalendarPage` | — | oui |
| `BacklogPanel` | possible | possibles |
| `MailingPage` (contacts) | oui | possibles |

## 3. Ton et style de copy

- **Langue** : français
- **Tutoiement** : oui (aligné avec le code existant)
- **Ton** : chaleureux + complice, mais pro — pas de familiarité excessive
- **Vocabulaire métier** : utiliser quand ça sert (tourneur, label, DSP, SACEM, intermittent, cachet, AEM, master, EP, sync, backline) — pas gratuitement
- **Structure** : titre court (≤ 50 caractères), description 1-2 phrases courtes
- **Pas d'émojis**

## 4. Inventaire des pages-feuilles (29)

| Module | Fichier | Pages à traiter |
|---|---|---|
| Tasks | `BacklogPanel.tsx` | Backlog vide |
| Tasks | `AiSuggestions.tsx` | Suggestions IA vides |
| Contacts | `ContactsPage.tsx` | Carnet vide |
| Calendar | `GlobalCalendarPage.tsx` | Aucun événement |
| Admin | `StatutsPage.tsx` | Aucun statut |
| Admin | `ProceduresPage.tsx` | Aucune procédure |
| Admin | `ContractsPage.tsx` | Aucun contrat |
| Live | `TourDatesPage.tsx` | Aucune date (futures + passées) |
| Live | `RehearsalsPage.tsx` | Aucune répétition |
| Live | `EquipmentPage.tsx` | Inventaire vide |
| Live | `EquipmentPage.tsx` | Listes vides |
| Live | `ProspectionPage.tsx` | Aucune prospection |
| Phono | `CatalogPage.tsx` | Tab Titres vide |
| Phono | `CatalogPage.tsx` | Tab Albums vide |
| Phono | `CatalogPage.tsx` | Tab Podcasts vide |
| Phono | `SessionsStudioPage.tsx` | Aucune session (futures + passées) |
| Édition | `WorksPage.tsx` | Aucune œuvre |
| Édition | `SyncPage.tsx` | Aucune sync |
| Incomes | `InvoicesPage.tsx` | Aucune facture |
| Incomes | `RoyaltiesImports.tsx` | Aucun import |
| Incomes | `CopyrightHistorique.tsx` | Aucun versement |
| Incomes | `IntermittenceMissions.tsx` | Aucune mission |
| Marketing | `MailingPage.tsx` | Aucune campagne |
| Marketing | `MailingPage.tsx` | Aucun contact mailing |
| Marketing | `MailingPage.tsx` | Aucun segment |
| Marketing | `PresskitPage.tsx` | Presskit non configuré |
| Marketing | `MarketingCalendar.tsx` | Aucun événement marketing |
| Projects | `ProjectsPage.tsx` | Aucun projet |
| Projects | `ArchivesPage.tsx` | Aucun projet archivé |

## 5. Copy par page

### Tasks

**`BacklogPanel`**
- **Icône** : `Inbox`
- **Titre** : Ton backlog est vide
- **Desc** : Tout ce que tu dois faire sans date précise atterrit ici. Ajoute une tâche pour t'en souvenir plus tard.
- **CTA** : Ajouter une tâche

**`AiSuggestions`**
- **Icône** : `Sparkles`
- **Titre** : Pas encore de suggestions
- **Desc** : Ajoute quelques tâches, l'IA te proposera ensuite comment les organiser dans ta semaine.
- **CTA** : (aucun)

### Contacts

**`ContactsPage`**
- **Icône** : `Users`
- **Titre** : Ton carnet d'adresses est vide
- **Desc** : Tourneurs, labels, presse, partenaires : regroupe ici tous tes contacts pro.
- **CTA** : Ajouter un contact
- **CTA secondaire** : Importer depuis un CSV *(placeholder tant que l'import CSV n'est pas implémenté — voir §7)*

### Calendar

**`GlobalCalendarPage`**
- **Icône** : `Calendar`
- **Titre** : Aucun événement planifié
- **Desc** : Ton agenda regroupe automatiquement tes dates de tournée, répétitions, sorties, et événements que tu ajoutes à la main.
- **CTA** : Ajouter un événement

### Admin

**`StatutsPage`**
- **Icône** : `IdCard`
- **Titre** : Ajoute tes statuts
- **Desc** : Intermittent, micro-entreprise, SACEM, SACD… Référence ici tes statuts pour garder une vue claire sur ta situation administrative et les connecter aux différents modules Sidekick.
- **CTA** : Ajouter un statut

**`ProceduresPage`**
- **Icône** : `ListChecks`
- **Titre** : Aucune procédure enregistrée
- **Desc** : Démarches récurrentes, checklists, process à suivre : garde-les ici pour ne rien oublier.
- **CTA** : Ajouter une procédure

**`ContractsPage`**
- **Icône** : `FileSignature`
- **Titre** : Aucun contrat pour le moment
- **Desc** : Centralise tes contrats d'édition, de management, de cession, et leurs signatures.
- **CTA** : Ajouter un contrat
- **CTA secondaire** : Créer à partir d'un template

### Live

**`TourDatesPage`** (aucune date, ni future, ni passée)
- **Icône** : `MapPin`
- **Titre** : Aucune date de tournée
- **Desc** : Dates à venir, dates passées, transport, logement, fiche technique, note de frais : tout se gère ici.
- **CTA** : Ajouter une date

**`RehearsalsPage`**
- **Icône** : `Music2`
- **Titre** : Aucune répétition planifiée
- **Desc** : Planifie tes sessions de répétition, les musiciens présents, les morceaux travaillés.
- **CTA** : Planifier une répétition

**`EquipmentPage` — inventaire**
- **Icône** : `Package`
- **Titre** : Ton inventaire est vide
- **Desc** : Référence tout ton matériel (instruments, pédaliers, câbles, backline) pour le retrouver vite.
- **CTA** : Ajouter du matériel

**`EquipmentPage` — listes**
- **Icône** : `ClipboardList`
- **Titre** : Aucune liste de matériel
- **Desc** : Crée des listes pour préparer tes dates et créer tes fiches techniques : tournée été, résidence, plateau solo…
- **CTA** : Créer une liste

**`ProspectionPage`**
- **Icône** : `Target`
- **Titre** : Aucune prospection en cours
- **Desc** : Suivi de tes démarches pour décrocher des dates : salles, festivals, tourneurs contactés.
- **CTA** : Ajouter un prospect

### Phono

**`CatalogPage` — tab Titres**
- **Icône** : `Music`
- **Titre** : Aucun titre dans ton catalogue
- **Desc** : Recense tous tes titres : masters, versions instrumentales, remixes, featurings. Tu pourras ensuite les rattacher à un album ou EP.
- **CTA** : Ajouter un titre

**`CatalogPage` — tab Albums**
- **Icône** : `Disc3`
- **Titre** : Aucun album ni EP
- **Desc** : Regroupe tes titres en albums ou EP pour organiser ton catalogue et préparer tes sorties.
- **CTA** : Ajouter un album ou EP

**`CatalogPage` — tab Podcasts**
- **Icône** : `Mic`
- **Titre** : Aucun podcast
- **Desc** : DJ sets, mixes, émissions : référence ici les podcasts dans lesquels tu apparais ou que tu produis.
- **CTA** : Ajouter un podcast

**`SessionsStudioPage`**
- **Icône** : `AudioWaveform`
- **Titre** : Aucune session studio
- **Desc** : Sessions à venir, sessions passées, studio, intervenants, morceaux enregistrés : garde l'historique de ton activité studio et récupère tes droits voisins.
- **CTA** : Planifier une session

### Édition

**`WorksPage`**
- **Icône** : `BookOpen`
- **Titre** : Aucune œuvre déposée
- **Desc** : Tes œuvres éditoriales (compositions, textes, arrangements) : référence-les ici et suis leurs dépôts SACEM.
- **CTA** : Ajouter une œuvre

**`SyncPage`**
- **Icône** : `Clapperboard`
- **Titre** : Aucune sync pour le moment
- **Desc** : Synchronisations audiovisuelles (pub, film, série, jeu) : suis tes placements, leurs contrats et leurs droits.
- **CTA** : Ajouter une sync

### Incomes

**`InvoicesPage`**
- **Icône** : `Receipt`
- **Titre** : Aucune facture émise
- **Desc** : Émets, suis et archive tes factures : cachets, prestations, royalties. Relances et paiements en un coup d'œil.
- **CTA** : Créer une facture

**`RoyaltiesImports`**
- **Icône** : `FileSpreadsheet`
- **Titre** : Aucun import de royalties
- **Desc** : Importe tes relevés DSP (Spotify, Apple Music, Deezer…) ou de distributeur en CSV pour suivre tes revenus de streaming.
- **CTA** : Importer un CSV

**`CopyrightHistorique`**
- **Icône** : `Coins`
- **Titre** : Aucun versement enregistré
- **Desc** : Historique de tes versements SACEM et autres sociétés de gestion collective : montants, périodes, catégories de droits.
- **CTA** : Ajouter un versement

**`IntermittenceMissions`**
- **Icône** : `Briefcase`
- **Titre** : Aucune mission déclarée
- **Desc** : Référence tes missions (concerts, sessions, captations) avec cachet, employeur et AEM : tu gardes la main sur tes heures et ton régime.
- **CTA** : Ajouter une mission

### Marketing

**`MailingPage` — Campagnes**
- **Icône** : `Send`
- **Titre** : Aucune campagne
- **Desc** : Crée et envoie des newsletters à ta fanbase : annonces de sortie, dates, actualités.
- **CTA** : Créer une campagne

**`MailingPage` — Contacts**
- **Icône** : `UsersRound`
- **Titre** : Aucun contact mailing
- **Desc** : Ajoute les emails de ta fanbase pour pouvoir l'informer de tes sorties et de tes dates.
- **CTA** : Ajouter un contact
- **CTA secondaire** : Importer depuis un CSV *(placeholder tant que l'import CSV n'est pas implémenté — voir §7)*

**`MailingPage` — Segments**
- **Icône** : `Filter`
- **Titre** : Aucun segment
- **Desc** : Groupe tes contacts par ville, centre d'intérêt ou source pour cibler tes envois.
- **CTA** : Créer un segment

**`PresskitPage`**
- **Icône** : `Newspaper`
- **Titre** : Ton presskit n'est pas encore configuré
- **Desc** : Bio, photos HD, réseaux, citations presse, liens d'écoute : une page publique à partager avec la presse, les programmateurs, les partenaires.
- **CTA** : Configurer mon presskit

**`MarketingCalendar`**
- **Icône** : `CalendarDays`
- **Titre** : Aucun événement marketing
- **Desc** : Planifie tes annonces de sortie, posts réseaux, campagnes presse sur un calendrier éditorial dédié.
- **CTA** : Ajouter un événement

### Projects

**`ProjectsPage`**
- **Icône** : `FolderKanban`
- **Titre** : Aucun projet en cours
- **Desc** : Un projet rassemble un album, une tournée, une campagne : fédère les tâches, dates, contacts et documents liés à un même objectif.
- **CTA** : Créer un projet

**`ArchivesPage`**
- **Icône** : `Archive`
- **Titre** : Aucun projet archivé
- **Desc** : Retrouve ici tes projets terminés : albums sortis, tournées passées, campagnes closes.
- **CTA** : (aucun)

## 6. Règles d'intégration par page

Pour chaque page, le pattern d'intégration est :

1. **Après loading / error** (déjà gérés via `PageLoader` / `PageError`)
2. **Si aucune donnée** (collection vide, pas de filtre/query actif) → `<EmptyState …>`
3. **Si filtre/query actif + aucun résultat** → `<NoResult …>`
4. **Sinon** → contenu habituel

**Pages à tabs (Phono Catalogue) :** la barre de tabs reste visible au-dessus. Chaque tab évalue son propre état vide / no-result indépendamment.

**TourDatesPage & SessionsStudioPage :** une seule page affichant futures + passées. L'`EmptyState` ne s'affiche que si **aucune** date/session n'existe (ni future, ni passée). Si l'une des deux sections a du contenu, l'autre conserve son petit texte gris discret.

## 7. Copy placeholder pour features non implémentées

Les CTA secondaires "Importer depuis un CSV" (Contacts, Mailing Contacts) référencent une fonctionnalité non encore implémentée.

**Décision** : afficher le bouton dès cette itération. Son `onClick` déclenche temporairement une notification "Fonctionnalité à venir" (ou un `console.warn` + pas d'action). Quand l'import CSV sera implémenté, il suffira de remplacer le handler.

Cela évite de modifier le composant `EmptyState` pour supporter un état "bouton désactivé" et documente l'intention produit.

## 8. Plan de vérification

Pour chaque page :
1. Lancer `npm run dev`
2. Vider l'état (via `npm run reset-data` ou suppression Supabase dev)
3. Naviguer vers la page → vérifier `EmptyState` affiché (icône + titre + desc + CTA)
4. Cliquer le CTA → vérifier que l'action (ouverture de modale / navigation) fonctionne
5. Ajouter une entrée → vérifier que l'`EmptyState` disparaît
6. Tester `NoResult` sur les pages concernées (lancer une recherche sans match)

`npx tsc --noEmit` doit passer sans erreur nouvelle.

## 9. Follow-ups (hors scope — à traiter plus tard)

- Empty states des pages-hub / overviews (Dashboard, overview Phono, overview Live, overview Incomes, overview Marketing). Nécessitera probablement une variante plus riche (ex. "onboarding").
- Illustrations custom (au lieu d'icône Lucide) sur les modules les plus importants.
- Remplacer les petits textes gris des sous-sections par une mini-variante `inline` si ça devient utile.
- Contenu de `Admin > Documents` n'a pas d'empty state car jamais vide en pratique — à revisiter si ça change.
