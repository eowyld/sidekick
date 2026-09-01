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

export async function proxy(request: NextRequest) {
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
    "/projects/:path*",
    "/settings/:path*",
    "/tasks/:path*"
  ]
};
