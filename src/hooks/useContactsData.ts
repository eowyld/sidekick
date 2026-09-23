"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient, getSessionUser } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetch-all";
import { userErrorMessage } from "@/lib/user-error";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  city: string;
  email: string;
  instagram: string;
  phone: string;
  notes: string;
  createdAt?: string;
}

const KEY = "user_contacts";

function rowToContact(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    firstName: (row.first_name as string) ?? "",
    lastName: (row.last_name as string) ?? "",
    role: (row.role as string) ?? "",
    city: (row.city as string) ?? "",
    email: (row.email as string) ?? "",
    instagram: (row.instagram as string) ?? "",
    phone: (row.phone as string) ?? "",
    notes: (row.notes as string) ?? "",
    createdAt: (row.created_at as string) ?? undefined,
  };
}

function contactToRow(contact: Contact): Record<string, unknown> {
  return {
    id: contact.id,
    first_name: contact.firstName,
    last_name: contact.lastName,
    role: contact.role,
    city: contact.city,
    email: contact.email,
    instagram: contact.instagram,
    phone: contact.phone,
    notes: contact.notes,
    created_at: contact.createdAt ?? null,
  };
}

async function fetchContacts(): Promise<Contact[]> {
  const supabase = createClient();
  const { data, error } = await fetchAll((from, to) =>
    supabase
      .from("user_contacts")
      .select("*")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  );
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToContact);
}

export function useContactsData() {
  const { data: contacts = [], isLoading, error: swrError, mutate: mutateLocal } = useSWR<Contact[]>(KEY, fetchContacts);

  const error = swrError ? userErrorMessage(swrError, "Impossible de charger tes contacts. Réessaie dans un instant.") : null;

  const setContacts = useCallback((fn: (prev: Contact[]) => Contact[]) => {
    const snapshot = contacts;
    const next = fn(contacts);

    mutateLocal(next, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await getSessionUser(supabase);
      if (!user) { mutateLocal(snapshot, false); return; }

      const prevMap = new Map(snapshot.map((c) => [c.id, c]));
      const nextMap = new Map(next.map((c) => [c.id, c]));

      const toUpsert = next.filter((c) => {
        const old = prevMap.get(c.id);
        return !old || JSON.stringify(old) !== JSON.stringify(c);
      });
      const toDelete = snapshot.filter((c) => !nextMap.has(c.id)).map((c) => c.id);

      const ops: Array<PromiseLike<{ error: { message: string } | null }>> = [];

      if (toUpsert.length > 0) {
        ops.push(
          supabase.from("user_contacts")
            .upsert(toUpsert.map((c) => ({ ...contactToRow(c), user_id: user.id })))
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }
      if (toDelete.length > 0) {
        ops.push(
          supabase.from("user_contacts")
            .delete().in("id", toDelete)
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      const results = await Promise.all(ops);
      if (results.find((r) => r.error)) {
        mutateLocal(snapshot, false);
      } else {
        mutate(KEY);
      }
    })();
  }, [contacts, mutateLocal]);

  return { contacts, setContacts, loading: isLoading, error };
}
