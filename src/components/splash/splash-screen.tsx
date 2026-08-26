"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import {
  demoteCriticalPaint,
  markSplashOverlaySkip,
  revealAppShell,
} from "@/lib/critical-paint";
import { recoverInteractiveSession } from "@/lib/session-health";
import {
  SPLASH_EXIT_MS,
  SPLASH_HOLD_MS,
  SPLASH_STORAGE_KEY,
  TAGLINE_DELAY_MS,
  TAGLINE_FADE_MS,
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
 * 2) Reveal Explore UNDER the black plate (vibeup-app-ready)
 * 3) After two frames, demote the plate (Explore is already painted)
 */
function handoffToApp() {
  if (typeof document !== "undefined") {
    document.documentElement.style.overflow = "";
  }

  removeBootSplash();
  persistSplashSeen();
  markSplashOverlaySkip();
  revealAppShell();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      demoteCriticalPaint();
      recoverInteractiveSession();
    });
  });
}

/**
 * Times the static HTML splash. Does not render a second logo — a second
 * overlay was painting a different size/animation on top of the boot splash.
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

    const taglineTimer = window.setTimeout(() => {
      boot?.classList.add("vibeup-splash--tagline");
    }, TAGLINE_DELAY_MS + TAGLINE_FADE_MS);

    const exitTimer = window.setTimeout(() => {
      boot?.classList.add("vibeup-splash--exit");
    }, SPLASH_HOLD_MS);

    const doneTimer = window.setTimeout(() => {
      handoffToApp();
    }, SPLASH_HOLD_MS + SPLASH_EXIT_MS);

    return () => {
      window.clearTimeout(taglineTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [skipSplash]);

  return null;
}
