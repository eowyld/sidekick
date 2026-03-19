import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const origin = req.nextUrl.origin;
  const redirectUri = origin + "/api/mail/oauth/google/callback";

  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "Variable d'environnement GOOGLE_OAUTH_CLIENT_ID manquante. Ajoutez-la dans .env.local."
      },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email"
    ].join(" ")
  });

  return NextResponse.redirect(
    "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString()
  );
}

