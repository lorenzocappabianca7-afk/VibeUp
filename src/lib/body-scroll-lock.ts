"use client";

import { useEffect } from "react";

let lockCount = 0;

/** True when any useBodyScrollLock / lockBodyScroll holder is active. */
export function isBodyScrollLocked() {
  return lockCount > 0;
}

/**
 * Overlays inside `hidden` / `aria-hidden` tab panels must not block unlock —
 * otherwise leaving Explore with search open freezes the whole app forever.
 */
function hasVisibleOverlay(): boolean {
  if (typeof document === "undefined") return false;

  const nodes = document.querySelectorAll('[data-overlay-open="true"]');
  for (const node of nodes) {
    const el = node as HTMLElement;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (el.closest(".hidden")) continue;

    let current: HTMLElement | null = el;
    let hidden = false;
    while (current) {
      const style = window.getComputedStyle(current);
      if (style.display === "none" || style.visibility === "hidden") {
        hidden = true;
        break;
      }
      current = current.parentElement;
    }
    if (!hidden) return true;
  }
  return false;
}

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

/**
 * Used by wake-recovery: clear orphan locks after PWA idle / bfcache,
 * ignoring overlays that are only mounted inside hidden tab panels.
 */
export function forceUnlockBodyScrollIfIdle() {
  if (typeof document === "undefined") return;
  if (hasVisibleOverlay()) return;

  // Module lockCount can desync after freezes / interrupted unmounts.
  lockCount = 0;
  document.body.style.overflow = "";
}
