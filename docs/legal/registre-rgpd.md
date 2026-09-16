# Registre des traitements et procédures RGPD

Document interne. Registre tenu au titre de l'article 30 du RGPD (l'exemption
des structures de moins de 250 personnes ne s'applique pas : les traitements
sont réguliers, pas occasionnels). À présenter à la CNIL sur demande.

**Responsable de traitement** : la SAS éditrice (voir `src/lib/legal.ts`),
représentée par son Président. Pas de DPO (non obligatoire : pas de suivi
régulier et systématique à grande échelle, pas de données sensibles).
Contact : hello@sidekickartists.com.

Règle de maintenance : ce registre, `app/confidentialite/page.tsx` et le code
changent **dans le même commit**. Un nouveau prestataire, un nouveau champ
collecté, la réactivation de l'IA = mise à jour ici et sur la page.

Mis à jour le 15/09/2026.

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
| T9 | Sécurité et journaux | Sécurité, preuve, obligations d'hébergeur | Intérêt légitime + obligation légale | IP, date, UA, erreurs | Tous | Vercel, Supabase | 12 mois |
| T10 | Support | Répondre aux demandes | Intérêt légitime | Contenu des emails | Tous | Neo | 3 ans après le dernier échange |

**Non actifs aujourd'hui** (ne pas les mentionner publiquement tant qu'ils sont
coupés, mettre à jour avant réactivation) : IA Anthropic (pausée le 14/09),
campagnes marketing et pixels de suivi `mail/track/*` (module fermé), presskit
public (fermé), Stripe (pas de paiement).

## 2. Sous-traitants et DPA

| Prestataire | Rôle | Localisation | DPA | Transfert hors UE |
|---|---|---|---|---|
| Supabase Inc. | Base, auth, stockage | AWS eu-west-3 (Paris) | ⬜ signer via le dashboard (Settings → Legal / DPA) | Accès support possible depuis les US : CCT dans le DPA |
| Vercel Inc. | Hébergement, fonctions | Fonctions à régler sur `cdg1` (Paris) si ce n'est pas déjà le cas | ⬜ DPA intégré aux conditions Vercel, à télécharger et archiver | Oui : DPF / CCT |
| Brevo (Sendinblue SAS) | Emails | UE | ⬜ DPA intégré aux CGU Brevo, archiver | Non |
| PostHog Inc. | Analytics | Instance EU (Francfort) | ⬜ DPA à signer en ligne (posthog.com/dpa) | Accès support possible : CCT |
| Neo (Titan) | Messagerie hello@ | ⬜ vérifier la localisation | ⬜ vérifier l'existence d'un DPA | ⬜ à vérifier |
| Google | Connexion Google, Gmail API | — | Responsable distinct pour la connexion ; conditions Google API | Oui |

Archiver chaque DPA signé en PDF dans un dossier hors dépôt.

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

Prérequis : migration `20260915120000_user_fk_cascade.sql` appliquée, sinon la
suppression de l'utilisateur échoue.

1. Proposer l'export (factures notamment) et attendre la confirmation.
2. Supabase → Storage → bucket `drive` : supprimer le dossier `{userId}/`.
   **Avant** l'étape 3, sinon on perd l'identifiant.
3. Supabase → Authentication → Users → supprimer l'utilisateur. Les tables
   `public` suivent par cascade.
4. PostHog → Persons → rechercher l'email → *Delete person and events*.
5. Brevo → Contacts : supprimer le contact s'il existe.
6. Supprimer la notification d'inscription de la boîte `SIGNUP_NOTIFY_TO`.
7. Confirmer la suppression par email. Délai engagé publiquement : 30 jours.

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
mais les journaux d'accès Storage n'ont pas été analysés. Corrigé par `20260916090000_drive_bucket_private.sql` et la route
`/api/drive/file` (URL signées de 60 s après contrôle du propriétaire).
Appliquée en production le : ⬜ [date à renseigner].

La politique de confidentialité (section 6) promet désormais des fichiers sans
adresse publique : **elle ne doit pas être mise en ligne avant l'application de
la migration**. Toute future fonctionnalité qui expose un fichier doit passer
par une URL signée, jamais `getPublicUrl`.

## 6. Compte utilisateur sans accès à sa boîte mail

Cas prévu au 15/09 dans `ALPHA.md`. Ne jamais changer l'email d'un compte sur
simple demande : c'est la voie classique de prise de contrôle. Exiger au moins
deux éléments que seul le titulaire connaît (date d'inscription approximative,
nom d'un projet ou d'un titre du compte, secteurs choisis), et envoyer une
notification à l'ancienne adresse avant tout changement, avec 7 jours pour
s'y opposer.
