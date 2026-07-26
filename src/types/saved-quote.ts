import type { BookingQuote } from "@/types/location";
import type { DrinkPackageMode } from "@/lib/drinks-quote";

/** Snapshot of a generated location quote saved for later comparison. */
export interface SavedQuote {
  id: string;
  savedAt: string;
  locationId: string;
  locationName: string;
  locationCity: string;
  zoneLabel: string;
  imageUrl: string;
  /** Up to 4 gallery photos for the saved card. */
  gallery: string[];
  quote: BookingQuote;
  hourlyPrice: number;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  eventTitle?: string;
  drinkMode?: DrinkPackageMode;
  drinksPerInvitee?: number;
  selectedExtraIds?: string[];
  selectedInternalServiceIds?: string[];
}

export const MAX_SAVED_QUOTES = 20;

export function buildSavedQuoteId(locationId: string, quoteKey: string) {
  return `quote-${locationId}-${quoteKey}`;
}
