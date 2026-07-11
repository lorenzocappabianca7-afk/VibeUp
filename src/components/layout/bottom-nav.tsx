"use client";

import { cn } from "@/lib/utils";
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
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-primary-black/15 bg-background lg:max-w-xl lg:rounded-t-3xl lg:border-x"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Navigazione principale"
    >
      <ul className="flex items-stretch justify-around px-2 pt-2 pb-2">
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
                  "flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors duration-150",
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
                    "text-[10px] font-medium leading-tight transition-colors duration-150",
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
