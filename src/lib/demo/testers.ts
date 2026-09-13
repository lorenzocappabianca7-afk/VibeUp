/** Testers who may repeat the demo on the same browser after completing it. */
const UNLIMITED_TESTER_EMAILS = new Set(["lorenzo.cappabianca7@gmail.com"]);

export const DEMO_LOCAL_RESET_EVENT = "vibeup-demo-local-reset";

export function isUnlimitedDemoTesterEmail(email: string | null | undefined) {
  return Boolean(
    email && UNLIMITED_TESTER_EMAILS.has(email.trim().toLowerCase()),
  );
}

export function dispatchDemoLocalReset() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DEMO_LOCAL_RESET_EVENT));
}
