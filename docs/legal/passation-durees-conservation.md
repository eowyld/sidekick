# Passation : durées de conservation des données

Document de passation, écrit le 16/09/2026 pour l'agent qui reprend ce sujet.
À lire en entier avant de toucher au code ou aux textes.

## Le problème

La politique de confidentialité et le registre RGPD annoncent des durées de
conservation. **Elles ne couvrent qu'une partie des données, et aucune n'est
appliquée automatiquement.** Il n'existe aujourd'hui aucune purge, aucun job
de nettoyage, aucun réglage de rétention chez les prestataires.

Autrement dit : les engagements publics sont écrits, la mécanique qui les tient
n'existe pas. C'est ça qu'il faut construire.

## Contexte du projet

- **SIDEKICK**, SaaS de gestion de carrière pour artistes musicaux
  indépendants français. Next.js 16 sur Vercel, Supabase (Paris, eu-west-3).
- **Éditeur** : PHÖS AGENCY, SAS, responsable de traitement. Pas de DPO.
- **Alpha gratuite ouverte à tous le 21/09/2026**, bêta payante visée le
  16/11 (`ALPHA.md`, `BETA.md`).
- Solo founder, budget contraint. Toute solution doit être tenable par une
  personne seule : un job cron qui tourne tout seul vaut mieux qu'une
  procédure manuelle annuelle.

## Ce qui est déjà fait (ne pas refaire)

Le bloc légal a été écrit les 15 et 16/09 :

- `app/confidentialite/page.tsx` : politique de confidentialité, **section 5**
  = les durées annoncées aujourd'hui.
- `app/cgu/page.tsx` : CGU, avec en annexe le contrat de sous-traitance
  (art. 28) pour les données de tiers saisies par l'utilisateur.
- `app/mentions-legales/page.tsx`, `src/lib/legal.ts` (identité de l'éditeur).
- `docs/legal/registre-rgpd.md` : registre des traitements **T1 à T10**,
  procédures (droits, suppression de compte, violation de données).
- `docs/legal/README.md` : checklist d'ouverture.
- `supabase/migrations/20260915120000_user_fk_cascade.sql` : la suppression
  d'un compte efface enfin ses données par cascade. **Non encore appliquée.**

**Règle de maintenance à respecter** : le registre, la page de
confidentialité et le code changent dans le même commit. Une durée annoncée
publiquement doit correspondre à ce que le code fait réellement.

## Les durées annoncées aujourd'hui (à vérifier et compléter)

Dans la section 5 de la politique de confidentialité :

| Donnée | Durée annoncée | Appliquée ? |
|---|---|---|
| Compte et contenus | vie du compte ; effacement ≤ 30 j après demande | manuel, procédure écrite |
| Comptes inactifs | supprimés après 3 ans, avec email de prévenance | **non, rien n'existe** |
| Journaux de connexion | 12 mois au plus | **non vérifié** côté Vercel et Supabase |
| Mesure d'audience | cookie ≤ 13 mois, événements ≤ 25 mois, replays ≤ 3 mois | **non, à régler dans PostHog** |
| Liens d'écoute | effacés avec le lien ou le compte | oui, par cascade SQL |
| Emails de support | 3 ans après le dernier échange | manuel |

## Ce qui manque, et qui est le cœur du travail

**Il y a 53 tables** dans `supabase/migrations/`, plus le stockage de fichiers,
plus les données chez les prestataires. La quasi-totalité n'a pas de durée
propre : elles suivent la vie du compte, ce qui est un choix défendable mais
qui doit être écrit, table par table, dans le registre.

Points à traiter en priorité, repérés mais non traités :

1. **`alpha_testers_waitlist`** : la waitlist a été retirée de l'interface le
   02/09, mais la table existe toujours et contient des adresses email. Données
   sans finalité active ni durée. À purger ou à justifier.
2. **Jetons et secrets** : `ical_tokens` (accès calendrier sans
   authentification), jetons OAuth Gmail, `presskit_user_slugs`. Quelle durée,
   quelle révocation ?
3. **Données de tiers** (`user_contacts`, `user_mailing_contacts`,
   `user_listening_invites`) : SIDEKICK est **sous-traitant**, c'est
   l'utilisateur qui décide de la durée. Comment le lui permettre en pratique ?
4. **Statistiques d'écoute** (`user_listening_sessions`, `user_listening_plays`)
   : elles concernent des tiers qui n'ont pas de compte. Une durée plafond est
   probablement nécessaire, même si le lien reste actif.
5. **Caches et quotas** : `task_suggestions`, `user_dashboard_hero`, compteurs
   de génération IA. Ce sont des données techniques, à faire tourner.
6. **Fichiers du bucket `drive`** : orphelins après suppression de lignes,
   fichiers de comptes supprimés, versions audio remplacées. Voir
   `src/modules/phono/lib/audio-gc.ts`, qui existe déjà.
7. **Sauvegardes Supabase** : la politique promet un effacement « sauvegardes
   comprises » sous 30 jours. Vérifier la rétention réelle du plan Pro.
8. **Prestataires** : PostHog (rétention à configurer), Brevo (journaux
   d'envoi), Vercel et Supabase (journaux), Neo (messagerie). Chacun a sa
   propre rétention, qu'il faut connaître avant de promettre une durée.

## Cadre juridique à respecter

- **RGPD art. 5.1.e** : pas de conservation au-delà de la finalité.
- **RGPD art. 13.2.a** : la durée doit être communiquée aux personnes.
- **RGPD art. 30** : le registre porte les durées, c'est le document qu'on
  présente à la CNIL.
- **Journaux de connexion** : un an au titre des obligations d'hébergeur
  (décret n° 2021-1362), à vérifier dans son état actuel.
- **Cookies et mesure d'audience** : recommandations CNIL, consentement à
  redemander au bout de 6 mois, cookie 13 mois, données 25 mois.
- **Factures émises par l'utilisateur** : 10 ans, mais c'est **son**
  obligation, pas celle de SIDEKICK. La politique le dit déjà.

## Livrable attendu

1. Un **tableau complet table par table** (les 53, plus le bucket, plus les
   prestataires) : finalité, durée, ce qui déclenche l'effacement. À intégrer
   au registre `docs/legal/registre-rgpd.md`.
2. Une **mécanique de purge** réellement exécutée. L'infrastructure existe
   déjà : `vercel.json` porte un cron quotidien, `app/api/cron/reminders`
   montre le modèle (protection par `CRON_SECRET`, client service role).
   Un second cron de nettoyage est la voie la plus simple.
3. La **mise à jour de la section 5** de la politique de confidentialité, pour
   que le texte public corresponde exactement à ce que la mécanique fait.
4. Les **réglages chez les prestataires**, PostHog en premier.

## Pièges connus

- La suppression d'un compte **ne supprime pas** les fichiers du bucket : le
  dossier `{userId}/` se supprime à part, avant l'utilisateur (procédure 4 du
  registre).
- La migration de cascade n'est pas encore appliquée en production. Tant
  qu'elle ne l'est pas, supprimer un utilisateur échoue.
- Le bucket `drive` passe en privé (migration `20260916090000`), les fichiers
  ne s'ouvrent plus que par `/api/drive/file`. Ne jamais réintroduire
  `getPublicUrl`.
- Ne rien promettre publiquement qui ne soit pas exécuté par du code ou par une
  procédure écrite. C'est la règle qui a guidé tout le bloc légal.

## Fichiers à lire en premier

```
docs/legal/registre-rgpd.md        ← registre et procédures
app/confidentialite/page.tsx       ← section 5, les durées publiques
supabase/migrations/               ← 53 tables
app/api/cron/reminders/route.ts    ← modèle de job protégé par CRON_SECRET
src/modules/phono/lib/audio-gc.ts  ← nettoyage de fichiers déjà écrit
ALPHA.md                           ← état du produit, périmètre, pièges
```
