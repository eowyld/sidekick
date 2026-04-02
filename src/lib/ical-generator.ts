import ical, { ICalCalendarMethod } from "ical-generator";

export type ICalEvent = {
  id: string;
  date: string;        // "YYYY-MM-DD"
  time: string | null;
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

    let start: Date;
    let end: Date;
    let allDay = false;

    if (event.time) {
      const [hours, minutes] = event.time.split(":").map(Number);
      start = new Date(year, month - 1, day, hours, minutes);
      end = new Date(year, month - 1, day, hours + 1, minutes);
    } else {
      start = new Date(year, month - 1, day);
      end = new Date(year, month - 1, day);
      allDay = true;
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
