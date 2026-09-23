# Logo d'artiste et page Personnalisation — conception

Date : 22/09/2026 · Cible : avant l'ouverture de l'alpha (jeudi 24/09)

## Objectif

Un logo d'artiste **facultatif**, demandé à la création du compte, modifiable
dans les réglages, et affichable au choix sur trois exports : factures, fiche
technique, liens d'écoute.

En même temps, les deux pages de réglages de documents (« Facturation » et
« Fiche technique ») fusionnent en une page **Personnalisation**, accessible
depuis l'éditeur de facture et depuis l'éditeur de fiche technique.

## Existant

- Un logo existe déjà : `user_preferences.invoice_template.logoDataUrl`
  (jsonb), data URL PNG réduite à 320 px par `fileToLogoDataUrl`
  (`InvoiceTemplatePage.tsx`). Téléversé dans Réglages > Facturation, affiché
  sur les factures (`InvoiceDocument.tsx`) et la fiche technique
  (`TechnicalDocument.tsx`), sans possibilité de le masquer sur l'un des deux.
- `user_presskit_profile.artist_logo_url` : colonne du presskit (fermé).
  **Non utilisée**, laissée telle quelle.
- `/settings/personnalisation` : redirection vers `/settings/modules` depuis le
  découpage du 21/09 (d'anciens mails de rappel y pointaient ; seul le compte
  du fondateur en a reçu).

## Décisions

1. Le logo fait partie de **l'identité de l'artiste**, pas du modèle de
   facture. Il vit à côté de `artist_name` dans `user_preferences` et passe
   par `useArtistIdentity()`. Règle « identité = en direct » : chaque export
   lit le logo au moment de l'export ; rien n'est copié dans les
   enregistrements.
2. Stockage en data URL dans la base (option A). Pas de Storage : l'image fait
   au plus 320 px, et la route de pochette sait déjà servir un data URL.
3. Un interrupteur par export, dans Réglages > Compte. Tous activés par
   défaut.
4. Lien d'écoute : logo d'environ 32 px de haut **au-dessus** du nom
   d'artiste, qui reste affiché (un logo sombre sur transparent disparaît sur
   fond noir, le nom garde l'identification). Même placement dans le mail
   d'invitation.
7. **Deux versions du logo**, chacune facultative : une pour fonds clairs,
   une pour fonds sombres. Chaque surface prend sa version et **se rabat sur
   l'autre** si elle manque ; un seul logo suffit donc pour tout.
   - Fonds clairs : PDF de facture, PDF de fiche technique.
   - Fonds sombres : page du lien d'écoute (`IdentityGate` compris), mail
     d'invitation (fond `#171717`).
5. Onboarding : proposé, jamais bloquant. Les comptes existants ne reçoivent
   pas de nouvelle question.
6. « Facturation » et « Fiche technique » fusionnent en **Personnalisation**
   (`/settings/personnalisation`), qui reprend l'adresse de l'ancienne
   redirection.

## Données

Migration `supabase/migrations/20260922000000_artist_logo.sql`, rejouable :

```sql
alter table public.user_preferences
  add column if not exists artist_logo text,
  add column if not exists artist_logo_dark text,
  add column if not exists artist_logo_exports jsonb not null
    default '{"invoices": true, "technical": true, "listening": true}'::jsonb;

-- Reprise du logo existant, puis retrait de la clé du modèle de facture.
update public.user_preferences
   set artist_logo = invoice_template->>'logoDataUrl'
 where artist_logo is null
   and invoice_template ? 'logoDataUrl';

update public.user_preferences
   set invoice_template = invoice_template - 'logoDataUrl'
 where invoice_template ? 'logoDataUrl';
```

- `artist_logo` : version pour fonds clairs, data URL `image/png`, NULL = pas
  de logo. Le logo existant y est repris (il était fait pour la facture
  blanche).
- `artist_logo_dark` : version pour fonds sombres, même format, NULL = se
  rabattre sur `artist_logo`.
- `artist_logo_exports` : `{ invoices, technical, listening }`. Même
  sémantique que `enabled_modules` : **une clé absente vaut `true`**.
- `InvoiceTemplate.logoDataUrl` est retiré du type (`sidekick-store.ts`).
  `migrate-facturation-to-supabase.ts` doit ignorer (ou reporter vers
  `artist_logo`) un `logoDataUrl` trouvé dans l'ancien blob localStorage.

## Code client

**`usePreferencesData`** lit et écrit les trois colonnes (mise à jour
optimiste habituelle) : `artistLogo`, `artistLogoDark`, `artistLogoExports`
et leurs setters.

**`useArtistIdentity()`** les expose sous la forme `logo: { light, dark }`,
`logoExports`, `setLogo(variant, dataUrl | null)` et
`setLogoExports(patch)`. `logoExports` est normalisé (clés absentes →
`true`).

**`src/lib/artist-logo.ts`** (nouveau), fonctions pures partagées client et
serveur :
- `fileToLogoDataUrl` (sorti de `InvoiceTemplatePage`) ;
- `logoFor({ light, dark }, exports, target)` : `target` ∈ `invoices`,
  `technical`, `listening`. Renvoie `undefined` si l'interrupteur est éteint,
  sinon la version du fond de la surface (`listening` → sombre, les deux
  autres → clair) avec repli sur l'autre version. Seul point de décision
  « quel logo va sur cet export ? ».

**`ArtistLogoField`** (nouveau, `src/modules/settings/components/`) : deux
emplacements côte à côte, « Fond clair » et « Fond sombre », chacun sur un
fond de sa couleur, avec Téléverser / Remplacer / Supprimer. Un emplacement
vide montre **en grisé** la version qui sera utilisée à sa place (le repli) :
l'artiste voit tout de suite si son logo noir disparaît sur le fond sombre,
et sait quoi ajouter. Utilisé par l'onboarding et par Réglages > Compte.

## Écrans

### Onboarding — `IdentityStep`

Sous le choix nom d'artiste / nom propre : « Ton logo (facultatif) » avec
`ArtistLogoField`. « Continuer » reste actif sans logo. Les comptes antérieurs
qui n'ont pas encore répondu à la question d'identité (`identity_mode` NULL)
la reçoivent seule depuis le tableau de bord, avec ce champ, toujours
facultatif. Ceux qui y ont déjà répondu ne revoient rien.

### Réglages > Compte

Carte « Logo » sous `ArtistIdentityCard` : `ArtistLogoField` + trois
interrupteurs (`Switch`) *Factures · Fiche technique · Liens d'écoute*,
masqués tant qu'il n'y a pas de logo. L'interrupteur Fiche technique est
masqué si le module Live est désactivé.

### Réglages > Personnalisation (fusion)

- Sidebar (`SettingsSidebar.tsx`) : l'entrée « Facturation » devient
  « Personnalisation » → `/settings/personnalisation` ; l'entrée « Fiche
  technique » disparaît.
- `/settings/personnalisation/page.tsx` rend la nouvelle page au lieu de
  rediriger. `/settings/facturation` et `/settings/fiche-technique` deviennent
  des redirections vers `/settings/personnalisation?doc=factures` et
  `?doc=fiche-technique`.
- La page : en-tête « Personnalisation », puis deux onglets **Factures** /
  **Fiche technique** pilotés par `?doc=` (défaut : factures). L'onglet Fiche
  technique n'apparaît que si le Live est activé.
  - Cartes communes, présentes dans les deux onglets : couleur d'accent,
    police (même état, déjà partagé via `invoice_template`).
  - Onglet Factures : statut émetteur (`BillingStatusCard`), termes et
    conditions ; aperçu de facture à droite.
  - Onglet Fiche technique : mise en page (trois modèles) ; aperçu de fiche à
    droite.
  - La carte « Logo » disparaît des deux ; à sa place, une ligne « Logo : géré
    dans Réglages > Compte » avec le lien, et l'état de l'interrupteur de
    l'onglet (« affiché » / « masqué sur ce document »).
- `InvoiceTemplatePage` et `TechnicalTemplatePage` deviennent deux panneaux
  d'une page `PersonalizationPage` ; pas de réécriture de leur contenu au-delà
  du retrait du logo et des en-têtes.

### Liens vers Personnalisation

- Éditeur de facture (`InvoiceEditorPage.tsx`, lignes 556 et 872) : le bouton
  « Modèle » pointe vers `/settings/personnalisation?doc=factures` et prend le
  libellé « Personnaliser ».
- Fiche technique : bouton `outline` « Personnaliser »
  (`/settings/personnalisation?doc=fiche-technique`) à côté de « Télécharger en
  PDF » dans `TechnicalEditor.tsx` (en-tête du bloc) et à côté de « Fiche
  technique PDF » dans l'en-tête de `ProductionEditPage.tsx`.

## Exports

- **Factures** : `InvoiceDocument` reçoit le logo via
  `logoFor(logo, exports, "invoices")` au lieu de `template.logoDataUrl`
  (`InvoiceEditorPage`, `InvoicesPage`, aperçu de Personnalisation).
- **Fiche technique** : idem avec `"technical"` (`useTechnicalPdf`,
  aperçu de Personnalisation).
- **Lien d'écoute** :
  - `app/api/listening/[slug]/route.ts` sélectionne aussi `artist_logo,
    artist_logo_exports` et renvoie `logoUrl: "/api/listening/<slug>/logo"`
    si `logoFor(…, "listening")` renvoie un logo, sinon `null`. Le data URL
    lui-même ne transite jamais dans la charge JSON.
  - Nouvelle route `app/api/listening/[slug]/logo/route.ts`, calquée sur
    `cover/route.ts` : clé service, `resolveLinkRow` + `linkState`, 404 si
    lien coupé ou expiré, pas de logo ou interrupteur éteint ; sert
    `logoFor(…, "listening")` décodé, en PNG, avec un cache court. Comme la
    pochette, **pas de contrôle du mot de passe** : le proxy d'images de Gmail
    n'a pas le cookie d'accès, et le logo n'est montré qu'à ceux qui ont le
    slug. Le logo étant déjà un PNG de 320 px au plus, pas de variante
    `?format=` : le PNG passe dans Outlook, et la transparence est gardée.
  - `ListeningPlayer.tsx` (en-tête) et `IdentityGate.tsx` : `<img>` de
    32 px de haut, `object-contain`, au-dessus du nom, `alt` = nom d'artiste.
- **Mail d'invitation** (`src/lib/listening-invite-email.ts`) :
  `inviteEmailHtml` reçoit `logoUrl` (URL absolue
  `${origin}/api/listening/<slug>/logo`, ou `null`). Si présent, une ligne
  `<img height="32">` (largeur libre, `max-width:200px`, `alt` = nom
  d'artiste) au-dessus du nom dans la carte, avant « Écoute privée ». La
  décision d'afficher suit l'interrupteur *Liens d'écoute* : un seul réglage
  pour la page et le mail. `ListeningLinksPage.tsx` (lignes 175 et 245)
  passe `logoUrl` à partir de `useArtistIdentity()`.

## Hors périmètre

- Colonne presskit `artist_logo_url`.
- Choix de la version (claire ou sombre) par export : le fond de chaque
  surface la décide.

## Vérification

- `npx tsc --noEmit`, `npm run lint`.
- Migration appliquée en local puis contrôle : le logo du compte de démo est
  passé de `invoice_template` à `artist_logo`.
- Captures Playwright (compte `SHOT_EMAIL`) : onboarding avec le champ logo,
  Réglages > Compte (carte Logo, interrupteurs), Personnalisation dans les deux
  onglets, les anciennes adresses qui redirigent, les boutons « Personnaliser »
  depuis une facture et une fiche technique.
- Pour chaque export : interrupteur activé → logo présent ; désactivé → logo
  absent (PDF de facture, PDF de fiche, page `/ecoute/<slug>` et appel direct
  à `/api/listening/<slug>/logo` qui doit répondre 404).
- Deux versions : avec la claire seule, la page d'écoute l'utilise (repli) ;
  une fois la sombre ajoutée, la page et le mail passent à la sombre, les PDF
  gardent la claire.
- Mail d'invitation : aperçu HTML dans `ListeningLinksPage`, puis un envoi réel
  vers une boîte Gmail pour vérifier que le logo passe par le proxy d'images.
- Documentation : section « Identité de l'artiste » de `CLAUDE.md` (logo),
  `ALPHA.md` (journée du 22/09).
