"use client";

import { useAppState } from "@/context/app-state-context";
import { isBodyScrollLocked } from "@/lib/body-scroll-lock";
import { assignHomeHref } from "@/lib/home-navigation";
import { recoverInteractiveSession } from "@/lib/session-health";
import {
  ALL_TAB_IDS,
  BUSINESS_TABS,
  CONSUMER_TABS,
  type TabId,
} from "@/types/navigation";
import { usePathname, useSearchParams } from "next/navigation";
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

function tabParamFromHref(href: string): string | null {
  if (!href.startsWith("/?")) return null;
  return new URLSearchParams(href.slice(2)).get("tab");
}

/**
 * Sync URL search `tab` into state without a Next.js RSC navigation.
 * `router.replace("/?tab=…")` on an already-mounted home shell can fail on
 * flaky networks and Safari then shows “This page couldn’t be loaded”.
 */
function replaceHomeTabUrl(href: string) {
  if (typeof window === "undefined") return;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === href || (href === "/" && window.location.pathname === "/" && !window.location.search)) {
    return;
  }
  window.history.replaceState(window.history.state, "", href);
}

/** Isolated so useSearchParams suspension never blanks the whole app shell. */
function TabParamSync({ onTab }: { onTab: (tab: string | null) => void }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  useEffect(() => {
    // Prefer the live address bar. After home tab switches we use
    // history.replaceState — Next's useSearchParams can stay stale and would
    // otherwise overwrite the tab back to explore/null.
    const fromLocation = new URLSearchParams(window.location.search).get("tab");
    onTab(fromLocation);
  }, [onTab, tab]);

  // Back/forward after history.replaceState (home tab switches).
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      onTab(params.get("tab"));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [onTab]);

  return null;
}

export function TabNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
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

    const href = buildTabHref(activeTab, isBusinessUser);
    const nextParam = tabParamFromHref(href);
    replaceHomeTabUrl(href);
    startTransition(() => {
      setTabParam(nextParam);
    });
  }, [activeTab, candidate, isBusinessUser, onHome]);

  // Restore scroll per tab after the panel is visible.
  useEffect(() => {
    if (previousTabRef.current === activeTab) return;

    // Under body scroll lock, scrollY is often 0 / wrong — keep last good value.
    if (!isBodyScrollLocked()) {
      scrollByTabRef.current[previousTabRef.current] = window.scrollY;
    }
    previousTabRef.current = activeTab;

    // Drop orphan overlay locks when leaving a tab (search/filters/modals).
    recoverInteractiveSession();

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

      const href = buildTabHref(tab, isBusinessUser);

      // Optimistic UI: swap panel immediately.
      setOptimisticTab(tab);

      if (onHome) {
        // Same document — update query locally. Avoid router.replace RSC fetch
        // (flaky mobile networks → Safari “page couldn’t be loaded”).
        setTabParam(tabParamFromHref(href));
        replaceHomeTabUrl(href);
        return;
      }

      // From /location|/event|/service etc.: soft router.push also RSC-fetches
      // and is the usual path to Safari’s “This page couldn’t load” after a
      // long session. Full assign is reliable; splash is session-skipped.
      skipNextScrollRestoreRef.current = true;
      assignHomeHref(href);
    },
    [activeTab, isBusinessUser, onHome],
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
