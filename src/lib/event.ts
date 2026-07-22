import type { BookedService, CountdownTime, UserEvent } from "@/types/event";

function parseEventDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const value = new Date(`${date}T${normalizedTime}`);
  if (Number.isNaN(value.getTime())) return null;
  return value;
}

export function getEventDateTime(event: UserEvent): Date {
  return (
    parseEventDateTime(event.date, event.time || "00:00") ??
    // Safe display fallback only — never use for prune decisions.
    new Date(Number.NaN)
  );
}

export function getEventEndDateTime(event: UserEvent): Date {
  const start = parseEventDateTime(event.date, event.time || "00:00");
  if (!start) return new Date(Number.NaN);

  if (!event.endTime) return start;

  const end = parseEventDateTime(event.date, event.endTime);
  if (!end) return start;

  // Overnight events (e.g. 22:00 → 02:00) end the next calendar day.
  if (end.getTime() <= start.getTime()) {
    end.setDate(end.getDate() + 1);
  }

  return end;
}

/**
 * True when the event end is confidently in the past.
 * Invalid dates never count as past (avoids deleting broken events).
 */
export function isEventPast(event: UserEvent, now: Date = new Date()): boolean {
  const end = getEventEndDateTime(event).getTime();
  if (Number.isNaN(end)) return false;
  return end <= now.getTime();
}

export function getCountdown(target: Date): CountdownTime {
  const now = new Date();
  const targetTime = target.getTime();
  if (Number.isNaN(targetTime)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const diff = targetTime - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isPast: false };
}

/**
 * Politica protezione utente: rimborso disponibile dopo la data dell'evento
 * oppure immediatamente se il servizio è stato annullato dal fornitore.
 */
export function isRefundEligible(
  event: UserEvent,
  service: BookedService,
): boolean {
  if (service.status === "cancelled") return true;

  const eventDateTime = getEventDateTime(event);
  const time = eventDateTime.getTime();
  if (Number.isNaN(time)) return false;
  return new Date() >= eventDateTime;
}

export function getRefundDisabledReason(
  event: UserEvent,
  service: BookedService,
): string {
  if (isRefundEligible(event, service)) return "";

  const eventDateTime = getEventDateTime(event);
  if (Number.isNaN(eventDateTime.getTime())) {
    return "Disponibile dopo l'evento";
  }

  const formatted = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(eventDateTime);

  return `Disponibile dopo l'evento (${formatted})`;
}
