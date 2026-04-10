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

  return NextResponse.redirect(`${origin}/dashboard`);
}
