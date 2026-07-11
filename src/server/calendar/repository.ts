import type {
  CalendarConnection,
  CalendarSource,
  CalendarProviderRole,
  CreateProviderCalendarEventInput,
} from "@/server/calendar/types";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CALENDAR_TOKEN_ENCRYPTION_KEY =
  process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;

function assertCalendarRepositoryConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase non configurato: imposta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!CALENDAR_TOKEN_ENCRYPTION_KEY) {
    throw new Error(
      "Chiave cifratura calendario mancante: imposta CALENDAR_TOKEN_ENCRYPTION_KEY.",
    );
  }
}

async function supabaseFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  assertCalendarRepositoryConfigured();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Errore database calendario: ${await response.text()}`);
  }

  return (await response.json()) as T;
}

export async function saveCalendarConnection(input: {
  providerId: string;
  providerRole: CalendarProviderRole;
  providerName: string;
  calendarType: CalendarSource;
  accountEmail?: string | null;
  calendarId?: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  appleAppPassword?: string | null;
  scope: string;
  tokenType: string;
  expiresAt?: string | null;
}) {
  const rows = await supabaseFetch<CalendarConnection[]>(
    "rpc/upsert_provider_calendar",
    {
      method: "POST",
      body: JSON.stringify({
        p_provider_id: input.providerId,
        p_provider_role: input.providerRole,
        p_provider_name: input.providerName,
        p_calendar_type: input.calendarType,
        p_account_email: input.accountEmail ?? null,
        p_calendar_id: input.calendarId ?? "primary",
        p_access_token: input.accessToken ?? null,
        p_refresh_token: input.refreshToken ?? null,
        p_apple_app_password: input.appleAppPassword ?? null,
        p_scope: input.scope,
        p_token_type: input.tokenType,
        p_expires_at: input.expiresAt ?? null,
        p_encryption_key: CALENDAR_TOKEN_ENCRYPTION_KEY,
      }),
    },
  );

  const connection = rows[0];
  if (!connection) throw new Error("Connessione calendario non salvata.");
  return connection;
}

export async function getCalendarConnection(providerId: string) {
  const rows = await supabaseFetch<CalendarConnection[]>(
    "rpc/get_provider_calendar",
    {
      method: "POST",
      body: JSON.stringify({
        p_provider_id: providerId,
        p_encryption_key: CALENDAR_TOKEN_ENCRYPTION_KEY,
      }),
    },
  );

  const connection = rows[0];
  if (!connection) {
    throw new Error("Il fornitore non ha collegato un calendario.");
  }

  return connection;
}

export async function saveCalendarReservation(input: {
  providerId: string;
  calendarType: CalendarSource;
  externalEventId: string;
  request: CreateProviderCalendarEventInput;
}) {
  await supabaseFetch("provider_calendar_reservations", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      provider_id: input.providerId,
      calendar_type: input.calendarType,
      event_id: input.request.event_id ?? null,
      service_id: input.request.service_id ?? null,
      external_event_id: input.externalEventId,
      title: input.request.title,
      starts_at: input.request.data_inizio,
      ends_at: input.request.data_fine,
    }),
  });
}
