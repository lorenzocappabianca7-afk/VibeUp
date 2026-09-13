/**
 * Global demo-mode switch. Off unless NEXT_PUBLIC_DEMO_MODE is true/1.
 * Rebuild / restart after changing — Next inlines NEXT_PUBLIC_* at build time.
 */
export function isDemoMode(): boolean {
  const raw = process.env.NEXT_PUBLIC_DEMO_MODE?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

export function isDemoAvailabilityRequestId(id: string) {
  return id.startsWith("ar-demo-");
}

export function isDemoEventId(id: string) {
  return id.startsWith("evt-demo-");
}
