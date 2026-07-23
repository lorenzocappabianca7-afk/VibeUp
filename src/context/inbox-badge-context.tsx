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

/** Seed inbox items used by Messaggi until live chat is wired. */
export const INBOX_MESSAGE_PREVIEW = [
  {
    id: "msg-villa-aurora",
    sender: "Villa Aurora",
    message: "Ciao! Abbiamo disponibilita' per la data richiesta.",
    time: "2 min fa",
    unread: true,
  },
  {
    id: "msg-dj-marco",
    sender: "DJ Marco Beats",
    message: "Posso preparare una playlist per compleanno o laurea.",
    time: "1 ora fa",
    unread: true,
  },
  {
    id: "msg-ai",
    sender: "Assistente IA VibeUp",
    message: "Ho trovato 3 servizi esterni adatti al tuo evento.",
    time: "Ieri",
    unread: false,
  },
] as const;

interface InboxBadgeContextValue {
  hasUnreadMessages: boolean;
  hasUnreadNotifications: boolean;
  markMessagesSeen: () => void;
  markNotificationsSeen: () => void;
}

const InboxBadgeContext = createContext<InboxBadgeContextValue | null>(null);

const INITIAL_UNREAD_MESSAGES = INBOX_MESSAGE_PREVIEW.filter(
  (item) => item.unread,
).length;

const INITIAL_UNREAD_NOTIFICATIONS = MOCK_BUSINESS_NOTIFICATIONS.filter(
  (item) => item.unread,
).length;

export function InboxBadgeProvider({ children }: { children: ReactNode }) {
  const [unreadMessages, setUnreadMessages] = useState(INITIAL_UNREAD_MESSAGES);
  const [unreadNotifications, setUnreadNotifications] = useState(
    INITIAL_UNREAD_NOTIFICATIONS,
  );

  const markMessagesSeen = useCallback(() => {
    setUnreadMessages(0);
  }, []);

  const markNotificationsSeen = useCallback(() => {
    setUnreadNotifications(0);
  }, []);

  const value = useMemo(
    () => ({
      hasUnreadMessages: unreadMessages > 0,
      hasUnreadNotifications: unreadNotifications > 0,
      markMessagesSeen,
      markNotificationsSeen,
    }),
    [
      unreadMessages,
      unreadNotifications,
      markMessagesSeen,
      markNotificationsSeen,
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
