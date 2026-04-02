import { createClient } from "@/lib/supabase";
import type { CalendarEvent } from "@/modules/calendar/components/GlobalCalendarPage";

type SyncAction = "upsert" | "delete";

function parseSourceFromEventId(eventId: string): {
  source_module: string;
  source_id: string;
} {
  const prefixMap: Record<string, string> = {
    "live-rep": "live",
    "live-rehearsal": "live",
    "revenus-invoice": "revenus",
    "phono-session": "phono",
    "phono-album-release": "phono",
    "phono-track-release": "phono",
    "phono-podcast-release": "phono",
    "task": "tasks",
    "marketing-event": "marketing",
    "admin-procedure": "admin",
    "admin-status-start": "admin",
    "admin-status-end": "admin",
    "edition-event": "edition",
    "custom": "custom",
  };

  for (const [prefix, module] of Object.entries(prefixMap)) {
    if (eventId.startsWith(`${prefix}-`)) {
      return {
        source_module: module,
        source_id: eventId,
      };
    }
  }

  return { source_module: "custom", source_id: eventId };
}

export async function syncEventToSupabase(
  event: CalendarEvent,
  action: SyncAction,
  userId: string
): Promise<void> {
  const supabase = createClient();
  const { source_module, source_id } = parseSourceFromEventId(event.id);

  if (action === "delete") {
    await supabase
      .from("calendar_events")
      .delete()
      .eq("user_id", userId)
      .eq("source_id", source_id);
    return;
  }

  await supabase.from("calendar_events").upsert(
    {
      user_id: userId,
      date: event.dateKey,
      time: event.time ?? null,
      label: event.label,
      sub_label: event.subLabel ?? null,
      sector: event.sector,
      type: event.type,
      place: event.place ?? null,
      source_module,
      source_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,source_module,source_id", ignoreDuplicates: false }
  );
}
