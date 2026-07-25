"use client";

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
  hasUnreadProfileComms: boolean;
  markMessagesSeen: () => void;
  markNotificationsSeen: () => void;
  markProfileCommsSeen: () => void;
  /** Keep the Messaggi tab badge in sync with live chat unread counts. */
  syncUnreadMessages: (count: number) => void;
  /** Keep business Notifiche badge in sync with pending availability requests. */
  syncUnreadNotifications: (count: number) => void;
  /** Keep consumer Profile tab badge in sync with VibeUp communications. */
  syncUnreadProfileComms: (count: number) => void;
}

const InboxBadgeContext = createContext<InboxBadgeContextValue | null>(null);

export function InboxBadgeProvider({ children }: { children: ReactNode }) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadProfileComms, setUnreadProfileComms] = useState(0);

  const markMessagesSeen = useCallback(() => {
    setUnreadMessages(0);
  }, []);

  const markNotificationsSeen = useCallback(() => {
    setUnreadNotifications(0);
  }, []);

  const markProfileCommsSeen = useCallback(() => {
    setUnreadProfileComms(0);
  }, []);

  const syncUnreadMessages = useCallback((count: number) => {
    setUnreadMessages(Math.max(0, count));
  }, []);

  const syncUnreadNotifications = useCallback((count: number) => {
    setUnreadNotifications(Math.max(0, count));
  }, []);

  const syncUnreadProfileComms = useCallback((count: number) => {
    setUnreadProfileComms(Math.max(0, count));
  }, []);

  const value = useMemo(
    () => ({
      hasUnreadMessages: unreadMessages > 0,
      hasUnreadNotifications: unreadNotifications > 0,
      hasUnreadProfileComms: unreadProfileComms > 0,
      markMessagesSeen,
      markNotificationsSeen,
      markProfileCommsSeen,
      syncUnreadMessages,
      syncUnreadNotifications,
      syncUnreadProfileComms,
    }),
    [
      unreadMessages,
      unreadNotifications,
      unreadProfileComms,
      markMessagesSeen,
      markNotificationsSeen,
      markProfileCommsSeen,
      syncUnreadMessages,
      syncUnreadNotifications,
      syncUnreadProfileComms,
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
