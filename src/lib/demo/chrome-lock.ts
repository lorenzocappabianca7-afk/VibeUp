"use client";

import { useDemoMode } from "@/context/demo-mode-context";
import { usePartyCriteria } from "@/context/party-criteria-context";

/** Which bottom-nav tab the demo may use right now, if any. */
export function useDemoLockedTab(): "home" | "explore" | "events" | null {
  const { isDemoHomeLocked, isDemoMode, session, bookingConfirmed } =
    useDemoMode();
  const { hasAppliedCriteria } = usePartyCriteria();

  if (isDemoMode && session && !session.completed && bookingConfirmed) {
    return "events";
  }
  if (isDemoHomeLocked) return "home";
  if (
    isDemoMode &&
    session &&
    !session.completed &&
    hasAppliedCriteria &&
    !bookingConfirmed
  ) {
    return "explore";
  }
  return null;
}
