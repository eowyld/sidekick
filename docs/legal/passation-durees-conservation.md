# Durées de conservation des données — la décision

Écrit le 16/09/2026. Remplace la version « passation » du même jour, qui posait
le problème beaucoup trop large.

Les échéances datées (2029, bêta du 16/11) vivent dans `docs/legal/echeances.md`.

## La décision

**Une seule règle : les données vivent ce que vit le compte. Un compte inactif
depuis 3 ans est supprimé, avec toutes ses données, après plusieurs emails de
prévenance.**

Pas de durée par table, pas de durée par type de donnée. Le RGPD (art. 5.1.e)
n'impose pas une durée par donnée : il impose qu'une durée soit justifiée par
la finalité. « Ces données servent à faire tourner le compte, donc elles vivent
ce que vit le compte » est une justification tenable, et 3 ans d'inactivité est
le seuil de référence de la CNIL pour une base clients.

C'est déjà ce qu'annonce la section 5 de `app/confidentialite/page.tsx`. **Le
texte public n'a pas à changer.** Ce qui manquait, c'est la mécanique.

## Les exceptions, et il n'y en a que quatre

Elles ne sont pas des choix : elles sont imposées de l'extérieur. Toutes les
quatre sont déjà écrites dans la section 5.

| Donnée | Durée | Pourquoi elle ne suit pas le compte |
|---|---|---|
| Journaux de connexion | 12 mois au plus | Plafond hébergeur (décret n° 2021-1362). Réglage Vercel et Supabase, pas du code applicatif |
| Mesure d'audience | cookie 13 mois, événements 25 mois, replays 3 mois | Recommandations CNIL. Réglage PostHog |
| Emails de support | 3 ans après le dernier échange | Hors base, donc hors cascade. Purge manuelle (Neo, Brevo) |
| Suppression à la demande | 30 jours, sauvegardes comprises | Distinct de l'inactivité : c'est le délai d'exécution d'un droit, pas une durée de conservation |

Deux autres arriveront, aucune avant l'alpha, toutes deux détaillées dans
`docs/legal/echeances.md` :

- **Bêta payante du 16/11/2026** : les factures d'abonnement de PHÖS AGENCY,
  10 ans (Code de commerce, art. L123-22).
- **Facturation électronique** : le jour où les factures transitent par une
  plateforme agréée, elle les archive avec ses propres durées et la suppression
  d'un compte SIDEKICK cesse de les effacer.

Les factures que l'utilisateur émet aujourd'hui ne sont **pas** une exception :
elles suivent le compte, et l'obligation de conservation de 10 ans pèse sur
l'artiste, pas sur SIDEKICK. La section 5 le dit déjà.

## Les arbitrages tranchés le 16/09

- **Statistiques d'écoute** (`user_listening_sessions`, `user_listening_plays`) :
  **conservées tant que le lien et le compte existent, sans plafond.** L'intérêt
  produit est la lecture de l'évolution d'une carrière sur plusieurs années, qui
  est une finalité réelle et durable. Les données sont déjà minimisées à la
  conception : `ip_hash` et jamais l'IP en clair, `visitor_name` seulement si le
  pro a choisi de s'identifier
  (`supabase/migrations/20260903100000_listening_links.sql`). Rien à changer, ni
  au code ni au texte.
- **Pas de tableau des 53 tables.** Le registre art. 30 porte une ligne de
  périmètre : toutes les tables `user_*` et le bucket `drive` suivent la vie du
  compte et s'effacent par cascade. Puis les quatre exceptions ci-dessus. Un
  tableau de 53 lignes n'ajouterait aucune information juridique et serait faux
  au premier `create table`.
- **Jetons et secrets** (`ical_tokens`, jetons OAuth Google, `presskit_user_slugs`) :
  suivent le compte comme le reste. La vraie question qu'ils posent n'est pas
  une durée de conservation mais une **révocation** : un jeton iCal donne accès
  au calendrier sans authentification, il faut pouvoir le regénérer. C'est un
  sujet de sécurité produit, pas de RGPD, à traiter comme tel.
- **Caches et quotas** (`task_suggestions`, `user_dashboard_hero`, compteurs IA) :
  suivent le compte. Ils tournent d'eux-mêmes par nature. Au pire un sujet de
  coût, pas un sujet juridique.
- **Données de tiers** (`user_contacts`, `user_mailing_contacts`,
  `user_listening_invites`) : SIDEKICK est sous-traitant, l'utilisateur décide.
  En pratique il décide en supprimant la ligne ou son compte, et le contrat de
  sous-traitance en annexe des CGU couvre déjà le cadre. Rien de plus à bâtir.

## Ce qui est fait

- ✅ **Cascade appliquée en production** depuis le 15/09
  (`20260915120000_user_fk_cascade.sql`, vérifié le 16/09 avec
  `supabase migration list --linked`). Supprimer un utilisateur efface ses
  données. La procédure de suppression sur demande est réellement exécutable.
- ✅ **Waitlist supprimée en production** (`20260901000100_drop_waitlist.sql`,
  vérifié le 16/09 : migration appliquée, la table ne répond plus en REST).
  Plus aucune adresse de liste d'attente n'est conservée. Le `CREATE TABLE` qui
  subsiste dans la baseline est de l'historique de migration, pas une table
  vivante. C'était le seul jeu de données personnelles sans compte, donc le seul
  hors de portée de la règle des 3 ans.
- ✅ Bloc légal écrit les 15 et 16/09 : politique de confidentialité, CGU et
  contrat de sous-traitance en annexe, mentions légales, registre RGPD T1 à T10
  avec ses procédures, `docs/legal/README.md` (checklist d'ouverture).

## Ce qui reste

Par ordre, du plus urgent au plus lointain :

1. ✅ **Fichiers du bucket `drive`** — fait le 16/09. `scripts/delete-user.mjs`
   exécute la procédure 4 dans le bon ordre et vérifie le résultat ; son mode
   `--sweep` retrouve les dossiers dont le compte n'existe plus. Les orphelins
   internes à un compte étaient déjà couverts : `deleteDocument` efface le
   fichier avec sa ligne, et `src/modules/phono/lib/audio-gc.ts` nettoie les
   versions audio remplacées. Balayage passé en production le 16/09 : 4
   dossiers de comptes de test supprimés, sans contenu personnel, et le bucket
   revérifié derrière.
2. ✅ **PostHog** — vérifié le 16/09, les trois durées annoncées sont tenues,
   mais pas de la façon qu'on croyait.
   - **Cookie, 13 mois** : `cookie_expiration: 365` est désormais explicite dans
     `instrumentation-client.ts`. C'était déjà le défaut de `posthog-js` ; le
     figer évite qu'une montée de version repousse la durée sans qu'on le voie.
   - **Événements, 25 mois** : **la rétention n'est pas réglable à la baisse
     chez PostHog.** Elle est fixée par le plan, 1 an en gratuit et 7 ans en
     payant, et la documentation est explicite : *« a shorter period is not
     available on request »*. Le projet est en plan gratuit, donc 1 an, ce qui
     respecte un plafond annoncé à 25 mois. 🔴 **Un passage au plan payant
     rendrait la section 5 fausse du jour au lendemain**, sans aucun moyen de
     la rattraper par un réglage. Consigné dans `docs/legal/echeances.md`.
   - **Replays, 3 mois** : le plan gratuit plafonne à 30 jours. Conforme par
     construction. Le réglage existe (*Project settings → Session replay →
     Data retention*) et ne vaut que pour les nouveaux enregistrements.
3. ✅ **Journaux et sauvegardes** — vérifié le 16/09. Les deux promesses sont
   tenues, mais ce que la vérification a trouvé compte plus que le constat.
   - **Journaux, 12 mois au plus** : SIDEKICK n'en écrit aucun. Chez les
     hébergeurs, la durée est fixée par le plan : 1 heure chez Vercel Hobby
     (1 jour en Pro), 1 jour chez Supabase Free (7 jours en Pro). On annonce
     des mois, on garde des heures. Plafond respecté très largement.
     ⚠️ La base légale de T9 a été corrigée au passage : elle invoquait une
     « obligation d'hébergeur » que SIDEKICK ne porte pas, puisqu'il ne
     conserve rien. Reste l'intérêt légitime, qui suffit. Le revers est
     opérationnel : sans journaux, l'ampleur d'une violation est
     indéterminable. Détail dans le registre, sous T9.
   - **Suppression sous 30 jours, sauvegardes comprises** : tenue. 🔴 Parce
     qu'en plan gratuit **Supabase ne fait aucune sauvegarde** : il n'y a rien
     à purger. Ce n'est pas un bon résultat, c'est une absence de filet. Le
     passage en Pro (7 jours de sauvegardes quotidiennes) reste sous les 30
     jours annoncés, et le PITR, s'il est pris un jour, plafonne à 28 jours,
     donc sous la promesse aussi. Un plan Team (28 j) ou Enterprise (30 j)
     serait à la limite : à rouvrir si ça arrive.
4. ✅ **Registre** — fait le 16/09. Il porte la règle unique, la **liste fermée
   des quatre exceptions** avec leur traitement de rattachement, les deux
   exceptions à venir, et les notes « comment T8 / T9 sont réellement tenus ».
   Deux durées restent imprécises et sont signalées comme telles plutôt que
   maquillées : les journaux Brevo (T5) et la purge des notifications
   d'inscription (T6). Le registre dit aussi explicitement que la suppression
   des comptes inactifs **n'est pas encore automatisée**, pour ne pas décrire un
   mécanisme inexistant.
5. **Cron d'inactivité.** Aucune urgence : le premier cas réel tombe le
   21/09/2029. Modèle : `app/api/cron/reminders/route.ts` (protection
   `CRON_SECRET`, client service role). Voir `docs/legal/echeances.md` pour ce
   qui doit exister avant cette date.

## Pièges connus

- La suppression d'un compte **ne supprime pas** les fichiers du bucket : le
  dossier `{userId}/` se supprime à part, avant l'utilisateur (procédure 4 du
  registre). C'est le point 1 ci-dessus.
- Le bucket `drive` est privé, migration `20260916090000` **appliquée en
  production le 16/09** et vérifiée (`public: false`, ancienne URL publique en
  400). Les fichiers ne s'ouvrent plus que par `/api/drive/file`. Ne jamais
  réintroduire `getPublicUrl`.
- Ne rien promettre publiquement qui ne soit pas exécuté par du code ou par une
  procédure écrite. C'est la règle qui a guidé tout le bloc légal.
- Le registre, la page de confidentialité et le code changent dans le même
  commit.

## Fichiers à lire

```
docs/legal/echeances.md            ← les échéances datées, dont sept. 2029
docs/legal/registre-rgpd.md        ← registre et procédures
app/confidentialite/page.tsx       ← section 5, les durées publiques
app/api/cron/reminders/route.ts    ← modèle de job protégé par CRON_SECRET
src/modules/phono/lib/audio-gc.ts  ← nettoyage de fichiers déjà écrit
ALPHA.md                           ← état du produit, périmètre, pièges
```
