"use client";

import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { AppWakeRecovery } from "@/components/pwa/app-wake-recovery";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
import {
  TabNavigationProvider,
  useTabNavigation,
} from "@/context/tab-navigation-context";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

function shouldHideBottomNav(pathname: string) {
  return pathname.startsWith("/business");
}

function AppChromeNav() {
  const { activeTab, setTab, isBusinessUser } = useTabNavigation();

  return (
    <BottomNav
      activeTab={activeTab}
      onTabChange={setTab}
      variant={isBusinessUser ? "business" : "consumer"}
    />
  );
}

function AppChromeInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const hideNav = shouldHideBottomNav(pathname);

  return (
    <TabNavigationProvider>
      <AppWakeRecovery />
      <div
        className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {!hideNav && <PwaInstallBanner />}
        <div className="min-w-0 max-w-full flex-1 overflow-x-hidden">
          {children}
        </div>
        <Footer withNavOffset={!hideNav} />
      </div>
      {!hideNav && <AppChromeNav />}
    </TabNavigationProvider>
  );
}

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden"
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
          }}
        >
          <div className="min-w-0 max-w-full flex-1 overflow-x-hidden">
            {children}
          </div>
          <Footer withNavOffset />
        </div>
      }
    >
      <AppChromeInner>{children}</AppChromeInner>
    </Suspense>
  );
}
