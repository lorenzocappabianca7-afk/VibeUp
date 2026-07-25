"use client";

import { useEffect } from "react";

let lockCount = 0;
/** Bumped on force-unlock so stale unlock callbacks from hidden tabs no-op. */
let lockGeneration = 0;

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
  const generation = lockGeneration;
  document.body.style.overflow = "hidden";

  return () => {
    // After wake-recovery force-unlock, ignore cleanup from orphaned holders
    // so they cannot drive lockCount negative / unlock under a new modal.
    if (generation !== lockGeneration) return;
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

  lockGeneration += 1;
  lockCount = 0;
  document.body.style.overflow = "";
}
