import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

function redirect(origin: string, path: string, search?: string) {
  const target = new URL(path, origin);
  if (search) target.search = search.startsWith("?") ? search : `?${search}`;
  return NextResponse.redirect(target.toString());
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;

  try {
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error || !code) {
      return redirect(origin, "/settings/mail", "error=google_oauth_cancelled");
    }

    const redirectUri = origin + "/api/mail/oauth/google/callback";

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return redirect(origin, "/settings/mail", "error=google_oauth_env_missing");
    }

    // 1) Échange du code contre des tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[OAuth callback] Token exchange failed:", tokenRes.status, errText);
      return redirect(origin, "/settings/mail", "error=google_token_failed");
    }

    const tokens: { access_token?: string; refresh_token?: string } = await tokenRes.json();

    // 2) Récupérer l'email Gmail
    const meRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!meRes.ok) {
      console.error("[OAuth callback] Userinfo failed:", meRes.status, await meRes.text());
      return redirect(origin, "/settings/mail", "error=google_userinfo_failed");
    }

    const me: { email?: string } = await meRes.json();
    const googleEmail = me.email;

    if (!googleEmail) {
      console.error("[OAuth callback] No email in userinfo:", me);
      return redirect(origin, "/settings/mail", "error=google_userinfo_failed");
    }

    // 3) Mettre à jour le user Supabase
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[OAuth callback] getUser error:", userError.message, userError);
      return redirect(origin, "/settings/mail", "error=google_supabase_failed");
    }

    if (!user) {
      console.error("[OAuth callback] No user session (not logged in?)");
      return redirect(origin, "/settings/mail", "error=google_supabase_not_logged_in");
    }

    const updateData: Record<string, string> = {
      mail_provider: "gmail",
      mail_from: googleEmail,
      gmail_email: googleEmail
    };
    if (tokens.refresh_token) {
      updateData.gmail_refresh_token = tokens.refresh_token;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: updateData
    });

    if (updateError) {
      console.error("[OAuth callback] updateUser error:", updateError.message, updateError);
      return redirect(origin, "/settings/mail", "error=google_supabase_failed");
    }

    return redirect(origin, "/settings/mail", "status=google_connected");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[OAuth callback] Unhandled error:", message, stack);
    return redirect(origin, "/settings/mail", "error=google_callback_error");
  }
}

