"use client";

import { recoverInteractiveSession } from "@/lib/session-health";
import { useEffect } from "react";

/** How often to self-heal while the tab stays open (long PWA sessions). */
const WATCHDOG_MS = 90_000;

/**
 * After long idle / bfcache restore, mobile Safari/Chrome can leave the page
 * unresponsive (stuck body/html scroll lock, frozen pointer-events).
 * Recover without poking the service worker — registration.update() + claim
 * was interrupting live sessions.
 */
export function AppWakeRecovery() {
  useEffect(() => {
    const recover = () => {
      recoverInteractiveSession();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") recover();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      // bfcache restore after backgrounding is a common freeze trigger.
      recover();
      if (event.persisted) {
        // Second pass after the browser restores layers.
        window.setTimeout(recover, 0);
        window.setTimeout(recover, 250);
      }
    };

    const onFocus = () => recover();
    const onOnline = () => recover();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    // One recovery pass on mount (returning to a frozen PWA session).
    recover();

    // Watchdog: catch orphan locks even if the user never backgrounds the tab
    // (e.g. search sheet closed incorrectly after hours of use).
    const watchdog = window.setInterval(() => {
      if (document.visibilityState === "visible") recover();
    }, WATCHDOG_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.clearInterval(watchdog);
    };
  }, []);

  return null;
}
