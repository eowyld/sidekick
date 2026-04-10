"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

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

export function useContactsData() {
  const [contacts, setContactsState] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    supabase
      .from("user_contacts")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error: err }) => {
        if (!alive) return;
        if (err) setError(err.message);
        else setContactsState((data ?? []).map(rowToContact));
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const setContacts = useCallback((fn: (prev: Contact[]) => Contact[]) => {
    let snapshot: Contact[] = [];
    let next: Contact[] = [];

    setContactsState((prev) => {
      snapshot = prev;
      next = fn(prev);
      return next;
    });

    (async () => {
      setError(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setContactsState(() => snapshot);
        return;
      }

      const prevMap = new Map(snapshot.map((c) => [c.id, c]));
      const nextMap = new Map(next.map((c) => [c.id, c]));

      const toUpsert = next.filter((c) => {
        const old = prevMap.get(c.id);
        return !old || JSON.stringify(old) !== JSON.stringify(c);
      });
      const toDelete = snapshot.filter((c) => !nextMap.has(c.id)).map((c) => c.id);

      const ops: Promise<{ error: { message: string } | null }>[] = [];

      if (toUpsert.length > 0) {
        ops.push(
          Promise.resolve(
            supabase
              .from("user_contacts")
              .upsert(toUpsert.map((c) => ({ ...contactToRow(c), user_id: user.id })))
              .then(({ error }) => ({ error: error ? { message: error.message } : null }))
          )
        );
      }

      if (toDelete.length > 0) {
        ops.push(
          Promise.resolve(
            supabase
              .from("user_contacts")
              .delete()
              .in("id", toDelete)
              .then(({ error }) => ({ error: error ? { message: error.message } : null }))
          )
        );
      }

      const results = await Promise.all(ops);
      const firstError = results.find((r) => r.error);
      if (firstError?.error) {
        setError(firstError.error.message);
        setContactsState(() => snapshot);
      }
    })();
  }, []);

  return { contacts, setContacts, loading, error };
}
