import {
  DEFAULT_DRINKS_PER_INVITEE,
  type DrinkPackageMode,
} from "@/lib/drinks-quote";
import { EXPLORE_GUEST_MIN } from "@/types/location";

const STORAGE_KEY = "vibeup-quote-session-draft-v1";

/** Quote inputs remembered only for the current browser tab session. */
export interface QuoteSessionDraft {
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  drinkMode: DrinkPackageMode;
  drinksPerInvitee: number;
  cakeKg: number;
}

function isDrinkMode(value: unknown): value is DrinkPackageMode {
  return value === "none" || value === "per_invitee" || value === "open_bar";
}

export function readQuoteSessionDraft(): QuoteSessionDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuoteSessionDraft>;
    if (!parsed || typeof parsed !== "object") return null;

    const guestCount = Number(parsed.guestCount);
    const drinksPerInvitee = Number(parsed.drinksPerInvitee);
    const cakeKg = Number(parsed.cakeKg);

    return {
      date: typeof parsed.date === "string" ? parsed.date : "",
      startTime:
        typeof parsed.startTime === "string" && parsed.startTime
          ? parsed.startTime
          : "18:00",
      endTime:
        typeof parsed.endTime === "string" && parsed.endTime
          ? parsed.endTime
          : "23:00",
      guestCount:
        Number.isFinite(guestCount) && guestCount >= 1
          ? guestCount
          : EXPLORE_GUEST_MIN,
      drinkMode: isDrinkMode(parsed.drinkMode) ? parsed.drinkMode : "none",
      drinksPerInvitee:
        Number.isFinite(drinksPerInvitee) && drinksPerInvitee >= 1
          ? drinksPerInvitee
          : DEFAULT_DRINKS_PER_INVITEE,
      cakeKg: Number.isFinite(cakeKg) && cakeKg >= 1 ? cakeKg : 3,
    };
  } catch {
    return null;
  }
}

export function writeQuoteSessionDraft(draft: QuoteSessionDraft) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // private mode / quota
  }
}
