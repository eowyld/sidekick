/**
 * Jetons OAuth mail côté serveur (table `user_mail_connections`).
 *
 * Réservé aux routes API : utilise la clé de service, qui contourne la RLS.
 * L'appelant doit avoir vérifié la session et passer l'id de l'utilisateur
 * connecté, jamais un id venu de la requête.
 *
 * Période de transition (21/09) : la table peut ne pas exister encore en
 * production. Toute erreur est journalisée puis absorbée, et l'appelant retombe
 * sur `user_metadata`. Rien ne casse avant la migration, rien ne casse après.
 */
import { getServiceSupabase } from "@/lib/listening-public";

export type MailProvider = "gmail" | "outlook";

export async function saveMailConnection(
  userId: string,
  provider: MailProvider,
  email: string,
  refreshToken: string
): Promise<void> {
  try {
    const { error } = await getServiceSupabase()
      .from("user_mail_connections")
      .upsert(
        { user_id: userId, provider, email, refresh_token: refreshToken, updated_at: new Date().toISOString() },
        { onConflict: "user_id,provider" }
      );
    if (error) console.warn("[mail-connections] écriture impossible, repli sur user_metadata:", error.message);
  } catch (e) {
    console.warn("[mail-connections] écriture impossible:", e instanceof Error ? e.message : e);
  }
}

/** Jeton enregistré en table, ou `null` (absent, table manquante, erreur). */
export async function readMailRefreshToken(userId: string, provider: MailProvider): Promise<string | null> {
  try {
    const { data, error } = await getServiceSupabase()
      .from("user_mail_connections")
      .select("refresh_token")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();
    if (error) {
      console.warn("[mail-connections] lecture impossible, repli sur user_metadata:", error.message);
      return null;
    }
    return (data?.refresh_token as string | undefined) ?? null;
  } catch (e) {
    console.warn("[mail-connections] lecture impossible:", e instanceof Error ? e.message : e);
    return null;
  }
}
