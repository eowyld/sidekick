import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = getSafeNextPath(searchParams.get("next"));

  if (!code) {
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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[Auth] OAuth exchange failed:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Persister le token Google dans user_metadata pour le module mailing
  const providerToken = data.session.provider_token;
  const userEmail = data.session.user.email;

  if (!providerToken || !userEmail) {
    console.warn("[Auth] Gmail token or email missing after OAuth", { hasToken: !!providerToken, hasEmail: !!userEmail });
  } else {
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

  return response;
}
