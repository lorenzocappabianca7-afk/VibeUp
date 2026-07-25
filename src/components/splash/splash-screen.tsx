"use client";

import { useEffect } from "react";
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
  document.getElementById("vibeup-boot-splash-style")?.remove();
}

/**
 * Orchestrates the server-rendered boot splash only.
 * The logo lives in the first HTML (data-URI) and never remounts —
 * this client layer only adds the tagline, then dismisses.
 */
export function SplashScreen() {
  useEffect(() => {
    if (shouldSkipSplash()) {
      removeBootSplash();
      return;
    }

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const boot = document.getElementById(BOOT_SPLASH_ID);
    const stage = boot?.querySelector(".vibeup-boot-stage");

    let taglineEl: HTMLParagraphElement | null = null;

    const taglineTimer = window.setTimeout(() => {
      if (!stage) return;
      taglineEl = document.createElement("p");
      taglineEl.textContent = "VibeUp your life";
      taglineEl.setAttribute("aria-hidden", "true");
      taglineEl.style.cssText = [
        "margin:0",
        "font-family:var(--font-brand),system-ui,sans-serif",
        "font-size:1.75rem",
        "font-weight:700",
        "letter-spacing:-0.025em",
        "color:#fff",
        "text-align:center",
        "line-height:1.15",
        "opacity:0",
        "transform:translateY(10px)",
        "animation:vibeup-splash-tagline-in 380ms cubic-bezier(0.22,1,0.36,1) both",
      ].join(";");
      stage.appendChild(taglineEl);
    }, TAGLINE_DELAY_MS);

    const doneTimer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SPLASH_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      document.documentElement.style.overflow = previousOverflow;
      removeBootSplash();
    }, TAGLINE_DELAY_MS + HOLD_AFTER_TAGLINE_MS);

    return () => {
      window.clearTimeout(taglineTimer);
      window.clearTimeout(doneTimer);
      document.documentElement.style.overflow = previousOverflow;
      taglineEl?.remove();
    };
  }, []);

  return null;
}
