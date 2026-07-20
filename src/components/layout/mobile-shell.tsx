"use client";

import { BottomNav } from "@/components/layout/bottom-nav";
import { ExploreScreen } from "@/components/screens/explore-screen";
import { MessagesScreen } from "@/components/screens/messages-screen";
import { MyEventsScreen } from "@/components/screens/my-events-screen";
import { ProfileScreen } from "@/components/screens/profile-screen";
import { TABS, type TabId } from "@/types/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const VALID_TABS = new Set(TABS.map((tab) => tab.id));

function getInitialTab(tabParam: string | null): TabId {
  if (tabParam && VALID_TABS.has(tabParam as TabId)) {
    return tabParam as TabId;
  }
  return "explore";
}

export function MobileShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    getInitialTab(tabParam),
  );

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);

      const params = new URLSearchParams(searchParams.toString());
      if (tab === "explore") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }

      const query = params.toString();
      router.replace(query ? `/?${query}` : "/", { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setActiveTab(getInitialTab(tabParam));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tabParam]);

  function renderActiveScreen() {
    switch (activeTab) {
      case "events":
        return <MyEventsScreen onCreateEvent={() => handleTabChange("explore")} />;
      case "messages":
        return <MessagesScreen />;
      case "profile":
        return <ProfileScreen />;
      case "explore":
      default:
        return <ExploreScreen />;
    }
  }

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-full overflow-x-hidden bg-background shadow-none sm:max-w-lg sm:shadow-[0_0_60px_-15px_rgba(15,15,17,0.12)] md:max-w-2xl lg:max-w-6xl">
      <main
        className="box-border min-w-0 w-full max-w-full overflow-x-hidden px-4 pt-6 lg:px-8 lg:pt-8"
        style={{
          paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
          paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
          paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
        }}
      >
        <div className="screen-enter min-w-0 w-full max-w-full">
          {renderActiveScreen()}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
