import {
  calculateLocationDeposit,
  getEventDepositPaymentKey,
} from "@/lib/booking-money";
import type { UserEvent } from "@/types/event";

/** Stable local id — never a cloud booking UUID, so Stripe is not called. */
export const ADMIN_PREVIEW_EVENT_ID = "admin-preview-confirmed-event";

export function isAdminPreviewEventId(eventId: string) {
  return eventId === ADMIN_PREVIEW_EVENT_ID;
}

export function getAdminPreviewDepositPaymentKey() {
  return getEventDepositPaymentKey(ADMIN_PREVIEW_EVENT_ID);
}

function previewPartyDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 4);
  date.setDate(15);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Canonical confirmed event used as a live UI reference on the admin account. */
export function buildAdminPreviewEvent(): UserEvent {
  const locationCost = 800;
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - 2);

  return {
    id: ADMIN_PREVIEW_EVENT_ID,
    title: "Il mio 18° compleanno",
    description: "Festa con musica e invitati.",
    date: previewPartyDate(),
    time: "21:00",
    endTime: "02:00",
    locationName: "Cascina Ristrutturata con Piscina",
    city: "Moncalieri",
    status: "confirmed",
    guestCount: 80,
    services: [
      {
        id: `${ADMIN_PREVIEW_EVENT_ID}-location`,
        category: "location",
        name: "Location",
        providerName: "Cascina Ristrutturata con Piscina",
        status: "confirmed",
        amountPaid: locationCost,
      },
    ],
    totalCost: locationCost,
    depositAmount: calculateLocationDeposit(locationCost),
    createdAt: createdAt.toISOString(),
    siaeChoice: null,
    siaeStatus: "unselected",
    siaeVenueFee: 180,
  };
}
