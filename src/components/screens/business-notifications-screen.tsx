"use client";

import {
  MOCK_BUSINESS_NOTIFICATIONS,
  type BusinessNotification,
} from "@/lib/mock/business-inbox";
import { useAppState } from "@/context/app-state-context";
import { useInboxBadge } from "@/context/inbox-badge-context";
import {
  Bell,
  CalendarCheck2,
  CreditCard,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { memo, useEffect } from "react";

const KIND_ICON = {
  booking: CalendarCheck2,
  payment: CreditCard,
  message: MessageCircle,
  system: Sparkles,
} as const;

function NotificationRow({ item }: { item: BusinessNotification }) {
  const Icon = KIND_ICON[item.kind];

  return (
    <li
      className={`flex gap-3 rounded-2xl border p-4 transition-colors ${
        item.unread
          ? "border-brand-teal/20 bg-brand-teal/5"
          : "border-primary-black/8 bg-background"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          item.unread
            ? "bg-brand-teal/15 text-brand-teal"
            : "bg-primary-black/5 text-primary-black/50"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-primary-black">
            {item.title}
          </p>
          {item.unread && (
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-pink"
              aria-label="Non letta"
            />
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-primary-black/60">
          {item.body}
        </p>
        <p className="mt-1 text-xs text-primary-black/40">{item.time}</p>
      </div>
    </li>
  );
}

export const BusinessNotificationsScreen = memo(
  function BusinessNotificationsScreen() {
    const { businessProfile, currentUser } = useAppState();
    const { hasUnreadNotifications, markNotificationsSeen } = useInboxBadge();

    useEffect(() => {
      markNotificationsSeen();
    }, [markNotificationsSeen]);

    const locationName =
      businessProfile?.businessName ?? currentUser.name ?? "la tua location";

    return (
      <div className="min-w-0 space-y-6">
        <header>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary-black">Notifiche</h1>
            <span className="rounded-md bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Pro
            </span>
          </div>
          <p className="mt-1 text-sm text-primary-black/60">
            Aggiornamenti su prenotazioni, pagamenti e messaggi per{" "}
            <span className="font-medium text-primary-black">{locationName}</span>
          </p>
          {hasUnreadNotifications && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-pink/15 px-2.5 py-1 text-xs font-medium text-brand-pink">
              <Bell className="h-3.5 w-3.5" aria-hidden />
              Nuove notifiche
            </p>
          )}
        </header>

        <ul className="space-y-2">
          {MOCK_BUSINESS_NOTIFICATIONS.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
        </ul>
      </div>
    );
  },
);
