"use client";

import type { BusinessProfile } from "@/types/business";
import {
  assertBiometricCredential,
  biometricErrorMessage,
  enrollBiometricCredential,
  isBiometricAvailable,
} from "@/lib/auth/biometric";
import {
  hashPassword,
  isAccountIdle,
  verifyPassword,
} from "@/lib/auth/password";
import { isEventPast } from "@/lib/event";
import { MOCK_EVENTS } from "@/lib/mock/events";
import {
  sanitizeAccountPaymentCards,
  sanitizeSavedPaymentCard,
} from "@/lib/payments/card-vault";
import type { ManagedListing } from "@/types/admin";
import type { BookedService, EventMenuSelection, UserEvent } from "@/types/event";
import type { SavedPaymentCard } from "@/types/payment";
import {
  normalizeUserSettings,
  type UserSettings,
} from "@/types/user-settings";
import { BiometricSetupModal } from "@/components/auth/biometric-setup-modal";
import { UnlockAccountModal } from "@/components/auth/unlock-account-modal";
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

export type { SavedPaymentCard };

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  instagramHandle?: string;
  phoneNumber?: string;
  paymentCard?: SavedPaymentCard;
  /** Consumer by default; business accounts unlock the Pro shell */
  accountType?: "consumer" | "business";
  businessProfile?: BusinessProfile | null;
  /** Preferenze impostazioni persistite per account */
  settings?: UserSettings;
  /** SHA-256 hash — never store the plain password */
  passwordHash?: string;
  /** ISO timestamp of last unlocked activity */
  lastActiveAt?: string;
  /** WebAuthn platform credential id (base64url) for Face ID / fingerprint */
  biometricCredentialId?: string;
}

export interface CreateAccountInput {
  name: string;
  email: string;
  password: string;
  accountType?: "consumer" | "business";
  businessProfile?: BusinessProfile | null;
  phoneNumber?: string;
  avatarUrl?: string;
  instagramHandle?: string;
}

export type CreateAccountResult =
  | { ok: true }
  | { ok: false; error: string };

type DeepPartialUserSettings = {
  privacy?: Partial<UserSettings["privacy"]>;
  notifications?: Partial<UserSettings["notifications"]>;
  security?: Partial<UserSettings["security"]>;
  account?: Partial<UserSettings["account"]>;
};

export function isProAccount(account: CurrentUser): boolean {
  return account.accountType === "business";
}

export interface CreateBusinessAccountInput {
  ownerName: string;
  email: string;
  phoneNumber: string;
  password: string;
  businessProfile: BusinessProfile;
}

export type CreateBusinessAccountResult =
  | { ok: true }
  | { ok: false; error: string };

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
  prunePastEvents: () => void;
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
  createAccount: (account: CreateAccountInput) => Promise<CreateAccountResult>;
  createBusinessAccount: (
    input: CreateBusinessAccountInput,
  ) => Promise<CreateBusinessAccountResult>;
  deleteAccount: (id: string) => void;
  switchAccount: (id: string) => void;
  updateCurrentUser: (updates: Partial<Omit<CurrentUser, "id">>) => void;
  updateUserSettings: (patch: DeepPartialUserSettings) => void;
  changePassword: (
    currentPassword: string,
    nextPassword: string,
  ) => Promise<CreateAccountResult>;
  unlockAccount: (password: string) => Promise<CreateAccountResult>;
  unlockAccountWithBiometric: () => Promise<CreateAccountResult>;
  enrollBiometric: () => Promise<CreateAccountResult>;
  disableBiometric: () => Promise<CreateAccountResult>;
  isAccountLocked: boolean;
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

function normalizeUserScopedState(
  state: Partial<UserScopedState> | undefined,
  userId: string,
): UserScopedState {
  const fallback = createDefaultUserState(userId);
  if (!state || typeof state !== "object") return fallback;

  return {
    events: Array.isArray(state.events)
      ? state.events
          .filter(
            (event): event is UserEvent =>
              Boolean(event) &&
              typeof event === "object" &&
              typeof event.id === "string" &&
              typeof event.date === "string",
          )
          .map((event) => ({
            ...event,
            title: typeof event.title === "string" ? event.title : "Evento",
            time: typeof event.time === "string" ? event.time : "20:00",
            locationName:
              typeof event.locationName === "string"
                ? event.locationName
                : "Location",
            city: typeof event.city === "string" ? event.city : "",
            status: event.status ?? "draft",
            guestCount:
              typeof event.guestCount === "number" ? event.guestCount : 0,
            services: Array.isArray(event.services) ? event.services : [],
          }))
      : fallback.events,
    paymentStates:
      state.paymentStates && typeof state.paymentStates === "object"
        ? state.paymentStates
        : {},
    favoriteLocationIds: Array.isArray(state.favoriteLocationIds)
      ? state.favoriteLocationIds.filter((id) => typeof id === "string")
      : [],
    favoriteServiceIds: Array.isArray(state.favoriteServiceIds)
      ? state.favoriteServiceIds.filter((id) => typeof id === "string")
      : [],
    compareLocationIds: trimCompareIds(
      Array.isArray(state.compareLocationIds)
        ? state.compareLocationIds.filter((id) => typeof id === "string")
        : [],
    ),
  };
}

function prunePastEventsFromState(state: UserScopedState): UserScopedState {
  const sourceEvents = Array.isArray(state.events) ? state.events : [];
  const events = sourceEvents.filter((event) => !isEventPast(event));
  if (events.length === sourceEvents.length) return state;

  const remainingIds = new Set(events.map((event) => event.id));
  const paymentStates = Object.fromEntries(
    Object.entries(state.paymentStates ?? {}).filter(([key]) => {
      const separator = key.indexOf(":");
      if (separator <= 0) return false;
      return remainingIds.has(key.slice(0, separator));
    }),
  );

  return {
    ...state,
    events,
    paymentStates,
  };
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

function normalizeAccount(account: CurrentUser): CurrentUser {
  const accountType =
    account.accountType === "business" || account.businessProfile
      ? "business"
      : "consumer";

  return {
    ...account,
    email: account.email.trim().toLowerCase(),
    name: account.name.trim() || account.email,
    accountType,
    businessProfile:
      accountType === "business" ? (account.businessProfile ?? null) : null,
    settings: normalizeUserSettings(account.settings),
  };
}

function migrateAccountsWithLegacyBusiness(
  accounts: CurrentUser[],
  legacyProfile: BusinessProfile | null | undefined,
  currentUserId: string | undefined,
): CurrentUser[] {
  const normalized = accounts.map(normalizeAccount);
  if (!legacyProfile) return normalized;
  if (normalized.some((account) => account.accountType === "business")) {
    return normalized;
  }

  const targetId =
    currentUserId &&
    currentUserId !== GUEST_USER.id &&
    normalized.some((account) => account.id === currentUserId)
      ? currentUserId
      : normalized[0]?.id;

  if (!targetId) return normalized;

  return normalized.map((account) =>
    account.id === targetId
      ? {
          ...account,
          accountType: "business" as const,
          businessProfile: legacyProfile,
        }
      : account,
  );
}

function trimCompareIds(ids: string[]) {
  return ids.slice(0, MAX_COMPARE_LOCATIONS);
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

function isUserScopedStateEmpty(state: UserScopedState) {
  return (
    state.events.length === 0 &&
    Object.keys(state.paymentStates).length === 0 &&
    state.favoriteLocationIds.length === 0 &&
    state.favoriteServiceIds.length === 0 &&
    state.compareLocationIds.length === 0
  );
}

/** Preferiti/eventi restano legati all'account: unisce lo stato guest nel target. */
function mergeUserScopedState(
  target: UserScopedState,
  source: UserScopedState,
): UserScopedState {
  const existingEventIds = new Set(target.events.map((event) => event.id));

  return {
    events: [
      ...target.events,
      ...source.events.filter((event) => !existingEventIds.has(event.id)),
    ],
    paymentStates: {
      ...source.paymentStates,
      ...target.paymentStates,
    },
    favoriteLocationIds: uniqueIds([
      ...target.favoriteLocationIds,
      ...source.favoriteLocationIds,
    ]),
    favoriteServiceIds: uniqueIds([
      ...target.favoriteServiceIds,
      ...source.favoriteServiceIds,
    ]),
    compareLocationIds: trimCompareIds(
      uniqueIds([
        ...target.compareLocationIds,
        ...source.compareLocationIds,
      ]),
    ),
  };
}

function claimGuestStateInto(
  map: Record<string, UserScopedState>,
  targetUserId: string,
): Record<string, UserScopedState> {
  const guestState = map[GUEST_USER.id];
  const base = map[targetUserId] ?? createDefaultUserState(targetUserId);

  if (!guestState || isUserScopedStateEmpty(guestState)) {
    if (map[targetUserId]) return map;
    return { ...map, [targetUserId]: base };
  }

  return {
    ...map,
    [targetUserId]: mergeUserScopedState(base, guestState),
    [GUEST_USER.id]: createDefaultUserState(GUEST_USER.id),
  };
}

function ensureAccountStateSlots(
  map: Record<string, UserScopedState>,
  accounts: CurrentUser[],
): Record<string, UserScopedState> {
  let next = map;
  let changed = false;

  for (const account of accounts) {
    if (account.id in next) continue;
    if (!changed) {
      next = { ...next };
      changed = true;
    }
    next[account.id] = createDefaultUserState(account.id);
  }

  if (!(GUEST_USER.id in next)) {
    if (!changed) {
      next = { ...next };
      changed = true;
    }
    next[GUEST_USER.id] = createDefaultUserState(GUEST_USER.id);
  }

  return next;
}

function hydrateUserStates(stored: StoredAppState): Record<string, UserScopedState> {
  const accounts = stored.accounts ?? MOCK_ACCOUNTS;

  if (stored.userStates && Object.keys(stored.userStates).length > 0) {
    const map = Object.fromEntries(
      Object.entries(stored.userStates).map(([userId, state]) => [
        userId,
        normalizeUserScopedState(state, userId),
      ]),
    );
    return ensureAccountStateSlots(map, accounts);
  }

  const map = Object.fromEntries(
    accounts.map((account) => [account.id, createDefaultUserState(account.id)]),
  );
  map[GUEST_USER.id] = createDefaultUserState(GUEST_USER.id);

  const ownerId = stored.currentUserId ?? MOCK_CURRENT_USER.id;
  const hasLegacyData =
    stored.events ||
    stored.paymentStates ||
    stored.favoriteLocationIds ||
    stored.favoriteServiceIds ||
    stored.compareLocationIds;

  if (hasLegacyData) {
    map[ownerId] = normalizeUserScopedState(
      {
        events: stored.events ?? map[ownerId]?.events ?? MOCK_EVENTS,
        paymentStates: stored.paymentStates ?? {},
        favoriteLocationIds: stored.favoriteLocationIds ?? [],
        favoriteServiceIds: stored.favoriteServiceIds ?? [],
        compareLocationIds: stored.compareLocationIds ?? [],
      },
      ownerId,
    );
  }

  return map;
}

function readStoredAppState(): StoredAppState {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return {};
    const parsed = JSON.parse(rawValue) as StoredAppState;
    if (parsed.accounts) {
      parsed.accounts = sanitizeAccountPaymentCards(parsed.accounts);
    }
    return parsed;
  } catch {
    return {};
  }
}

function writeStoredAppState(state: StoredAppState) {
  if (typeof window === "undefined") return;

  try {
    const safeState: StoredAppState = {
      ...state,
      accounts: state.accounts
        ? sanitizeAccountPaymentCards(state.accounts)
        : state.accounts,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
  } catch {
    // Storage can be unavailable in private mode; the app should keep working.
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hydratedFromStorage, setHydratedFromStorage] = useState(false);
  const [accounts, setAccounts] = useState<CurrentUser[]>(MOCK_ACCOUNTS);
  const [currentUserId, setCurrentUserId] = useState(GUEST_USER.id);
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
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [pendingBiometricSetup, setPendingBiometricSetup] = useState(false);
  const isGuest = currentUserId === GUEST_USER.id;
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  const currentUser = resolveCurrentUser(accounts, currentUserId);
  const businessProfile =
    currentUser.accountType === "business"
      ? (currentUser.businessProfile ?? null)
      : null;
  const isBusinessUser = currentUser.accountType === "business";

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
      const migratedAccounts = migrateAccountsWithLegacyBusiness(
        storedState.accounts ?? MOCK_ACCOUNTS,
        storedState.businessProfile,
        storedState.currentUserId,
      );
      const requestedUserId = storedState.currentUserId;
      const resolvedUserId =
        requestedUserId === GUEST_USER.id ||
        migratedAccounts.some((account) => account.id === requestedUserId)
          ? (requestedUserId ?? GUEST_USER.id)
          : GUEST_USER.id;

      setAccounts(migratedAccounts);
      setCurrentUserId(resolvedUserId);
      setUserStatesMap(hydrateUserStates(storedState));
      if (storedState.managedListings) {
        setManagedListings(storedState.managedListings);
      }

      const activeAccount = migratedAccounts.find(
        (account) => account.id === resolvedUserId,
      );
      if (
        activeAccount?.passwordHash &&
        isAccountIdle(activeAccount.lastActiveAt)
      ) {
        setIsAccountLocked(true);
      }

      setHydratedFromStorage(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const touchAccountActivity = useCallback((userId: string) => {
    if (!userId || userId === GUEST_USER.id) return;
    const stamp = new Date().toISOString();
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === userId
          ? normalizeAccount({ ...account, lastActiveAt: stamp })
          : account,
      ),
    );
  }, []);

  const markUnlocked = useCallback(
    (userId: string) => {
      setIsAccountLocked(false);
      setUnlockError(null);
      touchAccountActivity(userId);
    },
    [touchAccountActivity],
  );

  const promptBiometricSetupIfAvailable = useCallback(async () => {
    const available = await isBiometricAvailable();
    if (available) {
      setPendingBiometricSetup(true);
    }
  }, []);

  useEffect(() => {
    if (!hydratedFromStorage) return;
    if (isGuest || isAccountLocked) return;

    touchAccountActivity(currentUserId);
    const interval = window.setInterval(() => {
      touchAccountActivity(currentUserIdRef.current);
    }, 5 * 60_000);

    return () => window.clearInterval(interval);
  }, [
    currentUserId,
    hydratedFromStorage,
    isAccountLocked,
    isGuest,
    touchAccountActivity,
  ]);

  useEffect(() => {
    if (!hydratedFromStorage) return;

    writeStoredAppState({
      accounts,
      currentUserId,
      // Keep legacy key in sync with the active business account for older builds
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

  useEffect(() => {
    if (!hydratedFromStorage) return;

    const pruneAllUsers = () => {
      setUserStatesMap((map) => {
        let changed = false;
        const next: Record<string, UserScopedState> = { ...map };

        for (const [userId, state] of Object.entries(map)) {
          const pruned = prunePastEventsFromState(state);
          if (pruned !== state) {
            next[userId] = pruned;
            changed = true;
          }
        }

        return changed ? next : map;
      });
    };

    pruneAllUsers();
    const interval = window.setInterval(pruneAllUsers, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") pruneAllUsers();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hydratedFromStorage]);

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

  const prunePastEvents = useCallback(() => {
    updateCurrentUserState((state) => prunePastEventsFromState(state));
  }, [updateCurrentUserState]);

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

  const createAccount = useCallback(
    async (account: CreateAccountInput): Promise<CreateAccountResult> => {
      const normalizedEmail = account.email.trim().toLowerCase();
      const password = account.password;
      if (!normalizedEmail) {
        return { ok: false, error: "Inserisci un’email valida." };
      }
      if (!password || password.length < 8) {
        return {
          ok: false,
          error: "La password deve avere almeno 8 caratteri.",
        };
      }

      const passwordHash = await hashPassword(password);
      const nextName = account.name.trim() || normalizedEmail;
      const nextAccountType =
        account.accountType === "business" || account.businessProfile
          ? ("business" as const)
          : ("consumer" as const);
      const now = new Date().toISOString();

      const existing = accounts.find(
        (item) => item.email.toLowerCase() === normalizedEmail,
      );

      if (existing) {
        if (existing.passwordHash) {
          const matches = await verifyPassword(password, existing.passwordHash);
          if (!matches) {
            return {
              ok: false,
              error: "Password non corretta per questo account.",
            };
          }
        }

        // Keep existing account type/profile unless this call explicitly upgrades to business.
        const upgradedToBusiness = nextAccountType === "business";
        const resolvedAccountType = upgradedToBusiness
          ? ("business" as const)
          : (existing.accountType ?? "consumer");
        const firstPasswordSet = !existing.passwordHash;

        setAccounts((prev) =>
          prev.map((item) =>
            item.id === existing.id
              ? normalizeAccount({
                  ...item,
                  name: nextName,
                  email: normalizedEmail,
                  accountType: resolvedAccountType,
                  businessProfile: upgradedToBusiness
                    ? (account.businessProfile ??
                      item.businessProfile ??
                      null)
                    : (item.businessProfile ?? null),
                  phoneNumber: account.phoneNumber ?? item.phoneNumber,
                  avatarUrl: account.avatarUrl ?? item.avatarUrl,
                  instagramHandle:
                    account.instagramHandle ?? item.instagramHandle,
                  passwordHash: existing.passwordHash ?? passwordHash,
                  lastActiveAt: now,
                })
              : item,
          ),
        );
        setUserStatesMap((map) => claimGuestStateInto(map, existing.id));
        setCurrentUserId(existing.id);
        setIsAccountLocked(false);
        setUnlockError(null);
        if (firstPasswordSet) {
          void promptBiometricSetupIfAvailable();
        }
        return { ok: true };
      }

      const id = `account-${Date.now()}`;
      const nextAccount = normalizeAccount({
        id,
        name: nextName,
        email: normalizedEmail,
        phoneNumber: account.phoneNumber,
        avatarUrl: account.avatarUrl,
        instagramHandle: account.instagramHandle,
        accountType: nextAccountType,
        businessProfile:
          nextAccountType === "business"
            ? (account.businessProfile ?? null)
            : null,
        passwordHash,
        lastActiveAt: now,
      });

      setAccounts((prev) => [nextAccount, ...prev]);
      setUserStatesMap((map) => claimGuestStateInto(map, id));
      setCurrentUserId(id);
      setIsAccountLocked(false);
      setUnlockError(null);
      void promptBiometricSetupIfAvailable();
      return { ok: true };
    },
    [accounts, promptBiometricSetupIfAvailable],
  );

  const createBusinessAccount = useCallback(
    async (
      input: CreateBusinessAccountInput,
    ): Promise<CreateBusinessAccountResult> => {
      const normalizedEmail = input.email.trim().toLowerCase();
      const nextName = input.ownerName.trim();
      const phoneNumber = input.phoneNumber.trim();
      const password = input.password;

      if (!nextName || !normalizedEmail) {
        return {
          ok: false,
          error: "Inserisci nome proprietario ed email.",
        };
      }
      if (!password || password.length < 8) {
        return {
          ok: false,
          error: "La password deve avere almeno 8 caratteri.",
        };
      }

      const sameIdentity = accounts.some(
        (account) =>
          account.email.toLowerCase() === normalizedEmail &&
          account.name.trim().toLowerCase() === nextName.toLowerCase(),
      );

      if (sameIdentity) {
        return {
          ok: false,
          error:
            "Questo account esiste già. Per creare un account Pro usa una email nuova oppure un nome diverso.",
        };
      }

      const passwordHash = await hashPassword(password);
      const id = `account-pro-${Date.now()}`;
      const nextAccount = normalizeAccount({
        id,
        name: nextName,
        email: normalizedEmail,
        phoneNumber,
        accountType: "business",
        businessProfile: input.businessProfile,
        passwordHash,
        lastActiveAt: new Date().toISOString(),
      });

      setAccounts((prev) => [nextAccount, ...prev]);
      setUserStatesMap((map) => claimGuestStateInto(map, id));
      setCurrentUserId(id);
      setIsAccountLocked(false);
      setUnlockError(null);
      void promptBiometricSetupIfAvailable();

      return { ok: true };
    },
    [accounts, promptBiometricSetupIfAvailable],
  );

  const deleteAccount = useCallback((id: string) => {
    if (id === GUEST_USER.id) return;

    setPendingBiometricSetup(false);
    setAccounts((prev) => {
      const next = prev.filter((account) => account.id !== id);

      setCurrentUserId((current) => {
        if (current !== id) return current;
        setIsAccountLocked(false);
        setUnlockError(null);
        return next[0]?.id ?? GUEST_USER.id;
      });

      return next;
    });

    setUserStatesMap((map) => {
      if (!(id in map)) return map;
      const { [id]: _removed, ...rest } = map;
      void _removed;
      return rest;
    });
  }, []);

  const switchAccount = useCallback(
    (id: string) => {
      setPendingBiometricSetup(false);
      if (id === GUEST_USER.id) {
        setCurrentUserId(GUEST_USER.id);
        setIsAccountLocked(false);
        setUnlockError(null);
        return;
      }
      const target = accounts.find((account) => account.id === id);
      if (!target) return;
      setCurrentUserId((current) => (current === id ? current : id));
      if (target.passwordHash && isAccountIdle(target.lastActiveAt)) {
        setIsAccountLocked(true);
        setUnlockError(null);
      } else {
        setIsAccountLocked(false);
        setUnlockError(null);
        if (target.passwordHash) {
          touchAccountActivity(id);
        }
      }
    },
    [accounts, touchAccountActivity],
  );

  const unlockAccount = useCallback(
    async (password: string): Promise<CreateAccountResult> => {
      const userId = currentUserIdRef.current;
      if (userId === GUEST_USER.id) {
        return { ok: false, error: "Nessun account da sbloccare." };
      }

      const account = accounts.find((item) => item.id === userId);
      if (!account?.passwordHash) {
        markUnlocked(userId);
        return { ok: true };
      }

      const matches = await verifyPassword(password, account.passwordHash);
      if (!matches) {
        setUnlockError("Password non corretta.");
        return { ok: false, error: "Password non corretta." };
      }

      markUnlocked(userId);
      return { ok: true };
    },
    [accounts, markUnlocked],
  );

  const unlockAccountWithBiometric = useCallback(async (): Promise<CreateAccountResult> => {
    const userId = currentUserIdRef.current;
    if (userId === GUEST_USER.id) {
      return { ok: false, error: "Nessun account da sbloccare." };
    }

    const account = accounts.find((item) => item.id === userId);
    const credentialId = account?.biometricCredentialId;
    if (
      !credentialId ||
      !normalizeUserSettings(account.settings).security.biometricUnlock
    ) {
      return {
        ok: false,
        error: "Sblocco biometrico non attivo su questo account.",
      };
    }

    try {
      await assertBiometricCredential(credentialId);
      markUnlocked(userId);
      return { ok: true };
    } catch (error) {
      const message = biometricErrorMessage(error);
      setUnlockError(message);
      return { ok: false, error: message };
    }
  }, [accounts, markUnlocked]);

  const enrollBiometric = useCallback(async (): Promise<CreateAccountResult> => {
    const userId = currentUserIdRef.current;
    if (userId === GUEST_USER.id) {
      return {
        ok: false,
        error: "Crea un account per attivare Face ID o impronta.",
      };
    }

    const account = accounts.find((item) => item.id === userId);
    if (!account) {
      return { ok: false, error: "Account non trovato." };
    }

    const markBiometricEnabled = (credentialId: string) => {
      setAccounts((prev) =>
        prev.map((item) =>
          item.id === userId
            ? normalizeAccount({
                ...item,
                biometricCredentialId: credentialId,
                settings: {
                  ...normalizeUserSettings(item.settings),
                  security: {
                    ...normalizeUserSettings(item.settings).security,
                    biometricUnlock: true,
                  },
                },
              })
            : item,
        ),
      );
      setPendingBiometricSetup(false);
    };

    // Re-enable an existing platform credential instead of recreating it
    // (recreate often fails with InvalidStateError on the same device).
    if (account.biometricCredentialId) {
      try {
        await assertBiometricCredential(account.biometricCredentialId);
        markBiometricEnabled(account.biometricCredentialId);
        return { ok: true };
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          return { ok: false, error: biometricErrorMessage(error) };
        }
        // Stale credential on this device — fall through and enroll fresh.
      }
    }

    const available = await isBiometricAvailable();
    if (!available) {
      return {
        ok: false,
        error: "Questo dispositivo non supporta Face ID o impronta.",
      };
    }

    try {
      const credentialId = await enrollBiometricCredential({
        userId: account.id,
        email: account.email,
        displayName: account.name,
      });
      markBiometricEnabled(credentialId);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: biometricErrorMessage(error) };
    }
  }, [accounts]);

  const disableBiometric = useCallback(async (): Promise<CreateAccountResult> => {
    const userId = currentUserIdRef.current;
    if (userId === GUEST_USER.id) {
      return { ok: false, error: "Nessun account attivo." };
    }

    // Keep credentialId so re-enable can reuse the platform authenticator.
    setAccounts((prev) =>
      prev.map((item) =>
        item.id === userId
          ? normalizeAccount({
              ...item,
              settings: {
                ...normalizeUserSettings(item.settings),
                security: {
                  ...normalizeUserSettings(item.settings).security,
                  biometricUnlock: false,
                },
              },
            })
          : item,
      ),
    );
    return { ok: true };
  }, []);

  const changePassword = useCallback(
    async (
      currentPassword: string,
      nextPassword: string,
    ): Promise<CreateAccountResult> => {
      const userId = currentUserIdRef.current;
      if (userId === GUEST_USER.id) {
        return { ok: false, error: "Crea un account per gestire la password." };
      }

      const account = accounts.find((item) => item.id === userId);
      if (!account) {
        return { ok: false, error: "Account non trovato." };
      }

      if (account.passwordHash) {
        const matches = await verifyPassword(
          currentPassword,
          account.passwordHash,
        );
        if (!matches) {
          return { ok: false, error: "Password attuale non corretta." };
        }
      }

      if (nextPassword.length < 8) {
        return {
          ok: false,
          error: "La nuova password deve avere almeno 8 caratteri.",
        };
      }

      const passwordHash = await hashPassword(nextPassword);
      setAccounts((prev) =>
        prev.map((item) =>
          item.id === userId
            ? normalizeAccount({
                ...item,
                passwordHash,
                lastActiveAt: new Date().toISOString(),
              })
            : item,
        ),
      );
      return { ok: true };
    },
    [accounts],
  );

  const updateCurrentUser = useCallback(
    (updates: Partial<Omit<CurrentUser, "id">>) => {
      const userId = currentUserIdRef.current;
      if (userId === GUEST_USER.id) return;

      const safeUpdates = { ...updates };
      if ("paymentCard" in safeUpdates) {
        safeUpdates.paymentCard = safeUpdates.paymentCard
          ? sanitizeSavedPaymentCard(safeUpdates.paymentCard)
          : undefined;
      }
      if ("settings" in safeUpdates) {
        safeUpdates.settings = normalizeUserSettings(safeUpdates.settings);
      }

      setAccounts((prev) =>
        prev.map((account) =>
          account.id === userId
            ? normalizeAccount({ ...account, ...safeUpdates })
            : account,
        ),
      );
    },
    [],
  );

  const updateUserSettings = useCallback(
    (patch: DeepPartialUserSettings) => {
      const userId = currentUserIdRef.current;
      if (userId === GUEST_USER.id) return;

      setAccounts((prev) =>
        prev.map((account) => {
          if (account.id !== userId) return account;
          const current = normalizeUserSettings(account.settings);
          return normalizeAccount({
            ...account,
            settings: normalizeUserSettings({
              privacy: { ...current.privacy, ...patch.privacy },
              notifications: {
                ...current.notifications,
                ...patch.notifications,
              },
              security: { ...current.security, ...patch.security },
              account: { ...current.account, ...patch.account },
            }),
          });
        }),
      );
    },
    [],
  );

  const saveBusinessProfile = useCallback((profile: BusinessProfile) => {
    const userId = currentUserIdRef.current;
    if (userId === GUEST_USER.id) return;

    setAccounts((prev) =>
      prev.map((account) =>
        account.id === userId
          ? normalizeAccount({
              ...account,
              accountType: "business",
              businessProfile: profile,
            })
          : account,
      ),
    );
  }, []);

  const clearBusinessProfile = useCallback(() => {
    const userId = currentUserIdRef.current;
    if (userId === GUEST_USER.id) return;

    setAccounts((prev) =>
      prev.map((account) =>
        account.id === userId
          ? normalizeAccount({
              ...account,
              accountType: "consumer",
              businessProfile: null,
            })
          : account,
      ),
    );
  }, []);

  const value = useMemo(
    () => {
      return {
      currentUser,
      accounts,
      isGuest,
      businessProfile,
      isBusinessUser,
      isStorageHydrated: hydratedFromStorage,
      events,
      paymentStates,
      favoriteLocationIds,
      favoriteServiceIds,
      compareLocationIds,
      managedListings,
      addEvent,
      getEvent,
      prunePastEvents,
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
      createBusinessAccount,
      deleteAccount,
      switchAccount,
      updateCurrentUser,
      updateUserSettings,
      changePassword,
      unlockAccount,
      unlockAccountWithBiometric,
      enrollBiometric,
      disableBiometric,
      isAccountLocked,
      saveBusinessProfile,
      clearBusinessProfile,
    };
    },
    [
      accounts,
      currentUser,
      isGuest,
      businessProfile,
      isBusinessUser,
      hydratedFromStorage,
      events,
      paymentStates,
      favoriteLocationIds,
      favoriteServiceIds,
      compareLocationIds,
      managedListings,
      addEvent,
      getEvent,
      prunePastEvents,
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
      createBusinessAccount,
      deleteAccount,
      switchAccount,
      updateCurrentUser,
      updateUserSettings,
      changePassword,
      unlockAccount,
      unlockAccountWithBiometric,
      enrollBiometric,
      disableBiometric,
      isAccountLocked,
      saveBusinessProfile,
      clearBusinessProfile,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
      {isAccountLocked && !isGuest && (
        <UnlockAccountModal
          accountName={currentUser.name}
          accountEmail={currentUser.email}
          error={unlockError}
          biometricEnabled={Boolean(
            currentUser.biometricCredentialId &&
              currentUser.settings?.security.biometricUnlock,
          )}
          onSubmit={async (password) => {
            await unlockAccount(password);
          }}
          onUnlockBiometric={
            currentUser.biometricCredentialId &&
            currentUser.settings?.security.biometricUnlock
              ? async () => {
                  const result = await unlockAccountWithBiometric();
                  if (!result.ok) {
                    throw new Error(result.error);
                  }
                }
              : undefined
          }
          onSwitchGuest={() => switchAccount(GUEST_USER.id)}
        />
      )}
      <BiometricSetupModal
        open={pendingBiometricSetup && !isGuest && !isAccountLocked}
        accountName={currentUser.name}
        onEnable={async () => {
          const result = await enrollBiometric();
          if (!result.ok) {
            throw new Error(result.error);
          }
        }}
        onSkip={() => setPendingBiometricSetup(false)}
      />
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}
