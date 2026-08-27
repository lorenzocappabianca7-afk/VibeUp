"use client";

import { BusinessCalendarScreen } from "@/components/screens/business-calendar-screen";
import { BusinessFesteScreen } from "@/components/screens/business-feste-screen";
import { BusinessNotificationsScreen } from "@/components/screens/business-notifications-screen";
import { ExploreScreen } from "@/components/screens/explore-screen";
import { HomeScreen } from "@/components/screens/home-screen";
import { MessagesScreen } from "@/components/screens/messages-screen";
import { MyEventsScreen } from "@/components/screens/my-events-screen";
import { ProfileScreen } from "@/components/screens/profile-screen";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";
import type { TabId } from "@/types/navigation";
import { useState } from "react";

function TabPanel({
  tab,
  activeTab,
  visited,
  children,
}: {
  tab: TabId;
  activeTab: TabId;
  visited: boolean;
  children: React.ReactNode;
}) {
  if (!visited) return null;

  const isActive = activeTab === tab;

  return (
    <div
      className={cn(
        "min-w-0 w-full max-w-full overflow-x-clip",
        isActive ? "relative" : "hidden",
      )}
      aria-hidden={!isActive}
    >
      {children}
    </div>
  );
}

export function MobileShell() {
  const { activeTab, setTab, isBusinessUser } = useTabNavigation();
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    () => new Set<TabId>([activeTab]),
  );
  const [mode, setMode] = useState(isBusinessUser);

  // Adjust visited panels during render (no effect cascade / no enter animation).
  if (mode !== isBusinessUser) {
    setMode(isBusinessUser);
    setVisitedTabs(new Set<TabId>([activeTab]));
  } else if (!visitedTabs.has(activeTab)) {
    const next = new Set(visitedTabs);
    next.add(activeTab);
    setVisitedTabs(next);
  }

  return (
    <div
      className={cn(
        "relative mx-auto box-border min-h-dvh overflow-x-clip bg-background shadow-none sm:shadow-[0_0_60px_-15px_rgba(0,0,0,0.55)]",
        APP_SHELL_WIDTH_CLASS,
      )}
      style={{ backgroundColor: "#0F1115" }}
    >
      <main
        className="box-border min-w-0 w-full max-w-full overflow-x-clip pt-6 lg:pt-8"
        style={{
          paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
          paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
        }}
      >
        <div className="relative min-w-0 w-full max-w-full overflow-x-clip">
          {isBusinessUser ? (
            <>
              <TabPanel
                tab="notifications"
                activeTab={activeTab}
                visited={visitedTabs.has("notifications")}
              >
                <BusinessNotificationsScreen />
              </TabPanel>
              <TabPanel
                tab="calendar"
                activeTab={activeTab}
                visited={visitedTabs.has("calendar")}
              >
                <BusinessCalendarScreen />
              </TabPanel>
              <TabPanel
                tab="feste"
                activeTab={activeTab}
                visited={visitedTabs.has("feste")}
              >
                <BusinessFesteScreen />
              </TabPanel>
              <TabPanel
                tab="profile"
                activeTab={activeTab}
                visited={visitedTabs.has("profile")}
              >
                <ProfileScreen isActive={activeTab === "profile"} />
              </TabPanel>
            </>
          ) : (
            <>
              <TabPanel
                tab="explore"
                activeTab={activeTab}
                visited={visitedTabs.has("explore")}
              >
                <ExploreScreen />
              </TabPanel>
              <TabPanel
                tab="home"
                activeTab={activeTab}
                visited={visitedTabs.has("home")}
              >
                <HomeScreen />
              </TabPanel>
              <TabPanel
                tab="events"
                activeTab={activeTab}
                visited={visitedTabs.has("events")}
              >
                <MyEventsScreen
                  isActive={activeTab === "events"}
                  onCreateEvent={() => setTab("home")}
                />
              </TabPanel>
              <TabPanel
                tab="messages"
                activeTab={activeTab}
                visited={visitedTabs.has("messages")}
              >
                <MessagesScreen isActive={activeTab === "messages"} />
              </TabPanel>
              <TabPanel
                tab="profile"
                activeTab={activeTab}
                visited={visitedTabs.has("profile")}
              >
                <ProfileScreen isActive={activeTab === "profile"} />
              </TabPanel>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
