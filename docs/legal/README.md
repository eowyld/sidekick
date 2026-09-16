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
| Durées de conservation : la décision et le reste à faire | `docs/legal/passation-durees-conservation.md` | interne |
| Échéances à date future (sept. 2029, bêta du 16/11) | `docs/legal/echeances.md` | interne |
| CGV | `docs/legal/CGV-brouillon.md` | **non, après l'alpha** |

Pas de page « charte RGPD » séparée : elle ferait doublon avec la politique de
confidentialité (côté utilisateurs) et le registre (côté obligations internes).

## Checklist d'ouverture

### Bloquant, avant le 21/09

- [x] Identité de l'éditeur renseignée le 16/09 : PHÖS AGENCY, SAS au capital
      de 6 000 €, SIREN 980 520 142, siège 117 rue Roger Salengro, 59239
      Thumeries, TVA FR33980520142.
- [x] Identité complétée le 16/09 : RCS Lille Métropole, président et
      directeur de la publication Eliott Matton, téléphone public renseigné.
- [x] Médiateur de la consommation : écarté pour l'alpha, décision du 16/09.
      L'obligation de l'article L612-1 vise les litiges nés d'un contrat de
      fourniture de services à un consommateur ; sans offre payante, le risque
      est faible. La clause correspondante des CGU ne s'affiche pas tant que
      `LEGAL_MEDIATOR` n'est pas renseigné. **À souscrire avant la bêta
      payante**, voir `BETA.md`.
- [x] `supabase/migrations/20260915120000_user_fk_cascade.sql` appliquée en
      production le 15/09, vérifiée le 16/09 : supprimer un compte efface ses
      données par cascade.
- [ ] 🔴 **Déployer `claude-edits` en production.** C'est le bloquant numéro un :
      la production tourne sur `main`, 183 commits de retard, et
      `/mentions-legales`, `/cgu`, `/confidentialite` répondent **404**. Les
      mentions légales sont obligatoires (LCEN art. 6-III) ; sans déploiement,
      aucun des textes écrits n'existe pour le public.
- [ ] 🔴 **Région d'exécution Vercel.** `"regions": ["cdg1"]` ajouté à
      `vercel.json` le 16/09 : sans lui, le défaut Vercel est `iad1` (Washington)
      et la promesse « données en Europe » était fausse côté calcul. Effectif au
      prochain déploiement, à vérifier ensuite via `x-vercel-id`.
- [ ] Vérifier que `SIGNUP_NOTIFY_TO` et la boîte hello@ reçoivent bien les
      emails (c'est l'adresse de toutes les demandes RGPD).
- [x] Aucun `TODO_` ne fuit dans une page : les deux restants concernent le
      médiateur, et la clause des CGU est conditionnée par `hasMediator`
      (`app/cgu/page.tsx`), donc rien ne s'affiche tant qu'il n'est pas souscrit.

### Durées de conservation — tranché le 16/09

Une seule règle : **les données vivent ce que vit le compte, et un compte
inactif depuis 3 ans est supprimé après plusieurs emails de prévenance.** Pas
d'inventaire table par table, pas de durée par donnée. Quatre exceptions
subies, toutes déjà écrites en section 5 de la politique. Décision complète et
justification : `docs/legal/passation-durees-conservation.md`.

Reste à faire avant l'ouverture :

- [x] Fichiers du bucket `drive` : `scripts/delete-user.mjs` exécute la
      procédure 4 dans le bon ordre (vidage du dossier `{userId}/`, vérification,
      puis suppression de l'utilisateur), et `--sweep` retrouve les dossiers
      dont le compte n'existe plus. Écrit le 16/09.
- [x] Balayage passé en production le 16/09 : 4 dossiers orphelins de comptes
      de test supprimés (squelette de dossiers vides, aucun contenu personnel).
      Vérifié après coup, le bucket ne contient plus qu'un dossier pour un
      compte existant.
- [x] PostHog : les trois durées annoncées sont tenues (vérifié le 16/09).
      Cookie figé à 365 jours dans le code ; événements 1 an et replays 30
      jours, imposés par le plan gratuit. 🔴 La rétention des événements n'est
      **pas** réglable à la baisse et passe à 7 ans sur un plan payant : ne pas
      changer de plan sans rouvrir la section 5.
- [ ] Vérifier d'un coup d'œil *Project settings → Session replay → Data
      retention* : la valeur affichée doit être ≤ 90 jours.
- [x] Journaux et sauvegardes vérifiés le 16/09. Les 12 mois annoncés sont un
      plafond très largement respecté (1 h chez Vercel Hobby, 1 j chez Supabase
      Free), et la base légale de T9 a été corrigée : SIDEKICK ne porte aucune
      obligation de conservation d'hébergeur puisqu'il ne journalise rien.
- [ ] 🔴 **Souscrire Supabase Pro avant l'ouverture.** En plan gratuit il n'y a
      **aucune sauvegarde** : une base perdue est perdue, et l'alpha avec. Déjà
      prévu au 17/09 dans `ALPHA.md` pour le quota de stockage ; c'est en
      réalité le point le plus critique de la recette.
- [x] Registre complété le 16/09 : règle unique, liste fermée des quatre
      exceptions, notes T8 et T9, base légale de T9 corrigée.
- [x] `20260916090000_drive_bucket_private.sql` **appliquée en production le
      16/09**. Vérifié : `public: false`, et l'ancienne URL publique répond 400.
      Le bloc légal peut désormais être déployé sans rendre la section 6 fausse.

Le cron de suppression des comptes inactifs n'est **pas** un sujet d'alpha : le
premier cas réel tombe le 21/09/2029. Voir `docs/legal/echeances.md`.

### Important, dans la première semaine

- [ ] Signer / archiver les DPA (Supabase, PostHog, Vercel, Brevo), voir le
      registre.
- [ ] Vérifier la localisation des données chez Neo.
- [ ] Régler la rétention PostHog pour tenir les durées annoncées
      (événements 25 mois, replays 3 mois).

### Avant toute offre payante

- [ ] Faire corriger le code APE (5829C ou 6201Z) sur le guichet unique INPI.
- [ ] TVA : l'éditeur est en franchise en base. Les CGV doivent porter la
      mention « TVA non applicable, article 293 B du CGI », et les prix
      annoncés sont nets de TVA. Surveiller le seuil de franchise : le jour où
      il est dépassé, 20 % de TVA s'appliquent et les prix affichés changent.
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
- **Point à régler, mineur** : l'objet social des statuts couvre déjà
  l'édition de logiciel ; seul le code APE (9002Z, soutien au spectacle
  vivant) ne reflète pas l'activité. Le code APE est déclaratif et n'a pas
  d'effet sur la validité des contrats, mais il sert de référence en cas de
  contrôle : à faire corriger sur le guichet unique INPI. Ce n'est pas bloquant pour ouvrir une alpha gratuite (les actes
  engagent quand même la société envers les tiers), mais il faut **étendre
  l'objet social** par décision des associés puis formalité sur le guichet
  unique de l'INPI, avant la première vente.
- **À vérifier avec ton expert-comptable** (consultation courte) : TVA
  applicable aux abonnements, et séparation analytique entre événementiel et
  SaaS.
