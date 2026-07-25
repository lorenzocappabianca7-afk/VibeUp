"use client";

import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { EmailActivationBanner } from "@/components/auth/email-activation-banner";
import { AppWakeRecovery } from "@/components/pwa/app-wake-recovery";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

function shouldHideBottomNav(pathname: string) {
  return pathname.startsWith("/business") || pathname.startsWith("/admin");
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

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const hideNav = shouldHideBottomNav(pathname);

  return (
    <>
      <AppWakeRecovery />
      <div
        className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {!hideNav && <PwaInstallBanner />}
        {!hideNav && <EmailActivationBanner />}
        <div className="min-w-0 max-w-full flex-1 overflow-x-hidden">
          {children}
        </div>
        <Footer withNavOffset={!hideNav} />
      </div>
      {!hideNav && <AppChromeNav />}
    </>
  );
}
