import type { CustomVenueRecord } from "@/lib/demo/custom-venue";
import type { DemoChosenLocation, DemoSession } from "@/types/demo";
import {
  normalizePartyCriteria,
  type PartyCriteria,
} from "@/types/party-criteria";

export const DEMO_SESSION_STORAGE_KEY = "vibeup-demo-session-v1";
export const DEMO_VISIT_STORAGE_KEY = "vibeup-demo-visit-v1";
export const DEMO_HOME_TIP_KEY = "vibeup-demo-home-tip-v1";
export const DEMO_CRITERIA_STORAGE_KEY = "vibeup-demo-party-criteria-v1";
export const DEMO_SESSION_COOKIE = "vibeup-demo-session";
/** One location per demo visit. Kept for older imports. */
export const DEMO_PICK_LIMIT = 1;

function readDurable(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key)
    );
  } catch {
    return null;
  }
}

function writeDurable(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
}

function clearDurable(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* private mode / quota */
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* private mode / quota */
  }
}

const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

function isDemoSession(value: unknown): value is DemoSession {
  if (!value || typeof value !== "object") return false;
  const session = value as DemoSession;
  return (
    typeof session.id === "string" &&
    session.id.length > 0 &&
    typeof session.firstName === "string" &&
    typeof session.lastName === "string" &&
    typeof session.email === "string" &&
    typeof session.privacyConsentAt === "string" &&
    typeof session.sessionCreatedAt === "string" &&
    typeof session.completed === "boolean"
  );
}

function parseSession(raw: string | null | undefined): DemoSession | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isDemoSession(parsed)) return null;
    return {
      ...parsed,
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      selectedLocations: parseChosenLocations(parsed.selectedLocations),
      customVenue: parseCustomVenue(
        (parsed as DemoSession).customVenue,
      ),
      bookedLocation: parseChosenLocation(parsed.bookedLocation),
      bookingConfirmed: parsed.bookingConfirmed === true,
      bookingConfirmedAt:
        typeof parsed.bookingConfirmedAt === "string"
          ? parsed.bookingConfirmedAt
          : null,
      completedAt:
        typeof parsed.completedAt === "string" ? parsed.completedAt : null,
    };
  } catch {
    return null;
  }
}

function parseCustomVenue(value: unknown): CustomVenueRecord | null {
  if (!value || typeof value !== "object") return null;
  const row = value as CustomVenueRecord;
  if (typeof row.name !== "string") return null;
  const name = row.name.trim();
  if (name.length < 2) return null;
  return {
    name,
    at: typeof row.at === "string" ? row.at : "",
  };
}

function parseChosenLocation(value: unknown): DemoChosenLocation | null {
  if (!value || typeof value !== "object") return null;
  const row = value as DemoChosenLocation;
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;
  return { id: row.id, name: row.name };
}

function parseChosenLocations(value: unknown): DemoChosenLocation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = parseChosenLocation(item);
    return parsed ? [parsed] : [];
  });
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(prefix));
  if (!match) return null;
  return decodeURIComponent(match.slice(prefix.length));
}

function writeCookie(session: DemoSession) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${DEMO_SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(session))}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

function clearCookie() {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${DEMO_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function readDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  const fromStorage = parseSession(
    window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY),
  );
  if (fromStorage) return fromStorage;
  return parseSession(readCookie(DEMO_SESSION_COOKIE));
}

export function writeDemoSession(session: DemoSession) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(session);
  window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, serialized);
  writeCookie(session);
}

export function clearDemoSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
  clearCookie();
}

export function readDemoVisitId(): string | null {
  return readDurable(DEMO_VISIT_STORAGE_KEY);
}

export function writeDemoVisitId(sessionId: string) {
  writeDurable(DEMO_VISIT_STORAGE_KEY, sessionId);
}

export function clearDemoVisit() {
  clearDurable(DEMO_VISIT_STORAGE_KEY);
}

/**
 * Drop every client key that could resume or prefill a previous attempt.
 * vu_locale and vibeup-demo-lang stay, so a new demo entry keeps the language.
 */
export function clearDemoAttemptLocalState() {
  clearDemoSession();
  clearDemoVisit();
  clearDemoHomeTip();
  clearDemoPartyCriteria();
  if (typeof window !== "undefined") window.__vibeupActivateDemoLang?.();
}

/**
 * Every full entry (TikTok link, refresh, PWA relaunch) is a new attempt.
 * Previous rows stay in `demo_submissions`; this only forgets the local resume.
 * The signup gate replaces the old data form, so the shell opens ready.
 */
export function resolveDemoLanding(_session?: DemoSession | null): {
  session: DemoSession | null;
  state: "ready";
} {
  clearDemoAttemptLocalState();
  return { session: null, state: "ready" };
}

export function isDemoHomeTipDismissed(sessionId: string): boolean {
  return readDurable(DEMO_HOME_TIP_KEY) === sessionId;
}

export function dismissDemoHomeTip(sessionId: string) {
  writeDurable(DEMO_HOME_TIP_KEY, sessionId);
}

export function clearDemoHomeTip() {
  clearDurable(DEMO_HOME_TIP_KEY);
}

export function readDemoPartyCriteria(sessionId: string): PartyCriteria | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_CRITERIA_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const row = parsed as { sessionId?: unknown; criteria?: unknown };
    if (row.sessionId !== sessionId || !row.criteria) return null;
    return normalizePartyCriteria(row.criteria as PartyCriteria);
  } catch {
    return null;
  }
}

export function writeDemoPartyCriteria(
  sessionId: string,
  criteria: PartyCriteria,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DEMO_CRITERIA_STORAGE_KEY,
      JSON.stringify({ sessionId, criteria }),
    );
  } catch {
    /* private mode / quota */
  }
}

export function clearDemoPartyCriteria() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DEMO_CRITERIA_STORAGE_KEY);
  } catch {
    /* private mode / quota */
  }
}
