"use client";

import { useEffect } from "react";

let lockCount = 0;

/**
 * Reference-counted body scroll lock so nested/overlapping modals
 * don't unlock the page while another overlay is still open.
 */
export function lockBodyScroll() {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  lockCount += 1;
  document.body.style.overflow = "hidden";

  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = "";
    }
  };
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    return lockBodyScroll();
  }, [locked]);
}

/** Used by wake-recovery: only clear if nothing holds a lock. */
export function forceUnlockBodyScrollIfIdle() {
  if (typeof document === "undefined") return;
  if (lockCount > 0) return;
  if (document.querySelector('[data-overlay-open="true"]')) return;
  document.body.style.overflow = "";
}
