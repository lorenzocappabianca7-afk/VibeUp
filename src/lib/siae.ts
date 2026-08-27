/** SIAE document add-on — price and deadlines are env-configurable. */

function envNumber(name: string, fallback: number): number {
  const raw =
    typeof process !== "undefined" ? process.env[name]?.trim() : undefined;
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Official SIAE birthday permit with recorded music (DJ / playlist).
 * Source: https://www.siae.it/it/utilizzatori/feste-private/compleanno/
 * Override with NEXT_PUBLIC_SIAE_PERMIT_EUR.
 */
export const SIAE_PERMIT_RECORDED_EUR = roundCents(
  envNumber("NEXT_PUBLIC_SIAE_PERMIT_EUR", 147.99),
);

/** Official SIAE birthday permit, live music only. */
export const SIAE_PERMIT_LIVE_EUR = roundCents(
  envNumber("NEXT_PUBLIC_SIAE_PERMIT_LIVE_EUR", 112.48),
);

/** VibeUp handling surcharge on top of the official permit. */
export const SIAE_VIBEUP_FEE_EUR = roundCents(
  envNumber("NEXT_PUBLIC_SIAE_VIBEUP_FEE_EUR", 20),
);

/** Amount charged when VibeUp files the permit: official tariff + surcharge. */
export const SIAE_VIBEUP_TOTAL_EUR = roundCents(
  SIAE_PERMIT_RECORDED_EUR + SIAE_VIBEUP_FEE_EUR,
);

export function formatSiaePrice(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

/** Working days-style buffer: SIAE paperwork is due this many days before the party. */
export const SIAE_DEADLINE_DAYS_BEFORE_EVENT = envNumber(
  "NEXT_PUBLIC_SIAE_DEADLINE_DAYS_BEFORE",
  15,
);

/** Show the “decide in time” badge when the deadline is this close. */
export const SIAE_REMINDER_DAYS = envNumber(
  "NEXT_PUBLIC_SIAE_REMINDER_DAYS",
  10,
);

export type SiaeChoice = "diy" | "venue" | "vibeup";

export type SiaeStatus =
  | "unselected"
  | "diy"
  | "venue"
  | "pending_payment"
  | "managed";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCloudBookingId(eventId: string): boolean {
  return UUID_RE.test(eventId);
}

export function parseSiaeChoice(value: unknown): SiaeChoice | null {
  if (value === "diy" || value === "venue" || value === "vibeup") return value;
  return null;
}

export function parseSiaeStatus(value: unknown): SiaeStatus {
  if (
    value === "diy" ||
    value === "venue" ||
    value === "pending_payment" ||
    value === "managed"
  ) {
    return value;
  }
  return "unselected";
}

function eventDateUtc(eventDate: string): Date | null {
  const stamp = Date.parse(`${eventDate}T12:00:00`);
  if (!Number.isFinite(stamp)) return null;
  return new Date(stamp);
}

/** Calendar date by which the SIAE filing should be started. */
export function getSiaeDeadline(eventDate: string): Date | null {
  const event = eventDateUtc(eventDate);
  if (!event) return null;
  const deadline = new Date(event);
  deadline.setDate(deadline.getDate() - SIAE_DEADLINE_DAYS_BEFORE_EVENT);
  return deadline;
}

export function daysUntilSiaeDeadline(eventDate: string, now = new Date()): number | null {
  const deadline = getSiaeDeadline(eventDate);
  if (!deadline) return null;
  const ms = deadline.getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function isSiaeDecisionPending(status: SiaeStatus | undefined): boolean {
  return !status || status === "unselected" || status === "pending_payment";
}

/** Nudge when the user has not locked a choice and the filing window is closing. */
export function isSiaeReminderDue(
  eventDate: string,
  status: SiaeStatus | undefined,
  now = new Date(),
): boolean {
  if (!isSiaeDecisionPending(status)) return false;
  const remaining = daysUntilSiaeDeadline(eventDate, now);
  if (remaining === null) return false;
  return remaining <= SIAE_REMINDER_DAYS;
}

export const SIAE_STATUS_LABELS: Record<SiaeStatus, string> = {
  unselected: "Da decidere",
  diy: "Fai da te",
  venue: "Richiesto al locale",
  pending_payment: "Pagamento in corso",
  managed: "In gestione da VibeUp",
};
