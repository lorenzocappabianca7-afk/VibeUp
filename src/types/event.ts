export type EventStatus = "draft" | "organizing" | "confirmed" | "completed";

export type ServiceStatus = "confirmed" | "pending" | "cancelled";

export type BookedServiceCategory =
  | "location"
  | "menu"
  | "dj"
  | "photographer"
  | "decorations"
  | "bakery"
  | "catering"
  | "audio_lights"
  | "security";

export interface BookedService {
  id: string;
  category: BookedServiceCategory;
  name: string;
  providerName: string;
  status: ServiceStatus;
  amountPaid: number;
  allergens?: string[];
}

export interface EventMenuSelection {
  courseId: string;
  courseLabel: string;
  itemId: string;
  itemLabel: string;
}

export interface UserEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  endTime?: string;
  locationId?: string;
  locationName: string;
  city: string;
  status: EventStatus;
  guestCount: number;
  services: BookedService[];
  totalCost?: number;
  depositAmount?: number;
  menuSelections?: EventMenuSelection[];
}

export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export type RefundReason =
  | "non_conforme"
  | "qualita_insufficiente"
  | "no_show"
  | "altro";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Bozza",
  organizing: "In organizzazione",
  confirmed: "Confermato",
  completed: "Completato",
};

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  confirmed: "Confermata",
  pending: "In attesa",
  cancelled: "Annullata",
};

export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  non_conforme: "Servizio non conforme alla prenotazione",
  qualita_insufficiente: "Qualità insufficiente",
  no_show: "Fornitore non si è presentato",
  altro: "Altro motivo",
};
