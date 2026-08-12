/** Confirmation window after manager accept / proposal forward. */
export const CONFIRMATION_DEADLINE_DAYS = 3;
export const CONFIRMATION_DEADLINE_MS =
  CONFIRMATION_DEADLINE_DAYS * 24 * 60 * 60 * 1000;

/** Send reminder when fewer than this many ms remain before deadline. */
export const CONFIRMATION_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

export function computeConfirmationDeadline(
  from: Date = new Date(),
): string {
  return new Date(from.getTime() + CONFIRMATION_DEADLINE_MS).toISOString();
}

export function formatConfirmationDeadlineIt(
  iso: string | null | undefined,
): string | null {
  if (!iso) return null;
  const stamp = Date.parse(iso);
  if (!Number.isFinite(stamp)) return null;
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(stamp));
}

export function confirmationDeadlineCountdownLabel(
  iso: string | null | undefined,
  now = Date.now(),
): string | null {
  if (!iso) return null;
  const stamp = Date.parse(iso);
  if (!Number.isFinite(stamp)) return null;
  const remaining = stamp - now;
  if (remaining <= 0) return "Scaduta";
  const hours = Math.ceil(remaining / (60 * 60 * 1000));
  if (hours < 48) {
    return hours <= 1 ? "Meno di 1 ora" : `${hours} ore rimanenti`;
  }
  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  return days === 1 ? "1 giorno rimanente" : `${days} giorni rimanenti`;
}
