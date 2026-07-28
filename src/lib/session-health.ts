"use client";

import {
  forceUnlockBodyScrollIfIdle,
  hasVisibleOverlay,
} from "@/lib/body-scroll-lock";

/**
 * Soft repairs for long PWA / Safari sessions without nuking an open modal.
 * Clears orphan scroll locks and accidental interaction freezes.
 */
export function recoverInteractiveSession() {
  if (typeof document === "undefined") return;

  forceUnlockBodyScrollIfIdle();

  if (hasVisibleOverlay()) return;

  const { body, documentElement: html } = document;

  // Desync: lockCount 0 but styles still hidden (Strict Mode / interrupted splash).
  if (body.style.overflow === "hidden") {
    body.style.overflow = "";
  }
  if (html.style.overflow === "hidden") {
    html.style.overflow = "";
  }

  // Rare Safari freeze: body stuck non-interactive after overlay teardown.
  if (body.style.pointerEvents === "none") {
    body.style.pointerEvents = "";
  }
  if (html.style.pointerEvents === "none") {
    html.style.pointerEvents = "";
  }
}
