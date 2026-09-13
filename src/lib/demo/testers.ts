/** Testers who may repeat the demo on the same browser after completing it. */
const UNLIMITED_TESTER_EMAILS = new Set(["lorenzo.cappabianca7@gmail.com"]);

export const DEMO_LOCAL_RESET_EVENT = "vibeup-demo-local-reset";
const DEMO_TESTER_EMAIL_KEY = "vibeup-demo-tester-email-v1";

export function isUnlimitedDemoTesterEmail(email: string | null | undefined) {
  return Boolean(
    email && UNLIMITED_TESTER_EMAILS.has(email.trim().toLowerCase()),
  );
}

export function rememberDemoTesterEmail(email: string | null | undefined) {
  if (typeof window === "undefined") return;
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!isUnlimitedDemoTesterEmail(normalized)) return;
  try {
    window.localStorage.setItem(DEMO_TESTER_EMAIL_KEY, normalized);
  } catch {
    /* private mode / quota */
  }
}

export function readRememberedDemoTesterEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(DEMO_TESTER_EMAIL_KEY);
    return isUnlimitedDemoTesterEmail(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function canRestartDemoFromEmail(
  ...emails: Array<string | null | undefined>
) {
  return emails.some((email) => isUnlimitedDemoTesterEmail(email));
}

export function dispatchDemoLocalReset() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DEMO_LOCAL_RESET_EVENT));
}
