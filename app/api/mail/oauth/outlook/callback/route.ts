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
      return redirect(origin, "/settings/mail", "error=outlook_oauth_cancelled");
    }

    const redirectUri = origin + "/api/mail/oauth/outlook/callback";
    const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return redirect(origin, "/settings/mail", "error=outlook_oauth_env_missing");
    }

    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
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
      console.error("[Outlook OAuth callback] Token exchange failed:", tokenRes.status, errText);
      return redirect(origin, "/settings/mail", "error=outlook_token_failed");
    }

    const tokens: { access_token?: string; refresh_token?: string } = await tokenRes.json();
    if (!tokens.access_token) {
      return redirect(origin, "/settings/mail", "error=outlook_token_failed");
    }

    const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!meRes.ok) {
      console.error("[Outlook OAuth callback] /me failed:", meRes.status, await meRes.text());
      return redirect(origin, "/settings/mail", "error=outlook_userinfo_failed");
    }

    const me: { mail?: string; userPrincipalName?: string } = await meRes.json();
    const outlookEmail = me.mail ?? me.userPrincipalName;

    if (!outlookEmail) {
      console.error("[Outlook OAuth callback] No email in /me response:", me);
      return redirect(origin, "/settings/mail", "error=outlook_userinfo_failed");
    }

    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[Outlook OAuth callback] getUser error:", userError.message, userError);
      return redirect(origin, "/settings/mail", "error=outlook_supabase_failed");
    }

    if (!user) {
      console.error("[Outlook OAuth callback] No user session (not logged in?)");
      return redirect(origin, "/settings/mail", "error=outlook_supabase_not_logged_in");
    }

    const updateData: Record<string, string> = {
      mail_provider: "outlook",
      mail_from: outlookEmail,
      outlook_email: outlookEmail
    };
    if (tokens.refresh_token) {
      updateData.outlook_refresh_token = tokens.refresh_token;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: updateData
    });

    if (updateError) {
      console.error("[Outlook OAuth callback] updateUser error:", updateError.message, updateError);
      return redirect(origin, "/settings/mail", "error=outlook_supabase_failed");
    }    return redirect(origin, "/settings/mail", "status=outlook_connected");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[Outlook OAuth callback] Unhandled error:", message, stack);
    return redirect(origin, "/settings/mail", "error=outlook_callback_error");
  }
}