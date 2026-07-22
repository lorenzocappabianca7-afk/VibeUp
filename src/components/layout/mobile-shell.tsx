"use client";

import { BusinessCalendarScreen } from "@/components/screens/business-calendar-screen";
import { BusinessNotificationsScreen } from "@/components/screens/business-notifications-screen";
import { ExploreScreen } from "@/components/screens/explore-screen";
import { MessagesScreen } from "@/components/screens/messages-screen";
import { MyEventsScreen } from "@/components/screens/my-events-screen";
import { ProfileScreen } from "@/components/screens/profile-screen";
import { useAppState } from "@/context/app-state-context";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";
import {
  ALL_TAB_IDS,
  BUSINESS_TABS,
  CONSUMER_TABS,
  type TabId,
} from "@/types/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";

function getInitialTab(
  tabParam: string | null,
  isBusinessUser: boolean,
): TabId {
  if (tabParam && ALL_TAB_IDS.has(tabParam as TabId)) {
    const tab = tabParam as TabId;
    if (isBusinessUser) {
      if (tab === "notifications" || tab === "calendar" || tab === "profile") {
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

export function MobileShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { isBusinessUser } = useAppState();
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    getInitialTab(tabParam, isBusinessUser),
  );
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    () => new Set<TabId>([getInitialTab(tabParam, isBusinessUser)]),
  );

  const handleTabChange = useCallback(
    (tab: TabId) => {
      startTransition(() => {
        setActiveTab(tab);
        setVisitedTabs((current) => {
          if (current.has(tab)) return current;
          const next = new Set(current);
          next.add(tab);
          return next;
        });
      });

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });

      const params = new URLSearchParams(searchParams.toString());
      const isDefault =
        (isBusinessUser && tab === "notifications") ||
        (!isBusinessUser && tab === "explore");

      if (isDefault) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }

      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `/?${query}` : "/", { scroll: false });
      });
    },
    [isBusinessUser, router, searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const nextTab = getInitialTab(tabParam, isBusinessUser);
      setActiveTab(nextTab);
      setVisitedTabs((current) => {
        if (current.has(nextTab)) return current;
        const next = new Set(current);
        next.add(nextTab);
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [tabParam, isBusinessUser]);

  useEffect(() => {
    const allowed = new Set(
      (isBusinessUser ? BUSINESS_TABS : CONSUMER_TABS).map((tab) => tab.id),
    );
    if (!allowed.has(activeTab)) {
      handleTabChange(isBusinessUser ? "notifications" : "explore");
    }
  }, [activeTab, handleTabChange, isBusinessUser]);

  return (
    <div
      className={cn(
        "relative mx-auto box-border min-h-dvh overflow-x-hidden bg-background shadow-none sm:shadow-[0_0_60px_-15px_rgba(15,15,17,0.12)]",
        APP_SHELL_WIDTH_CLASS,
      )}
    >
      <main
        className="box-border min-w-0 w-full max-w-full overflow-x-hidden pt-6 lg:pt-8"
        style={{
          paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
          paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
        }}
      >
        <div className="relative min-w-0 w-full max-w-full overflow-x-hidden">
          {isBusinessUser ? (
            <>
              {visitedTabs.has("notifications") && (
                <div
                  className={cn(
                    "min-w-0 w-full max-w-full overflow-x-hidden",
                    activeTab === "notifications" ? "screen-enter" : "hidden",
                  )}
                  aria-hidden={activeTab !== "notifications"}
                >
                  <BusinessNotificationsScreen />
                </div>
              )}
              {visitedTabs.has("calendar") && (
                <div
                  className={cn(
                    "min-w-0 w-full max-w-full overflow-x-hidden",
                    activeTab === "calendar" ? "screen-enter" : "hidden",
                  )}
                  aria-hidden={activeTab !== "calendar"}
                >
                  <BusinessCalendarScreen />
                </div>
              )}
              {visitedTabs.has("profile") && (
                <div
                  className={cn(
                    "min-w-0 w-full max-w-full overflow-x-hidden",
                    activeTab === "profile" ? "screen-enter" : "hidden",
                  )}
                  aria-hidden={activeTab !== "profile"}
                >
                  <ProfileScreen />
                </div>
              )}
            </>
          ) : (
            <>
              {visitedTabs.has("explore") && (
                <div
                  className={cn(
                    "min-w-0 w-full max-w-full overflow-x-hidden",
                    activeTab === "explore" ? "screen-enter" : "hidden",
                  )}
                  aria-hidden={activeTab !== "explore"}
                >
                  <ExploreScreen />
                </div>
              )}
              {visitedTabs.has("events") && (
                <div
                  className={cn(
                    "min-w-0 w-full max-w-full overflow-x-hidden",
                    activeTab === "events" ? "screen-enter" : "hidden",
                  )}
                  aria-hidden={activeTab !== "events"}
                >
                  <MyEventsScreen
                    isActive={activeTab === "events"}
                    onCreateEvent={() => handleTabChange("explore")}
                  />
                </div>
              )}
              {visitedTabs.has("messages") && (
                <div
                  className={cn(
                    "min-w-0 w-full max-w-full overflow-x-hidden",
                    activeTab === "messages" ? "screen-enter" : "hidden",
                  )}
                  aria-hidden={activeTab !== "messages"}
                >
                  <MessagesScreen />
                </div>
              )}
              {visitedTabs.has("profile") && (
                <div
                  className={cn(
                    "min-w-0 w-full max-w-full overflow-x-hidden",
                    activeTab === "profile" ? "screen-enter" : "hidden",
                  )}
                  aria-hidden={activeTab !== "profile"}
                >
                  <ProfileScreen />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
