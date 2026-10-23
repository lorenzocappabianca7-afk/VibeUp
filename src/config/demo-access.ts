/** Public demo links. Reusable until this instant, then they stop opening the demo. */
export const demoAccessConfig = {
  /** 31 January 2027, 23:59 Italian time (CET). */
  endsAt: "2027-01-31T23:59:59.999+01:00",
} as const;

export function demoAccessEndsAtMs() {
  return Date.parse(demoAccessConfig.endsAt);
}

export function isDemoAccessOpen(now = Date.now()) {
  return now <= demoAccessEndsAtMs();
}
