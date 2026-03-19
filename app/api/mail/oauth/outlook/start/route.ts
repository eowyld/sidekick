import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID;
  const origin = req.nextUrl.origin;
  const redirectUri = origin + "/api/mail/oauth/outlook/callback";

  if (!clientId) {
    return NextResponse.redirect(new URL("/settings/mail?error=outlook_oauth_env_missing", origin));
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "query",
    prompt: "consent",
    scope: [
      "openid",
      "profile",
      "email",
      "offline_access",
      "https://graph.microsoft.com/User.Read",
      "https://graph.microsoft.com/Mail.Send"
    ].join(" ")
  });

  return NextResponse.redirect(
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" + params.toString()
  );
}
