import type { BookedService, CountdownTime, UserEvent } from "@/types/event";

export function getEventDateTime(event: UserEvent): Date {
  return new Date(`${event.date}T${event.time}:00`);
}

export function getCountdown(target: Date): CountdownTime {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

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
  return new Date() >= eventDateTime;
}

export function getRefundDisabledReason(
  event: UserEvent,
  service: BookedService,
): string {
  if (isRefundEligible(event, service)) return "";

  const eventDateTime = getEventDateTime(event);
  const formatted = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(eventDateTime);

  return `Disponibile dopo l'evento (${formatted})`;
}
