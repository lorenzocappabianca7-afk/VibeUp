import {
  collectPayloadAllergens,
  formatAllergenRestrictionLabel,
  formatServiceRequestLine,
} from "@/lib/availability-request-details";
import { SIAE_STATUS_LABELS, type SiaeChoice, type SiaeStatus } from "@/lib/siae";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AvailabilityRequest } from "@/types/availability-request";
import type { BookedService } from "@/types/event";

export interface EventCheckupItem {
  id: string;
  label: string;
  detail?: string;
}

export interface EventCheckup {
  received: EventCheckupItem[];
  missing: EventCheckupItem[];
  completed: number;
  total: number;
  percent: number;
  complete: boolean;
}

export interface LinkedVenueBooking {
  siaeChoice?: SiaeChoice | null;
  siaeStatus?: SiaeStatus;
  siaePaidAt?: string;
}

const FOOD_CATEGORIES = new Set(["menu", "catering", "bakery"]);

function hasFoodService(services: BookedService[]): boolean {
  return services.some((service) => FOOD_CATEGORIES.has(service.category));
}

function isDepositPaid(request: AvailabilityRequest): boolean {
  return (
    request.depositPaymentStatus === "paid" || request.status === "confirmed"
  );
}

function depositIsDue(request: AvailabilityRequest): boolean {
  return (
    request.status === "pending_user_confirm" ||
    request.status === "pending_deposit_payment" ||
    request.status === "confirmed"
  );
}

function siaeChoiceMade(
  status: SiaeStatus | undefined,
  choice: SiaeChoice | null | undefined,
): boolean {
  if (choice === "diy" || choice === "venue" || choice === "vibeup") return true;
  return (
    status === "diy" ||
    status === "venue" ||
    status === "managed" ||
    status === "pending_payment"
  );
}

function hasMeaningfulNotes(description: string): boolean {
  const text = description.trim();
  if (!text) return false;
  return !text.startsWith("Preventivo richiesto dalla scheda location");
}

function timeRange(time: string, endTime: string): string | null {
  if (time && endTime) return `${time}–${endTime}`;
  if (time) return time;
  return null;
}

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function siaeDetail(
  status: SiaeStatus | undefined,
  choice: SiaeChoice | null | undefined,
): string {
  if (status && status !== "unselected") return SIAE_STATUS_LABELS[status];
  if (choice === "vibeup") return SIAE_STATUS_LABELS.pending_payment;
  if (choice === "diy") return SIAE_STATUS_LABELS.diy;
  if (choice === "venue") return SIAE_STATUS_LABELS.venue;
  return SIAE_STATUS_LABELS.unselected;
}

export function buildEventCheckup(request: AvailabilityRequest): EventCheckup {
  const payload = request.eventPayload;
  if (!payload || typeof payload !== "object") {
    return {
      received: [
        {
          id: "organizer",
          label: "Organizzatore",
          detail: request.requesterName,
        },
      ],
      missing: [
        {
          id: "payload",
          label: "Dettagli evento",
          detail: "Dati dell’evento non disponibili.",
        },
      ],
      completed: 1,
      total: 2,
      percent: 50,
      complete: false,
    };
  }

  const services = payload.services ?? [];
  const allergens = collectPayloadAllergens(payload);
  const eventDate = trimmed(request.userSelectedDate) || trimmed(payload.date);
  const hours = timeRange(trimmed(payload.time), trimmed(payload.endTime));
  const siaeStatus = request.linkedBooking?.siaeStatus;
  const siaeChoice = request.linkedBooking?.siaeChoice;
  const received: EventCheckupItem[] = [];
  const missing: EventCheckupItem[] = [];

  const push = (
    done: boolean,
    item: EventCheckupItem,
    missingItem?: EventCheckupItem,
  ) => {
    if (done) received.push(item);
    else missing.push(missingItem ?? { id: item.id, label: item.label });
  };

  received.push({
    id: "organizer",
    label: "Organizzatore",
    detail: request.requesterEmail
      ? `${request.requesterName} · ${request.requesterEmail}`
      : request.requesterName,
  });

  const locationName = trimmed(payload.locationName);
  if (locationName) {
    received.push({
      id: "location",
      label: "Location",
      detail: trimmed(payload.city)
        ? `${locationName}, ${trimmed(payload.city)}`
        : locationName,
    });
  } else {
    missing.push({ id: "location", label: "Location ancora da indicare" });
  }

  const title = trimmed(payload.title);
  if (title) {
    received.push({
      id: "title",
      label: "Titolo evento",
      detail: title,
    });
  }

  push(
    Boolean(eventDate),
    {
      id: "date",
      label: "Data",
      detail: eventDate ? formatDate(eventDate) : undefined,
    },
    { id: "date", label: "Data dell’evento" },
  );

  push(
    Boolean(hours),
    {
      id: "time",
      label: "Orario",
      detail: hours ?? undefined,
    },
    { id: "time", label: "Orario di inizio e fine" },
  );

  push(
    payload.guestCount > 0,
    {
      id: "guests",
      label: "Numero invitati",
      detail: `${payload.guestCount} ospiti`,
    },
    { id: "guests", label: "Numero invitati" },
  );

  if (services.length > 0) {
    received.push({
      id: "services",
      label: "Servizi richiesti",
      detail: services.map(formatServiceRequestLine).join(" · "),
    });
  } else {
    missing.push({
      id: "services",
      label: "Servizi richiesti",
      detail: "Nessun servizio nel preventivo.",
    });
  }

  if (hasFoodService(services)) {
    push(
      allergens.length > 0,
      {
        id: "allergens",
        label: "Allergie e intolleranze",
        detail: allergens.map(formatAllergenRestrictionLabel).join(", "),
      },
      {
        id: "allergens",
        label: "Allergie e intolleranze",
        detail: "Menu presente, ma l’organizzatore non ha ancora segnalato nulla.",
      },
    );
  } else if (allergens.length > 0) {
    received.push({
      id: "allergens",
      label: "Allergie e intolleranze",
      detail: allergens.map(formatAllergenRestrictionLabel).join(", "),
    });
  }

  if (hasMeaningfulNotes(trimmed(payload.description))) {
    received.push({
      id: "notes",
      label: "Dettagli evento",
      detail: trimmed(payload.description),
    });
  } else {
    missing.push({
      id: "notes",
      label: "Note o dettagli extra",
      detail: "L’organizzatore non ha aggiunto indicazioni particolari.",
    });
  }

  if (payload.totalCost > 0) {
    received.push({
      id: "total",
      label: "Preventivo",
      detail: formatCurrency(payload.totalCost),
    });
  }

  if (depositIsDue(request)) {
    if (isDepositPaid(request)) {
      received.push({
        id: "deposit",
        label: "Caparra",
        detail:
          payload.depositAmount > 0
            ? `Pagata · ${formatCurrency(payload.depositAmount)}`
            : "Pagata",
      });
    } else {
      missing.push({
        id: "deposit",
        label: "Pagamento caparra",
        detail:
          request.status === "pending_deposit_payment"
            ? "Checkout avviato, pagamento non ancora completato."
            : "In attesa che l’organizzatore confermi e paghi.",
      });
    }
  }

  if (request.status === "pending_user_review_proposal" && !request.userSelectedDate) {
    missing.push({
      id: "proposal",
      label: "Scelta data proposta",
      detail: "L’organizzatore deve ancora scegliere uno slot.",
    });
  }

  if (isDepositPaid(request)) {
    if (siaeChoiceMade(siaeStatus, siaeChoice)) {
      received.push({
        id: "siae",
        label: "Documento SIAE",
        detail: siaeDetail(siaeStatus, siaeChoice),
      });
    } else {
      missing.push({
        id: "siae",
        label: "Documento SIAE",
        detail: "Dopo la caparra l’organizzatore deve ancora scegliere come gestirlo.",
      });
    }
  }

  const total = received.length + missing.length;
  const completed = received.length;
  const percent = total === 0 ? 100 : Math.round((completed / total) * 100);

  return {
    received,
    missing,
    completed,
    total,
    percent,
    complete: missing.length === 0,
  };
}

export function buildDemoEventCheckup(input: {
  id?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  organizerName: string;
  locationName: string;
  notes?: string;
}): EventCheckup {
  const variant =
    input.id === "be-2" ? "low" : input.id === "be-4" ? "complete" : "mid";

  const received: EventCheckupItem[] = [
    { id: "organizer", label: "Organizzatore", detail: input.organizerName },
    { id: "location", label: "Location", detail: input.locationName },
    { id: "title", label: "Titolo evento", detail: input.title },
  ];
  const missing: EventCheckupItem[] = [];

  const extras: EventCheckupItem[] = [
    { id: "date", label: "Data", detail: formatDate(input.date) },
    {
      id: "time",
      label: "Orario",
      detail: `${input.startTime}–${input.endTime}`,
    },
    {
      id: "guests",
      label: "Numero invitati",
      detail: `${input.guestCount} ospiti`,
    },
    { id: "deposit", label: "Caparra", detail: "Pagata" },
    {
      id: "siae",
      label: "Documento SIAE",
      detail:
        variant === "complete"
          ? "Scelta registrata"
          : "Dopo la caparra l’organizzatore deve ancora scegliere come gestirlo.",
    },
  ];
  if (input.notes?.trim()) {
    extras.push({
      id: "notes",
      label: "Dettagli evento",
      detail: input.notes.trim(),
    });
  } else if (variant !== "complete") {
    extras.push({
      id: "notes",
      label: "Note o dettagli extra",
      detail: "L’organizzatore non ha aggiunto indicazioni particolari.",
    });
  }

  if (variant === "complete") {
    received.push(...extras);
  } else if (variant === "low") {
    missing.push(...extras);
  } else {
    received.push(...extras.slice(0, 3));
    missing.push(...extras.slice(3));
  }

  const total = received.length + missing.length;
  return {
    received,
    missing,
    completed: received.length,
    total,
    percent: Math.round((received.length / total) * 100),
    complete: missing.length === 0,
  };
}

export function checkupForManagerVenueEvent(event: {
  id?: string;
  request?: AvailabilityRequest;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  organizerName: string;
  locationName: string;
  notes?: string;
}): EventCheckup {
  return event.request
    ? buildEventCheckup(event.request)
    : buildDemoEventCheckup(event);
}
