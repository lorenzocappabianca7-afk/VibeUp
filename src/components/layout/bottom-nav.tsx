"use client";

import { useInboxBadge } from "@/context/inbox-badge-context";
import { cn, APP_SHELL_WIDTH_CLASS } from "@/lib/utils";
import {
  BUSINESS_TABS,
  CONSUMER_TABS,
  type TabId,
  type TabItem,
} from "@/types/navigation";
import {
  Bell,
  Calendar,
  CalendarDays,
  MessageCircle,
  Search,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TAB_ICONS: Record<TabId, LucideIcon> = {
  explore: Search,
  events: Calendar,
  messages: MessageCircle,
  notifications: Bell,
  calendar: CalendarDays,
  profile: User,
};

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  variant?: "consumer" | "business";
}

export function BottomNav({
  activeTab,
  onTabChange,
  variant = "consumer",
}: BottomNavProps) {
  const { hasUnreadMessages, hasUnreadNotifications } = useInboxBadge();
  const tabs: TabItem[] =
    variant === "business" ? BUSINESS_TABS : CONSUMER_TABS;

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mx-auto border-t border-primary-black/15 bg-background lg:rounded-t-3xl lg:border-x",
        APP_SHELL_WIDTH_CLASS,
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
      aria-label="Navigazione principale"
    >
      <ul className="flex items-stretch justify-around px-1 pt-1.5 pb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = TAB_ICONS[tab.id];
          const showBadge =
            (tab.id === "messages" && hasUnreadMessages) ||
            (tab.id === "notifications" && hasUnreadNotifications);

          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={isActive ? "page" : undefined}
                aria-label={
                  showBadge
                    ? `${tab.label}, nuove notifiche`
                    : tab.label
                }
                className={cn(
                  "flex w-full min-w-0 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 transition-colors duration-100 sm:gap-1 sm:px-1 sm:py-2",
                  isActive
                    ? "bg-primary-black/[0.03] text-primary-black"
                    : "text-primary-black/45 hover:text-primary-black/70",
                )}
              >
                <span className="relative inline-flex">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors duration-150",
                      isActive ? "text-primary-black" : "text-current",
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                    aria-hidden
                  />
                  {showBadge && (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#FF3B30] ring-2 ring-background"
                      aria-hidden
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "max-w-full truncate px-0.5 text-[9px] font-medium leading-none transition-colors duration-150 sm:text-[10px] sm:leading-tight",
                    isActive ? "text-primary-black" : "text-current",
                  )}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span
                    className={cn(
                      "h-0.5 w-4 rounded-full",
                      tab.id === "messages" ||
                        tab.id === "profile" ||
                        tab.id === "notifications"
                        ? "bg-brand-pink"
                        : "bg-brand-teal",
                    )}
                    aria-hidden
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
