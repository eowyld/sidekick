import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { generateICalContent } from "@/lib/ical-generator";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createServerSupabase();

  const { data: tokenRow, error: tokenError } = await supabase
    .from("ical_tokens")
    .select("user_id, enabled_sectors")
    .eq("token", token)
    .single();

  if (tokenError || !tokenRow) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: events, error: eventsError } = await supabase
    .from("calendar_events")
    .select("id, date, time, label, sub_label, sector, place")
    .eq("user_id", tokenRow.user_id)
    .in("sector", tokenRow.enabled_sectors);

  if (eventsError) {
    return new NextResponse("Server error", { status: 500 });
  }

  const icsContent = generateICalContent(
    (events ?? []).map((e) => ({
      id: e.id,
      date: e.date,
      time: e.time ?? null,
      label: e.label,
      sub_label: e.sub_label ?? null,
      sector: e.sector,
      place: e.place ?? null,
    }))
  );

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Disposition": 'attachment; filename="sidekick.ics"',
    },
  });
}
