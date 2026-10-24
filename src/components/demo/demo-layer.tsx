"use client";

import { DemoLanding } from "@/components/demo/demo-landing";
import { leaveDemoForSite, useDemoMode } from "@/context/demo-mode-context";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * When the demo cookie is off this is a pass-through.
 * Demo screens mount only inside DemoGate / DemoLanding.
 * Admin routes stay outside the overlay.
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

  const appUnlocked = landingState === "ready";

  return (
    <>
      <style>{`html[data-demo-mode],html[data-demo-mode] body{-webkit-text-size-adjust:100%;text-size-adjust:100%}html[data-demo-mode] input:not([type=checkbox]):not([type=radio]):not([type=range]),html[data-demo-mode] textarea,html[data-demo-mode] select{font-size:16px}`}</style>
      <DemoExitControl />
      <div aria-hidden={!appUnlocked} inert={!appUnlocked || undefined}>
        {children}
      </div>
      <DemoLanding />
    </>
  );
}

function DemoExitControl() {
  return (
    <div
      className="fixed z-[75] flex items-center gap-2"
      style={{
        top: "max(0.5rem, env(safe-area-inset-top, 0px))",
        right: "max(0.5rem, env(safe-area-inset-right, 0px))",
      }}
    >
      <button
        type="button"
        onClick={() => leaveDemoForSite()}
        className="rounded-full bg-surface/90 px-3 py-1.5 text-[11px] font-medium text-primary-black/55 shadow-sm ring-1 ring-primary-black/10"
      >
        Esci dalla demo
      </button>
    </div>
  );
}

/** Render children only while demo mode is on. Use for new demo-only UI. */
export function DemoGate({ children }: { children: ReactNode }) {
  const { isDemoMode } = useDemoMode();
  if (!isDemoMode) return null;
  return children;
}
