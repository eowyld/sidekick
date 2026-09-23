# Logo d'artiste et Personnalisation — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** logo d'artiste facultatif (versions claire et sombre), collecté à l'onboarding, géré dans Réglages > Compte, affiché selon un interrupteur par export (factures, fiche technique, liens d'écoute + mail d'invitation) ; fusion des réglages Facturation et Fiche technique en « Personnalisation ».

**Architecture:** deux colonnes data URL + un jsonb d'interrupteurs dans `user_preferences`, exposés par `usePreferencesData` → `useArtistIdentity()`. Une fonction pure `logoFor()` décide du logo de chaque export. Les PDF reçoivent un champ `logo` explicite au lieu de lire `template.logoDataUrl`. Le lien d'écoute sert le logo par une route calquée sur `/cover`.

**Tech Stack:** Next.js 16 App Router, Supabase, @react-pdf/renderer, Playwright pour la vérification (pas de suite de tests).

Spec : `docs/superpowers/specs/2026-09-22-artist-logo-design.md`.

**Écart assumé avec la spec** : la migration **ne retire pas** `logoDataUrl` de `invoice_template`. La base de dev est la production, et la version déployée lit encore cette clé : la retirer ferait perdre le logo des factures en prod jusqu'au déploiement. Le nouveau code ignore la clé et `setInvoiceTemplate` la retire à la prochaine écriture. Nettoyage SQL après le déploiement.

**Pas de commit** (CLAUDE.md : commit uniquement sur demande explicite).

---

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20260922000000_artist_logo.sql` (nouveau) | colonnes `artist_logo`, `artist_logo_dark`, `artist_logo_exports` + reprise |
| `src/lib/artist-logo.ts` (nouveau) | types, `normalizeLogoExports`, `logoFor`, `fileToLogoDataUrl` |
| `src/lib/data-url.ts` (nouveau) | `decodeDataUrl` + `sniffImageType`, sortis de `cover/route.ts` |
| `src/hooks/usePreferencesData.ts` | lecture/écriture des 3 colonnes, `logoDataUrl` retiré à l'écriture du modèle |
| `src/hooks/useArtistIdentity.ts` | expose `logo`, `logoExports`, `setLogo`, `setLogoExports` |
| `src/lib/sidekick-store.ts` | `logoDataUrl` retiré de `InvoiceTemplate` |
| `src/lib/migrate-facturation-to-supabase.ts` | reporte un `logoDataUrl` local vers `artist_logo` |
| `src/modules/settings/components/ArtistLogoField.tsx` (nouveau) | deux emplacements clair/sombre avec repli grisé |
| `src/modules/settings/components/ArtistLogoCard.tsx` (nouveau) | carte Réglages > Compte : champ + interrupteurs |
| `src/modules/settings/components/SettingsPage.tsx` | monte `ArtistLogoCard` sous `ArtistIdentityCard` |
| `src/components/onboarding/IdentityStep.tsx` | champ logo facultatif |
| `src/modules/settings/components/PersonalizationPage.tsx` (nouveau) | page à onglets `?doc=factures|fiche-technique` |
| `src/modules/settings/components/InvoiceTemplatePage.tsx` → `InvoiceTemplatePanel` | sans en-tête ni carte logo |
| `src/modules/settings/components/TechnicalTemplatePage.tsx` → `TechnicalTemplatePanel` | idem |
| `app/(app)/settings/personnalisation/page.tsx` | rend `PersonalizationPage` |
| `app/(app)/settings/facturation/page.tsx`, `fiche-technique/page.tsx` | redirections |
| `src/components/layout/SettingsSidebar.tsx` | une entrée « Personnalisation » |
| `src/modules/incomes/components/pdf/InvoiceDocument.tsx`, `InvoicesPage.tsx`, `InvoiceEditorPage.tsx` | champ `logo`, bouton « Personnaliser » |
| `src/modules/live/components/pdf/TechnicalDocument.tsx`, `shared/useTechnicalPdf.ts`, `shared/TechnicalEditor.tsx`, `ProductionEditPage.tsx` | champ `logo`, bouton « Personnaliser » |
| `app/api/listening/[slug]/logo/route.ts` (nouveau) | sert le logo du lien |
| `app/api/listening/[slug]/route.ts`, `cover/route.ts` | `logoUrl` dans la charge ; import de `data-url` |
| `src/lib/listening-types.ts`, `ListeningPlayer.tsx`, `IdentityGate.tsx`, `app/ecoute/[slug]/ListeningRoomClient.tsx` | affichage |
| `src/lib/listening-invite-email.ts`, `ListeningLinksPage.tsx` | logo dans le mail |

## Tâches

### Task 1 : migration
- [ ] Écrire `20260922000000_artist_logo.sql` : `add column if not exists` ×3 (`artist_logo_exports jsonb not null default '{"invoices":true,"technical":true,"listening":true}'`), `update … set artist_logo = invoice_template->>'logoDataUrl' where artist_logo is null and invoice_template ? 'logoDataUrl'`, commentaires de colonnes.
- [ ] `npx supabase db push --linked --dry-run` ; appliquer **après accord explicite**.

### Task 2 : bibliothèque pure `artist-logo.ts` + `data-url.ts`
- [ ] Types `ArtistLogo = { light: string | null; dark: string | null }`, `LogoExports = { invoices; technical; listening }`, `LogoTarget = keyof LogoExports`.
- [ ] `normalizeLogoExports(raw)` : clé absente → `true`.
- [ ] `logoFor(logo, exports, target)` : `undefined` si interrupteur `false` ; `listening` → `dark ?? light`, sinon `light ?? dark` ; `undefined` si aucun.
- [ ] `fileToLogoDataUrl` déplacé tel quel (320 px, PNG).
- [ ] `decodeDataUrl` / `sniffImageType` déplacés de `cover/route.ts`, qui les importe.
- [ ] Vérif : script node ponctuel qui transpile `artist-logo.ts` et teste les 6 cas de `logoFor`.

### Task 3 : hooks
- [ ] `PreferencesRow` + SELECTS : nouvelle sélection la plus riche avec `artist_logo, artist_logo_dark, artist_logo_exports` ; `persist` les recopie.
- [ ] Setters `setArtistLogo(variant, value)` et `setArtistLogoExports(patch)`.
- [ ] `setInvoiceTemplate` retire `logoDataUrl` du modèle écrit.
- [ ] `useArtistIdentity` expose `logo`, `logoExports`, `setLogo`, `setLogoExports`.
- [ ] `InvoiceTemplate.logoDataUrl` retiré du type ; `migrate-facturation` reporte le logo local vers `artist_logo`.

### Task 4 : PDF
- [ ] `InvoiceDocumentData.logo?: string`, lu à la place de `template.logoDataUrl` ; appelants : `logoFor(logo, logoExports, "invoices")`.
- [ ] `TechnicalDocumentInput.logo?: string` ; `useTechnicalPdf` passe `logoFor(…, "technical")`.

### Task 5 : composants logo
- [ ] `ArtistLogoField` : deux tuiles (fond `#ffffff` en style direct, globals.css écrase `bg-white` ; fond `#101010`), repli grisé à 35 % d'opacité avec la mention « Repli : version claire/sombre », Importer / Remplacer / Retirer, erreur si pas une image.
- [ ] `ArtistLogoCard` : champ + 3 `Switch` (Fiche technique masqué si Live désactivé), interrupteurs masqués sans logo.
- [ ] Monter la carte dans `SettingsPage` sous `ArtistIdentityCard`.
- [ ] `IdentityStep` : `ArtistLogoField` sous le choix d'identité, titre « Ton logo (facultatif) ».

### Task 6 : Personnalisation
- [ ] Panneaux sans `SettingsHeader` ni carte logo ; ligne d'état « Logo : affiché / masqué sur ce document / aucun » + lien vers `/settings`.
- [ ] `PersonalizationPage` : en-tête, `Segments`-like onglets pilotés par `?doc=`, onglet fiche technique seulement si Live activé. Couleur et police : restent dans le panneau Factures et s'affichent aussi dans le panneau Fiche technique (composant `AppearanceCards` extrait du panneau Factures).
- [ ] Routes : `personnalisation` rend la page (dans `<Suspense>` pour `useSearchParams`) ; `facturation` et `fiche-technique` redirigent.
- [ ] Sidebar : « Personnalisation », entrée Fiche technique retirée.
- [ ] Boutons « Personnaliser » : `InvoiceEditorPage` ×2, `TechnicalEditor` (en-tête du bloc), `ProductionEditPage` (en-tête).

### Task 7 : lien d'écoute et mail
- [ ] `PublicListeningLink.logoUrl?: string` ; `route.ts` sélectionne les 3 colonnes et pose `logoUrl` si `logoFor(…, "listening")`.
- [ ] `logo/route.ts` : `resolveLinkRow` + `linkState`, relit les préférences, 404 sinon, sert l'image décodée (`Cache-Control: public, max-age=300`).
- [ ] `ListeningPlayer` : `<img>` h-8 au-dessus du nom ; `IdentityGate` : le logo remplace la pastille casque.
- [ ] `inviteEmailHtml({ …, logoUrl })` : ligne `<img height="32">` en tête de carte ; `ListeningLinksPage` passe `${origin}/api/listening/<slug>/logo` si `logoFor(…, "listening")`.

### Task 8 : vérification et docs
- [ ] `npx tsc --noEmit`, `npm run lint`.
- [ ] Playwright (compte `SHOT_EMAIL`) : Réglages > Compte, Personnalisation (2 onglets), redirections, boutons Personnaliser, onboarding (écran IdentityStep).
- [ ] Après application de la migration : PDF facture + fiche avec/sans interrupteur ; `/ecoute/<slug>` + `curl /api/listening/<slug>/logo` (200 puis 404).
- [ ] CLAUDE.md (section identité : logo) et ALPHA.md (22/09).
