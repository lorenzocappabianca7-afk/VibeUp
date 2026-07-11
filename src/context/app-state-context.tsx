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
  businessProfile: BusinessProfile | null;
  isBusinessUser: boolean;
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
const STORAGE_KEY = "vibeup-app-state-v1";

interface StoredAppState {
  accounts?: CurrentUser[];
  currentUserId?: string;
  businessProfile?: BusinessProfile | null;
  events?: UserEvent[];
  paymentStates?: Record<string, PaymentState>;
  favoriteLocationIds?: string[];
  favoriteServiceIds?: string[];
  compareLocationIds?: string[];
  managedListings?: ManagedListing[];
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
  const [currentUserId, setCurrentUserId] = useState(MOCK_CURRENT_USER.id);
  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfile | null>(null);
  const [events, setEvents] = useState<UserEvent[]>(MOCK_EVENTS);
  const [paymentStates, setPaymentStates] = useState<Record<string, PaymentState>>(
    {},
  );
  const [favoriteLocationIds, setFavoriteLocationIds] = useState<string[]>([]);
  const [favoriteServiceIds, setFavoriteServiceIds] = useState<string[]>([]);
  const [compareLocationIds, setCompareLocationIds] = useState<string[]>([]);
  const [managedListings, setManagedListings] = useState<ManagedListing[]>([]);

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
      if (storedState.events) setEvents(storedState.events);
      if (storedState.paymentStates) setPaymentStates(storedState.paymentStates);
      if (storedState.favoriteLocationIds) {
        setFavoriteLocationIds(storedState.favoriteLocationIds);
      }
      if (storedState.favoriteServiceIds) {
        setFavoriteServiceIds(storedState.favoriteServiceIds);
      }
      if (storedState.compareLocationIds) {
        setCompareLocationIds(storedState.compareLocationIds);
      }
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
      events,
      paymentStates,
      favoriteLocationIds,
      favoriteServiceIds,
      compareLocationIds,
      managedListings,
    });
  }, [
    accounts,
    businessProfile,
    compareLocationIds,
    currentUserId,
    events,
    favoriteLocationIds,
    favoriteServiceIds,
    hydratedFromStorage,
    managedListings,
    paymentStates,
  ]);

  const addEvent = useCallback((event: UserEvent) => {
    setEvents((prev) => [event, ...prev.filter((item) => item.id !== event.id)]);
  }, []);

  const getEvent = useCallback(
    (id: string) => events.find((event) => event.id === id),
    [events],
  );

  const updateEventTitle = useCallback((eventId: string, title: string) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId && event.title !== title ? { ...event, title } : event,
      ),
    );
  }, []);

  const updateEventMenuSelections = useCallback(
    (eventId: string, selections: EventMenuSelection[]) => {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId
            ? { ...event, menuSelections: selections }
            : event,
        ),
      );
    },
    [],
  );

  const addServiceToEvent = useCallback(
    (eventId: string, service: BookedService) => {
      setEvents((prev) =>
        prev.map((event) => {
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
      );
    },
    [],
  );

  const markServicePaid = useCallback(
    (eventId: string, serviceId: string, method?: string) => {
      setPaymentStates((current) => {
        const key = `${eventId}:${serviceId}`;
        const existing = current[key];
        if (existing?.paid && existing.method === method) return current;

        return {
          ...current,
          [key]: { paid: true, method },
        };
      });
    },
    [],
  );

  const toggleFavoriteLocation = useCallback((id: string) => {
    setFavoriteLocationIds((prev) =>
      prev.includes(id)
        ? prev.filter((favoriteId) => favoriteId !== id)
        : [...prev, id],
    );
  }, []);

  const removeFavoriteLocation = useCallback((id: string) => {
    setFavoriteLocationIds((prev) => {
      if (!prev.includes(id)) return prev;
      return prev.filter((favoriteId) => favoriteId !== id);
    });
  }, []);

  const toggleFavoriteService = useCallback((id: string) => {
    setFavoriteServiceIds((prev) =>
      prev.includes(id)
        ? prev.filter((favoriteId) => favoriteId !== id)
        : [...prev, id],
    );
  }, []);

  const removeFavoriteService = useCallback((id: string) => {
    setFavoriteServiceIds((prev) => {
      if (!prev.includes(id)) return prev;
      return prev.filter((favoriteId) => favoriteId !== id);
    });
  }, []);

  const toggleCompareLocation = useCallback((id: string) => {
    setCompareLocationIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((compareId) => compareId !== id);
      }

      const next = [...prev, id];
      return next.length > MAX_COMPARE_LOCATIONS
        ? next.slice(next.length - MAX_COMPARE_LOCATIONS)
        : next;
    });
  }, []);

  const removeCompareLocation = useCallback((id: string) => {
    setCompareLocationIds((prev) => {
      if (!prev.includes(id)) return prev;
      return prev.filter((compareId) => compareId !== id);
    });
  }, []);

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
    setCurrentUserId(id);
  }, []);

  const switchAccount = useCallback((id: string) => {
    setCurrentUserId((current) => (current === id ? current : id));
  }, []);

  const updateCurrentUser = useCallback(
    (updates: Partial<Omit<CurrentUser, "id">>) => {
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === currentUserId ? { ...account, ...updates } : account,
        ),
      );
    },
    [currentUserId],
  );

  const saveBusinessProfile = useCallback((profile: BusinessProfile) => {
    setBusinessProfile(profile);
  }, []);

  const clearBusinessProfile = useCallback(() => {
    setBusinessProfile(null);
  }, []);

  const value = useMemo(
    () => {
      const currentUser =
        accounts.find((account) => account.id === currentUserId) ??
        accounts[0] ??
        MOCK_CURRENT_USER;

      return {
      currentUser,
      accounts,
      businessProfile,
      isBusinessUser: businessProfile !== null,
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
      businessProfile,
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
