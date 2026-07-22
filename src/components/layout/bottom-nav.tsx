"use client";

import { cn, APP_SHELL_WIDTH_CLASS } from "@/lib/utils";
import { TABS, type TabId } from "@/types/navigation";
import { Calendar, MessageCircle, Search, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TAB_ICONS: Record<TabId, LucideIcon> = {
  explore: Search,
  events: Calendar,
  messages: MessageCircle,
  profile: User,
};

const ACTIVE_COLORS: Record<TabId, string> = {
  explore: "text-primary-black",
  events: "text-primary-black",
  messages: "text-primary-black",
  profile: "text-primary-black",
};

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
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
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = TAB_ICONS[tab.id];

          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "touch-feedback flex w-full min-w-0 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 sm:gap-1 sm:px-1 sm:py-2",
                  isActive
                    ? `${ACTIVE_COLORS[tab.id]} bg-primary-black/[0.03]`
                    : "text-primary-black/45 hover:text-primary-black/70",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors duration-150",
                    isActive ? ACTIVE_COLORS[tab.id] : "text-current",
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden
                />
                <span
                  className={cn(
                    "max-w-full truncate px-0.5 text-[9px] font-medium leading-none transition-colors duration-150 sm:text-[10px] sm:leading-tight",
                    isActive ? ACTIVE_COLORS[tab.id] : "text-current",
                  )}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span
                    className={cn(
                      "h-0.5 w-4 rounded-full",
                      tab.id === "messages" || tab.id === "profile"
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
