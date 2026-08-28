# Google OAuth — Design Spec

**Date:** 2026-04-10  
**Statut:** Approuvé  

---

## Objectif

Ajouter la connexion / inscription via Google OAuth sur les pages `/login` et `/inscription`, en utilisant le client Google déjà configuré pour le module mailing. Ajouter un middleware Next.js pour rafraîchir les sessions côté serveur (pattern Supabase SSR recommandé).

---

## Périmètre

- Bouton "Continuer avec Google" sur `/login` et `/inscription`
- Route callback `/auth/callback` pour finaliser le flow OAuth
- Middleware `middleware.ts` pour rafraîchir les sessions
- Stockage du `google_refresh_token` dans les préférences mailing lors d'une inscription via Google
- **Hors périmètre :** liaison compte classique → Google pour le mailing (flow existant, non modifié)

---

## Architecture

### Fichiers créés

| Fichier | Rôle |
|---|---|
| `middleware.ts` | Rafraîchit la session Supabase à chaque requête sur routes protégées |
| `app/(auth)/auth/callback/route.ts` | Échange le code OAuth contre une session, redirige vers `/dashboard` |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `app/(auth)/login/page.tsx` | Ajout bouton Google + séparateur "ou" |
| `app/(auth)/inscription/page.tsx` | Ajout bouton Google + séparateur "ou" |

---

## Flow détaillé

### Connexion / Inscription via Google

1. L'utilisateur clique "Continuer avec Google" sur `/login` ou `/inscription`
2. Appel : `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '<origin>/auth/callback', scopes: 'email profile' } })`
3. Redirection vers Google → l'utilisateur choisit son compte
4. Google redirige vers `/auth/callback?code=...`
5. La route callback appelle `supabase.auth.exchangeCodeForSession(code)`
6. Si l'utilisateur s'inscrit pour la première fois : Supabase crée le compte automatiquement
7. Le `provider_token` (refresh token Google) est extrait de la session et stocké dans les préférences mailing (`user_mailing_contacts` ou table de préférences)
8. Redirection finale vers `/dashboard`

### Session refresh (middleware)

Le middleware intercepte toutes les requêtes. Il crée un client Supabase SSR avec lecture/écriture des cookies, appelle `supabase.auth.getUser()` pour rafraîchir le token si expiré, puis laisse passer la requête. Il ne gère **pas** les redirections (responsabilité de `AuthGuard`).

**Routes concernées par le middleware :** toutes sauf `/login`, `/inscription`, `/auth/callback`, `/presskit`, `/api`, `/_next`, et les assets statiques.

---

## Configuration Google Cloud Console

Ajouter dans les "Authorized redirect URIs" du client OAuth Google existant :
- `http://localhost:3000/auth/callback` (dev)
- `https://<domaine-vercel>/auth/callback` (prod)

Le client ID et secret sont déjà présents dans `.env` (utilisés pour le mailing).

---

## Lien avec le module mailing

Quand un utilisateur s'inscrit via Google, le `provider_token` retourné par Supabase est le token d'accès Google. Ce token doit être persisté pour le module mailing. Le stockage se fait dans la route callback, après `exchangeCodeForSession`.

La table/champ cible pour ce token est à confirmer lors de l'implémentation en consultant `useMarketingData` et le schéma existant du mailing.

---

## UI

- Bouton Google : variante `outline`, pleine largeur, icône Google (SVG inline ou Lucide si disponible)
- Séparateur : ligne horizontale avec texte "ou" centré entre le formulaire et le bouton
- Positionnement : bouton Google **en dessous** du formulaire existant, avant le lien "Pas encore de compte ?"

---

## Erreurs à gérer

| Cas | Comportement |
|---|---|
| Utilisateur annule le flow Google | Retour sur `/login` sans erreur |
| `code` absent ou invalide dans callback | Redirection vers `/login?error=oauth` |
| `exchangeCodeForSession` échoue | Redirection vers `/login?error=oauth` |
| Compte Google déjà lié à un autre compte | Supabase gère nativement (merge par email si même adresse) |
