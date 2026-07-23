"use client";

import { useEffect } from "react";

/**
 * Defense-in-depth companion to CSP.
 * Watches for Content-Security-Policy violations without altering page scripts.
 */
export function SecurityRuntimeGuard() {
  useEffect(() => {
    function onViolation(event: SecurityPolicyViolationEvent) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[VibeUp CSP]", event.violatedDirective, event.blockedURI);
      }
    }

    document.addEventListener("securitypolicyviolation", onViolation);
    return () => {
      document.removeEventListener("securitypolicyviolation", onViolation);
    };
  }, []);

  return null;
}
