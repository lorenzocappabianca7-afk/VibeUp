"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SPLASH_STORAGE_KEY = "vibeup-splash-seen";
/** Text appears shortly after the logo bounce starts */
const TAGLINE_DELAY_MS = 520;
/** Hold after the tagline is visible, then open Explore */
const HOLD_AFTER_TAGLINE_MS = 1700;

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
  const [visible, setVisible] = useState(true);
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    if (shouldSkipSplash()) {
      setVisible(false);
      return;
    }

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const taglineTimer = window.setTimeout(() => {
      setShowTagline(true);
    }, TAGLINE_DELAY_MS);

    const doneTimer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SPLASH_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      document.documentElement.style.overflow = previousOverflow;
      setVisible(false);
    }, TAGLINE_DELAY_MS + HOLD_AFTER_TAGLINE_MS);

    return () => {
      window.clearTimeout(taglineTimer);
      window.clearTimeout(doneTimer);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="vibeup-splash" role="presentation" aria-hidden>
      <div className="vibeup-splash__stage">
        <Image
          src="/vibeup-splash-logo.png"
          alt=""
          width={868}
          height={874}
          priority
          className="vibeup-splash__logo"
          draggable={false}
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
