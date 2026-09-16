"use client";

import { DemoLanding } from "@/components/demo/demo-landing";
import { useDemoMode } from "@/context/demo-mode-context";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Temporary overlay hook-in. When the flag is off this is a pass-through:
 * the real app tree is unchanged. Demo screens mount only inside
 * DemoGate / DemoLanding — never by replacing existing pages.
 *
 * Admin routes stay outside the demo overlay so staff tools remain usable
 * while the TikTok demo flag is on.
 */
export function DemoLayer({ children }: { children: ReactNode }) {
  const { isDemoMode, landingState } = useDemoMode();
  const pathname = usePathname() || "/";
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    if (!isDemoMode || isAdminRoute) return;
    document.documentElement.dataset.demoMode = "true";
    return () => {
      delete document.documentElement.dataset.demoMode;
    };
  }, [isAdminRoute, isDemoMode]);

  if (!isDemoMode || isAdminRoute) return children;

  const appUnlocked =
    landingState === "ready" || landingState === "loading";

  return (
    <>
      <style>{`html[data-demo-mode],html[data-demo-mode] body{-webkit-text-size-adjust:100%;text-size-adjust:100%}html[data-demo-mode] input:not([type=checkbox]):not([type=radio]):not([type=range]),html[data-demo-mode] textarea,html[data-demo-mode] select{font-size:16px}`}</style>
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
