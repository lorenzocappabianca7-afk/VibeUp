import ICAL from "ical.js";
import { randomUUID } from "crypto";
import { createDAVClient, type DAVCalendar } from "tsdav";
import type {
  CalendarAvailabilityResult,
  CalendarConnection,
  CreateProviderCalendarEventInput,
} from "@/server/calendar/types";

const APPLE_CALDAV_SERVER_URL =
  process.env.APPLE_CALDAV_SERVER_URL ?? "https://caldav.icloud.com";

export async function checkAppleCalendarAvailability(input: {
  connection: CalendarConnection;
  dataInizio: string;
  dataFine: string;
}): Promise<CalendarAvailabilityResult> {
  if (input.connection.calendar_type !== "apple") {
    throw new Error("Connessione calendario non Apple.");
  }
  if (!input.connection.account_email || !input.connection.apple_app_password) {
    throw new Error("Credenziali iCloud incomplete.");
  }

  const client = await createDAVClient({
    serverUrl: APPLE_CALDAV_SERVER_URL,
    credentials: {
      username: input.connection.account_email,
      password: input.connection.apple_app_password,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
  const calendars = await client.fetchCalendars();
  const calendar = pickCalendar(calendars, input.connection.calendar_id);
  if (!calendar) {
    throw new Error("Calendario iCloud non trovato.");
  }

  const objects = await client.fetchCalendarObjects({
    calendar,
    timeRange: {
      start: input.dataInizio,
      end: input.dataFine,
    },
  });
  const rangeStart = new Date(input.dataInizio);
  const rangeEnd = new Date(input.dataFine);
  const busy = objects.flatMap((object) =>
    getBusyRangesFromIcs(object.data, rangeStart, rangeEnd),
  );

  return {
    provider_id: input.connection.provider_id,
    calendar_type: "apple",
    available: busy.length === 0,
    busy,
  };
}

export async function createAppleCalendarEvent(input: {
  connection: CalendarConnection;
  request: CreateProviderCalendarEventInput;
}) {
  if (input.connection.calendar_type !== "apple") {
    throw new Error("Connessione calendario non Apple.");
  }
  if (!input.connection.account_email || !input.connection.apple_app_password) {
    throw new Error("Credenziali iCloud incomplete.");
  }

  const client = await createDAVClient({
    serverUrl: APPLE_CALDAV_SERVER_URL,
    credentials: {
      username: input.connection.account_email,
      password: input.connection.apple_app_password,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
  const calendars = await client.fetchCalendars();
  const calendar = pickCalendar(calendars, input.connection.calendar_id);
  if (!calendar) {
    throw new Error("Calendario iCloud non trovato.");
  }

  const uid = `${randomUUID()}@vibeup`;
  const response = await client.createCalendarObject({
    calendar,
    filename: `${uid}.ics`,
    iCalString: buildIcsEvent({
      uid,
      title: input.request.title,
      description: input.request.description,
      start: new Date(input.request.data_inizio),
      end: new Date(input.request.data_fine),
    }),
  });

  if (!response.ok) {
    throw new Error(`Creazione evento iCloud fallita: ${await response.text()}`);
  }

  return { id: uid };
}

function pickCalendar(calendars: DAVCalendar[], calendarId: string) {
  if (calendarId === "primary") {
    return calendars[0] ?? null;
  }

  return (
    calendars.find(
      (calendar) =>
        calendar.url === calendarId ||
        calendar.displayName === calendarId ||
        calendar.ctag === calendarId,
    ) ?? calendars[0] ?? null
  );
}

function getBusyRangesFromIcs(
  ics: string | undefined,
  rangeStart: Date,
  rangeEnd: Date,
) {
  if (!ics) return [];

  try {
    const component = new ICAL.Component(ICAL.parse(ics));
    return component.getAllSubcomponents("vevent").flatMap((vevent) => {
      const event = new ICAL.Event(vevent);
      const start = event.startDate?.toJSDate();
      const end = event.endDate?.toJSDate();
      if (!start || !end) return [];
      if (!rangesOverlap(start, end, rangeStart, rangeEnd)) return [];
      return [{ start: start.toISOString(), end: end.toISOString() }];
    });
  } catch {
    return [];
  }
}

function rangesOverlap(
  busyStart: Date,
  busyEnd: Date,
  rangeStart: Date,
  rangeEnd: Date,
) {
  return busyStart < rangeEnd && busyEnd > rangeStart;
}

function buildIcsEvent(input: {
  uid: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
}) {
  const now = formatIcsDate(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VibeUp//Provider Calendar//IT",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsDate(input.start)}`,
    `DTEND:${formatIcsDate(input.end)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    input.description ? `DESCRIPTION:${escapeIcsText(input.description)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\r\n");
}

function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}
