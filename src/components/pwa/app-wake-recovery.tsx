"use client";

import { forceUnlockBodyScrollIfIdle } from "@/lib/body-scroll-lock";
import { useEffect } from "react";

/**
 * After long idle / bfcache restore, mobile Safari/Chrome can leave the page
 * unresponsive (stuck body scroll lock). Unlock without poking the service
 * worker — registration.update() + claim was interrupting live sessions.
 */
export function AppWakeRecovery() {
  useEffect(() => {
    const recover = () => {
      forceUnlockBodyScrollIfIdle();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") recover();
    };

    const onPageShow = () => {
      // bfcache restore after backgrounding is a common freeze trigger.
      recover();
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
