"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  BOOT_SPLASH_ID,
  HOLD_AFTER_TAGLINE_MS,
  SPLASH_STORAGE_KEY,
  TAGLINE_DELAY_MS,
} from "@/lib/splash";

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

function removeBootSplash() {
  document.getElementById(BOOT_SPLASH_ID)?.remove();
}

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    if (shouldSkipSplash()) {
      removeBootSplash();
      setVisible(false);
      return;
    }

    // Take over from the HTML boot splash without a blank frame.
    removeBootSplash();

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
          className="vibeup-splash__logo vibeup-splash__logo--static"
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
