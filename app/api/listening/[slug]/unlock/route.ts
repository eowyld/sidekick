import { NextRequest, NextResponse } from "next/server";
import {
  accessCookieName,
  accessCookieValue,
  getServiceSupabase,
  linkState,
  resolveLinkRow,
  verifyListeningPassword,
} from "@/lib/listening-public";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = (await req.json()) as { password?: string };
  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);

  if (linkState(row) !== "ok" || !row?.password_hash) {
    return NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
  }

  if (!body.password || !verifyListeningPassword(body.password, row.password_hash)) {
    return NextResponse.json({ error: "Code incorrect." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // Portée limitée aux routes de ce lien : ce sont elles qui vérifient l'accès
  // avant de servir la tracklist ou de signer une URL audio, et déverrouiller
  // un lien n'en déverrouille donc aucun autre.
  res.cookies.set({
    name: accessCookieName(slug),
    value: accessCookieValue(slug, row.password_hash),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/api/listening/${slug}`,
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
