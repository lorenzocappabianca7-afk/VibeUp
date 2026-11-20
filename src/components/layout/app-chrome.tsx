"use client";

import {
  DemoAvailabilityBar,
  useDemoAvailabilityTarget,
} from "@/components/demo/demo-availability-bar";
import { DemoConfyGuide } from "@/components/demo/demo-confy-guide";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { EmailActivationBanner } from "@/components/auth/email-activation-banner";
import { AppWakeRecovery } from "@/components/pwa/app-wake-recovery";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
import { useDemoMode } from "@/context/demo-mode-context";
import { useDemoLockedTab } from "@/lib/demo/chrome-lock";
import { requestDemoNudge } from "@/lib/demo/nudge";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { prelaunchChromeHideCss } from "@/components/home/prelaunch-critical-css";
import { isPlatformLive } from "@/lib/platform";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useState, type ReactNode } from "react";

function shouldHideBottomNav(pathname: string) {
  return (
    pathname.startsWith("/business") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/demo/book") ||
    pathname.startsWith("/demo/rating") ||
    pathname.startsWith("/r/")
  );
}

function shouldHideFooter(pathname: string) {
  return pathname.startsWith("/admin/demo") || pathname.startsWith("/admin/iscrizioni");
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
      guideTab={demoLockedTab}
      onLockedTab={demoLockedTab === "home" ? () => requestDemoNudge() : undefined}
    />
  );
}

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const hideNav = shouldHideBottomNav(pathname);
  const hideFooter = shouldHideFooter(pathname);
  const chromeLocked = useDemoLockedTab() !== null;
  const { isDemoMode, demoEntryReady } = useDemoMode();
  const demoRequestLocation = useDemoAvailabilityTarget();
  const showDemoRequestBar = !hideNav && demoRequestLocation != null;
  const demoRoute = pathname === "/demo" || pathname.startsWith("/demo/");
  const [appPreview, setAppPreview] = useState(false);
  useLayoutEffect(() => {
    if (isPlatformLive() || pathname !== "/") {
      setAppPreview(false);
      return;
    }
    setAppPreview(new URLSearchParams(window.location.search).get("app") === "1");
  }, [pathname]);
  const prelaunchLanding = !isPlatformLive() && pathname === "/" && !appPreview;
  const hideInstall = isDemoMode || demoRoute || prelaunchLanding;
  const hideAppFooter = hideFooter || demoRoute || isDemoMode;
  const showTabs = !hideNav && !prelaunchLanding && (!demoRoute || demoEntryReady);

  return (
    <>
      <style>{prelaunchChromeHideCss}</style>
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
          {!hideNav && !hideInstall && <PwaInstallBanner />}
          {!hideNav && !demoRoute && <EmailActivationBanner />}
        </div>
        <div
          className="min-w-0 max-w-full flex-1 overflow-x-clip"
          style={
            showTabs && hideAppFooter
              ? {
                  paddingBottom: showDemoRequestBar
                    ? "max(var(--vu-demo-pad, 0px), calc(12.5rem + env(safe-area-inset-bottom, 0px)))"
                    : "var(--vu-demo-pad, calc(7rem + env(safe-area-inset-bottom, 0px)))",
                }
              : undefined
          }
        >
          {children}
        </div>
        {hideAppFooter ? null : (
          <div
            className={chromeLocked ? "pointer-events-none" : undefined}
            inert={chromeLocked || undefined}
          >
            <Footer withNavOffset={!hideNav} />
          </div>
        )}
      </div>
      {showDemoRequestBar && demoRequestLocation ? (
        <DemoAvailabilityBar location={demoRequestLocation} />
      ) : null}
      {isDemoMode && !hideNav ? <DemoConfyGuide /> : null}
      {showTabs ? <AppChromeNav /> : null}
    </>
  );
}
