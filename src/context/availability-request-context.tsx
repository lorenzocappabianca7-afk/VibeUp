"use client";

import { useAppState } from "@/context/app-state-context";
import { useInboxBadge } from "@/context/inbox-badge-context";
import type {
  AvailabilityEventPayload,
  AvailabilityRequest,
} from "@/types/availability-request";
import type { UserEvent } from "@/types/event";
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

const STORAGE_KEY = "vibeup-availability-requests-v1";
const MAX_REQUESTS = 80;
const TERMINAL_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const TERMINAL_STATUSES = new Set([
  "confirmed",
  "declined",
  "cancelled",
]);

interface AvailabilityRequestContextValue {
  requests: AvailabilityRequest[];
  sendAvailabilityRequest: (input: {
    locationId: string;
    locationName: string;
    eventPayload: AvailabilityEventPayload;
  }) => { ok: true; requestId: string } | { ok: false; error: string };
  acceptAvailabilityRequest: (requestId: string) => void;
  declineAvailabilityRequest: (requestId: string) => void;
  confirmAvailabilityRequest: (requestId: string) => {
    ok: true;
    eventId: string;
  } | { ok: false; error: string };
  cancelAvailabilityRequest: (requestId: string) => void;
  /** Hide confirm modal for now without cancelling the manager acceptance. */
  snoozeAvailabilityConfirm: (requestId: string) => void;
  /** Show the confirm modal again after a snooze. */
  resumeAvailabilityConfirm: (requestId: string) => void;
  pendingManagerRequests: AvailabilityRequest[];
  pendingUserConfirms: AvailabilityRequest[];
}

const AvailabilityRequestContext =
  createContext<AvailabilityRequestContextValue | null>(null);

function isAvailabilityRequest(item: unknown): item is AvailabilityRequest {
  return Boolean(item && typeof item === "object" && "id" in item);
}

function pruneAvailabilityRequests(
  requests: AvailabilityRequest[],
  aggressive = false,
): AvailabilityRequest[] {
  const now = Date.now();
  const maxAge = aggressive ? 7 * 24 * 60 * 60 * 1000 : TERMINAL_MAX_AGE_MS;
  const maxCount = aggressive ? 40 : MAX_REQUESTS;

  const pruned = requests.filter((item) => {
    if (!TERMINAL_STATUSES.has(item.status)) return true;
    const stamp = Date.parse(item.updatedAt || item.createdAt);
    if (Number.isNaN(stamp)) return false;
    return now - stamp <= maxAge;
  });

  return pruned.slice(0, maxCount);
}

function readStoredRequests(): AvailabilityRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return pruneAvailabilityRequests(parsed.filter(isAvailabilityRequest));
  } catch {
    return [];
  }
}

function writeStoredRequests(requests: AvailabilityRequest[]) {
  if (typeof window === "undefined") return;
  const pruned = pruneAvailabilityRequests(requests);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(pruneAvailabilityRequests(pruned, true)),
      );
    } catch {
      // private mode / quota
    }
  }
}

function formatRequestTime(iso: string) {
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) return "";
  const diff = Date.now() - stamp;
  if (diff < 60_000) return "Ora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min fa`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ore fa`;
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
  }).format(new Date(stamp));
}

export function formatAvailabilityRequestTime(iso: string) {
  return formatRequestTime(iso);
}

export function AvailabilityRequestProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    addEvent,
    businessProfile,
    currentUser,
    isBusinessUser,
    isGuest,
    managedListings,
  } = useAppState();
  const { syncUnreadNotifications } = useInboxBadge();

  const [requests, setRequests] = useState<AvailabilityRequest[]>([]);
  const [snoozedConfirmIds, setSnoozedConfirmIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const skipFirstPersist = useRef(true);
  const currentUserIdRef = useRef(currentUser.id);
  const confirmLockRef = useRef<Set<string>>(new Set());
  const requestsRef = useRef<AvailabilityRequest[]>([]);

  useEffect(() => {
    currentUserIdRef.current = currentUser.id;
  }, [currentUser.id]);

  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  useEffect(() => {
    setRequests(readStoredRequests());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }
    const pruned = pruneAvailabilityRequests(requests);
    if (pruned.length !== requests.length) {
      setRequests(pruned);
      return;
    }
    writeStoredRequests(pruned);
  }, [hydrated, requests]);

  const managedLocationIds = useMemo(() => {
    return new Set(
      managedListings
        .filter((listing) => listing.category === "locali")
        .map((listing) => listing.location.id),
    );
  }, [managedListings]);

  const pendingManagerRequests = useMemo(() => {
    const pending = requests.filter(
      (item) => item.status === "pending_manager",
    );
    if (!isBusinessUser) return [];
    if (managedLocationIds.size > 0) {
      return pending.filter((item) => managedLocationIds.has(item.locationId));
    }
    const businessName = businessProfile?.businessName?.trim().toLowerCase();
    if (businessName) {
      const matched = pending.filter((item) =>
        item.locationName.toLowerCase().includes(businessName),
      );
      if (matched.length > 0) return matched;
    }
    // On-device demo: Pro accounts without linked listings still see pending requests.
    return pending;
  }, [
    businessProfile?.businessName,
    isBusinessUser,
    managedLocationIds,
    requests,
  ]);

  const pendingUserConfirms = useMemo(() => {
    if (isGuest || isBusinessUser) return [];
    return requests.filter(
      (item) =>
        item.status === "pending_user_confirm" &&
        item.requesterUserId === currentUser.id &&
        !snoozedConfirmIds.includes(item.id),
    );
  }, [
    currentUser.id,
    isBusinessUser,
    isGuest,
    requests,
    snoozedConfirmIds,
  ]);

  useEffect(() => {
    if (!isBusinessUser) {
      syncUnreadNotifications(0);
      return;
    }
    syncUnreadNotifications(pendingManagerRequests.length);
  }, [isBusinessUser, pendingManagerRequests.length, syncUnreadNotifications]);

  const sendAvailabilityRequest = useCallback(
    (input: {
      locationId: string;
      locationName: string;
      eventPayload: AvailabilityEventPayload;
    }) => {
      if (isGuest) {
        return { ok: false as const, error: "Crea un account per inviare la richiesta." };
      }
      if (isBusinessUser) {
        return {
          ok: false as const,
          error: "Passa a un account organizzatore per richiedere disponibilità.",
        };
      }

      const now = new Date().toISOString();
      const request: AvailabilityRequest = {
        id: `ar-${Date.now()}`,
        status: "pending_manager",
        requesterUserId: currentUser.id,
        requesterName: currentUser.name,
        requesterEmail: currentUser.email,
        locationId: input.locationId,
        locationName: input.locationName,
        createdAt: now,
        updatedAt: now,
        eventPayload: input.eventPayload,
      };

      setRequests((prev) => [request, ...prev]);
      // Manager sees the request in Notifiche Pro; avoid notifying the requester's tab.
      return { ok: true as const, requestId: request.id };
    },
    [
      currentUser.email,
      currentUser.id,
      currentUser.name,
      isBusinessUser,
      isGuest,
    ],
  );

  const acceptAvailabilityRequest = useCallback((requestId: string) => {
    setRequests((prev) =>
      prev.map((item) =>
        item.id === requestId && item.status === "pending_manager"
          ? {
              ...item,
              status: "pending_user_confirm" as const,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    // Clear snooze so the consumer sees the confirm modal again after accept.
    setSnoozedConfirmIds((prev) => prev.filter((id) => id !== requestId));
  }, []);

  const declineAvailabilityRequest = useCallback((requestId: string) => {
    setRequests((prev) =>
      prev.map((item) =>
        item.id === requestId && item.status === "pending_manager"
          ? {
              ...item,
              status: "declined" as const,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  }, []);

  const confirmAvailabilityRequest = useCallback(
    (requestId: string) => {
      if (confirmLockRef.current.has(requestId)) {
        return {
          ok: false as const,
          error: "Conferma già in corso.",
        };
      }

      const existing = requestsRef.current.find(
        (item) =>
          item.id === requestId &&
          item.status === "pending_user_confirm" &&
          item.requesterUserId === currentUserIdRef.current,
      );
      if (!existing) {
        return {
          ok: false as const,
          error: "La richiesta non è pronta per la conferma.",
        };
      }

      confirmLockRef.current.add(requestId);

      let didClaim = false;
      setRequests((prev) => {
        const stillPending = prev.some(
          (item) =>
            item.id === requestId && item.status === "pending_user_confirm",
        );
        if (!stillPending) return prev;
        didClaim = true;
        return prev.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status: "confirmed" as const,
                updatedAt: new Date().toISOString(),
              }
            : item,
        );
      });

      if (!didClaim) {
        confirmLockRef.current.delete(requestId);
        return {
          ok: false as const,
          error: "La richiesta non è pronta per la conferma.",
        };
      }

      const eventId = `evt-${Date.now()}`;
      const payload = existing.eventPayload;
      const event: UserEvent = {
        id: eventId,
        title: payload.title,
        description: payload.description,
        date: payload.date,
        time: payload.time,
        endTime: payload.endTime,
        locationId: payload.locationId,
        locationName: payload.locationName,
        city: payload.city,
        status: "organizing",
        guestCount: payload.guestCount,
        services: payload.services.map((service) => ({
          ...service,
          id: service.id.startsWith("draft-")
            ? service.id.replace(/^draft-/, `${eventId}-`)
            : `${eventId}-${service.id}`,
        })),
        totalCost: payload.totalCost,
        depositAmount: payload.depositAmount,
        createdAt: new Date().toISOString(),
      };

      addEvent(event);
      setSnoozedConfirmIds((prev) => prev.filter((id) => id !== requestId));
      confirmLockRef.current.delete(requestId);
      return { ok: true as const, eventId };
    },
    [addEvent],
  );

  const cancelAvailabilityRequest = useCallback((requestId: string) => {
    setRequests((prev) =>
      prev.map((item) =>
        item.id === requestId &&
        (item.status === "pending_manager" ||
          item.status === "pending_user_confirm")
          ? {
              ...item,
              status: "cancelled" as const,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setSnoozedConfirmIds((prev) => prev.filter((id) => id !== requestId));
  }, []);

  const snoozeAvailabilityConfirm = useCallback((requestId: string) => {
    setSnoozedConfirmIds((prev) =>
      prev.includes(requestId) ? prev : [...prev, requestId],
    );
  }, []);

  const resumeAvailabilityConfirm = useCallback((requestId: string) => {
    setSnoozedConfirmIds((prev) => prev.filter((id) => id !== requestId));
  }, []);

  const value = useMemo(
    () => ({
      requests,
      sendAvailabilityRequest,
      acceptAvailabilityRequest,
      declineAvailabilityRequest,
      confirmAvailabilityRequest,
      cancelAvailabilityRequest,
      snoozeAvailabilityConfirm,
      resumeAvailabilityConfirm,
      pendingManagerRequests,
      pendingUserConfirms,
    }),
    [
      requests,
      sendAvailabilityRequest,
      acceptAvailabilityRequest,
      declineAvailabilityRequest,
      confirmAvailabilityRequest,
      cancelAvailabilityRequest,
      snoozeAvailabilityConfirm,
      resumeAvailabilityConfirm,
      pendingManagerRequests,
      pendingUserConfirms,
    ],
  );

  return (
    <AvailabilityRequestContext.Provider value={value}>
      {children}
    </AvailabilityRequestContext.Provider>
  );
}

export function useAvailabilityRequests() {
  const context = useContext(AvailabilityRequestContext);
  if (!context) {
    throw new Error(
      "useAvailabilityRequests must be used within AvailabilityRequestProvider",
    );
  }
  return context;
}
