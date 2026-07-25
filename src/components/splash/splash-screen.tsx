"use client";

import Image from "next/image";
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
        <div className="vibeup-splash__mark">
          <Image
            src="/vibeup-splash-logo.png"
            alt=""
            width={868}
            height={874}
            priority
            className="vibeup-splash__logo"
            draggable={false}
          />
          {/* Extra burst layer so the fiocchi feel like they fire out */}
          <span className="vibeup-splash__burst" aria-hidden>
            <i className="vibeup-splash__piece vibeup-splash__piece--1" />
            <i className="vibeup-splash__piece vibeup-splash__piece--2" />
            <i className="vibeup-splash__piece vibeup-splash__piece--3" />
            <i className="vibeup-splash__piece vibeup-splash__piece--4" />
            <i className="vibeup-splash__piece vibeup-splash__piece--5" />
            <i className="vibeup-splash__piece vibeup-splash__piece--6" />
            <i className="vibeup-splash__piece vibeup-splash__piece--7" />
            <i className="vibeup-splash__piece vibeup-splash__piece--8" />
          </span>
        </div>
        <p className="vibeup-splash__tagline">Time to Vibeup</p>
      </div>
    </div>
  );
}
