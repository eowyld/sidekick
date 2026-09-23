# Mise en place de l'email — domaine + Brevo

Guide de bout en bout pour passer des mails d'auth Supabase « bruts » à des mails
envoyés depuis une adresse de ton nom de domaine, via **Brevo** (fournisseur
unique, cf. décision dans `ALPHA.md`).

Prérequis : un nom de domaine dont la **zone DNS est gérée chez Porkbun**.

---

## Cible

| Usage | Qui envoie | Adresse | Reply-To |
|---|---|---|---|
| Confirmations d'inscription, reset password, magic link | Supabase Auth → SMTP Brevo | `no-reply@tondomaine.com` | `hello@tondomaine.com` |
| Notification fondateur (`/api/notify/signup`) | Route Next → API Brevo | `no-reply@tondomaine.com` | adresse du nouvel inscrit |
| Rappels de démarches admin (à venir, jeudi 03/09) | Route Next → API Brevo | `no-reply@tondomaine.com` | `hello@tondomaine.com` |
| Boîte mail humaine (lire + répondre) | Google Workspace | `hello@tondomaine.com` | — |

Deux briques distinctes sur le **même domaine** :

- **Boîte mail** (Google Workspace) : reçoit et permet d'écrire depuis
  `hello@tondomaine.com`.
- **Envoi transactionnel** (Brevo) : l'app envoie, depuis `no-reply@`, sans
  boîte associée.

Elles cohabitent proprement si le DNS est fait dans le bon ordre : SPF fusionné,
un DKIM par brique (sélecteurs différents, aucun conflit), un DMARC.

### Domaine racine ou sous-domaine pour Brevo ?

Pour l'alpha (quelques mails/jour) : **domaine racine `tondomaine.com`**. Plus
simple, le `Reply-To` vers `hello@` est naturel.

À l'échelle : sous-domaine dédié `mail.tondomaine.com` pour isoler la réputation
d'envoi transactionnel de celle de la boîte humaine. Ce guide traite la version
racine ; pour la version sous-domaine, tous les enregistrements Brevo se posent
sur `mail.` au lieu de `@`, et l'expéditeur devient `no-reply@mail.tondomaine.com`.

---

## Ordre d'exécution

```
1. Boîte mail Google Workspace  (vérif domaine + MX)
2. SPF fusionné Google + Brevo
3. DKIM Google Workspace
4. Compte Brevo : domaine + senders
5. DMARC
6. SMTP custom dans Supabase Auth + templates
7. Clé API Brevo + variables d'env
8. Vérification bout-en-bout
```

La boîte mail vient en premier : Brevo envoie un mail de validation à
`no-reply@` / `hello@`, il faut pouvoir le recevoir.

---

## 1. Boîte mail — Google Workspace

Alternatives moins chères et hébergées en Europe : **Infomaniak kSuite**
(~1,50 €/mois), **Fastmail** (~5 $/mois). La procédure DNS est équivalente
(MX + un DKIM propre au fournisseur). La suite du guide prend Workspace comme
exemple.

1. `workspace.google.com` → **Commencer**. Renseigne `tondomaine.com`.
2. Google demande de prouver la propriété du domaine → il fournit un
   enregistrement **TXT** `google-site-verification=…`.
3. Porkbun → **Domain Management** → `tondomaine.com` → **DNS Records** → **Add** :
   - Type `TXT` · Host vide (= `@`) · Answer = `google-site-verification=…` · TTL 600
4. Retour Workspace → **Vérifier**.
5. **MX** — Workspace moderne donne un seul enregistrement :
   - Type `MX` · Host vide (`@`) · Priority `1` · Answer `smtp.google.com`

   (L'ancien jeu à 5 MX `ASPMX.L.GOOGLE.COM`, `ALT1…` etc. fonctionne aussi.)

   ⚠️ **Supprime d'abord tout MX déjà présent** : Porkbun ajoute souvent un MX
   vers son service d'« Email Forwarding » gratuit, qui entrerait en conflit.
   Désactive aussi ce forwarding dans l'interface Porkbun.
6. Console admin Google → crée les utilisateurs `hello@tondomaine.com` (et
   `eliott@tondomaine.com` si tu veux une adresse nominale).
7. Propagation : quelques minutes à 1 h. Teste en t'envoyant un mail depuis une
   Gmail perso vers `hello@tondomaine.com`.

---

## 2. SPF

**Un seul enregistrement SPF par domaine.** Il faut fusionner Google et Brevo
dans la même ligne.

Porkbun → Add :
- Type `TXT` · Host vide (`@`) · Answer :
  ```
  v=spf1 include:_spf.google.com include:spf.brevo.com ~all
  ```

Si un `v=spf1 …` existe déjà, **ne crée pas un second TXT** : édite l'existant
pour y insérer `include:spf.brevo.com` avant le `~all`.

Deux lignes `v=spf1` = SPF invalide → tous les mails passent en fail/softfail.

---

## 3. DKIM Google Workspace

1. Console admin → **Apps → Google Workspace → Gmail → Authentifier l'e-mail**.
2. **Générer une nouvelle clé** (2048 bits). Google affiche :
   - Nom d'hôte DNS : `google._domainkey`
   - Valeur : `v=DKIM1; k=rsa; p=MIIBIjANBgkq…` (longue)
3. Porkbun → Add :
   - Type `TXT` · Host `google._domainkey` · Answer = la valeur complète
   - Porkbun accepte les valeurs longues en une seule entrée, pas besoin de
     découper en `p1`/`p2`.
4. Retour console Google → **Commencer l'authentification**.
5. La bascule peut rester « en attente » jusqu'à 24-48 h côté Google. Normal.

---

## 4. Compte Brevo — domaine et expéditeurs

1. Crée le compte sur `brevo.com`. Plan gratuit : **300 mails/jour**, largement
   suffisant pour l'alpha.
2. **Senders, Domains & Dedicated IPs → Domains → Add a domain** → `tondomaine.com`.
3. Brevo affiche les enregistrements à poser. Le détail varie selon le compte —
   **suis exactement l'écran**. En général :
   - 1 TXT de vérification de propriété : Host `@`, valeur `brevo-code:xxxxxxxx`
   - 1 à 2 enregistrements **DKIM Brevo** : Host du type `brevo._domainkey`
     (parfois `mail._domainkey`), en `CNAME` ou `TXT` selon ce qu'indique Brevo
   - Brevo réclame aussi un **DMARC** → on le pose à l'étape 5
4. Ajoute ces enregistrements chez Porkbun en respectant le type (CNAME vs TXT).
5. Brevo → **Authenticate / Verify**. Le SPF est déjà bon (étape 2). Les DKIM
   Google et Brevo ont des sélecteurs différents → aucun conflit.
6. **Senders → Add a sender** :
   - `no-reply@tondomaine.com` (nom : `SIDEKICK`)
   - `hello@tondomaine.com` si tu veux aussi pouvoir envoyer depuis cette adresse
   - Brevo envoie un mail de confirmation à chaque adresse → valide-le depuis la
     boîte Workspace (d'où l'ordre : boîte mail d'abord).

---

## 5. DMARC

Porkbun → Add :
- Type `TXT` · Host `_dmarc` · Answer :
  ```
  v=DMARC1; p=none; rua=mailto:hello@tondomaine.com; fo=1; adkim=r; aspf=r
  ```

`p=none` = phase d'observation : rien n'est bloqué, tu reçois les rapports
agrégés sur `hello@`. Après 2-3 semaines sans anomalie, passe à
`p=quarantine`, puis `p=reject`.

---

## 6. Brancher Brevo dans Supabase Auth (SMTP)

### 6.1 Récupérer les identifiants SMTP Brevo

Brevo → **SMTP & API → onglet SMTP**. Note :

| Champ | Valeur |
|---|---|
| Server | `smtp-relay.brevo.com` |
| Port | `587` |
| Login | ton adresse de connexion Brevo (email du compte) |
| Password | **clé SMTP** — génère-la sur cette page (« Generate a new SMTP key ») |

⚠️ La **clé SMTP** n'est pas la **clé API**. Deux choses différentes, deux
onglets différents.

### 6.2 Configurer Supabase

Dashboard Supabase → **Authentication → Emails → SMTP Settings** (selon version :
*Project Settings → Auth → SMTP*). Active **Enable Custom SMTP** :

| Champ | Valeur |
|---|---|
| Sender email | `no-reply@tondomaine.com` |
| Sender name | `SIDEKICK` |
| Host | `smtp-relay.brevo.com` |
| Port number | `587` |
| Username | login Brevo (email du compte) |
| Password | la clé SMTP de l'étape 6.1 |

Sauvegarde → Supabase envoie un mail de test. Vérifie la réception.

### 6.3 Personnaliser les templates

Les 4 templates brandés (carte sombre, accent `#F0FF00`, table-based +
conditionnels MSO pour Outlook) sont dans **`docs/email-templates/`** :

| Fichier | Template Supabase | Variables clés |
|---|---|---|
| `confirm-signup.html` | Confirm signup | `{{ .RedirectTo }}`, `{{ .TokenHash }}`, `{{ .Token }}` |
| `reset-password.html` | Reset Password | `{{ .RedirectTo }}`, `{{ .TokenHash }}`, `{{ .Token }}` |
| `magic-link.html` | Magic Link | `{{ .RedirectTo }}`, `{{ .TokenHash }}`, `{{ .Token }}` |
| `change-email.html` | Change Email Address | `{{ .RedirectTo }}`, `{{ .TokenHash }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .Token }}` |
| `notification-email-changed.html` | Security notifications › Email address changed | `{{ .OldEmail }}`, `{{ .Email }}` |
| `notification-password-changed.html` | Security notifications › Password changed | `{{ .Email }}`, `{{ .SiteURL }}` |

**Liens (22/09) : jamais `{{ .ConfirmationURL }}`.** Il pointe sur le domaine
technique `…supabase.co/auth/v1/verify`. Les modèles construisent le lien sur
le site : `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=…` (`email` pour
l'inscription et le lien magique, `recovery`, `email_change`), validé par
`app/(auth)/auth/callback/route.ts` via `verifyOtp`. `{{ .RedirectTo }}` est
l'adresse de retour passée par l'app, toujours de la forme
`<origine>/auth/callback?next=…` : le `&` qui suit suppose ce `?`. Si l'adresse
n'est pas dans les Redirect URLs, Supabase la remplace par la Site URL, sans
`?`, et le lien est cassé : l'allowlist est donc obligatoire.

Pour chacun : **Authentication → Email Templates** → sélectionne le template →
colle le contenu du fichier dans le champ *Message body* → renseigne l'objet
(suggéré en commentaire en tête de fichier) → *Save*.

Le logo est un wordmark texte `SIDEKICK` (aucune image externe à charger, robuste
tous clients). Pour un vrai logo image, remplacer le `<p>` du wordmark par la
balise `<img>` indiquée en commentaire dans `confirm-signup.html` — mais l'URL
`https://sidekickartists.com/images/sidekick-mail.png` ne répondra qu'une fois
`claude-edits` mergée sur `main` (branche de prod Vercel).

### 6.4 Rate limits

Même avec SMTP custom, **Project Settings → Auth → Rate limits** garde une limite
d'envoi de mails assez basse par défaut. Une fois le SMTP fiable, tu peux la
remonter.

---

## 7. Clé API Brevo + variables d'environnement

Pour les envois faits par les routes Next (`/api/notify/signup`, rappels à venir).

1. Brevo → **SMTP & API → onglet API Keys → Generate a new API key** (v3).
2. Renseigne les variables, en local (`.env.local`) **et** sur Vercel
   (*Project → Settings → Environment Variables*, pour Production + Preview) :

   ```
   BREVO_API_KEY=xkeysib-…
   SIGNUP_NOTIFY_FROM=no-reply@tondomaine.com
   SIGNUP_NOTIFY_TO=hello@tondomaine.com
   ```

3. `SIGNUP_NOTIFY_FROM` **doit être un sender vérifié** dans Brevo (étape 4.6),
   sinon Brevo refuse l'envoi et le code loggue « Brevo a refusé l'envoi ».
4. Reporte ces trois clés dans `.env.example` (sans valeurs) pour la doc.

---

## 8. Vérification bout-en-bout

1. **DNS résolu** :
   ```
   dig +short txt tondomaine.com
   dig +short txt google._domainkey.tondomaine.com
   dig +short txt _dmarc.tondomaine.com
   dig +short cname brevo._domainkey.tondomaine.com   # ou txt selon Brevo
   dig +short mx tondomaine.com
   ```
2. **Mail de test Brevo** (bouton dans Senders) → vers une adresse **Gmail** →
   ouvre le mail → **Afficher l'original** :
   - `SPF: PASS`
   - `DKIM: PASS` signé par `tondomaine.com`
   - `DMARC: PASS`
3. **Inscription réelle** dans l'app en préprod avec une adresse email → le mail
   de confirmation arrive avec ton template et l'expéditeur
   `no-reply@tondomaine.com`. Le lien mène à `/auth/callback` puis `/dashboard`.
4. **Score global** : envoie un mail à `mail-tester.com`, vise 9-10/10.

---

## Pièges connus

- **Porkbun Email Forwarding** ajoute des MX automatiques. À désactiver + purger
  avant de poser les MX Google, sinon conflit et mails perdus.
- **Un seul SPF, une seule ligne.** Deux `v=spf1` → SPF invalide.
- **Clé SMTP ≠ clé API Brevo.** Supabase veut la SMTP (onglet SMTP) ;
  `notify/signup` veut l'API (onglet API Keys).
- **Sender non vérifié** → Brevo refuse tout envoi depuis cette adresse.
- **`emailRedirectTo` reste `/auth/callback?next=/dashboard`** (déjà en place
  dans `app/(auth)/inscription/page.tsx`). Le lien de confirmation porte un code
  PKCE à échanger contre une session ; pointer sur `/dashboard` laisse
  l'utilisateur non connecté.
- **Propagation DKIM** : Porkbun publie en quelques minutes, mais Google et Brevo
  peuvent mettre 24-48 h à valider. « Pending » quelques heures est normal.
- **DMARC `p=reject` trop tôt** : garde `p=none` jusqu'à avoir vérifié SPF+DKIM
  PASS sur des mails réels, sinon tu bloques tes propres mails.
