import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Utilisateur de la session courante, lu depuis la session locale.
 *
 * À préférer à `supabase.auth.getUser()` côté navigateur. `getUser()` garde le
 * verrou d'auth (partagé par tout l'onglet) pendant un aller-retour réseau vers
 * Supabase Auth : avec une trentaine de hooks qui l'appellent au montage, les
 * appels font la queue, et au-delà de 10 s d'attente la lib abandonne avec
 * « signal is aborted without reason ». `getSession()` ne touche le réseau
 * que pour rafraîchir un jeton expiré.
 *
 * L'authenticité n'est pas perdue : `proxy.ts` vérifie la session côté serveur
 * à chaque requête, et la RLS refuse toute requête faite avec un jeton invalide.
 * Même forme de retour que `getUser()`, pour un remplacement direct.
 */
export async function getSessionUser(
  supabase: SupabaseClient
): Promise<{ data: { user: User | null } }> {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  return { data: { user: session?.user ?? null } };
}

/**
 * Client Supabase pour le navigateur.
 * Utilise createBrowserClient de @supabase/ssr pour gérer les sessions avec cookies.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
    );
  }

  return createBrowserClient(url, key);
}
