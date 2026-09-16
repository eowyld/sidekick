# Registre des traitements et procédures RGPD

Document interne. Registre tenu au titre de l'article 30 du RGPD (l'exemption
des structures de moins de 250 personnes ne s'applique pas : les traitements
sont réguliers, pas occasionnels). À présenter à la CNIL sur demande.

**Responsable de traitement** : PHÖS AGENCY, SAS au capital de 6 000 €,
SIREN 980 520 142, SIRET du siège 980 520 142 00012, 117 rue Roger Salengro,
59239 Thumeries, représentée par son Président, Eliott Matton. Pas de DPO (non obligatoire : pas de suivi
régulier et systématique à grande échelle, pas de données sensibles).
Contact : hello@sidekickartists.com.

Règle de maintenance : ce registre, `app/confidentialite/page.tsx` et le code
changent **dans le même commit**. Un nouveau prestataire, un nouveau champ
collecté, la réactivation de l'IA = mise à jour ici et sur la page.

Mis à jour le 16/09/2026 : durées de conservation tranchées (règle unique et
liste fermée des exceptions), base légale de T9 corrigée, procédure 4 outillée
par `scripts/delete-user.mjs`.

---

## 1. Registre

| # | Traitement | Finalité | Base légale | Données | Personnes | Destinataires / sous-traitants | Durée |
|---|---|---|---|---|---|---|---|
| T1 | Comptes | Créer et authentifier les comptes | Contrat (6.1.b) | Prénom, nom, email, mot de passe haché, ID Google, secteurs, préférences, version des CGU acceptée | Utilisateurs | Supabase (Paris), Google si connexion Google | Vie du compte ; 3 ans d'inactivité → suppression après prévenance |
| T2 | Contenus | Fournir le service (catalogue, revenus, admin, documents, liens d'écoute) | Contrat | Fichiers audio, documents, factures, revenus, statuts, démarches | Utilisateurs | Supabase, Vercel | Vie du compte ; effacement ≤ 30 j après demande |
| T3 | Données de tiers saisies par l'utilisateur | Pour le compte de l'utilisateur | **SIDEKICK sous-traitant** (annexe CGU, art. 28) | Contacts, coauteurs, clients, emails de destinataires | Tiers | Supabase, Vercel | Décidée par l'utilisateur ; supprimées avec le compte |
| T4 | Statistiques des liens d'écoute | Montrer à l'artiste qui a écouté | **SIDEKICK sous-traitant** de l'artiste | Nom saisi (facultatif), email d'invitation, UA, empreinte HMAC de l'IP, titres, durée, téléchargements | Destinataires des liens | Supabase | Supprimées avec le lien ou le compte |
| T5 | Emails de service | Confirmation, mot de passe, rappels de démarches | Contrat | Email, prénom, intitulés et dates des démarches | Utilisateurs | Brevo (FR/UE) | Journaux Brevo selon leur politique |
| T6 | Notification d'inscription | Suivi interne des inscriptions | Intérêt légitime | Nom, email, secteurs | Utilisateurs | Brevo, boîte `SIGNUP_NOTIFY_TO` | Supprimer les notifications de plus de 12 mois |
| T7 | Envoi via Gmail (si activé) | Envoyer les emails déclenchés par l'utilisateur | Contrat | Jetons OAuth `gmail.send`, adresse | Utilisateurs | Google | Jusqu'à révocation ou suppression du compte |
| T8 | Mesure d'audience | Améliorer le produit | **Consentement** (art. 82 loi I&L) | Événements, pages, clics, replays masqués, ID + email une fois connecté | Visiteurs, utilisateurs | PostHog (instance UE) | Cookie ≤ 13 mois ; événements ≤ 25 mois ; replays ≤ 3 mois |
| T9 | Sécurité et journaux | Sécurité, débogage | Intérêt légitime | IP, date, UA, erreurs | Tous | Vercel, Supabase | 12 mois au plus (voir la note ci-dessous : en pratique quelques heures à quelques jours) |
| T10 | Support | Répondre aux demandes | Intérêt légitime | Contenu des emails | Tous | Neo | 3 ans après le dernier échange |

### Périmètre des durées, et la liste fermée des exceptions

**Règle unique** : sauf exception listée ci-dessous, toutes les tables `user_*`
et le bucket `drive` suivent la vie du compte et s'effacent par cascade à sa
suppression. Un compte inactif depuis 3 ans est supprimé. Pas de durée par
table : la finalité est la même pour toutes, faire fonctionner le compte.
Décision et justification dans `docs/legal/passation-durees-conservation.md`.

**Les exceptions sont au nombre de quatre, et cette liste est fermée.** Toutes
sont imposées de l'extérieur, aucune n'est un choix :

| Exception | Durée | Traitement | Pourquoi elle échappe à la règle |
|---|---|---|---|
| Journaux de connexion | 12 mois au plus | T9 | Plafond hébergeur ; ce sont les plans Vercel et Supabase qui décident |
| Mesure d'audience | 13 / 25 / 3 mois | T8 | Recommandations CNIL ; réglages PostHog |
| Emails de support | 3 ans après le dernier échange | T10 | Hors base, donc hors cascade |
| Suppression à la demande | 30 jours | T2 | Ce n'est pas une durée de conservation mais le délai d'exécution d'un droit |

Deux exceptions supplémentaires sont prévues et n'existent pas encore : les
factures d'abonnement de PHÖS (10 ans) à la bêta payante, et l'archivage des
factures chez une plateforme agréée avec la facturation électronique. Les deux
sont décrites dans `docs/legal/echeances.md`. **Ne pas en ajouter d'autres sans
rouvrir la section 5 de la politique dans le même commit.**

⚠️ **La suppression des comptes inactifs n'est pas automatisée au 16/09.** Le
registre annonce une règle, pas un mécanisme en fonctionnement : aucun compte ne
peut atteindre 3 ans d'inactivité avant le **21/09/2029**, et le job de purge
sera écrit d'ici là (cadence de prévenance et définition de l'inactivité dans
`docs/legal/echeances.md`). La suppression sur demande, elle, est exécutable dès
aujourd'hui, voir procédure 4.

**Comment T8 est réellement tenu** (vérifié le 16/09) : le cookie est figé à
365 jours dans `instrumentation-client.ts`. Les deux autres durées ne sont pas
des réglages : la rétention des événements est fixée par le plan PostHog et
**n'est pas réductible** (1 an en gratuit, 7 ans en payant), et les replays
sont plafonnés à 30 jours par le plan gratuit. Le projet est en gratuit, donc
les plafonds annoncés sont respectés avec de la marge. 🔴 Un passage au plan
payant porterait les événements à 7 ans et rendrait l'annonce fausse sans
recours technique.

**Comment T9 est réellement tenu** (vérifié le 16/09) : SIDEKICK n'écrit aucun
journal de connexion. Tout vit chez les hébergeurs, et leurs durées sont fixées
par le plan, pas par nous.

| Source | Aujourd'hui (plans gratuits) | Après passage en payant |
|---|---|---|
| Journaux d'exécution Vercel | 1 heure (Hobby) | 1 jour (Pro), 30 jours avec Observability Plus |
| Journaux Supabase | 1 jour | 7 jours (Pro), 28 jours (Team) |

Le plafond annoncé de 12 mois est donc respecté avec une marge considérable :
on annonce des mois, on garde des heures.

⚠️ **La base légale a été corrigée le 16/09.** T9 invoquait une « obligation
légale » et des « obligations d'hébergeur » (décret n° 2021-1362). Cette
mention n'avait pas de sens ici : cette obligation de conservation pèse sur
l'hébergeur, et SIDEKICK ne conserve rien. Ce sont Vercel et Supabase qui sont
concernés, chacun pour ce qu'il héberge. Ne reste que l'intérêt légitime
(sécurité, débogage), qui suffit.

⚠️ **Conséquence opérationnelle, à connaître avant d'en avoir besoin** : avec
une heure de journaux chez Vercel, une intrusion repérée le lendemain n'est
plus traçable. C'est exactement ce qui s'est produit pour la période où le
bucket `drive` était public (voir procédure 5) : les journaux d'accès n'ont pas
pu être analysés parce qu'ils n'existaient plus. La procédure 5 demande de
documenter l'ampleur d'une violation (art. 33.5) ; sans journaux, cette
documentation se limitera à « ampleur indéterminable ». C'est un choix de coût
assumé, pas un oubli.

⚠️ **Deux durées restent imprécises, et c'est assumé pour l'alpha.** L'article
30 attend une durée par traitement ; ces deux-là n'en ont pas de vraie :

- **T5** dit « journaux Brevo selon leur politique ». Ce n'est pas une durée.
  À relever chez Brevo et à inscrire ici. Faible enjeu : ce sont des journaux
  d'envoi, pas du contenu.
- **T6** dit « supprimer les notifications de plus de 12 mois ». C'est une
  instruction manuelle que personne n'exécute. Tant qu'elle n'est pas tenue,
  elle décrit une intention, pas un traitement. Passée en tâche annuelle dans
  `docs/legal/echeances.md`, à défaut de l'automatiser.

**Non actifs aujourd'hui** (ne pas les mentionner publiquement tant qu'ils sont
coupés, mettre à jour avant réactivation) : IA Anthropic (pausée le 14/09),
campagnes marketing et pixels de suivi `mail/track/*` (module fermé), presskit
public (fermé), Stripe (pas de paiement).

## 2. Sous-traitants et DPA

| Prestataire | Rôle | Localisation | DPA | Transfert hors UE |
|---|---|---|---|---|
| Supabase Inc. | Base, auth, stockage | AWS eu-west-3 (Paris) | ⬜ signer via le dashboard (Settings → Legal / DPA) | Accès support possible depuis les US : CCT dans le DPA |
| Vercel Inc. | Hébergement, fonctions | `cdg1` (Paris), figé dans `vercel.json` le 16/09 (voir note ci-dessous) | ⬜ DPA intégré aux conditions Vercel, à télécharger et archiver | Oui : DPF / CCT |
| Brevo (Sendinblue SAS) | Emails | UE | ⬜ DPA intégré aux CGU Brevo, archiver | Non |
| PostHog Inc. | Analytics | Instance EU (Francfort) | ⬜ DPA à signer en ligne (posthog.com/dpa) | Accès support possible : CCT |
| Neo (Titan) | Messagerie hello@ | ⬜ vérifier la localisation | ⬜ vérifier l'existence d'un DPA | ⬜ à vérifier |
| Google | Connexion Google, Gmail API | — | Responsable distinct pour la connexion ; conditions Google API | Oui |

Archiver chaque DPA signé en PDF dans un dossier hors dépôt.

🔴 **Région d'exécution Vercel — écart trouvé et corrigé le 16/09.** `vercel.json`
ne déclarait aucune région. Or **le défaut de Vercel est `iad1`, Washington**,
pour tout nouveau projet. La base est bien à Paris, mais le calcul ne l'était
pas : chaque requête portant des factures, des contrats et des revenus
s'exécutait aux États-Unis, alors que la politique de confidentialité et la
landing affirment que les données restent en Europe.

Corrigé en déclarant `"regions": ["cdg1"]` dans `vercel.json`, pour que la
promesse soit portée par le dépôt et non par un réglage de tableau de bord qu'un
recréation de projet remettrait à zéro. ⚠️ **Effectif seulement au prochain
déploiement** : tant que la production tourne sur `main`, la région n'est pas
garantie. À vérifier après la bascule dans *Settings → Functions → Function
Regions*, et via l'en-tête `x-vercel-id` d'une réponse de fonction.

## 3. Procédure : demande d'exercice de droits

1. Vérifier que la demande vient de l'adresse du compte. Sinon, demander une
   confirmation depuis cette adresse (pas de pièce d'identité par défaut).
2. Accuser réception. Délai légal : **1 mois** (art. 12.3), prorogeable de 2
   mois si complexe, en prévenant.
3. **Accès / portabilité** : exporter les lignes du `user_id` de toutes les
   tables `public` en JSON, plus un zip du dossier `{userId}/` du bucket `drive`.
   Envoyer via un lien à durée limitée, pas en pièce jointe.
4. **Effacement** : voir procédure 4.
5. Consigner la demande (date, type, date de réponse) dans un tableau de suivi.

## 4. Procédure : suppression de compte

Prérequis : migration `20260915120000_user_fk_cascade.sql`, appliquée en
production le 15/09.

1. Proposer l'export (factures notamment) et attendre la confirmation.
2. Aperçu, qui ne supprime rien :

   ```bash
   node scripts/delete-user.mjs <email>
   ```

   Puis l'exécution, une fois le compte et le volume vérifiés :

   ```bash
   node scripts/delete-user.mjs <email> --yes
   ```

   Le script vide le dossier `{userId}/` du bucket, vérifie qu'il ne reste
   rien, **puis seulement** supprime l'utilisateur ; les tables `public`
   suivent par cascade. Cet ordre est la raison d'être du script : après la
   suppression de l'utilisateur, l'identifiant est perdu et ses fichiers
   deviennent introuvables. Ne pas faire ces deux étapes à la main dans le
   dashboard Supabase.
3. PostHog → Persons → rechercher l'email → *Delete person and events*.
4. Brevo → Contacts : supprimer le contact s'il existe.
5. Supprimer la notification d'inscription de la boîte `SIGNUP_NOTIFY_TO`.
6. Confirmer la suppression par email. Délai engagé publiquement : 30 jours.

Le script rappelle lui-même les étapes 3 à 6 à la fin de son exécution.

### Filet : dossiers orphelins du bucket

Une suppression faite à la main dans le dashboard, ou faite avant l'écriture de
ce script, laisse un dossier `{userId}/` sans propriétaire. Le balayage les
retrouve en comparant la racine du bucket à la liste des comptes :

```bash
node scripts/delete-user.mjs --sweep        # aperçu
node scripts/delete-user.mjs --sweep --yes  # suppression
```

À passer après chaque suppression de compte, et au moins une fois par
trimestre. Les entrées de la racine qui ne portent pas la forme d'un
identifiant ne sont jamais supprimées : elles sont signalées, pas touchées.

## 5. Procédure : violation de données

1. Contenir (révoquer les clés, couper la route, passer le bucket en privé).
2. Documenter dans ce dossier : date, nature, données et personnes touchées,
   conséquences, mesures (art. 33.5 — obligatoire même si non notifiée).
3. Si risque pour les personnes : notification CNIL **sous 72 h** via
   notifications.cnil.fr.
4. Si risque élevé : informer les utilisateurs concernés sans délai (art. 34).
5. Si les données touchées relèvent de T3/T4 : prévenir les utilisateurs
   concernés sous 48 h (engagement de l'annexe CGU), ce sont eux les
   responsables de traitement.

**Historique à conserver** : jusqu'au 16/09/2026, le bucket `drive` était
public. Toute URL de fichier (chemins prévisibles `{userId}/…`) donnait accès
au fichier sans authentification, masters et contrats compris. Aucune fuite connue,
mais les journaux d'accès Storage n'ont pas été analysés — et ne pourront pas
l'être, ils n'existent plus (voir la note T9). Corrigé dans le code par
`20260916090000_drive_bucket_private.sql` et la route `/api/drive/file` (URL
signées de 60 s après contrôle du propriétaire).

✅ **Appliquée en production le 16/09/2026.** Vérifié dans la foulée :
`storage.getBucket('drive')` renvoie `public: false`, et une URL
`…/storage/v1/object/public/drive/…` répond **400**. Le trou est fermé.

Appliquée avant le déploiement du code, contrairement à l'ordre prévu, après
mesure de ce que cela cassait : le bucket ne contenait qu'un fichier de démo et
**aucun lien d'écoute n'existait**. Refermer l'accès public l'emportait sur un
lien mort sur le compte du fondateur. ⚠️ Tant que `claude-edits` n'est pas
déployé, la production n'a pas `/api/drive/file` : les fichiers du Drive ne
s'ouvrent pas depuis le site en ligne. C'est attendu, et cela se résout au
déploiement.

⚠️ Le CDN Supabase peut servir une copie en cache jusqu'à 1 h après la bascule
(`cacheControl: 3600` posé à l'upload). Un fichier consulté juste avant peut
donc rester lisible un moment par son ancienne URL.

**Ordre de déploiement, pour la suite.** La politique de confidentialité
(section 6) promet des fichiers sans adresse publique. Vérifié le 16/09 : les
pages `/confidentialite`, `/cgu` et `/mentions-legales` renvoyaient 404 en
production. La migration étant désormais passée, cette contrainte est levée :
le bloc légal peut être déployé sans rendre la section 6 fausse.

Toute future fonctionnalité qui expose un fichier doit passer par une URL
signée, jamais `getPublicUrl`.

## 6. Compte utilisateur sans accès à sa boîte mail

Cas prévu au 15/09 dans `ALPHA.md`. Ne jamais changer l'email d'un compte sur
simple demande : c'est la voie classique de prise de contrôle. Exiger au moins
deux éléments que seul le titulaire connaît (date d'inscription approximative,
nom d'un projet ou d'un titre du compte, secteurs choisis), et envoyer une
notification à l'ancienne adresse avant tout changement, avec 7 jours pour
s'y opposer.
