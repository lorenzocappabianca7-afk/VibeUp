"use client";

import { useEffect, useState } from "react";

const SPLASH_STORAGE_KEY = "vibeup-splash-seen";
/** Prepare + fire (0.50s) */
const ANIMATION_MS = 500;
/** Fade out after the burst */
const EXIT_MS = 240;

type SplashPhase = "playing" | "exiting" | "done";

function shouldSkipSplash() {
  if (typeof window === "undefined") return true;
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

export function SplashScreen() {
  const [phase, setPhase] = useState<SplashPhase>("playing");

  useEffect(() => {
    if (shouldSkipSplash()) {
      setPhase("done");
      return;
    }

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const exitTimer = window.setTimeout(() => {
      setPhase("exiting");
    }, ANIMATION_MS);

    const doneTimer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SPLASH_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      document.documentElement.style.overflow = previousOverflow;
      setPhase("done");
    }, ANIMATION_MS + EXIT_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={`vibeup-splash${phase === "exiting" ? " vibeup-splash--exit" : ""}`}
      role="presentation"
      aria-hidden
    >
      <div className="vibeup-splash__stage">
        <svg
          className="vibeup-splash__logo"
          viewBox="0 0 200 200"
          width={176}
          height={176}
          aria-hidden
        >
          {/* Confetti burst from cone mouth */}
          <g className="vibeup-splash__burst" transform="translate(132 86)">
            <path
              className="vibeup-splash__piece vibeup-splash__piece--1"
              d="M0 0c10-12 22-16 34-12"
              fill="none"
              stroke="#F091B2"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              className="vibeup-splash__piece vibeup-splash__piece--2"
              d="M0 0c14-2 26 2 34 14"
              fill="none"
              stroke="#3ECFCF"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              className="vibeup-splash__piece vibeup-splash__piece--3"
              d="M0 0c2-18 14-28 28-30"
              fill="none"
              stroke="#F091B2"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              className="vibeup-splash__piece vibeup-splash__piece--4"
              d="M0 0c12 6 22 18 24 30"
              fill="none"
              stroke="#F091B2"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <rect
              className="vibeup-splash__piece vibeup-splash__piece--5"
              x="-4"
              y="-4"
              width="10"
              height="10"
              rx="1.5"
              fill="#3ECFCF"
            />
            <rect
              className="vibeup-splash__piece vibeup-splash__piece--6"
              x="-3.5"
              y="-3.5"
              width="9"
              height="9"
              rx="1.5"
              fill="#F5F5F7"
            />
            <rect
              className="vibeup-splash__piece vibeup-splash__piece--7"
              x="-3"
              y="-3"
              width="8"
              height="8"
              rx="1.5"
              fill="#3ECFCF"
            />
            <circle
              className="vibeup-splash__piece vibeup-splash__piece--8"
              r="5"
              fill="#F091B2"
            />
            <circle
              className="vibeup-splash__piece vibeup-splash__piece--9"
              r="4"
              fill="#F5F5F7"
            />
            <rect
              className="vibeup-splash__piece vibeup-splash__piece--10"
              x="-3"
              y="-3"
              width="7"
              height="7"
              rx="1"
              fill="#F5F5F7"
            />
          </g>

          {/* Party popper cone */}
          <g className="vibeup-splash__cone">
            <path
              d="M44 154 L118 72 L146 100 L72 182 Z"
              fill="#3ECFCF"
              stroke="#F5F5F7"
              strokeWidth="10"
              strokeLinejoin="round"
            />
            <path d="M70 128 L108 90 L124 106 L86 144 Z" fill="#F5F5F7" />
            <path
              d="M118 72 L146 100"
              fill="none"
              stroke="#F5F5F7"
              strokeWidth="12"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
