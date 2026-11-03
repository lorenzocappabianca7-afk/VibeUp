export const DEMO_LOCAL_RESET_EVENT = "vibeup-demo-local-reset";

export function dispatchDemoLocalReset() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DEMO_LOCAL_RESET_EVENT));
}
