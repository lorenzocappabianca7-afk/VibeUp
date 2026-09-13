import type { DemoChosenLocation, DemoSession } from "@/types/demo";

export const DEMO_SESSION_STORAGE_KEY = "vibeup-demo-session-v1";
export const DEMO_VISIT_STORAGE_KEY = "vibeup-demo-visit-v1";
export const DEMO_HOME_TIP_KEY = "vibeup-demo-home-tip-v1";
export const DEMO_SESSION_COOKIE = "vibeup-demo-session";
export const DEMO_PICK_LIMIT = 3;

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
      selectedLocations: parseChosenLocations(parsed.selectedLocations),
      bookedLocation: parseChosenLocation(parsed.bookedLocation),
      bookingConfirmed: parsed.bookingConfirmed === true,
      completedAt:
        typeof parsed.completedAt === "string" ? parsed.completedAt : null,
    };
  } catch {
    return null;
  }
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
  document.cookie = `${DEMO_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
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
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(DEMO_VISIT_STORAGE_KEY);
}

export function writeDemoVisitId(sessionId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(DEMO_VISIT_STORAGE_KEY, sessionId);
}

export function clearDemoVisit() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(DEMO_VISIT_STORAGE_KEY);
}

/** Same browser visit (refresh) vs a later reopen of the demo link. */
export function resolveDemoLanding(session: DemoSession | null): {
  session: DemoSession | null;
  state: "form" | "completed" | "ready";
} {
  if (session?.completed) {
    return { session, state: "completed" };
  }

  const visitId = readDemoVisitId();
  if (session && visitId === session.id) {
    return { session, state: "ready" };
  }

  if (session) clearDemoSession();
  clearDemoVisit();
  clearDemoHomeTip();
  return { session: null, state: "form" };
}

export function isDemoHomeTipDismissed(sessionId: string): boolean {
  if (typeof window === "undefined") return true;
  return window.sessionStorage.getItem(DEMO_HOME_TIP_KEY) === sessionId;
}

export function dismissDemoHomeTip(sessionId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(DEMO_HOME_TIP_KEY, sessionId);
}

export function clearDemoHomeTip() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(DEMO_HOME_TIP_KEY);
}
