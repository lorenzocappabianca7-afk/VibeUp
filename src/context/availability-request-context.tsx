"use client";

import { useAppState } from "@/context/app-state-context";
import { canAccessAdminCatalog } from "@/lib/admin-access";
import { useInboxBadge } from "@/context/inbox-badge-context";
import {
  createAvailabilityRequestRemote,
  fetchAvailabilityRequests,
  patchAvailabilityRequestRemote,
  startDepositCheckoutRemote,
} from "@/lib/bookings/client";
import {
  normalizeAvailabilityRequest,
  type AvailabilityEventPayload,
  type AvailabilityRequest,
} from "@/types/availability-request";
import type { UserEvent } from "@/types/event";
import { computeConfirmationDeadline } from "@/lib/availability/confirmation-deadline";
import { getRequestStatusShortLabel } from "@/lib/availability/request-status-display";
import { normalizeSlotEventDate } from "@/lib/availability/slot-holds";
import { notifyAvailabilityUpdate } from "@/lib/browser-notifications";
import { normalizeUserSettings } from "@/types/user-settings";
import { useProfileCommunications } from "@/context/profile-communications-context";
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
  "expired",
]);

interface AvailabilityRequestContextValue {
  requests: AvailabilityRequest[];
  cloudSyncEnabled: boolean;
  sendAvailabilityRequest: (input: {
    locationId: string;
    locationName: string;
    eventPayload: AvailabilityEventPayload;
  }) => Promise<{ ok: true; requestId: string } | { ok: false; error: string }>;
  acceptAvailabilityRequest: (
    requestId: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  declineAvailabilityRequest: (
    requestId: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  confirmAvailabilityRequest: (requestId: string) => Promise<
    | {
        ok: true;
        eventId: string;
      }
    | {
        ok: true;
        checkoutUrl: string;
      }
    | { ok: false; error: string }
  >;
  confirmProposedAvailability: (
    requestId: string,
    choice: { selectedDate: string; selectedPrice: number | null },
  ) => Promise<
    | {
        ok: true;
        eventId: string;
      }
    | {
        ok: true;
        checkoutUrl: string;
      }
    | { ok: false; error: string }
  >;
  rejectProposedAvailability: (
    requestId: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  cancelAvailabilityRequest: (requestId: string) => Promise<void>;
  /** Hide confirm modal for now without cancelling the manager acceptance. */
  snoozeAvailabilityConfirm: (requestId: string) => void;
  /** Show the confirm modal again after a snooze. */
  resumeAvailabilityConfirm: (requestId: string) => void;
  pendingManagerRequests: AvailabilityRequest[];
  pendingUserConfirms: AvailabilityRequest[];
  /** All requests for locations/services managed by the current business user. */
  managedRequests: AvailabilityRequest[];
  /** Open (non-terminal) requests created by the current organizer. */
  organizerOpenRequests: AvailabilityRequest[];
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
    return pruneAvailabilityRequests(
      parsed.filter(isAvailabilityRequest).map(normalizeAvailabilityRequest),
    );
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

function upsertRequest(
  list: AvailabilityRequest[],
  next: AvailabilityRequest,
): AvailabilityRequest[] {
  const without = list.filter((item) => item.id !== next.id);
  return pruneAvailabilityRequests([next, ...without]);
}

export function AvailabilityRequestProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    addEvent,
    addServiceToEvent,
    businessProfile,
    currentUser,
    isBusinessUser,
    isGuest,
    managedListings,
  } = useAppState();
  const { seenNotificationIds, syncUnreadNotifications } = useInboxBadge();
  const { addRequestStatusNotice } = useProfileCommunications();

  const [requests, setRequests] = useState<AvailabilityRequest[]>([]);
  const [snoozedConfirmIds, setSnoozedConfirmIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const skipFirstPersist = useRef(true);
  const currentUserIdRef = useRef(currentUser.id);
  const confirmLockRef = useRef<Set<string>>(new Set());
  const requestsRef = useRef<AvailabilityRequest[]>([]);
  const adminCancelledRequestIdsRef = useRef<Set<string>>(new Set());

  const cloudSyncEnabled = currentUser.authProvider === "supabase";

  useEffect(() => {
    currentUserIdRef.current = currentUser.id;
  }, [currentUser.id]);

  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  useEffect(() => {
    const stored = readStoredRequests();
    queueMicrotask(() => {
      setRequests(stored);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated || !cloudSyncEnabled || isGuest) return;

    let cancelled = false;
    void fetchAvailabilityRequests().then((result) => {
      if (cancelled || !result.ok) return;
      setRequests((prev) => {
        const byId = new Map<string, AvailabilityRequest>();
        for (const item of prev) byId.set(item.id, item);
        for (const item of result.requests) byId.set(item.id, item);
        return pruneAvailabilityRequests(Array.from(byId.values()));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [cloudSyncEnabled, hydrated, isGuest, currentUser.id]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }
    const pruned = pruneAvailabilityRequests(requests);
    if (pruned.length !== requests.length) {
      queueMicrotask(() => setRequests(pruned));
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

  const managedServiceIds = useMemo(() => {
    return new Set(
      managedListings
        .filter((listing) => listing.category !== "locali")
        .map((listing) => listing.id),
    );
  }, [managedListings]);

  const pendingManagerRequests = useMemo(() => {
    const pending = requests.filter(
      (item) => item.status === "pending_manager",
    );
    if (!isBusinessUser && currentUser.role !== "admin") return [];

    // Cloud inbox: server already scopes to owned listings / admin.
    if (cloudSyncEnabled) {
      return pending.filter(
        (item) => item.requesterUserId !== currentUser.id,
      );
    }

    if (managedLocationIds.size > 0 || managedServiceIds.size > 0) {
      return pending.filter(
        (item) =>
          managedLocationIds.has(item.locationId) ||
          managedServiceIds.has(item.locationId),
      );
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
    cloudSyncEnabled,
    currentUser.id,
    currentUser.role,
    isBusinessUser,
    managedLocationIds,
    managedServiceIds,
    requests,
  ]);

  const pendingUserConfirms = useMemo(() => {
    if (isGuest || isBusinessUser) return [];
    // Deadline comparison needs wall-clock time; not a render-stable value.
    // eslint-disable-next-line react-hooks/purity -- confirmation window
    const now = Date.now();
    return requests.filter((item) => {
      if (
        item.status !== "pending_user_confirm" &&
        item.status !== "pending_user_review_proposal"
      ) {
        return false;
      }
      if (item.requesterUserId !== currentUser.id) return false;
      if (snoozedConfirmIds.includes(item.id)) return false;
      if (item.confirmationDeadline) {
        const deadline = Date.parse(item.confirmationDeadline);
        if (Number.isFinite(deadline) && deadline < now) return false;
      }
      return true;
    });
  }, [
    currentUser.id,
    isBusinessUser,
    isGuest,
    requests,
    snoozedConfirmIds,
  ]);

  const managedRequests = useMemo(() => {
    if (!isBusinessUser) return [];
    const sorted = [...requests].sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
    );
    if (managedLocationIds.size > 0 || managedServiceIds.size > 0) {
      return sorted.filter(
        (item) =>
          managedLocationIds.has(item.locationId) ||
          managedServiceIds.has(item.locationId),
      );
    }
    const businessName = businessProfile?.businessName?.trim().toLowerCase();
    if (businessName) {
      const matched = sorted.filter((item) =>
        item.locationName.toLowerCase().includes(businessName),
      );
      if (matched.length > 0) return matched;
    }
    return sorted.filter((item) => item.requesterUserId !== currentUser.id);
  }, [
    businessProfile?.businessName,
    currentUser.id,
    isBusinessUser,
    managedLocationIds,
    managedServiceIds,
    requests,
  ]);

  const organizerOpenRequests = useMemo(() => {
    if (isGuest || isBusinessUser) return [];
    if (canAccessAdminCatalog(currentUser.email, currentUser.role)) return [];
    return requests
      .filter(
        (item) =>
          item.requesterUserId === currentUser.id &&
          item.status !== "confirmed" &&
          item.status !== "declined" &&
          item.status !== "cancelled" &&
          item.status !== "expired",
      )
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [
    currentUser.email,
    currentUser.id,
    currentUser.role,
    isBusinessUser,
    isGuest,
    requests,
  ]);

  useEffect(() => {
    if (!isBusinessUser) {
      syncUnreadNotifications(0);
      return;
    }
    const seen = new Set(seenNotificationIds);
    syncUnreadNotifications(
      pendingManagerRequests.filter((item) => !seen.has(item.id)).length,
    );
  }, [
    isBusinessUser,
    pendingManagerRequests,
    seenNotificationIds,
    syncUnreadNotifications,
  ]);

  const sendAvailabilityRequest = useCallback(
    async (input: {
      locationId: string;
      locationName: string;
      eventPayload: AvailabilityEventPayload;
    }) => {
      if (isGuest) {
        return {
          ok: false as const,
          error: "Crea un account per inviare la richiesta.",
        };
      }
      if (isBusinessUser) {
        return {
          ok: false as const,
          error:
            "Passa a un account organizzatore per richiedere disponibilità.",
        };
      }

      if (cloudSyncEnabled) {
        const remote = await createAvailabilityRequestRemote(input);
        if (!remote.ok) {
          return { ok: false as const, error: remote.error };
        }
        setRequests((prev) => upsertRequest(prev, remote.request));
        return { ok: true as const, requestId: remote.request.id };
      }

      const eventDate = normalizeSlotEventDate(input.eventPayload.date);
      if (eventDate) {
        const blocking = requestsRef.current.find((item) => {
          if (item.locationId !== input.locationId) return false;
          if (
            item.status !== "pending_manager" &&
            item.status !== "pending_admin_review" &&
            item.status !== "pending_user_confirm" &&
            item.status !== "pending_user_review_proposal" &&
            item.status !== "confirmed"
          ) {
            return false;
          }
          return (
            normalizeSlotEventDate(item.eventPayload.date) === eventDate
          );
        });
        if (blocking) {
          return {
            ok: false as const,
            error:
              "Questa data è già riservata da un’altra richiesta in corso per questa location. Riprova quando viene rifiutata o scade.",
          };
        }
      }

      const now = new Date().toISOString();
      const request = normalizeAvailabilityRequest({
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
        managerDecision: null,
        managerNote: null,
        managerProposedDates: null,
        managerProposedPrice: null,
        managerRespondedAt: null,
        responseToken: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        responseTokenExpiresAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        responseTokenUsedAt: null,
        adminReviewedBy: null,
        adminReviewedAt: null,
        adminNote: null,
        userSelectedDate: null,
        userSelectedPrice: null,
        confirmationDeadline: null,
        confirmationReminderSentAt: null,
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: null,
        depositPaymentStatus: null,
        statusBeforePayment: null,
      });

      setRequests((prev) => [request, ...prev]);
      return { ok: true as const, requestId: request.id };
    },
    [
      cloudSyncEnabled,
      currentUser.email,
      currentUser.id,
      currentUser.name,
      isBusinessUser,
      isGuest,
    ],
  );

  const acceptAvailabilityRequest = useCallback(
    async (requestId: string) => {
      if (cloudSyncEnabled) {
        const remote = await patchAvailabilityRequestRemote({
          requestId,
          action: "accept",
        });
        if (!remote.ok) {
          return { ok: false as const, error: remote.error };
        }
        setRequests((prev) => upsertRequest(prev, remote.request));
        setSnoozedConfirmIds((prev) => prev.filter((id) => id !== requestId));
        return { ok: true as const };
      }

      setRequests((prev) =>
        prev.map((item) =>
          item.id === requestId && item.status === "pending_manager"
            ? {
                ...item,
                status: "pending_user_confirm" as const,
                confirmationDeadline: computeConfirmationDeadline(),
                confirmationReminderSentAt: null,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      setSnoozedConfirmIds((prev) => prev.filter((id) => id !== requestId));
      return { ok: true as const };
    },
    [cloudSyncEnabled],
  );

  const declineAvailabilityRequest = useCallback(
    async (requestId: string) => {
      if (cloudSyncEnabled) {
        const remote = await patchAvailabilityRequestRemote({
          requestId,
          action: "decline",
        });
        if (!remote.ok) {
          return { ok: false as const, error: remote.error };
        }
        setRequests((prev) => upsertRequest(prev, remote.request));
        return { ok: true as const };
      }

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
      return { ok: true as const };
    },
    [cloudSyncEnabled],
  );

  const confirmAvailabilityRequest = useCallback(
    async (requestId: string) => {
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

      if (cloudSyncEnabled) {
        const remote = await startDepositCheckoutRemote({ requestId });
        confirmLockRef.current.delete(requestId);
        if (!remote.ok) {
          return { ok: false as const, error: remote.error };
        }
        setRequests((prev) => upsertRequest(prev, remote.request));

        if ("alreadyPaid" in remote && remote.alreadyPaid) {
          const payload = remote.request.eventPayload;
          if (
            payload.requestKind === "service" &&
            payload.targetEventId &&
            payload.pendingService
          ) {
            addServiceToEvent(payload.targetEventId, {
              ...payload.pendingService,
              status: "confirmed",
            });
            setSnoozedConfirmIds((prev) =>
              prev.filter((id) => id !== requestId),
            );
            return { ok: true as const, eventId: payload.targetEventId };
          }
          if (remote.event) {
            addEvent(remote.event);
            setSnoozedConfirmIds((prev) =>
              prev.filter((id) => id !== requestId),
            );
            return { ok: true as const, eventId: remote.event.id };
          }
          return {
            ok: false as const,
            error: "Pagamento registrato ma evento non disponibile.",
          };
        }

        if (!("checkoutUrl" in remote) || !remote.checkoutUrl) {
          return {
            ok: false as const,
            error: "URL di pagamento non disponibile.",
          };
        }

        return { ok: true as const, checkoutUrl: remote.checkoutUrl };
      }

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

      const payload = existing.eventPayload;
      if (
        payload.requestKind === "service" &&
        payload.targetEventId &&
        payload.pendingService
      ) {
        addServiceToEvent(payload.targetEventId, {
          ...payload.pendingService,
          status: "confirmed",
        });
        setSnoozedConfirmIds((prev) => prev.filter((id) => id !== requestId));
        confirmLockRef.current.delete(requestId);
        return { ok: true as const, eventId: payload.targetEventId };
      }

      const eventId = `evt-${Date.now()}`;
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
    [addEvent, addServiceToEvent, cloudSyncEnabled],
  );

  const confirmProposedAvailability = useCallback(
    async (
      requestId: string,
      choice: { selectedDate: string; selectedPrice: number | null },
    ) => {
      if (confirmLockRef.current.has(requestId)) {
        return {
          ok: false as const,
          error: "Conferma già in corso.",
        };
      }

      const existing = requestsRef.current.find(
        (item) =>
          item.id === requestId &&
          item.status === "pending_user_review_proposal" &&
          item.requesterUserId === currentUserIdRef.current,
      );
      if (!existing) {
        return {
          ok: false as const,
          error: "La proposta non è pronta per la conferma.",
        };
      }

      const selectedDate = choice.selectedDate.trim();
      if (!selectedDate) {
        return {
          ok: false as const,
          error: "Seleziona una data proposta.",
        };
      }

      confirmLockRef.current.add(requestId);

      if (cloudSyncEnabled) {
        const remote = await startDepositCheckoutRemote({
          requestId,
          selectedDate,
          selectedPrice: choice.selectedPrice,
        });
        confirmLockRef.current.delete(requestId);
        if (!remote.ok) {
          return { ok: false as const, error: remote.error };
        }
        setRequests((prev) => upsertRequest(prev, remote.request));

        if ("alreadyPaid" in remote && remote.alreadyPaid) {
          const payload = remote.request.eventPayload;
          if (
            payload.requestKind === "service" &&
            payload.targetEventId &&
            payload.pendingService
          ) {
            addServiceToEvent(payload.targetEventId, {
              ...payload.pendingService,
              status: "confirmed",
            });
            setSnoozedConfirmIds((prev) =>
              prev.filter((id) => id !== requestId),
            );
            return { ok: true as const, eventId: payload.targetEventId };
          }
          if (remote.event) {
            addEvent(remote.event);
            setSnoozedConfirmIds((prev) =>
              prev.filter((id) => id !== requestId),
            );
            return { ok: true as const, eventId: remote.event.id };
          }
          return {
            ok: false as const,
            error: "Pagamento registrato ma evento non disponibile.",
          };
        }

        if (!("checkoutUrl" in remote) || !remote.checkoutUrl) {
          return {
            ok: false as const,
            error: "URL di pagamento non disponibile.",
          };
        }

        return { ok: true as const, checkoutUrl: remote.checkoutUrl };
      }

      const proposed =
        existing.managerProposedDates?.find(
          (slot) => slot.date === selectedDate,
        ) ?? null;
      const totalCost =
        typeof choice.selectedPrice === "number"
          ? choice.selectedPrice
          : existing.eventPayload.totalCost;

      let didClaim = false;
      setRequests((prev) => {
        const stillPending = prev.some(
          (item) =>
            item.id === requestId &&
            item.status === "pending_user_review_proposal",
        );
        if (!stillPending) return prev;
        didClaim = true;
        return prev.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status: "confirmed" as const,
                userSelectedDate: selectedDate,
                userSelectedPrice:
                  typeof choice.selectedPrice === "number"
                    ? choice.selectedPrice
                    : null,
                updatedAt: new Date().toISOString(),
              }
            : item,
        );
      });

      if (!didClaim) {
        confirmLockRef.current.delete(requestId);
        return {
          ok: false as const,
          error: "La proposta non è pronta per la conferma.",
        };
      }

      const payload = existing.eventPayload;
      if (
        payload.requestKind === "service" &&
        payload.targetEventId &&
        payload.pendingService
      ) {
        addServiceToEvent(payload.targetEventId, {
          ...payload.pendingService,
          status: "confirmed",
        });
        setSnoozedConfirmIds((prev) => prev.filter((id) => id !== requestId));
        confirmLockRef.current.delete(requestId);
        return { ok: true as const, eventId: payload.targetEventId };
      }

      const eventId = `evt-${Date.now()}`;
      const event: UserEvent = {
        id: eventId,
        title: payload.title,
        description: payload.description,
        date: selectedDate,
        time: proposed?.time ?? payload.time,
        endTime: proposed?.endTime ?? payload.endTime,
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
        totalCost,
        depositAmount: payload.depositAmount,
        createdAt: new Date().toISOString(),
      };

      addEvent(event);
      setSnoozedConfirmIds((prev) => prev.filter((id) => id !== requestId));
      confirmLockRef.current.delete(requestId);
      return { ok: true as const, eventId };
    },
    [addEvent, addServiceToEvent, cloudSyncEnabled],
  );

  const rejectProposedAvailability = useCallback(
    async (requestId: string) => {
      const existing = requestsRef.current.find(
        (item) =>
          item.id === requestId &&
          item.status === "pending_user_review_proposal" &&
          item.requesterUserId === currentUserIdRef.current,
      );
      if (!existing) {
        return {
          ok: false as const,
          error: "La proposta non è più disponibile.",
        };
      }

      if (cloudSyncEnabled) {
        const remote = await patchAvailabilityRequestRemote({
          requestId,
          action: "reject_proposal",
        });
        if (!remote.ok) {
          return { ok: false as const, error: remote.error };
        }
        setRequests((prev) => upsertRequest(prev, remote.request));
        setSnoozedConfirmIds((prev) => prev.filter((id) => id !== requestId));
        return { ok: true as const };
      }

      setRequests((prev) =>
        prev.map((item) =>
          item.id === requestId &&
          item.status === "pending_user_review_proposal"
            ? {
                ...item,
                status: "declined" as const,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      setSnoozedConfirmIds((prev) => prev.filter((id) => id !== requestId));
      return { ok: true as const };
    },
    [cloudSyncEnabled],
  );

  const cancelAvailabilityRequest = useCallback(
    async (requestId: string) => {
      if (cloudSyncEnabled) {
        const remote = await patchAvailabilityRequestRemote({
          requestId,
          action: "cancel",
        });
        if (remote.ok) {
          setRequests((prev) => upsertRequest(prev, remote.request));
        }
        setSnoozedConfirmIds((prev) => prev.filter((id) => id !== requestId));
        return;
      }

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
    },
    [cloudSyncEnabled],
  );

  useEffect(() => {
    if (!hydrated || isGuest || isBusinessUser) return;
    if (!canAccessAdminCatalog(currentUser.email, currentUser.role)) return;

    const open = requests.filter(
      (item) =>
        item.requesterUserId === currentUser.id &&
        !TERMINAL_STATUSES.has(item.status),
    );

    for (const item of open) {
      if (adminCancelledRequestIdsRef.current.has(item.id)) continue;
      adminCancelledRequestIdsRef.current.add(item.id);
      void cancelAvailabilityRequest(item.id);
    }
  }, [
    cancelAvailabilityRequest,
    currentUser.email,
    currentUser.id,
    currentUser.role,
    hydrated,
    isBusinessUser,
    isGuest,
    requests,
  ]);

  const snoozeAvailabilityConfirm = useCallback((requestId: string) => {
    setSnoozedConfirmIds((prev) =>
      prev.includes(requestId) ? prev : [...prev, requestId],
    );
  }, []);

  const resumeAvailabilityConfirm = useCallback((requestId: string) => {
    setSnoozedConfirmIds((prev) => prev.filter((id) => id !== requestId));
  }, []);

  const knownStatusesRef = useRef<Map<string, string>>(new Map());
  const statusNotifyReadyRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    const pushEnabled = normalizeUserSettings(currentUser.settings)
      .notifications.pushEnabled;
    const relevant = isBusinessUser
      ? managedRequests
      : requests.filter((item) => item.requesterUserId === currentUser.id);

    if (!statusNotifyReadyRef.current) {
      for (const item of relevant) {
        knownStatusesRef.current.set(item.id, item.status);
      }
      statusNotifyReadyRef.current = true;
      return;
    }

    for (const item of relevant) {
      const previous = knownStatusesRef.current.get(item.id);
      knownStatusesRef.current.set(item.id, item.status);
      if (!previous || previous === item.status) continue;
      const label = getRequestStatusShortLabel(
        item.status,
        item.confirmationDeadline,
      );
      notifyAvailabilityUpdate({
        pushEnabled,
        title: `Stato: ${label}`,
        body: `“${item.eventPayload.title}” · ${item.locationName}`,
        tag: `vibeup-status-${item.id}-${item.status}`,
        onlyWhenHidden: false,
      });
      addRequestStatusNotice({
        requestId: item.id,
        statusLabel: label,
        eventTitle: item.eventPayload.title,
        locationName: item.locationName,
        status: item.status,
      });
    }
  }, [
    currentUser.id,
    currentUser.settings,
    hydrated,
    isBusinessUser,
    managedRequests,
    requests,
    addRequestStatusNotice,
  ]);

  const value = useMemo(
    () => ({
      requests,
      cloudSyncEnabled,
      sendAvailabilityRequest,
      acceptAvailabilityRequest,
      declineAvailabilityRequest,
      confirmAvailabilityRequest,
      confirmProposedAvailability,
      rejectProposedAvailability,
      cancelAvailabilityRequest,
      snoozeAvailabilityConfirm,
      resumeAvailabilityConfirm,
      pendingManagerRequests,
      pendingUserConfirms,
      managedRequests,
      organizerOpenRequests,
    }),
    [
      requests,
      cloudSyncEnabled,
      sendAvailabilityRequest,
      acceptAvailabilityRequest,
      declineAvailabilityRequest,
      confirmAvailabilityRequest,
      confirmProposedAvailability,
      rejectProposedAvailability,
      cancelAvailabilityRequest,
      snoozeAvailabilityConfirm,
      resumeAvailabilityConfirm,
      pendingManagerRequests,
      pendingUserConfirms,
      managedRequests,
      organizerOpenRequests,
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
