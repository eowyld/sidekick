import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { requestOrigin } from "@/lib/request-origin";

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

/** Types acceptés par `verifyOtp({ token_hash, type })`. */
const EMAIL_OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const;
type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return !!value && (EMAIL_OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Retour de trois sortes de liens :
 *
 * - **Liens d'email** (`token_hash` + `type`) : confirmation d'inscription,
 *   mot de passe oublié, changement d'adresse. Les modèles Supabase pointent
 *   ici (`{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=…`) au lieu de
 *   `{{ .ConfirmationURL }}`, qui affichait le domaine technique
 *   `…supabase.co` dans l'email. `verifyOtp` n'a pas besoin du code verifier
 *   PKCE : le lien marche aussi ouvert sur un autre appareil.
 * - **Code PKCE** (`code`) : connexion Google, et liens d'anciens emails.
 * - **Message ou erreur** sans code, renvoyés par Supabase.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Pas `request.url` : en dev il vaut `0.0.0.0:3000`, une autre origine que
  // `localhost:3000` pour le navigateur, qui y arrivait sans ses cookies de
  // session (cf. requestOrigin).
  const origin = requestOrigin(request);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const nextPath = getSafeNextPath(searchParams.get("next"));

  /** Échec d'un lien d'email : sur la page visée si elle sait l'afficher, sinon sur la connexion. */
  const linkFailed = (description: string) => {
    if (nextPath !== "/dashboard" && nextPath !== "/nouveau-mot-de-passe") {
      const target = new URL(`${origin}${nextPath}`);
      target.searchParams.set("auth_error", description);
      return NextResponse.redirect(target);
    }
    return NextResponse.redirect(`${origin}/login?error=lien`);
  };

  if (!code && !(tokenHash && isEmailOtpType(type))) {
    // Changement d'email avec « Secure email change » : le premier des deux
    // liens (ancienne ou nouvelle adresse) ne porte pas de code, seulement un
    // message. La session existe déjà, on revient là où on allait.
    const message = searchParams.get("message");
    if (message) {
      const target = new URL(`${origin}${nextPath}`);
      target.searchParams.set("auth_message", message);
      return NextResponse.redirect(target);
    }
    const errorDescription = searchParams.get("error_description");
    if (errorDescription) return linkFailed(errorDescription);
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Créer un client avec accès direct à request/response pour que
  // exchangeCodeForSession puisse lire le code verifier PKCE depuis les cookies
  // et écrire la session dans la réponse.
  const response = NextResponse.redirect(`${origin}${nextPath}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      console.error("[Auth] email link verification failed:", type, error.message);
      return linkFailed(error.message);
    }
    return response;
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code!);

  if (error || !data.session) {
    console.error("[Auth] code exchange failed:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Aucun jeton Gmail n'est enregistré ici. Ce bloc stockait `provider_token`
  // comme `gmail_refresh_token` : c'est un access token d'une heure, obtenu avec
  // les seuls scopes `email profile`, donc incapable d'envoyer et refusé
  // (`invalid_grant`) dès le premier rafraîchissement. L'utilisateur voyait
  // « Gmail connecté » sans qu'aucun envoi ne puisse partir. La connexion Gmail
  // passe uniquement par /api/mail/oauth/google (scope gmail.send, offline).

  return response;
}
