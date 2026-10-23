/**
 * Demo mode is a session cookie set from /demo, not a build flag.
 * NEXT_PUBLIC_DEMO_MODE is unused. To shut the demo off without a deploy,
 * set the server-only env DEMO_MODE_DISABLED=1 (proxy + API).
 * The client snapshot stays false during hydration so the first paint
 * matches the server, then flips before the browser paints.
 */

export const DEMO_MODE_COOKIE = "vibeup-demo-mode";
export const DEMO_MODE_COOKIE_VALUE = "1";

let demoModeSnapshot = false;

export function publishDemoMode(active: boolean) {
  demoModeSnapshot = active;
}

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return demoModeSnapshot;
}

export function readDemoModeCookie(): boolean {
  if (typeof document === "undefined") return false;
  const prefix = `${DEMO_MODE_COOKIE}=`;
  return document.cookie.split("; ").some((part) => {
    return part.startsWith(prefix) && part.slice(prefix.length) === DEMO_MODE_COOKIE_VALUE;
  });
}

export function writeDemoModeCookie() {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${DEMO_MODE_COOKIE}=${DEMO_MODE_COOKIE_VALUE}; Path=/; SameSite=Lax${secure}`;
}

export function clearDemoModeCookie() {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${DEMO_MODE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function isDemoAvailabilityRequestId(id: string) {
  return id.startsWith("ar-demo-");
}

export function isDemoEventId(id: string) {
  return id.startsWith("evt-demo-");
}
