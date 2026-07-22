"use client";

import { BottomNav } from "@/components/layout/bottom-nav";
import { AppWakeRecovery } from "@/components/pwa/app-wake-recovery";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
import { TABS, type TabId } from "@/types/navigation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, type ReactNode } from "react";

const VALID_TABS = new Set(TABS.map((tab) => tab.id));

function resolveActiveTab(pathname: string, tabParam: string | null): TabId {
  if (pathname.startsWith("/event")) return "events";
  if (pathname.startsWith("/location") || pathname.startsWith("/service")) {
    return "explore";
  }

  if (pathname === "/" || pathname === "") {
    if (tabParam && VALID_TABS.has(tabParam as TabId)) {
      return tabParam as TabId;
    }
    return "explore";
  }

  return "explore";
}

function shouldHideBottomNav(pathname: string) {
  return pathname.startsWith("/business");
}

function AppChromeInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const searchParams = useSearchParams();
  const hideNav = shouldHideBottomNav(pathname);
  const activeTab = resolveActiveTab(pathname, searchParams.get("tab"));

  const handleTabChange = useCallback(
    (tab: TabId) => {
      if (tab === "explore") {
        router.push("/");
        return;
      }
      router.push(`/?tab=${tab}`);
    },
    [router],
  );

  return (
    <>
      <AppWakeRecovery />
      <div
        className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          ...(hideNav
            ? {}
            : {
                paddingBottom:
                  "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
              }),
        }}
      >
        {!hideNav && <PwaInstallBanner />}
        <div className="min-w-0 max-w-full flex-1 overflow-x-hidden">
          {children}
        </div>
      </div>
      {!hideNav && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </>
  );
}

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          className="min-w-0 max-w-full flex-1 overflow-x-hidden"
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </div>
      }
    >
      <AppChromeInner>{children}</AppChromeInner>
    </Suspense>
  );
}
