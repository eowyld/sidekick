# Refonte Édition — plan d'implémentation

> Exécuté inline le 21/09 en l'absence d'Eliott, qui a demandé de tout faire
> d'un coup. Plan volontairement compact : le code est dans les fichiers, pas
> recopié ici. Pas de commit (convention du dépôt).

**But :** livrer la spec `docs/superpowers/specs/2026-09-21-edition-refonte-design.md`.

**Architecture :** logique pure dans `src/modules/edition/lib/`, écrans découpés
dans `src/modules/edition/components/`, accord en deux tables + routes API
(authentifiées sous `app/api/edition/`, publiques sous `app/api/accord/`), page
publique `app/accord/[token]`.

**Stack :** Next.js 16 App Router, Supabase (RLS + clé service), SWR, Brevo.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20260921220000_edition_agreements.sql` | tables accord + signataires, RLS, index |
| `src/modules/edition/lib/sacem-keys.ts` | clés DEP/DRM (déplacées de `WorksPage`) |
| `src/modules/edition/lib/persons.ts` | libellés de rôles, nom affiché, sommes |
| `src/modules/edition/lib/work-lifecycle.ts` | cycle de vie calculé, statut lu |
| `src/modules/edition/lib/work-life.ts` | enregistrements liés, concerts joués, alertes |
| `src/modules/edition/lib/agreement-types.ts` | types accord / signataire / snapshot, construction du snapshot |
| `src/lib/edition-agreement-server.ts` | jeton, hachage, résolution publique (serveur) |
| `src/hooks/useEditionAgreements.ts` | lecture RLS des accords + actions via API |
| `app/api/edition/agreements/route.ts` | créer une version d'accord |
| `app/api/edition/agreements/[id]/token/route.ts` | régénérer un jeton |
| `app/api/edition/agreements/[id]/send/route.ts` | envoi Brevo |
| `app/api/edition/agreements/[id]/cancel/route.ts` | annuler |
| `app/api/accord/[token]/route.ts` | GET état / POST réponse (public) |
| `app/accord/[token]/page.tsx` + `AgreementClient.tsx` | page co-auteur |
| `src/modules/edition/components/WorksPage.tsx` | catalogue (réécrit) |
| `src/modules/edition/components/work/*` | fiche, onglets, éditeur d'ayants droit, camemberts, bloc accord |
| `app/(app)/edition/[id]/page.tsx`, `app/(app)/edition/nouvelle/page.tsx` | routes fiche |
| `src/modules/live/lib/live-model.ts` | `sacemProgramDeclared?: boolean` dans `LiveDetails` |
| `src/modules/live/components/EventEditPage.tsx` | case « programme déclaré » |
| `src/modules/tasks/rules/edition.ts`, `types.ts`, `index.ts`, `Tasks.tsx` | règles |
| `src/modules/calendar/components/GlobalCalendarPage.tsx`, `Tasks.tsx` | retrait des lectures localStorage Édition |
| `scripts/check-edition-life.ts` | vérification des règles pures |

## Tâches

1. **Logique pure** — `sacem-keys`, `persons`, `work-lifecycle`, `work-life`,
   `agreement-types` ; script `check-edition-life.ts` qui vérifie : lecture des
   statuts historiques, œuvre solo sans accord, `n/m` validés, contestation,
   correspondance setlist par `trackId` et par titre normalisé, représentations
   futures ignorées, alerte « sortie non déclarée ».
   Vérif : `npx --yes tsx scripts/check-edition-life.ts` → tout OK.
2. **Migration** — deux tables, index unique partiel « un accord actif par
   œuvre », RLS propriétaire. Non appliquée.
3. **Serveur accord** — helpers jeton (`randomBytes(32)` base64url, `sha256`),
   routes authentifiées (création de version en remplaçant l'active, jeton,
   envoi Brevo avec limite par utilisateur, annulation) et publiques (GET avec
   `opened_at`, POST décision + recalcul du statut, limite par IP).
4. **Hook** `useEditionAgreements` — SWR, tolère l'absence des tables (erreur
   capturée → liste vide + drapeau `unavailable`).
5. **Écrans** — catalogue (bandeau, segments, recherche, liste dense, écran
   vide), fiche à trois onglets, création, bloc accord, page publique.
6. **Live** — case « Programme déclaré à la SACEM » sur les représentations
   passées.
7. **Tâches** — `rules/edition.ts` branché dans `Tasks.tsx`.
8. **Nettoyage** — lectures localStorage Édition retirées de
   `GlobalCalendarPage` et `Tasks.tsx`.
9. **Vérification** — `tsc`, ESLint des fichiers touchés, `npm run build`,
   captures Playwright en dev (catalogue, fiche, onglets, `/accord/inconnu`).
10. **ALPHA.md** — section du jour.
