"use client";

import { forceUnlockBodyScrollIfIdle } from "@/lib/body-scroll-lock";
import { useEffect, useRef } from "react";

const SW_UPDATE_MIN_MS = 30 * 60 * 1000;

/**
 * After long idle / bfcache restore, mobile Safari/Chrome can leave the page
 * unresponsive (stuck body scroll lock or a stale service worker).
 * This soft-recovers interaction without remounting the whole app.
 */
export function AppWakeRecovery() {
  const lastSwUpdateAtRef = useRef(0);

  useEffect(() => {
    const recover = () => {
      forceUnlockBodyScrollIfIdle();

      // Throttle SW checks — focus/visibility can fire often during long use.
      if (!("serviceWorker" in navigator)) return;
      const now = Date.now();
      if (now - lastSwUpdateAtRef.current < SW_UPDATE_MIN_MS) return;
      lastSwUpdateAtRef.current = now;
      void navigator.serviceWorker.getRegistration().then((registration) => {
        void registration?.update();
      });
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
