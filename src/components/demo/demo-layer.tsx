"use client";

import { DemoLanding } from "@/components/demo/demo-landing";
import { useDemoMode } from "@/context/demo-mode-context";
import { useEffect, type ReactNode } from "react";

/**
 * Temporary overlay hook-in. When the flag is off this is a pass-through:
 * the real app tree is unchanged. Demo screens mount only inside
 * DemoGate / DemoLanding — never by replacing existing pages.
 */
export function DemoLayer({ children }: { children: ReactNode }) {
  const { isDemoMode, landingState } = useDemoMode();

  useEffect(() => {
    if (!isDemoMode) return;
    document.documentElement.dataset.demoMode = "true";
    return () => {
      delete document.documentElement.dataset.demoMode;
    };
  }, [isDemoMode]);

  if (!isDemoMode) return children;

  const appUnlocked = landingState === "ready";

  return (
    <>
      <div aria-hidden={!appUnlocked}>{children}</div>
      <DemoLanding />
    </>
  );
}

/** Render children only while demo mode is on. Use for new demo-only UI. */
export function DemoGate({ children }: { children: ReactNode }) {
  const { isDemoMode } = useDemoMode();
  if (!isDemoMode) return null;
  return children;
}
