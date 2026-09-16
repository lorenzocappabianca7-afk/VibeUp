"use client";

import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { EmailActivationBanner } from "@/components/auth/email-activation-banner";
import { AppWakeRecovery } from "@/components/pwa/app-wake-recovery";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
import { useDemoMode } from "@/context/demo-mode-context";
import { useDemoLockedTab } from "@/lib/demo/chrome-lock";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

function shouldHideBottomNav(pathname: string) {
  return (
    pathname.startsWith("/business") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/r/")
  );
}

function shouldHideFooter(pathname: string) {
  return pathname.startsWith("/admin/demo");
}

function AppChromeNav() {
  const { activeTab, setTab, isBusinessUser } = useTabNavigation();
  const demoLockedTab = useDemoLockedTab();

  return (
    <BottomNav
      activeTab={activeTab}
      onTabChange={setTab}
      variant={isBusinessUser ? "business" : "consumer"}
      tabsLocked={demoLockedTab !== null}
    />
  );
}

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const hideNav = shouldHideBottomNav(pathname);
  const hideFooter = shouldHideFooter(pathname);
  const chromeLocked = useDemoLockedTab() !== null;
  const { isDemoMode } = useDemoMode();

  return (
    <>
      <AppWakeRecovery />
      <div
        className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-clip"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div
          className={chromeLocked ? "pointer-events-none" : undefined}
          inert={chromeLocked || undefined}
        >
          {!hideNav && !isDemoMode && <PwaInstallBanner />}
          {!hideNav && <EmailActivationBanner />}
        </div>
        <div className="min-w-0 max-w-full flex-1 overflow-x-clip">
          {children}
        </div>
        {hideFooter ? null : (
          <div
            className={chromeLocked ? "pointer-events-none" : undefined}
            inert={chromeLocked || undefined}
          >
            <Footer withNavOffset={!hideNav} />
          </div>
        )}
      </div>
      {!hideNav && <AppChromeNav />}
    </>
  );
}
