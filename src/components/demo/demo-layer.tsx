"use client";

import { DemoLanguageSwitch } from "@/components/demo/demo-language-switch";
import { DemoLanding } from "@/components/demo/demo-landing";
import { useLocale } from "@/context/locale-context";
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
      <div
        className="pt-11"
        aria-hidden={!appUnlocked}
        inert={!appUnlocked || undefined}
      >
        {children}
      </div>
      <DemoLanding />
    </>
  );
}

function DemoExitControl() {
  const { t } = useLocale();
  return (
    <div
      className="fixed inset-x-0 top-0 z-[75] flex items-center justify-between bg-background px-3"
      style={{
        height: "calc(env(safe-area-inset-top, 0px) + 2.75rem)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <DemoLanguageSwitch />
      <button
        type="button"
        onClick={() => leaveDemoForSite()}
        className="rounded-full px-2 py-1 text-[11px] font-medium text-primary-black/55"
      >
        {t("Esci dalla demo")}
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
