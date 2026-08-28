import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  normalizeWaitlistPayload,
  waitlistPayloadSchema,
  type WaitlistPayload,
} from "@/lib/waitlist";

const WAITLIST_SOURCE = "sidekick-landing";

type WaitlistAction = "created" | "updated" | "submitted" | "none";

function getWaitlistSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey);
}

async function persistWaitlistEntry(
  payload: WaitlistPayload,
  submittedAt: string
): Promise<Extract<WaitlistAction, "created" | "updated">> {
  const supabase = getWaitlistSupabaseClient();

  if (!supabase) {
    throw new Error("missing_supabase_configuration");
  }

  const { data: existingRow, error: existingRowError } = await supabase
    .from("alpha_testers_waitlist")
    .select("id")
    .eq("email", payload.email)
    .maybeSingle();

  if (existingRowError) {
    throw existingRowError;
  }

  if (existingRow?.id) {
    const { error: updateError } = await supabase
      .from("alpha_testers_waitlist")
      .update({
        last_name: payload.lastName,
        first_name: payload.firstName,
        status: payload.status,
        source: WAITLIST_SOURCE,
        updated_at: submittedAt,
      })
      .eq("id", existingRow.id);

    if (updateError) {
      throw updateError;
    }

    return "updated";
  }

  const { error: insertError } = await supabase.from("alpha_testers_waitlist").insert({
    last_name: payload.lastName,
    first_name: payload.firstName,
    email: payload.email,
    status: payload.status,
    source: WAITLIST_SOURCE,
    created_at: submittedAt,
    updated_at: submittedAt,
  });

  if (!insertError) {
    return "created";
  }

  if (insertError.code !== "23505") {
    throw insertError;
  }

  const { error: retryUpdateError } = await supabase
    .from("alpha_testers_waitlist")
    .update({
      last_name: payload.lastName,
      first_name: payload.firstName,
      status: payload.status,
      source: WAITLIST_SOURCE,
      updated_at: submittedAt,
    })
    .eq("email", payload.email);

  if (retryUpdateError) {
    throw retryUpdateError;
  }

  return "updated";
}

async function syncWaitlistWebhook(
  webhookUrl: string,
  payload: WaitlistPayload,
  submittedAt: string,
  action: WaitlistAction
) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      action,
      source: WAITLIST_SOURCE,
      submittedAt,
    }),
  });

  if (!response.ok) {
    throw new Error("webhook_rejected");
  }
}

/**
 * POST /api/waitlist — capture la demande d'accès alpha depuis la landing.
 * Persistance recommandée :
 * - Supabase via la table `alpha_testers_waitlist`
 * - Synchronisation optionnelle via WAITLIST_WEBHOOK_URL (Google Sheets, Make, Zapier...)
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsedBody = waitlistPayloadSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_form",
        fieldErrors: parsedBody.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const payload = normalizeWaitlistPayload(parsedBody.data);
  const webhookUrl = process.env.WAITLIST_WEBHOOK_URL?.trim();
  const hasSupabaseStorage = Boolean(getWaitlistSupabaseClient());
  const hasWebhookStorage = Boolean(webhookUrl);

  if (!hasSupabaseStorage && !hasWebhookStorage) {
    return NextResponse.json(
      { ok: false, error: "waitlist_not_configured" },
      { status: 503 }
    );
  }

  const submittedAt = new Date().toISOString();
  let action: WaitlistAction = "none";
  let persistedInDatabase = false;
  let syncedWebhook = false;
  let databaseError: string | null = null;
  let webhookError: string | null = null;

  if (hasSupabaseStorage) {
    try {
      action = await persistWaitlistEntry(payload, submittedAt);
      persistedInDatabase = true;
    } catch (error) {
      databaseError =
        error instanceof Error && error.message === "missing_supabase_configuration"
          ? "missing_supabase_configuration"
          : "database_failed";
      console.error("[waitlist] database persistence failed", error);
    }
  }

  if (webhookUrl) {
    try {
      await syncWaitlistWebhook(
        webhookUrl,
        payload,
        submittedAt,
        action === "none" ? "submitted" : action
      );
      syncedWebhook = true;
      if (action === "none") {
        action = "submitted";
      }
    } catch (error) {
      webhookError =
        error instanceof Error && error.message === "webhook_rejected"
          ? "webhook_rejected"
          : "webhook_failed";
      console.error("[waitlist] webhook sync failed", error);
    }
  }

  if (!persistedInDatabase && !syncedWebhook) {
    return NextResponse.json(
      {
        ok: false,
        error:
          databaseError === "missing_supabase_configuration"
            ? webhookError ?? "waitlist_not_configured"
            : databaseError ?? webhookError ?? "waitlist_unavailable",
      },
      { status: webhookError ? 502 : 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    persisted: true,
    action,
    storage: {
      database: persistedInDatabase,
      webhook: syncedWebhook,
    },
    warnings: [databaseError, webhookError].filter(Boolean),
  });
}
