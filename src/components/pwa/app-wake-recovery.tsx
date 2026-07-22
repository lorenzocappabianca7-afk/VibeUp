"use client";

import { forceUnlockBodyScrollIfIdle } from "@/lib/body-scroll-lock";
import { useEffect } from "react";

/**
 * After long idle / bfcache restore, mobile Safari/Chrome can leave the page
 * unresponsive (stuck body scroll lock or a stale service worker).
 * This soft-recovers interaction without remounting the whole app.
 */
export function AppWakeRecovery() {
  useEffect(() => {
    const recover = () => {
      forceUnlockBodyScrollIfIdle();

      // Nudge a stale SW to update after the tab wakes up.
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.getRegistration().then((registration) => {
          void registration?.update();
        });
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") recover();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      // bfcache restore after backgrounding is a common freeze trigger.
      if (event.persisted) recover();
      else recover();
    };

    const onFocus = () => recover();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);

    // One recovery pass on mount (returning to a frozen PWA session).
    recover();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
