"use client";

import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import {
  CRITICAL_PAINT_ID,
  SPLASH_LOGO_SRC,
} from "@/lib/critical-paint";
import {
  HOLD_AFTER_TAGLINE_MS,
  LOGO_BOUNCE_MS,
  SPLASH_EXIT_MS,
  SPLASH_STORAGE_KEY,
  TAGLINE_DELAY_MS,
} from "@/lib/splash";

/** Survives Strict Mode remount — settle class without replaying bounce CSS. */
let splashBounceAlreadyPlayed = false;

type Phase = "enter" | "exit" | "gone";

function shouldSkipSplash() {
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

function removeCriticalPaint() {
  document.getElementById(CRITICAL_PAINT_ID)?.remove();
}

function markSplashSeen() {
  try {
    sessionStorage.setItem(SPLASH_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
  document.documentElement.classList.add("vibeup-splash-skip");
}

/**
 * Cold-start intro.
 *
 * Skip is applied in a blocking <head> script (`vibeup-splash-skip`) so hard
 * navigations never paint this overlay again in the same session — CSS hides
 * it before first paint; this component then unmounts without a state flash.
 */
export function SplashScreen() {
  const skipSplash = useSyncExternalStore(
    () => () => {},
    shouldSkipSplash,
    () => false,
  );
  const [phase, setPhase] = useState<Phase>("enter");
  const [showTagline, setShowTagline] = useState(false);
  const [bounceDone, setBounceDone] = useState(() => splashBounceAlreadyPlayed);

  useLayoutEffect(() => {
    if (!skipSplash) return;
    removeCriticalPaint();
  }, [skipSplash]);

  useEffect(() => {
    if (skipSplash) {
      removeCriticalPaint();
      return;
    }

    splashBounceAlreadyPlayed = true;

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const taglineTimer = window.setTimeout(() => {
      setShowTagline(true);
    }, TAGLINE_DELAY_MS);

    const settleTimer = window.setTimeout(() => {
      setBounceDone(true);
    }, LOGO_BOUNCE_MS + 40);

    const exitTimer = window.setTimeout(() => {
      setPhase("exit");
    }, TAGLINE_DELAY_MS + HOLD_AFTER_TAGLINE_MS);

    const doneTimer = window.setTimeout(() => {
      markSplashSeen();
      document.documentElement.style.overflow = previousOverflow;
      removeCriticalPaint();
      setPhase("gone");
    }, TAGLINE_DELAY_MS + HOLD_AFTER_TAGLINE_MS + SPLASH_EXIT_MS);

    return () => {
      window.clearTimeout(taglineTimer);
      window.clearTimeout(settleTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [skipSplash]);

  if (skipSplash || phase === "gone") return null;

  return (
    <div
      className={`vibeup-splash${phase === "exit" ? " vibeup-splash--exit" : ""}`}
      role="presentation"
      aria-hidden
      suppressHydrationWarning
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 10000,
        backgroundColor: "#000000",
        opacity: phase === "exit" ? 0 : 1,
        transition:
          phase === "exit"
            ? `opacity ${SPLASH_EXIT_MS}ms cubic-bezier(0.4,0,0.2,1)`
            : "none",
        pointerEvents: phase === "exit" ? "none" : "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="vibeup-splash__stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SPLASH_LOGO_SRC}
          alt=""
          width={640}
          height={640}
          className={
            bounceDone
              ? "vibeup-splash__logo vibeup-splash__logo--settled"
              : "vibeup-splash__logo"
          }
          style={{
            width: "7rem",
            maxWidth: "7rem",
            height: "auto",
            opacity: 1,
          }}
          draggable={false}
          decoding="sync"
          fetchPriority="high"
          onAnimationEnd={(event) => {
            if (!event.animationName.includes("vibeup-splash-bounce")) return;
            setBounceDone(true);
          }}
        />
        <p
          className={`vibeup-splash__tagline${showTagline ? " vibeup-splash__tagline--in" : ""}`}
        >
          VibeUp your life
        </p>
      </div>
    </div>
  );
}
