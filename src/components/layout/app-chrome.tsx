"use client";

import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { AppWakeRecovery } from "@/components/pwa/app-wake-recovery";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
import { useAppState } from "@/context/app-state-context";
import { ALL_TAB_IDS, type TabId } from "@/types/navigation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, startTransition, useCallback, type ReactNode } from "react";

function resolveActiveTab(
  pathname: string,
  tabParam: string | null,
  isBusinessUser: boolean,
): TabId {
  if (pathname.startsWith("/event")) return "events";
  if (pathname.startsWith("/location") || pathname.startsWith("/service")) {
    return "explore";
  }

  if (pathname === "/" || pathname === "") {
    if (tabParam && ALL_TAB_IDS.has(tabParam as TabId)) {
      const tab = tabParam as TabId;
      if (isBusinessUser) {
        if (
          tab === "notifications" ||
          tab === "calendar" ||
          tab === "profile"
        ) {
          return tab;
        }
        return "notifications";
      }
      if (
        tab === "explore" ||
        tab === "events" ||
        tab === "messages" ||
        tab === "profile"
      ) {
        return tab;
      }
      return "explore";
    }
    return isBusinessUser ? "notifications" : "explore";
  }

  return isBusinessUser ? "notifications" : "explore";
}

function shouldHideBottomNav(pathname: string) {
  return pathname.startsWith("/business");
}

function AppChromeInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isBusinessUser } = useAppState();
  const hideNav = shouldHideBottomNav(pathname);
  const activeTab = resolveActiveTab(
    pathname,
    searchParams.get("tab"),
    isBusinessUser,
  );

  const handleTabChange = useCallback(
    (tab: TabId) => {
      startTransition(() => {
        const isDefault =
          (isBusinessUser && tab === "notifications") ||
          (!isBusinessUser && tab === "explore");
        if (isDefault) {
          router.push("/");
          return;
        }
        router.push(`/?tab=${tab}`);
      });
    },
    [isBusinessUser, router],
  );

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
        <div className="min-w-0 max-w-full flex-1 overflow-x-hidden">
          {children}
        </div>
        <Footer withNavOffset={!hideNav} />
      </div>
      {!hideNav && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          variant={isBusinessUser ? "business" : "consumer"}
        />
      )}
    </>
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
