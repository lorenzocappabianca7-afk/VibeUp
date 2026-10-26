export const CUSTOM_VENUE_ID = "custom-venue";

export interface CustomVenueRecord {
  name: string;
  /** When the visitor confirmed the name. */
  at: string;
}

export function isCustomVenueId(id: string | null | undefined) {
  return id === CUSTOM_VENUE_ID;
}

export function normalizeCustomVenueName(
  raw: string,
): { ok: true; name: string } | { ok: false; reason: "short" | "long" | "link" } {
  const name = raw.trim();
  if (name.length < 2) return { ok: false, reason: "short" };
  if (name.length > 60) return { ok: false, reason: "long" };
  if (/https?:\/\/|www\./i.test(name)) return { ok: false, reason: "link" };
  return { ok: true, name };
}

export function catalogChoice<T extends { id: string }>(
  location: T | null | undefined,
): T | null {
  if (!location || isCustomVenueId(location.id)) return null;
  return location;
}
