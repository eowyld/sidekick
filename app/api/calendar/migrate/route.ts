import { NextRequest, NextResponse } from "next/server";
import {
  minutesToTimeHHMMSS,
  normalizeCustomTimes,
  parseTimeToMinutes,
} from "@/lib/calendar-time";
import { createServerSupabase } from "@/lib/supabase-server";

type RawEvent = {
  id: string;
  dateKey: string;
  label: string;
  subLabel?: string;
  sector: string;
  type: string;
  time?: string;
  endTime?: string;
  place?: string;
};

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let events: RawEvent[];
  try {
    const body = await req.json();
    events = body.events;
    if (!Array.isArray(events)) throw new Error("events must be array");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const rows = events.map((e) => {
    const nt = normalizeCustomTimes({ time: e.time, endTime: e.endTime });
    const timeDb =
      nt.time && parseTimeToMinutes(nt.time) !== null
        ? minutesToTimeHHMMSS(parseTimeToMinutes(nt.time)!)
        : null;
    const endDb =
      nt.time && nt.endTime && parseTimeToMinutes(nt.endTime) !== null
        ? minutesToTimeHHMMSS(parseTimeToMinutes(nt.endTime)!)
        : null;
    return {
      user_id: user.id,
      date: e.dateKey,
      end_date: e.dateKey,
      time: timeDb,
      end_time: endDb,
      label: e.label,
      sub_label: e.subLabel ?? null,
      sector: e.sector,
      type: e.type,
      place: e.place ?? null,
      source_module: e.id.split("-")[0] ?? "custom",
      source_id: e.id,
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase
    .from("calendar_events")
    .upsert(rows, { onConflict: "user_id,source_module,source_id", ignoreDuplicates: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ migrated: rows.length });
}
