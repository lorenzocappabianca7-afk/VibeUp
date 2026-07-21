"use client";

import type { BusinessProfile } from "@/types/business";
import { MOCK_EVENTS } from "@/lib/mock/events";
import type { ManagedListing } from "@/types/admin";
import type { BookedService, EventMenuSelection, UserEvent } from "@/types/event";
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

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  instagramHandle?: string;
  phoneNumber?: string;
  paymentCard?: SavedPaymentCard;
}

export interface SavedPaymentCard {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  cardholderName: string;
}

interface PaymentState {
  paid: boolean;
  method?: string;
}

interface AppStateContextValue {
  currentUser: CurrentUser;
  accounts: CurrentUser[];
  isGuest: boolean;
  businessProfile: BusinessProfile | null;
  isBusinessUser: boolean;
  isStorageHydrated: boolean;
  events: UserEvent[];
  paymentStates: Record<string, PaymentState>;
  favoriteLocationIds: string[];
  favoriteServiceIds: string[];
  compareLocationIds: string[];
  managedListings: ManagedListing[];
  addEvent: (event: UserEvent) => void;
  getEvent: (id: string) => UserEvent | undefined;
  updateEventTitle: (eventId: string, title: string) => void;
  updateEventMenuSelections: (
    eventId: string,
    selections: EventMenuSelection[],
  ) => void;
  addServiceToEvent: (eventId: string, service: BookedService) => void;
  markServicePaid: (eventId: string, serviceId: string, method?: string) => void;
  toggleFavoriteLocation: (id: string) => void;
  removeFavoriteLocation: (id: string) => void;
  toggleFavoriteService: (id: string) => void;
  removeFavoriteService: (id: string) => void;
  toggleCompareLocation: (id: string) => void;
  removeCompareLocation: (id: string) => void;
  upsertManagedListing: (listing: ManagedListing) => void;
  removeManagedListing: (id: string) => void;
  toggleManagedListingPublication: (id: string) => void;
  createAccount: (account: Omit<CurrentUser, "id">) => void;
  switchAccount: (id: string) => void;
  updateCurrentUser: (updates: Partial<Omit<CurrentUser, "id">>) => void;
  saveBusinessProfile: (profile: BusinessProfile) => void;
  clearBusinessProfile: () => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export const GUEST_USER: CurrentUser = {
  id: "account-guest",
  name: "Ospite",
  email: "",
};

const MOCK_CURRENT_USER: CurrentUser = {
  id: "account-vibeup-planner",
  name: "VibeUp Planner",
  email: "vibeup.planner@gmail.com",
};

const MOCK_ACCOUNTS: CurrentUser[] = [
  MOCK_CURRENT_USER,
  {
    id: "account-demo-user",
    name: "Lorenzo C.",
    email: "lorenzo@email.com",
  },
];

const MAX_COMPARE_LOCATIONS = 3;
const STORAGE_KEY = "vibeup-app-state-v2";

interface UserScopedState {
  events: UserEvent[];
  paymentStates: Record<string, PaymentState>;
  favoriteLocationIds: string[];
  favoriteServiceIds: string[];
  compareLocationIds: string[];
}

interface StoredAppState {
  accounts?: CurrentUser[];
  currentUserId?: string;
  businessProfile?: BusinessProfile | null;
  userStates?: Record<string, UserScopedState>;
  managedListings?: ManagedListing[];
  events?: UserEvent[];
  paymentStates?: Record<string, PaymentState>;
  favoriteLocationIds?: string[];
  favoriteServiceIds?: string[];
  compareLocationIds?: string[];
}

function createDefaultUserState(userId: string): UserScopedState {
  const hasDemoEvents =
    userId === MOCK_CURRENT_USER.id || userId === "account-demo-user";

  return {
    events: hasDemoEvents ? MOCK_EVENTS : [],
    paymentStates: {},
    favoriteLocationIds: [],
    favoriteServiceIds: [],
    compareLocationIds: [],
  };
}

function resolveCurrentUser(
  accounts: CurrentUser[],
  currentUserId: string,
): CurrentUser {
  if (currentUserId === GUEST_USER.id) return GUEST_USER;
  return (
    accounts.find((account) => account.id === currentUserId) ??
    accounts[0] ??
    GUEST_USER
  );
}

function trimCompareIds(ids: string[]) {
  return ids.slice(0, MAX_COMPARE_LOCATIONS);
}

function hydrateUserStates(stored: StoredAppState): Record<string, UserScopedState> {
  if (stored.userStates && Object.keys(stored.userStates).length > 0) {
    return Object.fromEntries(
      Object.entries(stored.userStates).map(([userId, state]) => [
        userId,
        {
          ...state,
          compareLocationIds: trimCompareIds(state.compareLocationIds ?? []),
        },
      ]),
    );
  }

  const accounts = stored.accounts ?? MOCK_ACCOUNTS;
  const map = Object.fromEntries(
    accounts.map((account) => [account.id, createDefaultUserState(account.id)]),
  );
  const ownerId = stored.currentUserId ?? MOCK_CURRENT_USER.id;
  const hasLegacyData =
    stored.events ||
    stored.paymentStates ||
    stored.favoriteLocationIds ||
    stored.favoriteServiceIds ||
    stored.compareLocationIds;

  if (hasLegacyData) {
    map[ownerId] = {
      events: stored.events ?? map[ownerId]?.events ?? MOCK_EVENTS,
      paymentStates: stored.paymentStates ?? {},
      favoriteLocationIds: stored.favoriteLocationIds ?? [],
      favoriteServiceIds: stored.favoriteServiceIds ?? [],
      compareLocationIds: trimCompareIds(stored.compareLocationIds ?? []),
    };
  }

  return map;
}

function readStoredAppState(): StoredAppState {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as StoredAppState) : {};
  } catch {
    return {};
  }
}

function writeStoredAppState(state: StoredAppState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private mode; the app should keep working.
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hydratedFromStorage, setHydratedFromStorage] = useState(false);
  const [accounts, setAccounts] = useState<CurrentUser[]>(MOCK_ACCOUNTS);
  const [currentUserId, setCurrentUserId] = useState(GUEST_USER.id);
  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfile | null>(null);
  const [userStatesMap, setUserStatesMap] = useState<
    Record<string, UserScopedState>
  >(() =>
    Object.fromEntries([
      [GUEST_USER.id, createDefaultUserState(GUEST_USER.id)],
      ...MOCK_ACCOUNTS.map((account) => [
        account.id,
        createDefaultUserState(account.id),
      ] as const),
    ]),
  );
  const [managedListings, setManagedListings] = useState<ManagedListing[]>([]);
  const isGuest = currentUserId === GUEST_USER.id;
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  const currentUserState =
    userStatesMap[currentUserId] ?? createDefaultUserState(currentUserId);
  const events = currentUserState.events;
  const paymentStates = currentUserState.paymentStates;
  const favoriteLocationIds = currentUserState.favoriteLocationIds;
  const favoriteServiceIds = currentUserState.favoriteServiceIds;
  const compareLocationIds = currentUserState.compareLocationIds;

  const updateCurrentUserState = useCallback(
    (updater: (state: UserScopedState) => UserScopedState) => {
      const userId = currentUserIdRef.current;
      setUserStatesMap((map) => {
        const current = map[userId] ?? createDefaultUserState(userId);
        const next = updater(current);
        if (next === current) return map;

        return {
          ...map,
          [userId]: next,
        };
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const storedState = readStoredAppState();

      if (storedState.accounts) setAccounts(storedState.accounts);
      if (storedState.currentUserId) setCurrentUserId(storedState.currentUserId);
      if ("businessProfile" in storedState) {
        setBusinessProfile(storedState.businessProfile ?? null);
      }
      setUserStatesMap(hydrateUserStates(storedState));
      if (storedState.managedListings) {
        setManagedListings(storedState.managedListings);
      }

      setHydratedFromStorage(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedFromStorage) return;

    writeStoredAppState({
      accounts,
      currentUserId,
      businessProfile,
      userStates: userStatesMap,
      managedListings,
    });
  }, [
    accounts,
    businessProfile,
    currentUserId,
    hydratedFromStorage,
    managedListings,
    userStatesMap,
  ]);

  const addEvent = useCallback((event: UserEvent) => {
    updateCurrentUserState((state) => ({
      ...state,
      events: [event, ...state.events.filter((item) => item.id !== event.id)],
    }));
  }, [updateCurrentUserState]);

  const getEvent = useCallback(
    (id: string) => events.find((event) => event.id === id),
    [events],
  );

  const updateEventTitle = useCallback((eventId: string, title: string) => {
    updateCurrentUserState((state) => ({
      ...state,
      events: state.events.map((event) =>
        event.id === eventId && event.title !== title ? { ...event, title } : event,
      ),
    }));
  }, [updateCurrentUserState]);

  const updateEventMenuSelections = useCallback(
    (eventId: string, selections: EventMenuSelection[]) => {
      updateCurrentUserState((state) => ({
        ...state,
        events: state.events.map((event) =>
          event.id === eventId
            ? { ...event, menuSelections: selections }
            : event,
        ),
      }));
    },
    [updateCurrentUserState],
  );

  const addServiceToEvent = useCallback(
    (eventId: string, service: BookedService) => {
      updateCurrentUserState((state) => ({
        ...state,
        events: state.events.map((event) => {
          if (event.id !== eventId) return event;

          const services = [
            ...event.services.filter((item) => item.id !== service.id),
            service,
          ];
          const totalCost = services.reduce((sum, item) => sum + item.amountPaid, 0);
          const locationCost =
            services.find((item) => item.category === "location")?.amountPaid ?? 0;

          return {
            ...event,
            services,
            totalCost,
            depositAmount: locationCost * 0.3,
          };
        }),
      }));
    },
    [updateCurrentUserState],
  );

  const markServicePaid = useCallback(
    (eventId: string, serviceId: string, method?: string) => {
      updateCurrentUserState((state) => {
        const key = `${eventId}:${serviceId}`;
        const existing = state.paymentStates[key];
        if (existing?.paid && existing.method === method) return state;

        return {
          ...state,
          paymentStates: {
            ...state.paymentStates,
            [key]: { paid: true, method },
          },
        };
      });
    },
    [updateCurrentUserState],
  );

  const toggleFavoriteLocation = useCallback((id: string) => {
    updateCurrentUserState((state) => ({
      ...state,
      favoriteLocationIds: state.favoriteLocationIds.includes(id)
        ? state.favoriteLocationIds.filter((favoriteId) => favoriteId !== id)
        : [...state.favoriteLocationIds, id],
    }));
  }, [updateCurrentUserState]);

  const removeFavoriteLocation = useCallback((id: string) => {
    updateCurrentUserState((state) => {
      if (!state.favoriteLocationIds.includes(id)) return state;
      return {
        ...state,
        favoriteLocationIds: state.favoriteLocationIds.filter(
          (favoriteId) => favoriteId !== id,
        ),
      };
    });
  }, [updateCurrentUserState]);

  const toggleFavoriteService = useCallback((id: string) => {
    updateCurrentUserState((state) => ({
      ...state,
      favoriteServiceIds: state.favoriteServiceIds.includes(id)
        ? state.favoriteServiceIds.filter((favoriteId) => favoriteId !== id)
        : [...state.favoriteServiceIds, id],
    }));
  }, [updateCurrentUserState]);

  const removeFavoriteService = useCallback((id: string) => {
    updateCurrentUserState((state) => {
      if (!state.favoriteServiceIds.includes(id)) return state;
      return {
        ...state,
        favoriteServiceIds: state.favoriteServiceIds.filter(
          (favoriteId) => favoriteId !== id,
        ),
      };
    });
  }, [updateCurrentUserState]);

  const toggleCompareLocation = useCallback((id: string) => {
    updateCurrentUserState((state) => {
      if (state.compareLocationIds.includes(id)) {
        return {
          ...state,
          compareLocationIds: state.compareLocationIds.filter(
            (compareId) => compareId !== id,
          ),
        };
      }

      const next = [...state.compareLocationIds, id];
      return {
        ...state,
        compareLocationIds:
          next.length > MAX_COMPARE_LOCATIONS
            ? next.slice(next.length - MAX_COMPARE_LOCATIONS)
            : next,
      };
    });
  }, [updateCurrentUserState]);

  const removeCompareLocation = useCallback((id: string) => {
    updateCurrentUserState((state) => {
      if (!state.compareLocationIds.includes(id)) return state;
      return {
        ...state,
        compareLocationIds: state.compareLocationIds.filter(
          (compareId) => compareId !== id,
        ),
      };
    });
  }, [updateCurrentUserState]);

  const upsertManagedListing = useCallback((listing: ManagedListing) => {
    setManagedListings((prev) => [
      listing,
      ...prev.filter((item) => item.id !== listing.id),
    ]);
  }, []);

  const removeManagedListing = useCallback((id: string) => {
    setManagedListings((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleManagedListingPublication = useCallback((id: string) => {
    setManagedListings((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, published: !item.published } : item,
      ),
    );
  }, []);

  const createAccount = useCallback((account: Omit<CurrentUser, "id">) => {
    const normalizedEmail = account.email.trim().toLowerCase();
    if (!normalizedEmail) return;

    const id = `account-${Date.now()}`;
    const nextAccount: CurrentUser = {
      ...account,
      id,
      email: normalizedEmail,
      name: account.name.trim() || normalizedEmail,
    };

    setAccounts((prev) => [
      nextAccount,
      ...prev.filter((item) => item.email.toLowerCase() !== normalizedEmail),
    ]);
    setUserStatesMap((map) => ({
      ...map,
      [id]: createDefaultUserState(id),
    }));
    setCurrentUserId(id);
  }, []);

  const switchAccount = useCallback((id: string) => {
    setCurrentUserId((current) => (current === id ? current : id));
  }, []);

  const updateCurrentUser = useCallback(
    (updates: Partial<Omit<CurrentUser, "id">>) => {
      const userId = currentUserIdRef.current;
      if (userId === GUEST_USER.id) return;

      setAccounts((prev) =>
        prev.map((account) =>
          account.id === userId ? { ...account, ...updates } : account,
        ),
      );
    },
    [],
  );

  const saveBusinessProfile = useCallback((profile: BusinessProfile) => {
    setBusinessProfile(profile);
  }, []);

  const clearBusinessProfile = useCallback(() => {
    setBusinessProfile(null);
  }, []);

  const value = useMemo(
    () => {
      const currentUser = resolveCurrentUser(accounts, currentUserId);

      return {
      currentUser,
      accounts,
      isGuest,
      businessProfile,
      isBusinessUser: businessProfile !== null,
      isStorageHydrated: hydratedFromStorage,
      events,
      paymentStates,
      favoriteLocationIds,
      favoriteServiceIds,
      compareLocationIds,
      managedListings,
      addEvent,
      getEvent,
      updateEventTitle,
      updateEventMenuSelections,
      addServiceToEvent,
      markServicePaid,
      toggleFavoriteLocation,
      removeFavoriteLocation,
      toggleFavoriteService,
      removeFavoriteService,
      toggleCompareLocation,
      removeCompareLocation,
      upsertManagedListing,
      removeManagedListing,
      toggleManagedListingPublication,
      createAccount,
      switchAccount,
      updateCurrentUser,
      saveBusinessProfile,
      clearBusinessProfile,
    };
    },
    [
      accounts,
      currentUserId,
      isGuest,
      businessProfile,
      hydratedFromStorage,
      events,
      paymentStates,
      favoriteLocationIds,
      favoriteServiceIds,
      compareLocationIds,
      managedListings,
      addEvent,
      getEvent,
      updateEventTitle,
      updateEventMenuSelections,
      addServiceToEvent,
      markServicePaid,
      toggleFavoriteLocation,
      removeFavoriteLocation,
      toggleFavoriteService,
      removeFavoriteService,
      toggleCompareLocation,
      removeCompareLocation,
      upsertManagedListing,
      removeManagedListing,
      toggleManagedListingPublication,
      createAccount,
      switchAccount,
      updateCurrentUser,
      saveBusinessProfile,
      clearBusinessProfile,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}
