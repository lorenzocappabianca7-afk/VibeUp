import { formatConfirmationDeadlineIt } from "@/lib/availability/confirmation-deadline";
import type { AvailabilityRequestStatus } from "@/types/availability-request";
import type { EventStatus } from "@/types/event";

/** User-facing lifecycle states for requests / booking flow. */
export type RequestDisplayStatus =
  | "awaiting_response"
  | "accepted_confirm_by"
  | "confirmed"
  | "rejected"
  | "expired";

export interface RequestStatusPresentation {
  key: RequestDisplayStatus;
  label: string;
  /** Tailwind classes for pill badge */
  badgeClassName: string;
}

const BADGE_STYLES: Record<RequestDisplayStatus, string> = {
  awaiting_response:
    "bg-amber-400/20 text-amber-800 ring-1 ring-inset ring-amber-500/25",
  accepted_confirm_by:
    "bg-brand-teal/15 text-teal-900 ring-1 ring-inset ring-brand-teal/30",
  confirmed:
    "bg-emerald-500/15 text-emerald-800 ring-1 ring-inset ring-emerald-600/25",
  rejected:
    "bg-brand-pink/15 text-rose-800 ring-1 ring-inset ring-brand-pink/30",
  expired:
    "bg-primary-black/8 text-primary-black/55 ring-1 ring-inset ring-primary-black/10",
};

export function mapAvailabilityStatusToDisplay(
  status: AvailabilityRequestStatus,
): RequestDisplayStatus {
  switch (status) {
    case "pending_manager":
    case "pending_admin_review":
      return "awaiting_response";
    case "pending_user_confirm":
    case "pending_user_review_proposal":
    case "pending_deposit_payment":
      return "accepted_confirm_by";
    case "confirmed":
      return "confirmed";
    case "declined":
    case "cancelled":
      return "rejected";
    case "expired":
      return "expired";
    default:
      return "awaiting_response";
  }
}

export function mapEventStatusToDisplay(
  status: EventStatus,
): RequestDisplayStatus {
  switch (status) {
    case "confirmed":
    case "organizing":
      return "confirmed";
    case "completed":
      return "confirmed";
    case "draft":
    default:
      return "awaiting_response";
  }
}

export function getRequestStatusPresentation(params: {
  status: AvailabilityRequestStatus;
  confirmationDeadline?: string | null;
}): RequestStatusPresentation {
  const key = mapAvailabilityStatusToDisplay(params.status);
  const deadlineLabel = formatConfirmationDeadlineIt(
    params.confirmationDeadline,
  );

  let label: string;
  switch (key) {
    case "awaiting_response":
      label = "In attesa di risposta";
      break;
    case "accepted_confirm_by":
      label = deadlineLabel
        ? `Accettata - conferma entro ${deadlineLabel}`
        : "Accettata - in attesa di conferma";
      break;
    case "confirmed":
      label = "Confermata";
      break;
    case "rejected":
      label = "Rifiutata";
      break;
    case "expired":
      label = "Scaduta";
      break;
  }

  return {
    key,
    label,
    badgeClassName: BADGE_STYLES[key],
  };
}

export function getEventStatusPresentation(params: {
  status: EventStatus;
}): RequestStatusPresentation {
  const key = mapEventStatusToDisplay(params.status);
  const label =
    key === "confirmed"
      ? "Confermata"
      : key === "awaiting_response"
        ? "In attesa di risposta"
        : getRequestStatusPresentation({
            status:
              key === "rejected"
                ? "declined"
                : key === "expired"
                  ? "expired"
                  : "pending_manager",
          }).label;

  return {
    key,
    label: key === "confirmed" ? "Confermata" : label,
    badgeClassName: BADGE_STYLES[key],
  };
}

/** Short subject-friendly label without long deadline text. */
export function getRequestStatusShortLabel(
  status: AvailabilityRequestStatus,
  confirmationDeadline?: string | null,
): string {
  return getRequestStatusPresentation({ status, confirmationDeadline }).label;
}
