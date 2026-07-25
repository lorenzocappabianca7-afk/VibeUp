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
  const {
    hasUnreadMessages,
    hasUnreadNotifications,
    hasUnreadProfileComms,
  } = useInboxBadge();
  const tabs: TabItem[] =
    variant === "business" ? BUSINESS_TABS : CONSUMER_TABS;

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mx-auto px-2 pb-2 pt-1 sm:px-3",
        APP_SHELL_WIDTH_CLASS,
      )}
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(0.5rem, env(safe-area-inset-left, 0px))",
        paddingRight: "max(0.5rem, env(safe-area-inset-right, 0px))",
      }}
      aria-label="Navigazione principale"
    >
      <ul className="flex items-stretch justify-around rounded-[1.35rem] border border-white/10 bg-surface-2/95 px-1 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = TAB_ICONS[tab.id];
          const showBadge =
            (tab.id === "messages" && hasUnreadMessages) ||
            (tab.id === "notifications" && hasUnreadNotifications) ||
            (tab.id === "profile" &&
              variant === "consumer" &&
              hasUnreadProfileComms);

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
                  "flex w-full min-w-0 flex-col items-center gap-0.5 rounded-2xl px-0.5 py-1.5 transition-colors duration-150 sm:gap-1 sm:px-1 sm:py-2",
                  isActive
                    ? "bg-white/12 text-primary-black"
                    : "text-primary-black/45 hover:text-primary-black/75",
                )}
              >
                <span className="relative inline-flex">
                  <Icon
                    className="h-5 w-5 text-current"
                    strokeWidth={isActive ? 2.4 : 2}
                    aria-hidden
                  />
                  {showBadge && (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand-pink ring-2 ring-surface-2"
                      aria-hidden
                    />
                  )}
                </span>
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium leading-none sm:text-[10px] sm:leading-tight">
                  {tab.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
