# Design — Cache SWR + PageLoader

**Date:** 2026-04-12  
**Statut:** Approuvé

---

## Objectif

1. Supprimer le flash de page vide lors du chargement des données — afficher un spinner centré à la place.
2. Mettre en cache les données fetchées en session pour éviter les re-fetch inutiles lors des navigations entre pages.

---

## Composant PageLoader

### Fichier
`src/components/ui/page-loader.tsx`

### Comportement
Composant sans props, centré verticalement dans le conteneur parent (`flex-1`). Affiche :
- Un spinner circulaire animé (`animate-spin`) en accent jaune `#F0FF00` avec bordure transparente en haut
- Un texte `Chargement des données…` en muted

### Usage dans chaque page
```tsx
if (isLoading) return <PageLoader />
```

### Ce que ça remplace
- Les `if (loading) return <div>Chargement…</div>` texte brut existants
- Les pages sans aucune gestion du loading (page vide visible)

---

## Cache SWR

### Installation
`swr` (package Vercel, déjà compatible Next.js App Router)

### Configuration globale — SWRProvider
Fichier : `src/components/providers/SWRProvider.tsx`  
Injecté dans `src/app/layout.tsx` autour du contenu protégé.

```ts
{
  dedupingInterval: 30_000,      // re-fetch max toutes les 30s
  revalidateOnFocus: false,      // pas de re-fetch au retour sur l'onglet
  revalidateOnReconnect: true,   // re-fetch si connexion retrouvée
  shouldRetryOnError: false,     // pas de retry automatique sur erreur Supabase
}
```

### Clés de cache SWR (par hook)

| Hook | Clé SWR |
|---|---|
| `useTasksData` | `"user_tasks"` |
| `useContactsData` | `"user_contacts"` |
| `useCalendarData` | `"calendar_events"` |
| `useAdminData` | `"user_admin"` |
| `useLiveData` | `"user_live"` |
| `useMarketingData` | `"user_marketing"` |
| `usePhonoData` | `"user_phono"` |
| `useEditionData` | `"user_edition"` |
| `useIncomesData` | `"user_incomes"` |
| `useContractsData` | `"user_contracts"` |

### Pattern de migration (par hook)

**Avant :**
```ts
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  supabase.from("table").select("*").then(({ data }) => {
    setData(data ?? [])
    setLoading(false)
  })
}, [])
```

**Après :**
```ts
const { data = [], isLoading } = useSWR("clé", async () => {
  const { data } = await supabase.from("table").select("*")
  return data ?? []
})
```

### Mutations — pattern optimiste avec invalidation SWR

Les mutations conservent leur logique optimiste actuelle. On ajoute un appel `mutate()` après chaque opération Supabase réussie pour synchroniser le cache SWR.

```ts
import { mutate } from "swr"

// Après upsert/delete réussi :
await mutate("clé")  // revalide silencieusement en arrière-plan
```

En cas d'erreur, le rollback local suffit — SWR récupère l'état correct au prochain revalidation.

---

## Périmètre — hooks à migrer vers SWR

| Hook | Statut |
|---|---|
| `useTasksData` | Migrer |
| `useContactsData` | Migrer |
| `useCalendarData` | Migrer |
| `useAdminData` | Migrer |
| `useLiveData` | Migrer |
| `useMarketingData` | Migrer |
| `usePhonoData` | Migrer |
| `useEditionData` | Migrer |
| `useIncomesData` | Migrer |
| `useContractsData` | Migrer (vérifier structure lors de l'implémentation — peut avoir des particularités comme useDriveData) |
| `useDriveData` | **Exclure** — voir ci-dessous |
| `useSidekickData` | **Exclure** — localStorage, pas Supabase |

### Cas spécial — useDriveData (DocumentsPage)

`useDriveData` gère du Supabase Storage (upload de fichiers, navigation dans des dossiers, usage disque, progress d'upload). Ce n'est pas du fetch de données tabulaires simples — SWR n'apporterait pas de valeur et compliquerait la logique.

**Traitement :** Uniquement ajouter `<PageLoader />` pendant `isLoading` initial. La logique interne n'est pas touchée.

---

## Périmètre — pages à mettre à jour

### Pages sans gestion loading (priorité haute — page vide visible)
- `TasksPage` / `Tasks.tsx`
- `TourDatesPage`
- `RehearsalsPage`
- `ProspectionPage` (Live)
- `CatalogPage`
- `AlbumsPage`
- `TracksPage`
- `DashboardPage`
- Pages incomes : `RoyaltiesPage`, `IntermittencePage`, `IncomesOverviewPage`, `CopyrightPage`, `NeighboringRightsPage`
- Pages marketing : `MailingPage`, `PresskitPage`, `MarketingOverviewPage`
- Pages admin : `StatutsPage`, `ProceduresPage`, `AdminOverviewPage`, `ContractsPage`
- Pages edition : `WorksPage`, `SyncPage`

### Pages avec loading texte brut (remplacer par PageLoader)
- `InvoicesPage` — `<p>Chargement…</p>`
- `EquipmentPage` — `<h1>Matériel</h1>` + texte
- `SessionsStudioPage` — `<h1>` + texte
- `SettingsPage` — déjà un `Loader2`, remplacer par `<PageLoader />`
- `ICalSyncPanel` — texte brut

---

## Ce qui ne change pas

- La logique des mutations (optimistic update + rollback)
- Supabase Realtime (non utilisé actuellement)
- `useSidekickData` et le localStorage pour les préférences
- Les types TypeScript des données
- L'auth Supabase

---

## Critères de succès

- Navigation entre pages déjà visitées : données affichées instantanément (< 50ms)
- Premier chargement : spinner visible, jamais de page vide
- Re-fetch transparent après 30s en arrière-plan, sans flash
- Aucune régression fonctionnelle sur les mutations
