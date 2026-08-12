"use client";

import { useAppState } from "@/context/app-state-context";
import { useInboxBadge } from "@/context/inbox-badge-context";
import type { ProfileCommunication } from "@/types/profile-communication";
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

const STORAGE_PREFIX = "vibeup-profile-comms-v1:";
const MAX_COMMUNICATIONS = 40;
const REMINDER_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

interface ProfileCommunicationsContextValue {
  communications: ProfileCommunication[];
  hasUnread: boolean;
  markAllSeen: () => void;
  addDepositReminder: (input: {
    eventId: string;
    eventTitle: string;
    locationName: string;
    date: string;
  }) => void;
}

const ProfileCommunicationsContext =
  createContext<ProfileCommunicationsContextValue | null>(null);

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function isProfileCommunication(item: unknown): item is ProfileCommunication {
  return Boolean(item && typeof item === "object" && "id" in item);
}

function pruneCommunications(
  items: ProfileCommunication[],
  aggressive = false,
): ProfileCommunication[] {
  const now = Date.now();
  const maxAge = aggressive ? 3 * 24 * 60 * 60 * 1000 : REMINDER_MAX_AGE_MS;
  const maxCount = aggressive ? 20 : MAX_COMMUNICATIONS;

  const pruned = items.filter((item) => {
    if (item.kind === "deposit_policy") return true;
    const stamp = Date.parse(item.createdAt);
    if (Number.isNaN(stamp)) return false;
    return now - stamp <= maxAge;
  });

  const policy = pruned.filter((item) => item.kind === "deposit_policy").slice(0, 1);
  const rest = pruned.filter((item) => item.kind !== "deposit_policy");
  return [...policy, ...rest].slice(0, maxCount);
}

function readStored(userId: string): ProfileCommunication[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return pruneCommunications(parsed.filter(isProfileCommunication));
  } catch {
    return [];
  }
}

function writeStored(userId: string, items: ProfileCommunication[]) {
  if (typeof window === "undefined") return;
  const pruned = pruneCommunications(items);
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(pruned));
  } catch {
    try {
      window.localStorage.setItem(
        storageKey(userId),
        JSON.stringify(pruneCommunications(pruned, true)),
      );
    } catch {
      // private mode / quota
    }
  }
}

function buildDepositPolicyNotice(): ProfileCommunication {
  return {
    id: "deposit-policy",
    kind: "deposit_policy",
    title: "Caparra entro 36 ore",
    body: "Quando accetti di creare un evento, paghi la caparra online (Stripe). Serve a bloccare la location per quelle date: se non paghi entro il termine, perdi la priorità su quel locale.",
    createdAt: new Date().toISOString(),
    unread: true,
  };
}

export function ProfileCommunicationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { currentUser, isBusinessUser, isGuest } = useAppState();
  const { syncUnreadProfileComms } = useInboxBadge();
  const [communications, setCommunications] = useState<ProfileCommunication[]>(
    [],
  );
  const [hydrated, setHydrated] = useState(false);
  const skipFirstPersist = useRef(true);
  const userId = currentUser.id;

  useEffect(() => {
    skipFirstPersist.current = true;
    setHydrated(false);

    if (isBusinessUser) {
      setCommunications([]);
      setHydrated(true);
      return;
    }

    if (isGuest) {
      setCommunications([buildDepositPolicyNotice()]);
      setHydrated(true);
      return;
    }

    const stored = readStored(userId);
    if (stored.length === 0) {
      setCommunications([buildDepositPolicyNotice()]);
    } else if (!stored.some((item) => item.kind === "deposit_policy")) {
      setCommunications([buildDepositPolicyNotice(), ...stored]);
    } else {
      setCommunications(stored);
    }
    setHydrated(true);
  }, [isBusinessUser, isGuest, userId]);

  useEffect(() => {
    if (!hydrated || isGuest || isBusinessUser) return;
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }
    const pruned = pruneCommunications(communications);
    if (pruned.length !== communications.length) {
      setCommunications(pruned);
      return;
    }
    writeStored(userId, pruned);
  }, [communications, hydrated, isBusinessUser, isGuest, userId]);

  const unreadCount = useMemo(
    () => communications.filter((item) => item.unread).length,
    [communications],
  );

  useEffect(() => {
    if (isBusinessUser) {
      syncUnreadProfileComms(0);
      return;
    }
    syncUnreadProfileComms(unreadCount);
  }, [isBusinessUser, syncUnreadProfileComms, unreadCount]);

  const markAllSeen = useCallback(() => {
    setCommunications((prev) => {
      if (!prev.some((item) => item.unread)) return prev;
      return prev.map((item) =>
        item.unread ? { ...item, unread: false } : item,
      );
    });
  }, []);

  const addDepositReminder = useCallback(
    (input: {
      eventId: string;
      eventTitle: string;
      locationName: string;
      date: string;
    }) => {
      if (isBusinessUser) return;

      const notice: ProfileCommunication = {
        id: `deposit-reminder-${input.eventId}`,
        kind: "deposit_reminder",
        title: "Paga la caparra entro 36 ore",
        body: `Hai creato “${input.eventTitle}” a ${input.locationName} per il ${input.date}. La caparra va pagata entro 36 ore: serve a bloccare la location per quella data. Se non la paghi, perdi la priorità su quel locale.`,
        createdAt: new Date().toISOString(),
        unread: true,
      };

      setCommunications((prev) => {
        const withoutDup = prev.filter((item) => item.id !== notice.id);
        return pruneCommunications([notice, ...withoutDup]);
      });
    },
    [isBusinessUser],
  );

  const value = useMemo(
    () => ({
      communications,
      hasUnread: unreadCount > 0,
      markAllSeen,
      addDepositReminder,
    }),
    [addDepositReminder, communications, markAllSeen, unreadCount],
  );

  return (
    <ProfileCommunicationsContext.Provider value={value}>
      {children}
    </ProfileCommunicationsContext.Provider>
  );
}

export function useProfileCommunications() {
  const context = useContext(ProfileCommunicationsContext);
  if (!context) {
    throw new Error(
      "useProfileCommunications must be used within ProfileCommunicationsProvider",
    );
  }
  return context;
}
