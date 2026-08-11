import type { BookedService } from "@/types/event";

export type AvailabilityRequestStatus =
  | "pending_manager"
  | "declined"
  | "pending_user_confirm"
  | "confirmed"
  | "cancelled";

/** Snapshot used to create the UserEvent after both sides confirm. */
export interface AvailabilityEventPayload {
  title: string;
  description: string;
  date: string;
  time: string;
  endTime: string;
  locationId: string;
  locationName: string;
  city: string;
  guestCount: number;
  services: BookedService[];
  totalCost: number;
  depositAmount: number;
  /** location = new event; service = add provider to an existing event. */
  requestKind?: "location" | "service";
  /** When requestKind is service, confirm adds this service to the target event. */
  targetEventId?: string;
  pendingService?: BookedService;
}

export interface AvailabilityRequest {
  id: string;
  status: AvailabilityRequestStatus;
  requesterUserId: string;
  requesterName: string;
  requesterEmail?: string;
  locationId: string;
  locationName: string;
  createdAt: string;
  updatedAt: string;
  eventPayload: AvailabilityEventPayload;
}
