import type { SupabaseClient } from "@supabase/supabase-js";
import type { ListeningInvite } from "@/lib/listening-types";

function rowToInvite(raw: Record<string, unknown>): ListeningInvite {
  return {
    id: raw.id as string,
    linkId: raw.link_id as string,
    contactId: (raw.contact_id as string) ?? undefined,
    contactName: raw.contact_name as string,
    contactEmail: raw.contact_email as string,
    sentAt: raw.sent_at as string,
    firstOpenedAt: (raw.first_opened_at as string) ?? undefined,
  };
}

const INVITE_SELECT =
  "id, link_id, contact_id, contact_name, contact_email, sent_at, first_opened_at";

/**
 * Une invitation = un envoi nominatif. Elle porte le paramètre `?i=` du lien,
 * qui pré-remplit le nom du destinataire sans lui imposer la moindre saisie,
 * et sert de base à la règle de relance.
 */
export async function createListeningInvite(
  supabase: SupabaseClient,
  linkId: string,
  contact: { id?: string; name: string; email: string }
): Promise<ListeningInvite> {
  const { data, error } = await supabase
    .from("user_listening_invites")
    .insert({
      link_id: linkId,
      contact_id: contact.id ?? null,
      contact_name: contact.name,
      contact_email: contact.email,
    })
    .select(INVITE_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return rowToInvite(data as Record<string, unknown>);
}

export async function fetchListeningInvites(
  supabase: SupabaseClient,
  linkIds: string[]
): Promise<ListeningInvite[]> {
  if (linkIds.length === 0) return [];
  const { data, error } = await supabase
    .from("user_listening_invites")
    .select(INVITE_SELECT)
    .in("link_id", linkIds);

  if (error) throw new Error(error.message);
  return (data ?? []).map((raw) => rowToInvite(raw as Record<string, unknown>));
}

/** URL nominative à insérer dans le corps du mail. */
export function inviteUrl(slug: string, inviteId: string, origin: string): string {
  return `${origin}/ecoute/${slug}?i=${inviteId}`;
}
