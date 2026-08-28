import ical, { ICalCalendarMethod } from "ical-generator";

export type ICalEvent = {
  id: string;
  date: string; // "YYYY-MM-DD"
  /** Fin inclusive (≥ date). Absente → un jour. */
  end_date?: string | null;
  time: string | null;
  end_time: string | null;
  label: string;
  sub_label: string | null;
  sector: string;
  place: string | null;
};

export function generateICalContent(events: ICalEvent[]): string {
  const calendar = ical({
    name: "SIDEKICK",
    method: ICalCalendarMethod.PUBLISH,
    timezone: "Europe/Paris",
  });

  for (const event of events) {
    const [year, month, day] = event.date.split("-").map(Number);
    const endDateStr =
      event.end_date &&
      /^\d{4}-\d{2}-\d{2}$/.test(event.end_date) &&
      event.end_date >= event.date
        ? event.end_date
        : event.date;
    const [ey, em, ed] = endDateStr.split("-").map(Number);

    let start: Date;
    let end: Date;
    let allDay = false;

    if (event.time) {
      const [hours, minutes] = event.time.split(":").map(Number);
      start = new Date(year, month - 1, day, hours, minutes);
      if (event.end_time) {
        const parts = event.end_time.split(":").map(Number);
        const eh = parts[0] ?? hours;
        const eMin = parts[1] ?? minutes;
        end = new Date(ey, em - 1, ed, eh, eMin);
      } else {
        end = new Date(ey, em - 1, ed, hours, minutes);
        end = new Date(end.getTime() + 3600000);
      }
      if (end.getTime() <= start.getTime()) {
        end = new Date(start.getTime() + 3600000);
      }
    } else {
      start = new Date(year, month - 1, day);
      end = new Date(ey, em - 1, ed);
      allDay = true;
      end.setDate(end.getDate() + 1);
    }

    const calEvent = calendar.createEvent({
      id: `sidekick-${event.id}@sidekick`,
      start,
      end,
      allDay,
      summary: event.label,
      location: event.place ?? undefined,
      description: [event.sub_label, event.sector].filter(Boolean).join(" · "),
    });

    void calEvent;
  }

  return calendar.toString();
}
