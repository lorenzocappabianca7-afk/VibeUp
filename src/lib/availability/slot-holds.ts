/** Normalize event date to YYYY-MM-DD for slot hold keys. */
export function normalizeSlotEventDate(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Already ISO date
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const stamp = Date.parse(trimmed);
  if (!Number.isFinite(stamp)) return null;
  return new Date(stamp).toISOString().slice(0, 10);
}

/** Default hold while waiting for manager response (mirrors response token window). */
export const SLOT_HOLD_PENDING_MANAGER_MS = 7 * 24 * 60 * 60 * 1000;

export function defaultSlotHoldUntil(from: Date = new Date()): string {
  return new Date(from.getTime() + SLOT_HOLD_PENDING_MANAGER_MS).toISOString();
}
