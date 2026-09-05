import {
  minutesToTimeHHMMSS,
  normalizeCustomTimes,
  parseTimeToMinutes,
} from "@/lib/calendar-time";
import type { CalendarEvent } from "@/modules/calendar/calendar-event-model";
import { createClient } from "@/lib/supabase";

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
    "phono-mix-release": "phono",
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

  let timeDb: string | null = null;
  let endDb: string | null = null;
  if (event.type === "custom") {
    const nt = normalizeCustomTimes({ time: event.time, endTime: event.endTime });
    if (nt.time && parseTimeToMinutes(nt.time) !== null) {
      timeDb = minutesToTimeHHMMSS(parseTimeToMinutes(nt.time)!);
      if (nt.endTime && parseTimeToMinutes(nt.endTime) !== null) {
        endDb = minutesToTimeHHMMSS(parseTimeToMinutes(nt.endTime)!);
      }
    }
  } else if (event.time && parseTimeToMinutes(event.time) !== null) {
    timeDb = minutesToTimeHHMMSS(parseTimeToMinutes(event.time)!);
  }

  await supabase.from("calendar_events").upsert(
    {
      user_id: userId,
      date: event.dateKey,
      end_date: event.dateKey,
      time: timeDb,
      end_time: endDb,
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
