import { getRequestStatusShortLabel } from "@/lib/availability/request-status-display";
import { MOCK_BUSINESS_CONFIRMED_EVENTS } from "@/lib/mock/business-inbox";
import type { AvailabilityRequest } from "@/types/availability-request";

export type ManagerEventStatus =
  | "pending"
  | "awaiting_guest"
  | "confirmed"
  | "cancelled";

export interface ManagerVenueEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  organizerName: string;
  locationName: string;
  locationId: string;
  status: ManagerEventStatus;
  statusLabel: string;
  totalCost: number;
  notes?: string;
  request?: AvailabilityRequest;
}

function mapRequestStatus(status: AvailabilityRequest["status"]): ManagerEventStatus {
  if (status === "confirmed" || status === "pending_deposit_payment") {
    return "confirmed";
  }
  if (
    status === "pending_user_confirm" ||
    status === "pending_user_review_proposal" ||
    status === "pending_admin_review"
  ) {
    return "awaiting_guest";
  }
  if (
    status === "declined" ||
    status === "cancelled" ||
    status === "expired"
  ) {
    return "cancelled";
  }
  return "pending";
}

export function managerEventsFromRequests(
  requests: AvailabilityRequest[],
): ManagerVenueEvent[] {
  return requests
    .map((request) => {
      const payload = request.eventPayload;
      const status = mapRequestStatus(request.status);
      return {
        id: request.id,
        title: payload.title || "Evento",
        date: payload.date,
        startTime: payload.time,
        endTime: payload.endTime,
        guestCount: payload.guestCount,
        organizerName: request.requesterName,
        locationName: request.locationName,
        locationId: request.locationId,
        status,
        statusLabel: getRequestStatusShortLabel(request.status),
        totalCost: payload.totalCost,
        notes: payload.description,
        request,
      } satisfies ManagerVenueEvent;
    })
    .sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.startTime.localeCompare(b.startTime);
    });
}

export function demoManagerVenueEvents(): ManagerVenueEvent[] {
  return MOCK_BUSINESS_CONFIRMED_EVENTS.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    guestCount: event.guestCount,
    organizerName: event.organizerName,
    locationName: "Locale di esempio",
    locationId: "demo",
    status: "confirmed" as const,
    statusLabel: "Confermato",
    totalCost: 0,
    notes: event.notes,
  }));
}

export function managerVenueEventsForDisplay(
  requests: AvailabilityRequest[],
): ManagerVenueEvent[] {
  const live = managerEventsFromRequests(requests);
  return live.length > 0 ? live : demoManagerVenueEvents();
}

export function upcomingManagerEvents(events: ManagerVenueEvent[]): ManagerVenueEvent[] {
  const today = new Date();
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return events.filter(
    (event) => event.date >= todayIso && event.status !== "cancelled",
  );
}