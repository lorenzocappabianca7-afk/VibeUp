"use client";

import { MOCK_BUSINESS_NOTIFICATIONS } from "@/lib/mock/business-inbox";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface InboxBadgeContextValue {
  hasUnreadMessages: boolean;
  hasUnreadNotifications: boolean;
  markMessagesSeen: () => void;
  markNotificationsSeen: () => void;
  /** Keep the Messaggi tab badge in sync with live chat unread counts. */
  syncUnreadMessages: (count: number) => void;
}

const InboxBadgeContext = createContext<InboxBadgeContextValue | null>(null);

const INITIAL_UNREAD_NOTIFICATIONS = MOCK_BUSINESS_NOTIFICATIONS.filter(
  (item) => item.unread,
).length;

export function InboxBadgeProvider({ children }: { children: ReactNode }) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(
    INITIAL_UNREAD_NOTIFICATIONS,
  );

  const markMessagesSeen = useCallback(() => {
    setUnreadMessages(0);
  }, []);

  const markNotificationsSeen = useCallback(() => {
    setUnreadNotifications(0);
  }, []);

  const syncUnreadMessages = useCallback((count: number) => {
    setUnreadMessages(Math.max(0, count));
  }, []);

  const value = useMemo(
    () => ({
      hasUnreadMessages: unreadMessages > 0,
      hasUnreadNotifications: unreadNotifications > 0,
      markMessagesSeen,
      markNotificationsSeen,
      syncUnreadMessages,
    }),
    [
      unreadMessages,
      unreadNotifications,
      markMessagesSeen,
      markNotificationsSeen,
      syncUnreadMessages,
    ],
  );

  return (
    <InboxBadgeContext.Provider value={value}>
      {children}
    </InboxBadgeContext.Provider>
  );
}

export function useInboxBadge() {
  const context = useContext(InboxBadgeContext);
  if (!context) {
    throw new Error("useInboxBadge must be used within InboxBadgeProvider");
  }
  return context;
}
