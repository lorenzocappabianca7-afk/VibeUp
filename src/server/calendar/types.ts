export type CalendarProviderRole =
  | "venue_manager"
  | "dj"
  | "photographer"
  | "decorator"
  | "catering"
  | "security"
  | "other_provider";

export type CalendarSource = "google" | "apple";

interface BaseCalendarConnection {
  id: string;
  provider_id: string;
  provider_role: CalendarProviderRole;
  provider_name: string;
  calendar_type: CalendarSource;
  calendar_id: string;
  account_email?: string | null;
  expires_at?: string | null;
}

export interface GoogleCalendarConnection extends BaseCalendarConnection {
  calendar_type: "google";
  access_token?: string | null;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export interface AppleCalendarConnection extends BaseCalendarConnection {
  calendar_type: "apple";
  apple_app_password: string;
}

export type CalendarConnection =
  | GoogleCalendarConnection
  | AppleCalendarConnection;

export interface CalendarOAuthState {
  providerId: string;
  providerRole: CalendarProviderRole;
  providerName: string;
  redirectPath?: string;
}

export interface CalendarAvailabilityInput {
  provider_id: string;
  data_inizio: string;
  data_fine: string;
}

export interface CalendarAvailabilityResult {
  provider_id: string;
  calendar_type: CalendarSource;
  available: boolean;
  busy: Array<{ start: string; end: string }>;
}

export interface CreateProviderCalendarEventInput {
  provider_id: string;
  data_inizio: string;
  data_fine: string;
  title: string;
  description?: string;
  event_id?: string;
  service_id?: string;
}
