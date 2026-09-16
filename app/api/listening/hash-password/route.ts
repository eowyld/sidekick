import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { hashListeningPassword } from "@/lib/listening-public";

/**
 * `scrypt` n'existe pas dans le navigateur, et hacher côté client n'aurait
 * aucune valeur de sécurité. Le composeur envoie donc le mot de passe en clair
 * sur HTTPS et reçoit l'empreinte à stocker.
 *
 * Route réservée aux utilisateurs authentifiés : sans cela, elle offrirait un
 * oracle de calcul scrypt gratuit à n'importe qui.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = (await req.json()) as { password?: string };
  const password = body.password?.trim();
  if (!password || password.length < 4) {
    return NextResponse.json(
      { error: "Mot de passe trop court (4 caractères minimum)." },
      { status: 400 }
    );
  }

  return NextResponse.json({ hash: hashListeningPassword(password) });
}
