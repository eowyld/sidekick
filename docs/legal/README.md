# Dossier légal SIDEKICK

État au 15/09/2026, pour l'ouverture de l'alpha du 21/09.

Ces textes sont des brouillons solides, rédigés à partir du code réel. Ce ne sont
pas des actes relus par un avocat : les points qui en demandent un sont
signalés 🔴.

## Où est quoi

| Document | Emplacement | Public |
|---|---|---|
| Identité de l'éditeur, contact, dates de version | `src/lib/legal.ts` | source des pages |
| Mentions légales | `app/mentions-legales/page.tsx` → `/mentions-legales` | oui |
| CGU + annexe sous-traitance RGPD (art. 28) | `app/cgu/page.tsx` → `/cgu` | oui |
| Politique de confidentialité et cookies | `app/confidentialite/page.tsx` → `/confidentialite` | oui |
| FAQ | `src/components/landing/faqData.ts` → `/faq` | oui |
| Registre des traitements + procédures | `docs/legal/registre-rgpd.md` | interne |
| CGV | `docs/legal/CGV-brouillon.md` | **non, après l'alpha** |

Pas de page « charte RGPD » séparée : elle ferait doublon avec la politique de
confidentialité (côté utilisateurs) et le registre (côté obligations internes).

## Checklist d'ouverture

### Bloquant, avant le 21/09

- [x] Identité de l'éditeur renseignée le 16/09 : PHÖS AGENCY, SAS au capital
      de 6 000 €, SIREN 980 520 142, siège 117 rue Roger Salengro, 59239
      Thumeries, TVA FR33980520142.
- [ ] Trois `TODO_` restants dans `src/lib/legal.ts` : ville du greffe du RCS
      (à lire sur le Kbis, Thumeries relève de l'arrondissement de Lille), nom
      du président / directeur de la publication, téléphone public.
- [ ] Adhérer à un médiateur de la consommation et renseigner `LEGAL_MEDIATOR`.
- [ ] Appliquer `supabase/migrations/20260915120000_user_fk_cascade.sql`
      (`--dry-run` d'abord). Sans elle, supprimer un compte échoue.
- [ ] Déployer le code, puis appliquer `20260916090000_drive_bucket_private.sql`
      (bucket privé). La politique de confidentialité promet des fichiers sans
      adresse publique : elle devient fausse si la migration n'est pas passée.
- [ ] Vérifier que `SIGNUP_NOTIFY_TO` et la boîte hello@ reçoivent bien les
      emails (c'est l'adresse de toutes les demandes RGPD).
- [ ] Vérifier qu'aucune page ne contient encore `TODO_` :
      `grep -rn "TODO_" src/lib/legal.ts`

### Important, dans la première semaine

- [ ] Signer / archiver les DPA (Supabase, PostHog, Vercel, Brevo), voir le
      registre.
- [ ] Vérifier la localisation des données chez Neo.
- [ ] Régler la rétention PostHog pour tenir les durées annoncées
      (événements 25 mois, replays 3 mois).

### Avant toute offre payante

- [ ] Modifier l'objet social de PHÖS AGENCY et déclarer l'activité d'édition
      de logiciel (APE 5829C ou 6201Z) sur le guichet unique INPI.
- [ ] TVA : PHÖS AGENCY a un numéro de TVA, donc les abonnements seront
      facturés TTC avec 20 % de TVA. À intégrer aux prix annoncés.
- [ ] 🔴 Faire relire la limitation de responsabilité (CGU art. 11, CGV art. 9).
- [ ] Publier les CGV, coder la résiliation en ligne et la demande expresse
      d'exécution immédiate.
- [ ] Déposer la marque SIDEKICK à l'INPI (classes 9, 42, 41) après recherche
      d'antériorité : le nom est courant.

## Quelle structure utiliser : la SAS

Recommandation : **la SAS**, pas la micro-entreprise.

- **Responsabilité** : SIDEKICK héberge des revenus, des contrats et des
  masters. Un incident de données ou un litige doit rester dans une personne
  morale, pas toucher ton patrimoine professionnel d'ingé son.
- **Migration évitée** : passer plus tard d'une EI à une société oblige à céder
  code, marque, base clients et contrats. Commencer dans la SAS évite ce
  transfert.
- **Seuils** : la micro-entreprise a un plafond de chiffre d'affaires commun à
  toutes ses activités. Ingé son et SIDEKICK s'additionneraient.
- **Point à régler** : le code APE de PHÖS AGENCY est 9002Z, soutien au
  spectacle vivant, et l'objet social vise la production d'événements.
  L'édition d'un logiciel en ligne n'y est pas incluse. Ce n'est pas bloquant pour ouvrir une alpha gratuite (les actes
  engagent quand même la société envers les tiers), mais il faut **étendre
  l'objet social** par décision des associés puis formalité sur le guichet
  unique de l'INPI, avant la première vente.
- **À vérifier avec ton expert-comptable** (consultation courte) : TVA
  applicable aux abonnements, et séparation analytique entre événementiel et
  SaaS.
