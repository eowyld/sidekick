# Échéances longues — à ne pas oublier

Ce fichier liste les obligations qui se déclenchent à une **date future**, loin
de l'endroit où on les a écrites. Elles ne cassent rien quand on les oublie :
c'est exactement pour ça qu'on les oublie.

Écrit le 16/09/2026. À relire au moins une fois par trimestre, et à chaque fois
qu'une date ci-dessous approche.

---

## Septembre 2029 — premier checkup des comptes inactifs

**C'est l'échéance principale de ce fichier.**

La politique de confidentialité (section 5) engage : *un compte inactif depuis
3 ans est supprimé, après un email de prévenance*. L'alpha ayant ouvert le
**21/09/2026**, aucun compte ne peut atteindre 3 ans d'inactivité avant le
**21/09/2029**. C'est la date du premier cas réel.

Ce qu'il faut avoir en place **avant** septembre 2029 :

1. Une définition de l'inactivité. Retenue : `auth.users.last_sign_in_at`.
   C'est la mesure la plus simple et la plus honnête (un compte qu'on n'ouvre
   plus est inactif, même si un cron y écrit).
2. Les emails de prévenance. Annoncés au pluriel dans l'intention : plusieurs
   rappels dans les mois qui précèdent. Proposition : **J-90, J-30, J-7**.
   Une seule connexion remet le compteur à zéro.
3. Le job de suppression. Un second cron dans `vercel.json`, sur le modèle de
   `app/api/cron/reminders` (protection `CRON_SECRET`, client service role).
   Il supprime le dossier `{userId}/` du bucket **avant** l'utilisateur
   (procédure 4 du registre), puis l'utilisateur, la cascade fait le reste.

Il n'y a **aucune urgence à l'écrire en 2026**. Ce qui compte, c'est que ce
soit fait avant l'été 2029, et que d'ici là le texte public reste vrai.

⚠️ Si la date d'ouverture change, ou si des comptes existent déjà depuis avant
le 21/09/2026 (compte de démo, comptes de test), recalculer la date : c'est le
compte le plus ancien qui déclenche le premier cas.

---

## 16/11/2026 — passage à la bêta payante

Le paiement change trois choses juridiques, aucune avant cette date :

- **Factures d'abonnement de PHÖS AGENCY** : obligation comptable de 10 ans
  (Code de commerce, art. L123-22). Elles vivent chez Stripe. Conséquence
  directe : **la suppression d'un compte utilisateur n'efface pas ces
  factures**, et la section 5 de la politique doit le dire avant l'ouverture
  de la bêta. C'est une exception réelle à la règle « les données vivent ce que
  vit le compte ».
- **Médiation de la consommation** : obligatoire en B2C payant. Écartée pour
  l'alpha gratuite (voir `BETA.md`), à trancher avant le 16/11.
- **Droit de rétractation** 14 jours et sa renonciation pour un service
  numérique fourni immédiatement : à vérifier dans les CGV.

---

## Facturation électronique — la troisième exception à la règle unique

La réforme française impose aux factures B2B de transiter par une **plateforme
agréée** (PA), dans un format structuré (Factur-X, UBL, CII). Calendrier tel
qu'il est au 16/09/2026 :

- **1er septembre 2026** (déjà en vigueur) : obligation de **réception** pour
  tous les assujettis à la TVA. Concerne PHÖS AGENCY en tant qu'entreprise, et
  concerne aussi les utilisateurs de SIDEKICK, y compris en franchise en base
  (assujettis non redevables). ⚠️ Ce dernier point est à confirmer avec
  l'expert-comptable, il détermine ce qu'on peut affirmer aux artistes.
- **1er septembre 2027** : obligation d'**émission** pour les TPE et PME, donc
  pour la quasi-totalité de la cible. C'est la seule date qui rende Factur-X
  nécessaire aux utilisateurs.

**Ce que ça fait à la règle des durées.** Dès que SIDEKICK s'adosse à une PA
(Iopole est le candidat, voir `BETA.md`), les factures sont transmises **et
archivées chez elle**, avec ses propres durées, indépendantes du compte
SIDEKICK. Trois conséquences à traiter ensemble, dans le même commit :

1. « Les données vivent ce que vit le compte » cesse d'être vrai pour les
   factures : supprimer un compte n'efface plus ce que la PA détient. La
   section 5 doit le dire.
2. Le rôle change : sur ce flux SIDEKICK est sous-traitant de l'utilisateur et
   la PA un sous-traitant ultérieur. DPA à signer, ligne au registre, mention
   dans la section transferts.
3. La réversibilité (récupérer 10 ans de documents, changer de PA dans
   l'annuaire) devient contractuelle, pas un confort. Déjà noté dans `BETA.md`.

Aujourd'hui rien de tout cela ne s'applique : aucune transmission, aucune PA,
et les factures restent des documents de l'utilisateur dont il porte seul
l'obligation de conservation (art. L123-22 Code de commerce, 10 ans ; art.
L102 B LPF, 6 ans fiscaux). C'est ce que dit déjà la section 5.

---

## Récurrent — à revérifier, sans date fixe

| Sujet | Quoi vérifier | Quand |
|---|---|---|
| 🔴 **Plan PostHog** | **Ne pas passer au payant sans rouvrir la section 5.** La rétention des événements est fixée par le plan et **n'est pas réglable à la baisse** : 1 an en gratuit, **7 ans dès le premier euro**. Le projet est en gratuit au 16/09, donc la promesse « événements 25 mois au plus » est tenue. Elle devient fausse le jour d'un passage au payant, et aucun écran ne permet de la rattraper | avant tout changement de plan, et à chaque migration d'outil d'analytics |
| Replays PostHog | Plafonnés à 30 jours par le plan gratuit, sous les 3 mois annoncés. Réglable dans *Project settings → Session replay → Data retention*, et **les changements ne valent que pour les nouveaux enregistrements** | à revérifier après un changement de plan |
| Cookie PostHog | 13 mois au plus (annoncé). Figé à 365 jours dans `instrumentation-client.ts`, plus laissé au défaut de la librairie | à revérifier après une montée de version de `posthog-js` |
| Consentement cookies | La CNIL recommande de redemander au bout de 6 mois | Vérifier que la bannière le fait |
| Journaux de connexion | 12 mois au plus (annoncé). Réel au 16/09 : 1 h chez Vercel Hobby, 1 j chez Supabase Free. Même en Pro (1 j et 7 j) ou avec Observability Plus (30 j), on reste très loin du plafond. Aucune action, sauf si un jour on se met à journaliser nous-mêmes | à chaque changement de plan ou d'hébergeur |
| Sauvegardes Supabase | La promesse d'effacement « sauvegardes comprises » sous 30 jours tient tant que la rétention reste sous 30 jours : **Pro = 7 j**, PITR = 7/14/28 j, Team = 14 j. ⚠️ **Enterprise = 30 j**, soit pile à la limite : rouvrir la section 5 avant d'y passer | à chaque changement de plan |
| Emails de support | 3 ans après le dernier échange (Neo, Brevo). Purge manuelle | Une fois par an |
| Notifications d'inscription (T6) | Supprimer celles de plus de 12 mois dans la boîte `SIGNUP_NOTIFY_TO`. Annoncé au registre, jamais fait : à tenir ou à retirer du registre | Une fois par an |
| Durée des journaux Brevo (T5) | Le registre dit « selon leur politique », ce qui n'est pas une durée. La relever chez Brevo et l'inscrire | Une fois, dès que possible |
| Sous-traitants | Tout nouveau prestataire qui touche des données ajoute une ligne au registre et, s'il est hors UE, une mention dans la section transferts | À chaque ajout |

---

## La règle de maintenance qui tient tout

**Le registre, la page de confidentialité et le code changent dans le même
commit.** Une durée annoncée publiquement doit correspondre à ce que le code
fait réellement. C'est la règle qui a guidé tout le bloc légal, et c'est la
seule qui empêche ce fichier de redevenir faux.

Fichiers concernés :

```
app/confidentialite/page.tsx     ← section 5, les durées publiques
docs/legal/registre-rgpd.md      ← registre art. 30 et procédures
docs/legal/passation-durees-conservation.md  ← la décision et son état
```
