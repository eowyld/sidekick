import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COMING_SOON_PUBLIC_PREFIXES } from "@/lib/coming-soon";

const PROTECTED_PREFIXES = [
  "/admin",
  "/calendar",
  "/contacts",
  "/dashboard",
  "/drive",
  "/edition",
  "/incomes",
  "/live",
  "/marketing",
  "/phono",
  "/projects",
  "/settings",
  "/tasks"
];

// Pages réservées aux visiteurs non connectés. Pas /nouveau-mot-de-passe :
// le lien de réinitialisation y arrive justement avec une session.
const AUTH_PAGES = ["/login", "/inscription"];

export async function proxy(request: NextRequest) {
  // Filet de sécurité des liens d'email (confirmation, changement d'adresse,
  // récupération) : quand l'adresse de retour demandée n'est pas dans les
  // Redirect URLs de Supabase, il renvoie sur la Site URL, donc l'accueil, avec
  // le code PKCE en paramètre. Rien ne l'échangeait et la personne restait sur
  // la landing sans session. On le fait passer par le callback.
  if (request.nextUrl.pathname === "/") {
    const code = request.nextUrl.searchParams.get("code");
    if (!code) return NextResponse.next();
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    callbackUrl.search = "";
    callbackUrl.searchParams.set("code", code);
    return NextResponse.redirect(callbackUrl);
  }

  // Pages publiques fermées pour l'alpha (presskit). Le code reste en place ;
  // rouvrir consiste à retirer l'entrée de COMING_SOON_PUBLIC_PREFIXES.
  const isClosedPublicRoute = COMING_SOON_PUBLIC_PREFIXES.some(
    (prefix) =>
      request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`)
  );
  if (isClosedPublicRoute) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`)
  );

  // Déjà connecté : la page de connexion ou d'inscription n'a rien à proposer,
  // on renvoie là où l'utilisateur allait (ou au dashboard).
  const isAuthPage = AUTH_PAGES.includes(request.nextUrl.pathname);
  if (user && isAuthPage) {
    const redirectedFrom = request.nextUrl.searchParams.get("redirectedFrom");
    const target = request.nextUrl.clone();
    target.pathname =
      redirectedFrom && redirectedFrom.startsWith("/") && !redirectedFrom.startsWith("//")
        ? redirectedFrom
        : "/dashboard";
    target.search = "";
    return NextResponse.redirect(target);
  }

  if (!user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Accueil : uniquement pour rattraper un `?code=` (voir plus haut), sans
    // appel à Supabase pour une visite normale de la landing.
    "/",
    "/admin/:path*",
    "/calendar/:path*",
    "/contacts/:path*",
    "/dashboard/:path*",
    "/drive/:path*",
    "/edition/:path*",
    "/incomes/:path*",
    "/live/:path*",
    "/marketing/:path*",
    "/phono/:path*",
    "/presskit/:path*",
    // Fermée pour l'alpha avec le presskit : voir COMING_SOON_PUBLIC_PREFIXES.
    "/accord/:path*",
    "/projects/:path*",
    "/settings/:path*",
    "/tasks/:path*",
    "/login",
    "/inscription"
  ]
};
