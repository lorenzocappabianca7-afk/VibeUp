export const DEMO_NUDGE_EVENT = "vibeup-demo-nudge";

/** Ask Confy to hop and remind the visitor to create the party first. */
export function requestDemoNudge() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DEMO_NUDGE_EVENT));
}
