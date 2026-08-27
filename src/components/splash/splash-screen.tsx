"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import {
  demoteCriticalPaint,
  markSplashOverlaySkip,
  revealAppShell,
  whenAppCssReady,
} from "@/lib/critical-paint";
import { recoverInteractiveSession } from "@/lib/session-health";
import {
  isStandalonePwa,
  SPLASH_EXIT_MS,
  SPLASH_HOLD_MS,
  SPLASH_STORAGE_KEY,
} from "@/lib/splash";

function removeBootSplash() {
  document.getElementById("vibeup-boot-splash")?.remove();
}

function shouldSkipSplash() {
  if (typeof window !== "undefined") {
    try {
      if (/(?:^|[?&])splash=force(?:&|$)/.test(window.location.search)) {
        return false;
      }
    } catch {
      /* ignore */
    }
  }
  /* iOS Home Screen always shows a native splash. Skipping the HTML overlay
     leaves a black gap (logo vanishes) between that image and Explore. */
  if (isStandalonePwa()) return false;

  if (typeof document !== "undefined") {
    if (document.documentElement.classList.contains("vibeup-splash-skip")) {
      return true;
    }
  }
  try {
    if (sessionStorage.getItem(SPLASH_STORAGE_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return true;
  }
  return false;
}

function persistSplashSeen() {
  try {
    sessionStorage.setItem(SPLASH_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Home-screen handoff without a white frame:
 * 1) Hide splash overlay; critical paint still covers at z-index 9990
 * 2) Wait until app CSS is applied (or timeout)
 * 3) Reveal Explore UNDER the black plate (vibeup-app-ready)
 * 4) After two frames, demote the plate (Explore is already painted)
 */
let handoffStarted = false;

function handoffToApp() {
  if (handoffStarted) return;
  handoffStarted = true;

  if (typeof document !== "undefined") {
    document.documentElement.style.overflow = "";
  }

  removeBootSplash();
  persistSplashSeen();
  markSplashOverlaySkip();

  void whenAppCssReady().then(() => {
    revealAppShell();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        demoteCriticalPaint();
        recoverInteractiveSession();
      });
    });
  });
}

/**
 * Times the static HTML splash in `#vibeup-boot-splash`. Must return null —
 * a second React overlay was painting a different size on top of the boot splash.
 */
export function SplashScreen() {
  const skipSplash = useSyncExternalStore(
    () => () => {},
    shouldSkipSplash,
    () => false,
  );

  useLayoutEffect(() => {
    if (skipSplash) handoffToApp();
  }, [skipSplash]);

  useEffect(() => {
    if (skipSplash) {
      handoffToApp();
      return;
    }

    const boot = document.getElementById("vibeup-boot-splash");

    const exitTimer = window.setTimeout(() => {
      boot?.classList.add("vibeup-splash--exit");
    }, SPLASH_HOLD_MS);

    const doneTimer = window.setTimeout(() => {
      handoffToApp();
    }, SPLASH_HOLD_MS + SPLASH_EXIT_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [skipSplash]);

  return null;
}
