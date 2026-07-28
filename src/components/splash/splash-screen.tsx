"use client";

import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import {
  demoteCriticalPaint,
  SPLASH_LOGO_SRC,
} from "@/lib/critical-paint";
import { recoverInteractiveSession } from "@/lib/session-health";
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

function markSplashSeen() {
  try {
    sessionStorage.setItem(SPLASH_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
  document.documentElement.classList.add("vibeup-splash-skip");
}

/**
 * Reveal Explore without a white frame:
 * 1) splash already unmounted / solid black plate held
 * 2) demote critical paint
 * 3) THEN set vibeup-splash-skip (reveals #vibeup-app-shell)
 */
function revealExplore() {
  if (typeof document !== "undefined") {
    document.documentElement.style.overflow = "";
  }
  demoteCriticalPaint();
  requestAnimationFrame(() => {
    demoteCriticalPaint();
    requestAnimationFrame(() => {
      demoteCriticalPaint();
      markSplashSeen();
      recoverInteractiveSession();
    });
  });
}

/**
 * Cold-start intro from Home Screen bookmark → Explore.
 *
 * The black splash plate never fades to transparent (that caused a white flash
 * when skip-class demoted the underlay). Only the logo/tagline stage fades.
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
    demoteCriticalPaint();
    markSplashSeen();
    recoverInteractiveSession();
  }, [skipSplash]);

  useEffect(() => {
    if (skipSplash) {
      demoteCriticalPaint();
      markSplashSeen();
      recoverInteractiveSession();
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
      document.documentElement.style.overflow = previousOverflow;
      setPhase("gone");
      // Reveal only after the solid splash node is gone — critical paint still
      // covers at z-index 9990 until revealExplore demotes it.
      revealExplore();
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
        opacity: 1,
        transition: "none",
        pointerEvents: phase === "exit" ? "none" : "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="vibeup-splash__stage"
        style={{
          opacity: phase === "exit" ? 0 : 1,
          transition:
            phase === "exit"
              ? `opacity ${SPLASH_EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
              : "none",
        }}
      >
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
