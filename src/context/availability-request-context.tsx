"use client";

import { notifyAvailabilityUpdate } from "@/lib/browser-notifications";
import { useAppState } from "@/context/app-state-context";
import { useInboxBadge } from "@/context/inbox-badge-context";
import { normalizeUserSettings } from "@/types/user-settings";
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
  pendingManagerRequests: AvailabilityRequest[];
  pendingUserConfirms: AvailabilityRequest[];
}

const AvailabilityRequestContext =
  createContext<AvailabilityRequestContextValue | null>(null);

function readStoredRequests(): AvailabilityRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AvailabilityRequest =>
        Boolean(item && typeof item === "object" && "id" in item),
    );
  } catch {
    return [];
  }
}

function writeStoredRequests(requests: AvailabilityRequest[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // private mode / quota
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
    currentUser,
    isBusinessUser,
    isGuest,
    managedListings,
  } = useAppState();
  const { syncUnreadNotifications } = useInboxBadge();
  const pushEnabled = normalizeUserSettings(currentUser.settings).notifications
    .pushEnabled;

  const [requests, setRequests] = useState<AvailabilityRequest[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const skipFirstPersist = useRef(true);
  const currentUserIdRef = useRef(currentUser.id);

  useEffect(() => {
    currentUserIdRef.current = currentUser.id;
  }, [currentUser.id]);

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
    writeStoredRequests(requests);
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
    if (managedLocationIds.size === 0) return pending;
    return pending.filter((item) => managedLocationIds.has(item.locationId));
  }, [isBusinessUser, managedLocationIds, requests]);

  const pendingUserConfirms = useMemo(() => {
    if (isGuest || isBusinessUser) return [];
    return requests.filter(
      (item) =>
        item.status === "pending_user_confirm" &&
        item.requesterUserId === currentUser.id,
    );
  }, [currentUser.id, isBusinessUser, isGuest, requests]);

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

      notifyAvailabilityUpdate({
        pushEnabled,
        title: "Nuova richiesta di disponibilità",
        body: `${currentUser.name} vuole festeggiare a ${input.locationName} il ${input.eventPayload.date}.`,
        tag: `vibeup-availability-manager-${request.id}`,
        onlyWhenHidden: false,
      });

      return { ok: true as const, requestId: request.id };
    },
    [
      currentUser.email,
      currentUser.id,
      currentUser.name,
      isBusinessUser,
      isGuest,
      pushEnabled,
    ],
  );

  const acceptAvailabilityRequest = useCallback(
    (requestId: string) => {
      setRequests((prev) =>
        prev.map((item) => {
          if (item.id !== requestId || item.status !== "pending_manager") {
            return item;
          }
          const next: AvailabilityRequest = {
            ...item,
            status: "pending_user_confirm",
            updatedAt: new Date().toISOString(),
          };

          notifyAvailabilityUpdate({
            pushEnabled: true,
            title: "Disponibilità confermata dal gestore",
            body: `${item.locationName} ha accettato la tua richiesta. Conferma per creare l'evento.`,
            tag: `vibeup-availability-user-${item.id}`,
            onlyWhenHidden: false,
          });

          return next;
        }),
      );
    },
    [],
  );

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
      const target = requests.find((item) => item.id === requestId);
      if (!target) {
        return { ok: false as const, error: "Richiesta non trovata." };
      }
      if (target.requesterUserId !== currentUserIdRef.current) {
        return { ok: false as const, error: "Questa richiesta non è tua." };
      }
      if (target.status !== "pending_user_confirm") {
        return {
          ok: false as const,
          error: "La richiesta non è pronta per la conferma.",
        };
      }

      const eventId = `evt-${Date.now()}`;
      const payload = target.eventPayload;
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
      setRequests((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status: "confirmed" as const,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );

      return { ok: true as const, eventId };
    },
    [addEvent, requests],
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
  }, []);

  const value = useMemo(
    () => ({
      requests,
      sendAvailabilityRequest,
      acceptAvailabilityRequest,
      declineAvailabilityRequest,
      confirmAvailabilityRequest,
      cancelAvailabilityRequest,
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
