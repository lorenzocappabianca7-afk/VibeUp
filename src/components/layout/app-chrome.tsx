"use client";

import { BottomNav } from "@/components/layout/bottom-nav";
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
      <div
        className="min-w-0 max-w-full flex-1 overflow-x-hidden"
        style={
          hideNav
            ? undefined
            : {
                paddingBottom:
                  "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
              }
        }
      >
        {children}
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
        <div className="min-w-0 max-w-full flex-1 overflow-x-hidden">
          {children}
        </div>
      }
    >
      <AppChromeInner>{children}</AppChromeInner>
    </Suspense>
  );
}
