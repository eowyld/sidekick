"use client";

import { useMemo } from "react";
import useSWR, { mutate } from "swr";
import { createClient, getSessionUser } from "@/lib/supabase";
import type { MailingCampaign, MailingContact, MailingSegment } from "@/modules/marketing/data/mailing.tsx";
import { DEFAULT_PRESSKIT_PROFILE, type PresskitProfile } from "@/modules/marketing/data/presskit";
import type { EditorialEvent } from "@/modules/marketing/data/calendrier-editorial";

export type { MailingCampaign, MailingContact, MailingSegment, PresskitProfile, EditorialEvent };

// ─── Row mappers ─────────────────────────────────────────────────────────────

function campaignToRow(c: MailingCampaign, userId: string, isDraft: boolean): Record<string, unknown> {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    subject: c.subject ?? null,
    accroche: c.accroche ?? null,
    content_html: c.contentHtml ?? null,
    date_envoi: c.dateEnvoi,
    envoyes: c.envoyes,
    ouverts: c.ouverts,
    pct_ouverture: c.pctOuverture,
    clics: c.clics,
    pct_clics: c.pctClics,
    details: c.details ?? null,
    target_segment_ids: c.targetSegmentIds ?? [],
    from_email: c.fromEmail ?? null,
    is_draft: isDraft,
    project_id: c.projectId ?? null,
  };
}

function rowToCampaign(row: Record<string, unknown>): MailingCampaign {
  return {
    id: row.id as string,
    name: row.name as string,
    subject: (row.subject as string) ?? undefined,
    accroche: (row.accroche as string) ?? undefined,
    contentHtml: (row.content_html as string) ?? undefined,
    dateEnvoi: row.date_envoi as string,
    envoyes: row.envoyes as number,
    ouverts: row.ouverts as number,
    pctOuverture: row.pct_ouverture as number,
    clics: row.clics as number,
    pctClics: row.pct_clics as number,
    details: (row.details as string) ?? undefined,
    targetSegmentIds: (row.target_segment_ids as string[]) ?? [],
    fromEmail: (row.from_email as string) ?? undefined,
    projectId: (row.project_id as string) ?? undefined,
  };
}

function contactToRow(c: MailingContact, userId: string): Record<string, unknown> {
  return {
    id: c.id,
    user_id: userId,
    nom: c.nom,
    prenom: c.prenom,
    mail: c.mail,
    date_ajout: c.dateAjout,
    segment_ids: c.segmentIds ?? [],
  };
}

function rowToContact(row: Record<string, unknown>): MailingContact {
  return {
    id: row.id as string,
    nom: row.nom as string,
    prenom: row.prenom as string,
    mail: row.mail as string,
    dateAjout: row.date_ajout as string,
    segmentIds: (row.segment_ids as string[]) ?? [],
  };
}

function segmentToRow(s: MailingSegment, userId: string): Record<string, unknown> {
  return { id: s.id, user_id: userId, name: s.name };
}

function rowToSegment(row: Record<string, unknown>): MailingSegment {
  return { id: row.id as string, name: row.name as string };
}

function eventToRow(e: EditorialEvent, userId: string): Record<string, unknown> {
  return {
    id: String(e.id),
    user_id: userId,
    title: e.title,
    date: e.date,
    project_id: e.projectId ?? null,
    data: {
      time: e.time,
      platforms: e.platforms,
      status: e.status,
      contentTypes: e.contentTypes,
      text: e.text,
      attachments: e.attachments,
      notes: e.notes,
    },
  };
}

function rowToEvent(row: Record<string, unknown>): EditorialEvent {
  const data = (row.data ?? {}) as Record<string, unknown>;
  return {
    id: row.id as string,
    title: row.title as string,
    date: row.date as string,
    time: (data.time as string) ?? "",
    platforms: (data.platforms as string[]) ?? ["instagram"],
    status: (data.status as EditorialEvent["status"]) ?? "idee",
    contentTypes: (data.contentTypes as string[]) ?? ["post"],
    text: (data.text as string) ?? "",
    attachments: (data.attachments as string[]) ?? [],
    notes: (data.notes as string) ?? "",
    projectId: (row.project_id as string) ?? undefined,
  };
}

// ─── SWR key & fetcher ────────────────────────────────────────────────────────

const KEY = "user_marketing";

type MarketingData = {
  campaigns: MailingCampaign[];
  draftCampaigns: MailingCampaign[];
  mailingContacts: MailingContact[];
  segments: MailingSegment[];
  marketingEvents: EditorialEvent[];
  presskit: PresskitProfile | null;
};

const EMPTY: MarketingData = {
  campaigns: [],
  draftCampaigns: [],
  mailingContacts: [],
  segments: [],
  marketingEvents: [],
  presskit: null,
};

async function fetchMarketingData(): Promise<MarketingData> {
  const supabase = createClient();
  const { data: { user } } = await getSessionUser(supabase);
  if (!user) return EMPTY;

  const [c, d, mc, seg, ev, pk] = await Promise.all([
    supabase.from("user_mailing_campaigns").select("*").eq("is_draft", false).order("date_envoi", { ascending: false }),
    supabase.from("user_mailing_campaigns").select("*").eq("is_draft", true).order("date_envoi", { ascending: false }),
    supabase.from("user_mailing_contacts").select("*").order("nom"),
    supabase.from("user_mailing_segments").select("*").order("name"),
    supabase.from("user_marketing_events").select("*").order("date"),
    supabase.from("user_presskit_profile").select("*").maybeSingle(),
  ]);

  return {
    campaigns: c.error ? [] : (c.data ?? []).map(rowToCampaign),
    draftCampaigns: d.error ? [] : (d.data ?? []).map(rowToCampaign),
    mailingContacts: mc.error ? [] : (mc.data ?? []).map(rowToContact),
    segments: seg.error ? [] : (seg.data ?? []).map(rowToSegment),
    marketingEvents: ev.error ? [] : (ev.data ?? []).map(rowToEvent),
    presskit: pk.error ? null : (pk.data ? (pk.data.data as PresskitProfile) : null),
  };
}

// ─── Generic optimistic slice updater ────────────────────────────────────────

function makeSliceUpdater<T extends { id: string }>(
  allDataKey: string,
  slice: keyof MarketingData,
  table: string,
  toRow: (item: T, userId: string) => Record<string, unknown>,
  extraWhere?: Record<string, unknown>
) {
  return (fn: (prev: T[]) => T[]) => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await getSessionUser(supabase);
      if (!user) return;

      // Capture current cached data
      const current = (await mutate(allDataKey, undefined, { revalidate: false })) as MarketingData | undefined;
      const allData: MarketingData = current ?? EMPTY;
      const snapshot = allData[slice] as unknown as T[];
      const next = fn(snapshot);

      // Optimistic update
      mutate(allDataKey, { ...allData, [slice]: next }, false);

      const prevMap = new Map(snapshot.map((e) => [e.id, e]));
      const nextMap = new Map(next.map((e) => [e.id, e]));

      const toInsert = next.filter((e) => !prevMap.has(e.id));
      const toUpdate = next.filter((e) => {
        const old = prevMap.get(e.id);
        return old && JSON.stringify(old) !== JSON.stringify(e);
      });
      const toDelete = snapshot.filter((e) => !nextMap.has(e.id)).map((e) => e.id);

      const ops: Array<PromiseLike<{ error: { message: string } | null }>> = [];

      if (toInsert.length > 0) {
        ops.push(
          Promise.resolve(
            supabase.from(table).insert(toInsert.map((e) => ({ ...toRow(e, user.id), ...extraWhere })))
          ).then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }
      for (const e of toUpdate) {
        ops.push(
          Promise.resolve(
            supabase.from(table).update({ ...toRow(e, user.id), ...extraWhere }).eq("id", e.id).eq("user_id", user.id)
          ).then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }
      if (toDelete.length > 0) {
        ops.push(
          Promise.resolve(
            supabase.from(table).delete().in("id", toDelete).eq("user_id", user.id)
          ).then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      const results = await Promise.all(ops);
      const firstError = results.find((r) => r.error);
      if (firstError?.error) {
        // Rollback
        mutate(allDataKey, { ...allData, [slice]: snapshot }, false);
      } else {
        // Revalidate to sync with server
        mutate(allDataKey);
      }
    })();
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMarketingData() {
  const { data, isLoading, error: swrError } = useSWR<MarketingData>(KEY, fetchMarketingData, {
    fallbackData: EMPTY,
  });

  const allData = data ?? EMPTY;

  const setCampaigns = useMemo(
    () => makeSliceUpdater<MailingCampaign>(KEY, "campaigns", "user_mailing_campaigns", (c, uid) => campaignToRow(c, uid, false), { is_draft: false }),
    []
  );

  const setDraftCampaigns = useMemo(
    () => makeSliceUpdater<MailingCampaign>(KEY, "draftCampaigns", "user_mailing_campaigns", (c, uid) => campaignToRow(c, uid, true), { is_draft: true }),
    []
  );

  const setMailingContacts = useMemo(
    () => makeSliceUpdater<MailingContact>(KEY, "mailingContacts", "user_mailing_contacts", contactToRow),
    []
  );

  const setSegments = useMemo(
    () => makeSliceUpdater<MailingSegment>(KEY, "segments", "user_mailing_segments", segmentToRow),
    []
  );

  const setMarketingEvents = useMemo(
    () => makeSliceUpdater<EditorialEvent>(KEY, "marketingEvents", "user_marketing_events", eventToRow),
    []
  );

  const setPresskit = useMemo(() => (updater: PresskitProfile | ((prev: PresskitProfile) => PresskitProfile)) => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await getSessionUser(supabase);
      if (!user) return;

      const current = (await mutate(KEY, undefined, { revalidate: false })) as MarketingData | undefined;
      const allCurrentData: MarketingData = current ?? EMPTY;
      const base = allCurrentData.presskit ?? DEFAULT_PRESSKIT_PROFILE;
      const next: PresskitProfile = typeof updater === "function" ? updater(base) : updater;

      // Optimistic update
      mutate(KEY, { ...allCurrentData, presskit: next }, false);

      const { error: err } = await supabase
        .from("user_presskit_profile")
        .upsert({ user_id: user.id, data: next }, { onConflict: "user_id" });

      if (err) {
        // Rollback
        mutate(KEY, allCurrentData, false);
      } else {
        mutate(KEY);
      }
    })();
  }, []);

  return {
    campaigns: allData.campaigns,
    setCampaigns,
    draftCampaigns: allData.draftCampaigns,
    setDraftCampaigns,
    mailingContacts: allData.mailingContacts,
    setMailingContacts,
    segments: allData.segments,
    setSegments,
    marketingEvents: allData.marketingEvents,
    setMarketingEvents,
    presskit: allData.presskit,
    setPresskit,
    loading: isLoading,
    error: swrError instanceof Error ? swrError.message : null,
  };
}
