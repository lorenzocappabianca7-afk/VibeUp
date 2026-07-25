"use client";

import { useEffect, useLayoutEffect, useState } from "react";
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

/** True after the first bounce has started — Strict Mode remount must not replay it. */
let splashBounceAlreadyPlayed = false;

type Phase = "enter" | "exit" | "gone";

function shouldSkipSplash() {
  try {
    if (sessionStorage.getItem(SPLASH_STORAGE_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }
  return false;
}

function removeCriticalPaint() {
  document.getElementById(CRITICAL_PAINT_ID)?.remove();
}

/**
 * Splash over a black safety net (CriticalPaint sits UNDER this layer).
 *
 * FOUC fixes:
 * - Logo uses a preloaded PNG URL (not a 250KB data-URI that delayed first paint).
 * - Bounce never starts at opacity:0 (that left a blank frame before the mark).
 * - Width is inline + in critical CSS so a 640px bitmap cannot flash full-screen.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<Phase>("enter");
  const [showTagline, setShowTagline] = useState(false);
  const [bounceDone, setBounceDone] = useState(() => splashBounceAlreadyPlayed);

  useLayoutEffect(() => {
    if (shouldSkipSplash()) {
      removeCriticalPaint();
      setPhase("gone");
    }
  }, []);

  useEffect(() => {
    if (shouldSkipSplash()) {
      removeCriticalPaint();
      setPhase("gone");
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
      try {
        sessionStorage.setItem(SPLASH_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
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
  }, []);

  if (phase === "gone") return null;

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
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{SPLASH_CSS}</style>
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
          decoding="async"
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

const SPLASH_CSS = `
.vibeup-splash--exit{opacity:0}
.vibeup-splash{
  opacity:1;
  transition:opacity ${SPLASH_EXIT_MS}ms cubic-bezier(0.4,0,0.2,1);
}
.vibeup-splash__stage{
  box-sizing:border-box;
  display:flex;flex-direction:column;align-items:center;
  margin-bottom:14vh;
}
.vibeup-splash__logo{
  display:block;
  width:7rem;
  max-width:7rem;
  height:auto;
  aspect-ratio:1/1;
  object-fit:contain;
  object-position:center;
  transform-origin:center center;
  image-rendering:auto;
  -webkit-user-drag:none;
  opacity:1;
  animation:vibeup-splash-bounce ${LOGO_BOUNCE_MS}ms cubic-bezier(0.16,1,0.3,1) both;
}
.vibeup-splash__logo--settled{
  animation:none!important;
  opacity:1!important;
  transform:none!important;
  filter:none!important;
  will-change:auto!important;
}
.vibeup-splash__tagline{
  margin:1rem 0 0;
  min-height:1.15em;
  padding:0 0.5rem;
  font-family:var(--font-brand),system-ui,sans-serif;
  font-size:1.75rem;font-weight:700;
  letter-spacing:-0.025em;line-height:1.15;
  color:#fff;text-align:center;white-space:nowrap;
  opacity:0;
  transform:translate3d(0,10px,0);
}
.vibeup-splash__tagline--in{
  animation:vibeup-splash-tagline-in 640ms cubic-bezier(0.16,1,0.3,1) both;
}
@keyframes vibeup-splash-bounce{
  0%{opacity:1;transform:translate3d(0,6px,0) scale(0.62)}
  45%{transform:translate3d(0,0,0) scale(1.05)}
  62%{transform:translate3d(0,0,0) scale(0.98)}
  78%{transform:translate3d(0,0,0) scale(1.015)}
  100%{opacity:1;transform:translate3d(0,0,0) scale(1)}
}
@keyframes vibeup-splash-tagline-in{
  from{opacity:0;transform:translate3d(0,10px,0)}
  to{opacity:1;transform:translate3d(0,0,0)}
}
@media (prefers-reduced-motion:reduce){
  .vibeup-splash__logo,.vibeup-splash__tagline--in{
    animation:none!important;opacity:1;transform:none
  }
  .vibeup-splash{transition:none}
}
@media (max-width:380px){
  .vibeup-splash__logo{width:6.25rem;max-width:6.25rem}
}
`.replace(/\n/g, "");
