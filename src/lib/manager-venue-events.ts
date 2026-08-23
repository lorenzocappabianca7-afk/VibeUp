import { getRequestStatusShortLabel } from "@/lib/availability/request-status-display";
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
      } satisfies ManagerVenueEvent;
    })
    .sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.startTime.localeCompare(b.startTime);
    });
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