"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SPLASH_STORAGE_KEY = "vibeup-splash-seen";
const SPLASH_MS = 1400;

function shouldSkipSplash() {
  if (typeof window === "undefined") return true;
  try {
    if (sessionStorage.getItem(SPLASH_STORAGE_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (shouldSkipSplash()) {
      setVisible(false);
      return;
    }

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const doneTimer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SPLASH_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      document.documentElement.style.overflow = previousOverflow;
      setVisible(false);
    }, SPLASH_MS);

    return () => {
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
        <p className="vibeup-splash__tagline">
          <span className="text-brand-teal">V</span>ibe
          <span className="text-brand-pink">U</span>p your life
        </p>
      </div>
    </div>
  );
}
