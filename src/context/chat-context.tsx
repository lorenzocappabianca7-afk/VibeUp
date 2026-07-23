"use client";

import {
  notifyNewChatMessage,
} from "@/lib/browser-notifications";
import { useAppState } from "@/context/app-state-context";
import { useInboxBadge } from "@/context/inbox-badge-context";
import { normalizeUserSettings } from "@/types/user-settings";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ChatPeerKind = "vendor" | "ai";

/** WhatsApp-like receipt: sent → delivered → read */
export type ChatDeliveryStatus = "sent" | "delivered" | "read";

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: "me" | "them";
  body: string;
  createdAt: string;
  /** Only meaningful for outgoing (`me`) messages. */
  status?: ChatDeliveryStatus;
}

export interface ChatConversation {
  id: string;
  title: string;
  preview: string;
  kind: ChatPeerKind;
  updatedAt: string;
  unreadCount: number;
}

interface ChatContextValue {
  conversations: ChatConversation[];
  getMessages: (conversationId: string) => ChatMessage[];
  openConversationId: string | null;
  openConversation: (id: string) => void;
  closeConversation: () => void;
  sendMessage: (conversationId: string, body: string) => void;
  markAllConversationsRead: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

const STORAGE_KEY_PREFIX = "vibeup-chat-v1";
const LEGACY_STORAGE_KEY = "vibeup-chat-v1";
const MAX_MESSAGES_PER_THREAD = 80;

function chatStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

const SEED_CONVERSATIONS: ChatConversation[] = [
  {
    id: "msg-villa-aurora",
    title: "Villa Aurora",
    preview: "Ciao! Abbiamo disponibilità per la data richiesta.",
    kind: "vendor",
    updatedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    unreadCount: 1,
  },
  {
    id: "msg-dj-marco",
    title: "DJ Marco Beats",
    preview: "Posso preparare una playlist per compleanno o laurea.",
    kind: "vendor",
    updatedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    unreadCount: 1,
  },
  {
    id: "msg-ai",
    title: "Assistente IA VibeUp",
    preview: "Ho trovato 3 servizi esterni adatti al tuo evento.",
    kind: "ai",
    updatedAt: new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
    unreadCount: 0,
  },
];

const SEED_MESSAGES: Record<string, ChatMessage[]> = {
  "msg-villa-aurora": [
    {
      id: "va-1",
      conversationId: "msg-villa-aurora",
      sender: "me",
      body: "Ciao! Vorrei un preventivo per sabato 18.",
      createdAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      status: "read",
    },
    {
      id: "va-2",
      conversationId: "msg-villa-aurora",
      sender: "them",
      body: "Ciao! Abbiamo disponibilità per la data richiesta.",
      createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    },
  ],
  "msg-dj-marco": [
    {
      id: "dj-1",
      conversationId: "msg-dj-marco",
      sender: "them",
      body: "Posso preparare una playlist per compleanno o laurea.",
      createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    },
  ],
  "msg-ai": [
    {
      id: "ai-1",
      conversationId: "msg-ai",
      sender: "them",
      body: "Ho trovato 3 servizi esterni adatti al tuo evento. Vuoi che te li elenchi?",
      createdAt: new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
    },
  ],
};

const AUTO_REPLIES: Record<string, string[]> = {
  "msg-villa-aurora": [
    "Perfetto, ti mando il preventivo entro oggi.",
    "Quanti ospiti prevedi circa?",
    "Sì, possiamo includere anche l'area esterna.",
  ],
  "msg-dj-marco": [
    "Ottimo, che genere preferisci per l'inizio serata?",
    "Posso portarmi anche luci LED se ti serve.",
    "Dimmi budget e orario e ti preparo un'offerta.",
  ],
  "msg-ai": [
    "Ecco tre opzioni in zona: un DJ, un fotografo e un servizio decorazioni.",
    "Posso confrontare i prezzi medi per la tua data.",
    "Se vuoi, ti aiuto a scrivere un messaggio ai fornitori.",
  ],
};

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeMessage(message: ChatMessage): ChatMessage {
  if (message.sender !== "me") return message;
  return {
    ...message,
    status: message.status ?? "read",
  };
}

function normalizeMessagesById(
  messagesById: Record<string, ChatMessage[]>,
): Record<string, ChatMessage[]> {
  const next: Record<string, ChatMessage[]> = {};
  for (const [id, list] of Object.entries(messagesById)) {
    next[id] = list.map(normalizeMessage);
  }
  return next;
}

function trimMessagesById(
  messagesById: Record<string, ChatMessage[]>,
): Record<string, ChatMessage[]> {
  const next: Record<string, ChatMessage[]> = {};
  for (const [id, list] of Object.entries(messagesById)) {
    next[id] =
      list.length > MAX_MESSAGES_PER_THREAD
        ? list.slice(-MAX_MESSAGES_PER_THREAD)
        : list;
  }
  return next;
}

function readStoredChat(userId: string): {
  conversations: ChatConversation[];
  messagesById: Record<string, ChatMessage[]>;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const scoped = window.localStorage.getItem(chatStorageKey(userId));
    const raw =
      scoped ??
      // One-time migrate legacy unscoped transcript into the active user.
      (userId ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : null);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      conversations?: ChatConversation[];
      messagesById?: Record<string, ChatMessage[]>;
    };
    if (!Array.isArray(parsed.conversations) || !parsed.messagesById) {
      return null;
    }
    if (!scoped && raw) {
      try {
        window.localStorage.setItem(chatStorageKey(userId), raw);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // ignore migrate failure
      }
    }
    return {
      conversations: parsed.conversations,
      messagesById: trimMessagesById(normalizeMessagesById(parsed.messagesById)),
    };
  } catch {
    return null;
  }
}

function writeStoredChat(
  userId: string,
  conversations: ChatConversation[],
  messagesById: Record<string, ChatMessage[]>,
) {
  if (typeof window === "undefined") return;
  const key = chatStorageKey(userId);
  const payload = JSON.stringify({
    conversations,
    messagesById: trimMessagesById(messagesById),
  });
  try {
    window.localStorage.setItem(key, payload);
  } catch {
    // Quota: drop oldest half of each thread and retry once.
    try {
      const trimmed: Record<string, ChatMessage[]> = {};
      for (const [id, list] of Object.entries(messagesById)) {
        trimmed[id] = list.slice(-Math.max(20, Math.floor(list.length / 2)));
      }
      window.localStorage.setItem(
        key,
        JSON.stringify({ conversations, messagesById: trimmed }),
      );
    } catch {
      // private mode / hard quota — keep working in memory
    }
  }
}

function formatPreviewTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "ora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min fa`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ore fa`;
  return "Ieri";
}

export function formatChatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export { formatPreviewTime };

export function ChatProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAppState();
  const { syncUnreadMessages } = useInboxBadge();
  const pushEnabled = normalizeUserSettings(currentUser.settings).notifications
    .pushEnabled;
  const userId = currentUser.id;

  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    if (typeof window === "undefined") return SEED_CONVERSATIONS;
    return readStoredChat(userId)?.conversations ?? SEED_CONVERSATIONS;
  });
  const [messagesById, setMessagesById] = useState<
    Record<string, ChatMessage[]>
  >(() => {
    if (typeof window === "undefined") return SEED_MESSAGES;
    return readStoredChat(userId)?.messagesById ?? SEED_MESSAGES;
  });
  const [openConversationId, setOpenConversationId] = useState<string | null>(
    null,
  );

  const openConversationIdRef = useRef(openConversationId);
  const pushEnabledRef = useRef(pushEnabled);
  const replyTimers = useRef<number[]>([]);
  const skipFirstPersistRef = useRef(true);
  const chatUserIdRef = useRef(userId);

  useEffect(() => {
    openConversationIdRef.current = openConversationId;
  }, [openConversationId]);

  useEffect(() => {
    pushEnabledRef.current = pushEnabled;
  }, [pushEnabled]);

  // Reload transcript when the signed-in account changes.
  useEffect(() => {
    if (chatUserIdRef.current === userId) return;
    chatUserIdRef.current = userId;
    for (const timer of replyTimers.current) {
      window.clearTimeout(timer);
    }
    replyTimers.current = [];
    skipFirstPersistRef.current = true;
    setOpenConversationId(null);
    const stored = readStoredChat(userId);
    setConversations(stored?.conversations ?? SEED_CONVERSATIONS);
    setMessagesById(stored?.messagesById ?? SEED_MESSAGES);
  }, [userId]);

  useEffect(() => {
    if (skipFirstPersistRef.current) {
      skipFirstPersistRef.current = false;
      return;
    }
    writeStoredChat(userId, conversations, messagesById);
  }, [conversations, messagesById, userId]);

  useEffect(() => {
    const total = conversations.reduce(
      (sum, item) => sum + item.unreadCount,
      0,
    );
    syncUnreadMessages(total);
  }, [conversations, syncUnreadMessages]);

  useEffect(() => {
    const timers = replyTimers.current;
    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const releaseTimer = useCallback((timer: number) => {
    replyTimers.current = replyTimers.current.filter((id) => id !== timer);
  }, []);

  const getMessages = useCallback(
    (conversationId: string) => messagesById[conversationId] ?? [],
    [messagesById],
  );

  const openConversation = useCallback((id: string) => {
    setOpenConversationId(id);
    setConversations((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, unreadCount: 0 } : item,
      ),
    );
  }, []);

  const closeConversation = useCallback(() => {
    setOpenConversationId(null);
  }, []);

  const markAllConversationsRead = useCallback(() => {
    setConversations((prev) =>
      prev.map((item) =>
        item.unreadCount === 0 ? item : { ...item, unreadCount: 0 },
      ),
    );
  }, []);

  const receiveIncoming = useCallback((conversationId: string, body: string) => {
    const createdAt = new Date().toISOString();
    const message: ChatMessage = {
      id: uid("in"),
      conversationId,
      sender: "them",
      body,
      createdAt,
    };

    let title = "Nuovo messaggio";
    setMessagesById((prev) => {
      const existing = prev[conversationId] ?? [];
      // Peer replied → they have read our outgoing messages.
      const marked = existing.map((item) =>
        item.sender === "me" && item.status !== "read"
          ? { ...item, status: "read" as const }
          : item,
      );
      const next = [...marked, message];
      return {
        ...prev,
        [conversationId]:
          next.length > MAX_MESSAGES_PER_THREAD
            ? next.slice(-MAX_MESSAGES_PER_THREAD)
            : next,
      };
    });

    setConversations((prev) => {
      const viewing = openConversationIdRef.current === conversationId;
      const next = prev
        .map((item) => {
          if (item.id !== conversationId) return item;
          title = item.title;
          return {
            ...item,
            preview: body,
            updatedAt: createdAt,
            unreadCount: viewing ? 0 : item.unreadCount + 1,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      return next;
    });

    const viewing = openConversationIdRef.current === conversationId;
    if (!viewing) {
      notifyNewChatMessage({
        pushEnabled: pushEnabledRef.current,
        title,
        body,
        tag: `vibeup-chat-${conversationId}`,
        onlyWhenHidden: false,
      });
    }
  }, []);

  const sendMessage = useCallback(
    (conversationId: string, rawBody: string) => {
      const body = rawBody.trim();
      if (!body) return;

      const createdAt = new Date().toISOString();
      const messageId = uid("out");
      const message: ChatMessage = {
        id: messageId,
        conversationId,
        sender: "me",
        body,
        createdAt,
        status: "sent",
      };

      setMessagesById((prev) => {
        const list = [...(prev[conversationId] ?? []), message];
        return {
          ...prev,
          [conversationId]:
            list.length > MAX_MESSAGES_PER_THREAD
              ? list.slice(-MAX_MESSAGES_PER_THREAD)
              : list,
        };
      });

      setConversations((prev) =>
        prev
          .map((item) =>
            item.id === conversationId
              ? {
                  ...item,
                  preview: body,
                  updatedAt: createdAt,
                  unreadCount: 0,
                }
              : item,
          )
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          ),
      );

      const deliveredTimer = window.setTimeout(() => {
        releaseTimer(deliveredTimer);
        setMessagesById((prev) => {
          const list = prev[conversationId];
          if (!list) return prev;
          return {
            ...prev,
            [conversationId]: list.map((item) =>
              item.id === messageId && item.status === "sent"
                ? { ...item, status: "delivered" as const }
                : item,
            ),
          };
        });
      }, 700 + Math.floor(Math.random() * 500));
      replyTimers.current.push(deliveredTimer);

      const replies = AUTO_REPLIES[conversationId] ?? [
        "Grazie! Ti rispondo a breve.",
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)]!;
      const delay = 1800 + Math.floor(Math.random() * 2200);
      const timer = window.setTimeout(() => {
        releaseTimer(timer);
        receiveIncoming(conversationId, reply);
      }, delay);
      replyTimers.current.push(timer);
    },
    [receiveIncoming, releaseTimer],
  );

  const value = useMemo(
    () => ({
      conversations,
      getMessages,
      openConversationId,
      openConversation,
      closeConversation,
      sendMessage,
      markAllConversationsRead,
    }),
    [
      conversations,
      getMessages,
      openConversationId,
      openConversation,
      closeConversation,
      sendMessage,
      markAllConversationsRead,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}
