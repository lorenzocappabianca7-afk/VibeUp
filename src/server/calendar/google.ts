import { google } from "googleapis";
import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CalendarAvailabilityResult,
  CalendarConnection,
  CalendarOAuthState,
  CreateProviderCalendarEventInput,
} from "@/server/calendar/types";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALENDAR_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
const GOOGLE_OAUTH_SCOPE =
  "openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy";

interface SignedOAuthState {
  payload: CalendarOAuthState;
  signature: string;
}

function assertGoogleConfigured() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALENDAR_REDIRECT_URI) {
    throw new Error(
      "Google Calendar non configurato: imposta GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_CALENDAR_REDIRECT_URI.",
    );
  }
}

function createOAuthClient() {
  assertGoogleConfigured();
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALENDAR_REDIRECT_URI,
  );
}

export function buildGoogleCalendarOAuthUrl(state: CalendarOAuthState) {
  const oauth2Client = createOAuthClient();
  const payload = JSON.stringify(state);

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GOOGLE_OAUTH_SCOPE.split(" "),
    state: Buffer.from(
      JSON.stringify({
        payload: state,
        signature: signOAuthState(payload),
      } satisfies SignedOAuthState),
      "utf8",
    ).toString("base64url"),
  });
}

export function parseGoogleOAuthState(value: string | null): CalendarOAuthState {
  if (!value) throw new Error("State OAuth mancante.");
  const decoded = JSON.parse(
    Buffer.from(value, "base64url").toString("utf8"),
  ) as SignedOAuthState;
  const payload = JSON.stringify(decoded.payload);
  const expected = signOAuthState(payload);
  const receivedBuffer = Buffer.from(decoded.signature ?? "", "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new Error("State OAuth non valido.");
  }

  return decoded.payload;
}

function signOAuthState(payload: string) {
  const secret = process.env.GOOGLE_OAUTH_STATE_SECRET ?? GOOGLE_CLIENT_SECRET;
  if (!secret) {
    throw new Error(
      "Google OAuth state secret mancante: imposta GOOGLE_OAUTH_STATE_SECRET.",
    );
  }

  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function exchangeGoogleCodeForTokens(code: string) {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getGoogleAccountEmail(accessToken: string) {
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data.email ?? null;
}

export async function checkGoogleCalendarAvailability(input: {
  connection: CalendarConnection;
  dataInizio: string;
  dataFine: string;
}): Promise<CalendarAvailabilityResult> {
  if (input.connection.calendar_type !== "google") {
    throw new Error("Connessione calendario non Google.");
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: input.connection.access_token ?? undefined,
    refresh_token: input.connection.refresh_token,
  });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: input.dataInizio,
      timeMax: input.dataFine,
      items: [{ id: input.connection.calendar_id }],
    },
  });

  const busy =
    data.calendars?.[input.connection.calendar_id]?.busy?.flatMap((item) =>
      item.start && item.end ? [{ start: item.start, end: item.end }] : [],
    ) ?? [];

  return {
    provider_id: input.connection.provider_id,
    calendar_type: "google",
    available: busy.length === 0,
    busy,
  };
}

export async function createGoogleCalendarEvent(input: {
  connection: CalendarConnection;
  request: CreateProviderCalendarEventInput;
}) {
  if (input.connection.calendar_type !== "google") {
    throw new Error("Connessione calendario non Google.");
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: input.connection.access_token ?? undefined,
    refresh_token: input.connection.refresh_token,
  });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const { data } = await calendar.events.insert({
    calendarId: input.connection.calendar_id,
    requestBody: {
      summary: input.request.title,
      description: input.request.description,
      start: { dateTime: input.request.data_inizio },
      end: { dateTime: input.request.data_fine },
    },
  });

  if (!data.id) {
    throw new Error("Google non ha restituito l'id dell'evento.");
  }

  return { id: data.id };
}

export async function revokeGoogleToken(connection: CalendarConnection) {
  if (connection.calendar_type !== "google") return;

  const oauth2Client = createOAuthClient();
  await oauth2Client.revokeToken(connection.refresh_token);
}
