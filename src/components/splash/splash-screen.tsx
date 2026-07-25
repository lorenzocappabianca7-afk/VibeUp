"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { CRITICAL_PAINT_ID } from "@/lib/critical-paint";
import {
  HOLD_AFTER_TAGLINE_MS,
  LOGO_BOUNCE_MS,
  SPLASH_EXIT_MS,
  SPLASH_STORAGE_KEY,
  TAGLINE_DELAY_MS,
} from "@/lib/splash";
import { SPLASH_LOGO_DATA_URI } from "@/lib/splash-logo-data";

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
 * Single splash layer over a server-painted black shell.
 * Smooth spring bounce → tagline → hold 2.1s → soft exit → Explore.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<Phase>("enter");
  const [showTagline, setShowTagline] = useState(false);
  const [bounceDone] = useState(() => splashBounceAlreadyPlayed);

  // Before paint: drop the critical shell once our overlay is in the tree
  // (or immediately if this session skips splash). Avoids stacked layers & white gaps.
  useLayoutEffect(() => {
    if (shouldSkipSplash()) {
      removeCriticalPaint();
      setPhase("gone");
      return;
    }
    // Splash covers the viewport — safe to remove the server black shell.
    removeCriticalPaint();
  }, []);

  useEffect(() => {
    if (shouldSkipSplash()) {
      setPhase("gone");
      return;
    }

    splashBounceAlreadyPlayed = true;

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const taglineTimer = window.setTimeout(() => {
      setShowTagline(true);
    }, TAGLINE_DELAY_MS);

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
      // Keep html/body black — app shell uses its own bg-background surface.
      setPhase("gone");
    }, TAGLINE_DELAY_MS + HOLD_AFTER_TAGLINE_MS + SPLASH_EXIT_MS);

    return () => {
      window.clearTimeout(taglineTimer);
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
    >
      <style>{SPLASH_CSS}</style>
      <div className="vibeup-splash__stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SPLASH_LOGO_DATA_URI}
          alt=""
          width={256}
          height={256}
          className={
            bounceDone
              ? "vibeup-splash__logo vibeup-splash__logo--settled"
              : "vibeup-splash__logo"
          }
          draggable={false}
          decoding="sync"
          fetchPriority="high"
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
.vibeup-splash{
  position:fixed;inset:0;z-index:10000;
  display:flex;align-items:center;justify-content:center;
  background:#000;
  pointer-events:none;
  opacity:1;
  transition:opacity ${SPLASH_EXIT_MS}ms cubic-bezier(0.4,0,0.2,1);
}
.vibeup-splash--exit{opacity:0}
.vibeup-splash__stage{
  box-sizing:border-box;
  display:flex;flex-direction:column;align-items:center;
  transform:translateY(-7vh);
}
.vibeup-splash__logo{
  display:block;
  width:min(52vw,11.5rem);
  height:auto;
  aspect-ratio:1;object-fit:contain;
  transform-origin:center center;
  backface-visibility:hidden;
  -webkit-backface-visibility:hidden;
  animation:vibeup-splash-bounce ${LOGO_BOUNCE_MS}ms cubic-bezier(0.16,1,0.3,1) both;
  will-change:transform,opacity;
}
.vibeup-splash__logo--settled{
  animation:none!important;
  opacity:1!important;
  transform:none!important;
}
.vibeup-splash__tagline{
  margin:1.15rem 0 0;
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
  0%{opacity:0;transform:translate3d(0,8px,0) scale(0.55)}
  18%{opacity:1}
  45%{transform:translate3d(0,0,0) scale(1.08)}
  62%{transform:translate3d(0,0,0) scale(0.96)}
  78%{transform:translate3d(0,0,0) scale(1.03)}
  90%{transform:translate3d(0,0,0) scale(0.99)}
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
`.replace(/\n/g, "");
