"use client";

import { useAppState } from "@/context/app-state-context";
import { isBodyScrollLocked } from "@/lib/body-scroll-lock";
import {
  ALL_TAB_IDS,
  BUSINESS_TABS,
  CONSUMER_TABS,
  type TabId,
} from "@/types/navigation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  startTransition,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface TabNavigationContextValue {
  activeTab: TabId;
  setTab: (tab: TabId) => void;
  isBusinessUser: boolean;
}

const TabNavigationContext = createContext<TabNavigationContextValue | null>(
  null,
);

const TAB_NAVIGATION_FALLBACK: TabNavigationContextValue = {
  activeTab: "explore",
  setTab: () => undefined,
  isBusinessUser: false,
};

/** Safe provider for Suspense fallbacks / first paint before searchParams resolve */
export function TabNavigationFallbackProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TabNavigationContext.Provider value={TAB_NAVIGATION_FALLBACK}>
      {children}
    </TabNavigationContext.Provider>
  );
}

function resolveTabFromLocation(
  pathname: string,
  tabParam: string | null,
  isBusinessUser: boolean,
): TabId {
  if (pathname.startsWith("/event")) {
    return isBusinessUser ? "calendar" : "events";
  }
  if (pathname.startsWith("/location") || pathname.startsWith("/service")) {
    return isBusinessUser ? "profile" : "explore";
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

function buildTabHref(tab: TabId, isBusinessUser: boolean) {
  const isDefault =
    (isBusinessUser && tab === "notifications") ||
    (!isBusinessUser && tab === "explore");
  return isDefault ? "/" : `/?tab=${tab}`;
}

function getAllowedTabs(isBusinessUser: boolean): Set<TabId> {
  return new Set(
    (isBusinessUser ? BUSINESS_TABS : CONSUMER_TABS).map((tab) => tab.id),
  );
}

/** Isolated so useSearchParams suspension never blanks the whole app shell. */
function TabParamSync({ onTab }: { onTab: (tab: string | null) => void }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  useEffect(() => {
    onTab(tab);
  }, [onTab, tab]);

  return null;
}

export function TabNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { isBusinessUser } = useAppState();
  const [tabParam, setTabParam] = useState<string | null>(null);

  const urlTab = useMemo(
    () => resolveTabFromLocation(pathname, tabParam, isBusinessUser),
    [pathname, tabParam, isBusinessUser],
  );

  const [optimisticTab, setOptimisticTab] = useState<TabId | null>(null);
  const [prevUrlTab, setPrevUrlTab] = useState(urlTab);
  const scrollByTabRef = useRef<Partial<Record<TabId, number>>>({});
  const previousTabRef = useRef<TabId>(urlTab);
  const skipNextScrollRestoreRef = useRef(false);

  // When the URL changes (back/forward), drop optimistic override during render.
  if (urlTab !== prevUrlTab) {
    setPrevUrlTab(urlTab);
    setOptimisticTab(null);
  }

  const allowed = getAllowedTabs(isBusinessUser);
  const fallback: TabId = isBusinessUser ? "notifications" : "explore";
  const candidate = optimisticTab ?? urlTab;
  const activeTab = allowed.has(candidate) ? candidate : fallback;
  const onHome = pathname === "/" || pathname === "";

  // Keep the address bar aligned if mode switch invalidates the current tab.
  useEffect(() => {
    if (!onHome) return;
    if (candidate === activeTab) return;

    startTransition(() => {
      router.replace(buildTabHref(activeTab, isBusinessUser), {
        scroll: false,
      });
    });
  }, [activeTab, candidate, isBusinessUser, onHome, router]);

  // Restore scroll per tab after the panel is visible.
  useEffect(() => {
    if (previousTabRef.current === activeTab) return;

    // Under body scroll lock, scrollY is often 0 / wrong — keep last good value.
    if (!isBodyScrollLocked()) {
      scrollByTabRef.current[previousTabRef.current] = window.scrollY;
    }
    previousTabRef.current = activeTab;

    if (skipNextScrollRestoreRef.current) {
      skipNextScrollRestoreRef.current = false;
      return;
    }

    const nextY = scrollByTabRef.current[activeTab] ?? 0;
    window.scrollTo({ top: nextY, left: 0, behavior: "auto" });
  }, [activeTab]);

  const setTab = useCallback(
    (tab: TabId) => {
      if (tab === activeTab && onHome) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }

      // Optimistic UI: swap panel immediately, sync URL afterwards.
      setOptimisticTab(tab);

      const href = buildTabHref(tab, isBusinessUser);

      startTransition(() => {
        if (onHome) {
          router.replace(href, { scroll: false });
        } else {
          skipNextScrollRestoreRef.current = true;
          router.push(href, { scroll: false });
        }
      });
    },
    [activeTab, isBusinessUser, onHome, router],
  );

  const value = useMemo(
    () => ({
      activeTab,
      setTab,
      isBusinessUser,
    }),
    [activeTab, setTab, isBusinessUser],
  );

  return (
    <TabNavigationContext.Provider value={value}>
      <Suspense fallback={null}>
        <TabParamSync onTab={setTabParam} />
      </Suspense>
      {children}
    </TabNavigationContext.Provider>
  );
}

export function useTabNavigation() {
  const context = useContext(TabNavigationContext);
  if (!context) {
    throw new Error(
      "useTabNavigation must be used within TabNavigationProvider",
    );
  }
  return context;
}
