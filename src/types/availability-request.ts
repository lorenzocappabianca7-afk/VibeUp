import type { BookedService } from "@/types/event";

export type AvailabilityRequestStatus =
  | "pending_manager"
  | "declined"
  | "pending_user_confirm"
  | "pending_admin_review"
  | "pending_user_review_proposal"
  | "confirmed"
  | "cancelled"
  | "expired"
  | "pending_deposit_payment";

export type ManagerDecision = "accept" | "decline" | "propose";

/** Alternative date/time slot proposed by the manager. */
export interface ManagerProposedDate {
  date: string;
  time?: string;
  endTime?: string;
  note?: string;
}

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
  /** Manager response path: accept as-is, decline, or propose alternatives. */
  managerDecision: ManagerDecision | null;
  managerNote: string | null;
  managerProposedDates: ManagerProposedDate[] | null;
  managerProposedPrice: number | null;
  managerRespondedAt: string | null;
  /** Opaque token for the public manager-response page (no login). */
  responseToken: string;
  responseTokenExpiresAt: string;
  responseTokenUsedAt: string | null;
  adminReviewedBy: string | null;
  adminReviewedAt: string | null;
  adminNote: string | null;
  /** Date the organizer picked among manager proposals (ISO date string). */
  userSelectedDate: string | null;
  userSelectedPrice: number | null;
  /**
   * ISO timestamp: organizer must confirm (and pay deposit) before this.
   * Set when the manager accepts or when a proposal is forwarded to the user.
   */
  confirmationDeadline: string | null;
  /** When the pre-deadline reminder email was sent (ISO). */
  confirmationReminderSentAt: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  depositPaymentStatus: "pending" | "paid" | "failed" | "abandoned" | null;
  /** Status to restore if Stripe checkout is abandoned/failed. */
  statusBeforePayment: AvailabilityRequestStatus | null;
}

/** Fill V2 fields for localStorage / partial payloads from older clients. */
export function normalizeAvailabilityRequest(
  item: Omit<
    AvailabilityRequest,
    | "stripeCheckoutSessionId"
    | "stripePaymentIntentId"
    | "depositPaymentStatus"
    | "statusBeforePayment"
  > &
    Partial<
      Pick<
        AvailabilityRequest,
        | "stripeCheckoutSessionId"
        | "stripePaymentIntentId"
        | "depositPaymentStatus"
        | "statusBeforePayment"
      >
    >,
): AvailabilityRequest {
  const createdMs = Date.parse(item.createdAt);
  const expiresFallback = Number.isFinite(createdMs)
    ? new Date(createdMs + 7 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    ...item,
    managerDecision: item.managerDecision ?? null,
    managerNote: item.managerNote ?? null,
    managerProposedDates: item.managerProposedDates ?? null,
    managerProposedPrice:
      typeof item.managerProposedPrice === "number"
        ? item.managerProposedPrice
        : null,
    managerRespondedAt: item.managerRespondedAt ?? null,
    responseToken:
      typeof item.responseToken === "string" && item.responseToken.length > 0
        ? item.responseToken
        : item.id,
    responseTokenExpiresAt:
      typeof item.responseTokenExpiresAt === "string" &&
      item.responseTokenExpiresAt.length > 0
        ? item.responseTokenExpiresAt
        : expiresFallback,
    responseTokenUsedAt: item.responseTokenUsedAt ?? null,
    adminReviewedBy: item.adminReviewedBy ?? null,
    adminReviewedAt: item.adminReviewedAt ?? null,
    adminNote: item.adminNote ?? null,
    userSelectedDate: item.userSelectedDate ?? null,
    userSelectedPrice:
      typeof item.userSelectedPrice === "number" ? item.userSelectedPrice : null,
    confirmationDeadline: item.confirmationDeadline ?? null,
    confirmationReminderSentAt: item.confirmationReminderSentAt ?? null,
    stripeCheckoutSessionId: item.stripeCheckoutSessionId ?? null,
    stripePaymentIntentId: item.stripePaymentIntentId ?? null,
    depositPaymentStatus: item.depositPaymentStatus ?? null,
    statusBeforePayment: item.statusBeforePayment ?? null,
  };
}
