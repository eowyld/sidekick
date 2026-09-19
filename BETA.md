# BÊTA — état et plan

Document de reprise de la bêta. `ALPHA.md` reste la référence jusqu'à
l'ouverture du 24/09/2026 ; ce document prend le relais ensuite.

**Cible : bêta payante le lundi 16/11/2026.** Huit semaines après l'ouverture de
l'alpha. Lundi, jamais un vendredi : les premiers paiements ratés doivent tomber
un jour où tu peux répondre.

**Règle de communication : on n'annonce rien tant que les essentiels ne sont pas
faits.** La date vit dans ce document, pas sur la landing ni dans un email aux
testeurs. On l'annonce quand le paiement fonctionne de bout en bout et que la
facturation électronique est branchée. Tant qu'elle n'est pas annoncée, elle se
recalibre sans rien coûter.

Créé le 16/09/2026.

---

## Ce qui change entre l'alpha et la bêta

| | Alpha (24/09) | Bêta (16/11) |
|---|---|---|
| Accès | gratuit, tout le monde | freemium : gratuit limité + Pro |
| Paiement | aucun | Stripe, 8 €/mois |
| Périmètre | Organisation, Revenus, Projets, 3 secteurs, Admin (statuts et démarches), Drive | plus Marketing, presskit public, Contrats, Comptabilité, facturation électronique |
| Juridique | CGU, mentions légales, confidentialité | plus CGV, médiateur, résiliation en ligne, rétractation |
| Connexion | email, Google | plus Outlook |

---

## Modèle économique

Règle annoncée dans la FAQ, à tenir : **consulter et faire entrer ses données
reste gratuit, on paie pour ce qui sort du produit.**

Proposition de frontière, à trancher avec les chiffres de l'alpha :

| Gratuit | Pro (8 €/mois) |
|---|---|
| Tous les modules en consultation et en saisie | Émettre une facture (PDF et Factur-X) |
| Tableau de bord, tâches, calendrier, contacts | Envoi par plateforme agréée (Iopole) |
| Catalogue, œuvres, dates, revenus | Écriture des métadonnées dans les fichiers audio |
| Rappels de démarches par email | Export comptable, note de frais |
| 1 Go de stockage, 3 liens d'écoute actifs | 20 Go, liens d'écoute illimités, presskit public |

**Tranché le 16/09 : les rappels de démarches restent gratuits.** C'est ce qui
fait revenir les gens dans l'outil ; on ne met pas de péage sur la rétention.

**Tranché le 16/09 : 1 Go de stockage dans le gratuit.** Soit une quinzaine de
masters WAV. À revoir seulement si les chiffres de l'alpha montrent que le
plafond est atteint avant que les gens aient compris la valeur du produit.

---

## Ce que l'alpha doit nous dire (à relever à J14 et J30)

Sans ces chiffres, la bêta se construit à l'aveugle. À lire dans PostHog.

- Répartition live / phono / édition des inscrits (`onboarding_sectors`).
- Taux de retour à J3 et J7 (`app_opened`).
- Modules réellement utilisés, et ceux que personne n'ouvre.
- Combien de factures émises, combien de liens d'écoute créés : ce sont les
  deux fonctionnalités qu'on veut faire payer.
- Volume de stockage par compte.
- Où les gens décrochent dans l'onboarding.

**Décision du J30** : si moins de 20 % des inscrits reviennent à J7, la bêta
payante est prématurée. Mieux vaut décaler et corriger l'usage que faire payer
un produit qu'on n'ouvre pas.

---

## Chantiers

### 1. Paiement (le plus structurant)

- Stripe : produits, prix mensuel et annuel, Checkout, portail client.
- Webhooks : abonnement créé, renouvelé, échoué, annulé. Source de vérité en
  base (`user_subscriptions`), jamais l'état renvoyé par le client.
- Verrouillage des fonctionnalités Pro côté serveur, pas seulement dans l'UI.
  `ModuleGuard` est une garde d'affichage, contournable (cf. `ALPHA.md`).
- Écran Réglages > Abonnement : offre en cours, facture, changement d'offre.
- **Résiliation en ligne en trois clics** (art. L215-1-1 C. conso), obligatoire.
- **Demande expresse d'exécution immédiate** à la souscription, avec le calcul
  du prorata en cas de rétractation dans les 14 jours (art. L221-25).
- Emails Brevo : confirmation de souscription avec CGV, échec de paiement,
  préavis de renouvellement annuel (art. L215-1).

### 2. Facturation électronique (Iopole)

Coupée du périmètre alpha le 16/09, faute de code écrit et parce que
l'obligation d'**émission** pour les TPE et PME ne tombe qu'au **1er septembre
2027** (seule la réception est obligatoire depuis le 1er septembre 2026). Rien
ne pressait. Détail de la décision dans `ALPHA.md`.

Voir l'échange du 16/09. Montage retenu : **solution compatible branchée sur
Iopole**, qui reste la plateforme agréée. Pas d'immatriculation de PHÖS AGENCY.

- Contrat et DPA Iopole signés, tarifs validés.
- Champs manquants au regard d'EN 16931 sur `user_invoices` (SIREN/SIRET
  émetteur et client, mentions légales, TVA par ligne).
- Génération Factur-X (PDF/A-3 + XML), validée par le validateur FNFE-MPE.
- Émission et réception via l'API Iopole, inscription des utilisateurs à
  l'annuaire, vérification d'identité.
- ⚠️ Rappel : l'obligation de **réception** court depuis le 01/09/2026,
  l'**émission** pour les micro-entreprises au 01/09/2027.

### 3. Réouverture du périmètre fermé

Retirer les entrées de `src/lib/coming-soon.ts`, une par une, chacune après
recette :

- Marketing (module entier) + `/presskit/*` public, à retirer aussi de
  `proxy.ts`.
- `/admin/contrats`.
- Signature numérique des fiches de présence studio, traitée avec le chantier
  Contrats. L'alpha génère seulement un PDF à imprimer et faire signer ; ne pas
  introduire un parcours de signature électronique isolé avant d'avoir défini
  le niveau de preuve, l'horodatage et la conservation des documents signés.
- `/admin/comptabilite`.
- ⚠️ Marketing et presskit rouvrent des surfaces publiques et des envois
  d'emails : les routes `mail/track/*` (pixels), `presskit/[id]` et le
  limiteur de débit sont à revoir avant, pas après.
- ⚠️ Le presskit public expose des contenus : ajouter la mention d'information
  des visiteurs et vérifier qu'aucun fichier ne repasse par une URL publique.

### 4. OAuth Outlook

Provider Azure AD côté Supabase, scope `Mail.Send` via Microsoft Graph, bouton
sur `/login` et `/inscription`. Détail dans `ALPHA.md`.

### 5. Dette technique à solder avant de faire payer

Un client qui paie ne tolère pas ce qu'un testeur gratuit pardonne.

- `handleMutationError()` sur les 20 hooks : aujourd'hui, une erreur Supabase
  fait un rollback silencieux, sans message.
- 205 problèmes de lint, dont 24 `rules-of-hooks`, la seule catégorie qui peut
  casser à l'exécution.
- `ffmpeg` sur Vercel : trancher entre `ffmpeg-static`, WASM navigateur ou
  fonctionnalité locale assumée (cf. `ALPHA.md`).
- Sauvegardes : vérifier la rétention Supabase Pro, envisager le PITR dès qu'il
  y a des données payantes.
- Limiteur de débit partagé (aujourd'hui en mémoire par instance Vercel).
- Service client : une adresse, un délai de réponse annoncé, une procédure.

### 6. Produit, selon les chiffres de l'alpha

- Refonte UI de Projets et de Live, volontairement repoussées.
- Ce que PostHog désignera comme point de décrochage.

---

## Juridique de la bêta

Le bloc alpha (mentions légales, CGU, confidentialité, registre) est en place.
Ce qui s'ajoute, dans l'ordre où il faut s'en occuper :

| Quoi | Quand | Où |
|---|---|---|
| **CGV publiées sur `/cgv`**, acceptées par case à cocher au paiement | avant le premier euro | `docs/legal/CGV-brouillon.md` |
| **Médiateur de la consommation** souscrit et cité dans les CGV et CGU | **adhésion à lancer en S5, autour du 19/10** : plusieurs semaines de traitement | `LEGAL_MEDIATOR` dans `src/lib/legal.ts` |
| 🔴 **Relecture avocat** de la limitation de responsabilité (CGU art. 11, CGV art. 9) | avant le premier euro, ~500 € | |
| **Récapitulatif sur support durable** (email + PDF) après souscription | avec Stripe | |
| **DPA Iopole**, ajout au registre et à la politique de confidentialité | avec Iopole | `docs/legal/registre-rgpd.md` |
| **Mise à jour des CGU** (offre payante, archivage des factures chez la PA, réversibilité) notifiée 30 jours avant | 30 j avant la bêta | `app/cgu/page.tsx` |
| **Code APE** corrigé au guichet unique INPI | quand tu veux, déclaratif | |
| **Seuil de franchise de TVA** surveillé : événementiel + SIDEKICK cumulés | continu | expert-comptable |
| **Marque SIDEKICK à l'INPI** (classes 9, 41, 42) après recherche d'antériorité | avant de communiquer largement | |
| Suppression de compte et export **en libre-service** dans l'app | bêta | aujourd'hui par email |
| 🔴 **Ne pas passer PostHog au plan payant** sans rouvrir la section 5 : la rétention des événements saute de 1 an à 7 ans et n'est pas réglable à la baisse. C'est le moment du produit où la tentation arrive (volume d'événements en hausse) | avant tout changement de plan | `docs/legal/echeances.md` |
| **Factures d'abonnement de PHÖS : 10 ans** (Code de commerce L123-22) à ajouter en section 5 de la politique. C'est la seule exception que le paiement crée à la règle « les données vivent ce que vit le compte » | avant le premier euro | `app/confidentialite/page.tsx` |

📅 **Échéances longues** : `docs/legal/echeances.md` rassemble les obligations
qui se déclenchent à une date future, dont les trois points juridiques que le
passage au payant ouvre le 16/11 et le premier checkup des comptes inactifs en
septembre 2029. La décision sur les durées est dans
`docs/legal/passation-durees-conservation.md`.

**Réversibilité, à ne pas oublier** : dès qu'Iopole archive les factures, un
artiste qui part doit pouvoir récupérer 10 ans de documents et changer de
plateforme agréée dans l'annuaire. C'est à écrire dans les CGU et à coder.

---

## Planning indicatif

| Semaines | Chantier |
|---|---|
| S1–S2 (22/09 → 03/10) | Correctifs d'alpha, écoute des testeurs, premiers chiffres à J14 |
| S3–S4 (05/10 → 17/10) | Stripe de bout en bout, écran Abonnement, résiliation en ligne, CGV publiées |
| S5–S6 (19/10 → 31/10) | **Lancer l'adhésion au médiateur de la consommation** (délai externe de plusieurs semaines, à faire maintenant pour être couvert le 16/11) · Iopole et Factur-X, dette technique (erreurs des hooks, lint) |
| S7 (02/11 → 07/11) | Réouverture Marketing, presskit, Contrats, Comptabilité, une par une |
| S8 (09/11 → 14/11) | Outlook si le temps le permet, recette complète sur comptes vierges, paiements de test |
| **Lun 16/11** | **Ouverture de la bêta payante** |

---

## Ordre de priorité

Le planning ci-dessus est une intention, pas un engagement : rien n'est annoncé,
donc il se recalibre en route. Ce qui compte, c'est l'ordre.

**Essentiels, dans cet ordre.** Ce sont eux qui déclenchent l'annonce :

1. **Le paiement** de bout en bout (Stripe, verrouillage côté serveur,
   résiliation en ligne).
2. **Les CGV et le médiateur**, sans quoi le paiement ne peut pas s'ouvrir.
3. **Iopole et Factur-X**, le seul argument qu'aucun outil anglophone ne tient.
4. **Les erreurs silencieuses des hooks**, parce qu'un client qui paie ne
   pardonne pas ce qu'un testeur gratuit laisse passer.

**Le reste vient après, et se décale sans drame** : réouverture de Contrats,
Marketing et presskit, Comptabilité, puis Outlook. Si l'un d'eux n'est pas prêt
le 16/11, il sort à la mise à jour suivante, la bêta n'attend pas après lui.

Deux points de vigilance qui ne dépendent pas de toi : le contrat Iopole et les
vérifications d'identité de leurs utilisateurs prennent un délai externe, et
l'adhésion au médiateur aussi. Ce sont les deux à lancer tôt.

---

## Critères de sortie

À vérifier avant d'ouvrir, sur deux comptes vierges :

- [ ] Souscription, paiement, facture reçue, accès Pro effectif.
- [ ] Résiliation en trois clics, accès maintenu jusqu'à la fin de la période.
- [ ] Rétractation dans les 14 jours, remboursement au prorata.
- [ ] Échec de paiement : email reçu, accès rétrogradé sans perte de données.
- [ ] Facture Factur-X validée par un validateur externe, transmise via Iopole.
- [ ] Une erreur Supabase affiche un message à l'utilisateur, plus de rollback
      silencieux.
- [ ] Suppression de compte en libre-service, données effacées, fichiers du
      bucket compris.
- [ ] CGV et CGU à jour en ligne, acceptées à la souscription, médiateur cité.
