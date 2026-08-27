"use client";

import "@/app/globals.css";
import { useLayoutEffect } from "react";
import { markAppCssReady } from "@/lib/critical-paint";

/**
 * Loads Tailwind / app CSS from a client-only chunk.
 *
 * Root layout must not `import "./globals.css"` — Next would hoist a ~100KB
 * render-blocking `<link>` into `<head>`, and iOS Home Screen dismisses the
 * native launch image onto a blank canvas until that file arrives.
 */
export default function AppCssLoader() {
  useLayoutEffect(() => {
    markAppCssReady();
  }, []);
  return null;
}
