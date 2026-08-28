import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateICalContent } from "@/lib/ical-generator";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Cette route est publique (le token secret remplace l'auth).
  // On utilise le service role pour bypasser la RLS.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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
    .select("id, date, end_date, time, end_time, label, sub_label, sector, place")
    .eq("user_id", tokenRow.user_id)
    .in("sector", tokenRow.enabled_sectors);

  if (eventsError) {
    return new NextResponse("Server error", { status: 500 });
  }

  const icsContent = generateICalContent(
    (events ?? []).map((e) => ({
      id: e.id,
      date: e.date,
      end_date: (e as { end_date?: string }).end_date ?? e.date,
      time: e.time ?? null,
      end_time: e.end_time ?? null,
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
