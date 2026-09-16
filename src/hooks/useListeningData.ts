"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient, getSessionUser } from "@/lib/supabase";
import {
  createListeningLink,
  deleteListeningLink,
  fetchListeningLinks,
  fetchListeningStats,
  setListeningLinkActive,
  updateListeningLink,
  type ListeningLinkInput,
} from "@/lib/listening-db";
import { fetchListeningInvites } from "@/lib/listening-invites";
import type {
  ListeningInvite,
  ListeningLink,
  ListeningLinkStats,
} from "@/lib/listening-types";

const KEY = "user_listening_links";

async function fetcher(): Promise<ListeningLink[]> {
  const supabase = createClient();
  const { data: auth } = await getSessionUser(supabase);
  if (!auth.user) return [];
  return fetchListeningLinks(supabase, auth.user.id);
}

export function useListeningData() {
  const { data, error, isLoading } = useSWR<ListeningLink[]>(KEY, fetcher, {
    revalidateOnFocus: false,
  });

  const links = data ?? [];

  const createLink = useCallback(async (input: ListeningLinkInput) => {
    const supabase = createClient();
    const { data: auth } = await getSessionUser(supabase);
    if (!auth.user) throw new Error("Session expirée, reconnectez-vous.");
    const created = await createListeningLink(supabase, auth.user.id, input);
    await mutate(KEY);
    return created;
  }, []);

  const updateLink = useCallback(
    async (linkId: string, input: ListeningLinkInput) => {
      const supabase = createClient();
      const updated = await updateListeningLink(supabase, linkId, input);
      await mutate(KEY);
      return updated;
    },
    []
  );

  // Le kill switch doit paraître instantané : c'est un geste de panique.
  const toggleActive = useCallback(
    async (linkId: string, isActive: boolean) => {
      const snapshot = data ?? [];
      await mutate(
        KEY,
        snapshot.map((l) => (l.id === linkId ? { ...l, isActive } : l)),
        false
      );
      try {
        await setListeningLinkActive(createClient(), linkId, isActive);
        await mutate(KEY);
      } catch (e) {
        await mutate(KEY, snapshot, false);
        throw e;
      }
    },
    [data]
  );

  const removeLink = useCallback(
    async (linkId: string) => {
      const snapshot = data ?? [];
      await mutate(
        KEY,
        snapshot.filter((l) => l.id !== linkId),
        false
      );
      try {
        await deleteListeningLink(createClient(), linkId);
        await mutate(KEY);
      } catch (e) {
        await mutate(KEY, snapshot, false);
        throw e;
      }
    },
    [data]
  );

  const loadStats = useCallback(
    async (linkId: string): Promise<ListeningLinkStats> =>
      fetchListeningStats(createClient(), linkId),
    []
  );

  return {
    links,
    isLoading,
    error,
    createLink,
    updateLink,
    toggleActive,
    removeLink,
    loadStats,
  };
}

/**
 * Invitations de tous les liens fournis.
 *
 * Passe par SWR plutôt qu'un `useEffect` : la clé dérive des identifiants, donc
 * le rechargement suit naturellement la liste des liens, sans setState dans un
 * effet ni rendu en cascade.
 */
export function useListeningInvites(linkIds: string[]): ListeningInvite[] {
  const key = linkIds.length > 0 ? `listening_invites:${[...linkIds].sort().join(",")}` : null;

  const { data } = useSWR<ListeningInvite[]>(
    key,
    async () => fetchListeningInvites(createClient(), linkIds),
    { revalidateOnFocus: false }
  );

  return data ?? [];
}

/**
 * Classement transverse des titres les plus écoutés, tous liens confondus.
 *
 * On additionne sessions identifiées et anonymes : la question posée ici est
 * « quel titre accroche », pas « qui l'a écouté ».
 */
export function useListeningTopTracks(
  links: ListeningLink[],
  limit = 5
): Array<{ title: string; ms: number }> {
  const key =
    links.length > 0 ? `listening_top:${links.map((l) => l.id).sort().join(",")}` : null;

  const { data } = useSWR(
    key,
    async () => {
      const supabase = createClient();
      const totals = new Map<string, number>();

      for (const link of links) {
        const stats = await fetchListeningStats(supabase, link.id);
        const titleOf = (itemId: string) =>
          link.items.find((i) => i.id === itemId)?.snapshot.title;

        for (const session of stats.identifiedSessions) {
          for (const play of session.plays) {
            const title = titleOf(play.itemId);
            if (title) totals.set(title, (totals.get(title) ?? 0) + play.listenedMs);
          }
        }
        for (const [itemId, ms] of Object.entries(stats.anonymousListenedMsByItem)) {
          const title = titleOf(itemId);
          if (title) totals.set(title, (totals.get(title) ?? 0) + ms);
        }
      }

      return [...totals.entries()]
        .map(([title, ms]) => ({ title, ms }))
        .filter((t) => t.ms > 0)
        .sort((a, b) => b.ms - a.ms)
        .slice(0, limit);
    },
    { revalidateOnFocus: false }
  );

  return data ?? [];
}
