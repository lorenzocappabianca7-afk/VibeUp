import type { CustomVenueRecord } from "@/lib/demo/custom-venue";

/** Payload written only to `public.demo_submissions` — never profiles/bookings. */
export type DemoSubmissionPayload = Record<string, unknown>;

export interface DemoSubmission {
  id: string;
  payload: DemoSubmissionPayload;
  createdAt: string;
  updatedAt: string;
}

export interface DemoChosenLocation {
  id: string;
  name: string;
}

/** Client session for the temporary demo layer. */
export interface DemoSession {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  privacyConsentAt: string;
  sessionCreatedAt: string;
  selectedLocations: DemoChosenLocation[];
  /** Handwritten place, kept apart from a catalog location. */
  customVenue: CustomVenueRecord | null;
  /** Which of the saved favorites the visitor tries to book. */
  bookedLocation: DemoChosenLocation | null;
  bookingConfirmed: boolean;
  /** When they tapped confirm on the demo booking — timer stop. */
  bookingConfirmedAt: string | null;
  completed: boolean;
  completedAt: string | null;
}

export interface DemoFeedback {
  selectedLocations: DemoChosenLocation[];
  rating: number;
  wouldUseForEighteenth: boolean;
}

export interface DemoResponseRow {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  selectedLocations: DemoChosenLocation[];
  /** The single location chosen in Esplora. Falls back for older rows. */
  chosenLocation: DemoChosenLocation | null;
  bookedLocation: DemoChosenLocation | null;
  rating: number | null;
  wouldUseForEighteenth: boolean | null;
  completed: boolean;
  completedAt: string | null;
  privacyConsentAt: string | null;
  sessionCreatedAt: string | null;
}

export type DemoLandingState = "loading" | "completed" | "ready" | "error";
