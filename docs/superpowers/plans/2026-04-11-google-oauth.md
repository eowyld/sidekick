# Google OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth sign-in/sign-up on `/login` and `/inscription`, add a session-refresh middleware, and persist the Google token in user metadata for the mailing module.

**Architecture:** Supabase's `signInWithOAuth` handles the Google redirect. A new `/auth/callback` route exchanges the code for a session. A `middleware.ts` at the project root refreshes Supabase session cookies on every request using `@supabase/ssr`.

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr`, Supabase Auth, TypeScript, Tailwind, Lucide React

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Create | `middleware.ts` | Refresh Supabase session cookies on every request |
| Create | `app/(auth)/auth/callback/route.ts` | Exchange OAuth code for session, persist Gmail token, redirect to `/dashboard` |
| Modify | `app/(auth)/login/page.tsx` | Add Google button + "ou" divider, show `?error=oauth` message |
| Modify | `app/(auth)/inscription/page.tsx` | Add Google button + "ou" divider, show `?error=oauth` message |

---

## Task 1: Middleware de session

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Créer le middleware**

```ts
// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Rafraîchit le token si expiré — ne pas supprimer cette ligne
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|inscription|auth/callback|presskit|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Vérifier que le dev server démarre sans erreur**

```bash
npm run dev
```

Expected: aucune erreur dans le terminal, app accessible sur `http://localhost:3000`.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): add Supabase SSR session refresh middleware"
```

---

## Task 2: Route callback OAuth

**Files:**
- Create: `app/(auth)/auth/callback/route.ts`

- [ ] **Step 1: Créer la route callback**

```ts
// app/(auth)/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Persister le token Google dans user_metadata pour le module mailing
  const providerToken = data.session.provider_token;
  const userEmail = data.session.user.email;

  if (providerToken && userEmail) {
    const existingMeta = data.session.user.user_metadata ?? {};
    // Ne pas écraser un token existant si déjà présent
    if (!existingMeta.gmail_refresh_token) {
      await supabase.auth.updateUser({
        data: {
          gmail_refresh_token: providerToken,
          gmail_email: userEmail,
        },
      });
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
```

- [ ] **Step 2: Tester le flow manuellement**

1. Ouvrir `http://localhost:3000/login`
2. Cliquer "Continuer avec Google" (bouton pas encore présent — tester après Task 3)
3. Flow complet attendu : Google → `/auth/callback?code=...` → `/dashboard`

- [ ] **Step 3: Tester le cas d'erreur**

Ouvrir directement `http://localhost:3000/auth/callback` (sans `code`) dans le navigateur.
Expected: redirection vers `http://localhost:3000/login?error=oauth`.

- [ ] **Step 4: Commit**

```bash
git add app/(auth)/auth/callback/route.ts
git commit -m "feat(auth): add OAuth callback route with Gmail token persistence"
```

---

## Task 3: Bouton Google sur `/login`

**Files:**
- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Ajouter la fonction `handleGoogleSignIn` et le state d'erreur OAuth**

Dans `app/(auth)/login/page.tsx`, ajouter après les imports existants :

```tsx
import { useSearchParams } from "next/navigation";
```

Remplacer le début du composant `LoginPage` (avant le `return`) par :

```tsx
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "oauth" ? "Erreur lors de la connexion Google. Réessaie." : null
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "email profile",
        },
      });
      if (err) throw err;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la connexion Google");
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    // ... (code existant inchangé)
  }
```

- [ ] **Step 2: Ajouter le séparateur et le bouton Google dans le JSX**

Dans le formulaire, après le `<Button type="submit" ...>` et avant le `<p className="text-center ...">` (lien "Pas encore de compte ?"), ajouter :

```tsx
          {/* Séparateur */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Bouton Google */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {googleLoading ? "Redirection…" : "Continuer avec Google"}
          </Button>
```

- [ ] **Step 3: Envelopper la page dans `<Suspense>` pour `useSearchParams`**

`useSearchParams` requiert un `<Suspense>` boundary. Modifier l'export default :

```tsx
import { Suspense } from "react";

function LoginPageContent() {
  // tout le code existant du composant LoginPage
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 4: Vérifier visuellement**

Ouvrir `http://localhost:3000/login` — le bouton Google doit apparaître sous le formulaire, séparé par "ou".

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/login/page.tsx
git commit -m "feat(auth): add Google sign-in button on login page"
```

---

## Task 4: Bouton Google sur `/inscription`

**Files:**
- Modify: `app/(auth)/inscription/page.tsx`

- [ ] **Step 1: Ajouter `useSearchParams`, state `googleLoading`, et `handleGoogleSignIn`**

Même pattern que Task 3. Dans `app/(auth)/inscription/page.tsx`, ajouter l'import :

```tsx
import { useSearchParams } from "next/navigation";
```

Ajouter dans le composant après les states existants :

```tsx
  const searchParams = useSearchParams();
  const [googleLoading, setGoogleLoading] = useState(false);

  // Initialiser l'erreur avec le param OAuth si présent
  // (ajouter au useState existant de error)
  // Remplacer : const [error, setError] = useState<string | null>(null);
  // Par :
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "oauth" ? "Erreur lors de la connexion Google. Réessaie." : null
  );

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "email profile",
        },
      });
      if (err) throw err;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la connexion Google");
      setGoogleLoading(false);
    }
  }
```

- [ ] **Step 2: Ajouter le séparateur et le bouton Google dans le JSX**

Dans le formulaire de `/inscription`, après le `<Button type="submit" ...>` et avant le `<p className="text-center ...">` (lien "Déjà un compte ?"), ajouter le même bloc que Task 3 Step 2 (séparateur + bouton Google — copier exactement le même JSX).

- [ ] **Step 3: Envelopper dans `<Suspense>` pour `useSearchParams`**

Même pattern que Task 3 Step 3 :

```tsx
import { Suspense } from "react";

function InscriptionPageContent() {
  // tout le code existant du composant InscriptionPage
}

export default function InscriptionPage() {
  return (
    <Suspense>
      <InscriptionPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 4: Vérifier visuellement**

Ouvrir `http://localhost:3000/inscription` — le bouton Google doit apparaître sous le formulaire.

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/inscription/page.tsx
git commit -m "feat(auth): add Google sign-in button on inscription page"
```

---

## Task 5: Configuration Google Cloud Console

> Cette tâche est manuelle — pas de code à écrire.

- [ ] **Step 1: Ouvrir Google Cloud Console**

Aller sur [https://console.cloud.google.com](https://console.cloud.google.com) → le projet utilisé pour le mailing → "APIs & Services" → "Credentials" → cliquer sur le client OAuth existant.

- [ ] **Step 2: Ajouter les redirect URIs**

Dans "Authorized redirect URIs", ajouter :
- `http://localhost:3000/auth/callback`
- `https://<ton-domaine-vercel>.vercel.app/auth/callback`

Cliquer "Save".

- [ ] **Step 3: Vérifier dans Supabase Dashboard**

Aller sur le Supabase Dashboard → Authentication → Providers → Google.
Vérifier que le provider est bien activé et que le Client ID / Secret correspondent au client Google configuré ci-dessus.
Le "Authorized redirect URI" dans Supabase doit être : `https://<project-ref>.supabase.co/auth/v1/callback`
(Supabase gère lui-même ce callback interne — le `/auth/callback` de Next.js est le callback *final* après que Supabase a traité le code.)

---

## Task 6: Test du flow complet

- [ ] **Step 1: Test inscription via Google**

1. Se déconnecter si connecté
2. Aller sur `http://localhost:3000/inscription`
3. Cliquer "Continuer avec Google" → choisir un compte Google
4. Expected: redirection vers `/dashboard`
5. Vérifier dans Supabase Dashboard → Authentication → Users : le nouvel utilisateur est présent avec `provider: google`
6. Vérifier dans "Raw User Meta Data" du user : `gmail_refresh_token` et `gmail_email` sont présents

- [ ] **Step 2: Test connexion via Google (compte existant)**

1. Se déconnecter
2. Aller sur `http://localhost:3000/login`
3. Cliquer "Continuer avec Google" avec le même compte
4. Expected: redirection vers `/dashboard` sans créer de doublon

- [ ] **Step 3: Test cas d'erreur**

Naviguer vers `http://localhost:3000/login?error=oauth`
Expected: le message "Erreur lors de la connexion Google. Réessaie." s'affiche en rouge.

- [ ] **Step 4: Test module mailing**

Aller dans le module Mailing → vérifier que l'adresse Gmail apparaît dans les adresses connectées pour l'envoi.
