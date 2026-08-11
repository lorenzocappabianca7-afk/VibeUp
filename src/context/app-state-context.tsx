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
  needsPasswordRehash,
  verifyPassword,
} from "@/lib/auth/password";
import {
  fetchSupabaseProfile,
  mapProfileRoleToAccountType,
  supabaseResetPassword,
  supabaseSignIn,
  supabaseSignOut,
  supabaseSignUp,
  supabaseUpdatePassword,
  type AppRole,
} from "@/lib/auth/supabase-auth";
import {
  getSupabaseBrowser,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/browser";
import {
  createActivationToken,
  getActivationExpiryIso,
  isActivationTokenExpired,
} from "@/lib/auth/activation";
import { isEventPast } from "@/lib/event";
import { calculateLocationDeposit } from "@/lib/booking-money";
import {
  allergenRestrictionNames,
  normalizeAllergenRestrictions,
  pruneMenuSelectionsForAllergens,
} from "@/lib/menu-allergens";
import { MOCK_EVENTS } from "@/lib/mock/events";
import {
  sanitizeAccountPaymentCards,
  sanitizeSavedPaymentCard,
} from "@/lib/payments/card-vault";
import {
  sanitizeEmail,
  sanitizeHandle,
  sanitizePlainText,
  sanitizeUrl,
} from "@/lib/security/sanitize";
import { scrubPersistedJson } from "@/lib/security/persist-scrub";
import { purgeUserSatelliteStorage } from "@/lib/local-user-data-cleanup";
import type { ManagedListing } from "@/types/admin";
import type {
  BookedService,
  EventMenuSelection,
  MenuAllergenRestriction,
  UserEvent,
} from "@/types/event";
import type { SavedPaymentCard } from "@/types/payment";
import type { SavedQuote } from "@/types/saved-quote";
import { MAX_SAVED_QUOTES } from "@/types/saved-quote";
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
  /** Supabase profiles.role when auth is cloud-backed */
  role?: "guest" | "consumer" | "business" | "admin";
  businessProfile?: BusinessProfile | null;
  /** Preferenze impostazioni persistite per account */
  settings?: UserSettings;
  /** SHA-256 hash — never store the plain password */
  passwordHash?: string;
  /** ISO timestamp of last unlocked activity */
  lastActiveAt?: string;
  /** WebAuthn platform credential id (base64url) for Face ID / fingerprint */
  biometricCredentialId?: string;
  /** false until the user confirms email via activation link */
  emailVerified?: boolean;
  activationToken?: string;
  activationTokenExpiresAt?: string;
  /** True when identity comes from Supabase Auth */
  authProvider?: "local" | "supabase";
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
  /** When true, reject if an account with the same email already exists. */
  requireNew?: boolean;
  /** Modal mode: register (default), login, or password reset */
  mode?: "register" | "login" | "reset";
}

export type CreateAccountResult =
  | {
      ok: true;
      needsEmailActivation?: boolean;
      activationToken?: string;
      email?: string;
      name?: string;
    }
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
  | {
      ok: true;
      needsEmailActivation?: boolean;
      activationToken?: string;
      email?: string;
      name?: string;
    }
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
  savedQuotes: SavedQuote[];
  managedListings: ManagedListing[];
  addEvent: (event: UserEvent) => void;
  getEvent: (id: string) => UserEvent | undefined;
  deleteEvent: (eventId: string) => void;
  prunePastEvents: () => void;
  updateEventTitle: (eventId: string, title: string) => void;
  updateEventMenuSelections: (
    eventId: string,
    selections: EventMenuSelection[],
  ) => void;
  updateEventMenuAllergens: (
    eventId: string,
    allergens: MenuAllergenRestriction[],
  ) => void;
  addServiceToEvent: (eventId: string, service: BookedService) => void;
  markServicePaid: (eventId: string, serviceId: string, method?: string) => void;
  toggleFavoriteLocation: (id: string) => void;
  removeFavoriteLocation: (id: string) => void;
  toggleFavoriteService: (id: string) => void;
  removeFavoriteService: (id: string) => void;
  toggleCompareLocation: (id: string) => void;
  removeCompareLocation: (id: string) => void;
  saveQuote: (quote: SavedQuote) => void;
  removeSavedQuote: (id: string) => void;
  isQuoteSaved: (id: string) => boolean;
  upsertManagedListing: (listing: ManagedListing) => void;
  removeManagedListing: (id: string) => void;
  toggleManagedListingPublication: (id: string) => void;
  setManagedListingStatus: (
    id: string,
    status: "draft" | "pending_review" | "published",
  ) => void;
  createAccount: (account: CreateAccountInput) => Promise<CreateAccountResult>;
  createBusinessAccount: (
    input: CreateBusinessAccountInput,
  ) => Promise<CreateBusinessAccountResult>;
  activateAccountWithToken: (token: string) => CreateAccountResult;
  issueActivationToken: (accountId?: string) => CreateAccountResult & {
    activationToken?: string;
    email?: string;
    name?: string;
  };
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
  emailVerified: true,
};

const MOCK_CURRENT_USER: CurrentUser = {
  id: "account-vibeup-planner",
  name: "VibeUp Planner",
  email: "vibeup.planner@gmail.com",
  emailVerified: true,
};

const MOCK_ACCOUNTS: CurrentUser[] = [
  MOCK_CURRENT_USER,
  {
    id: "account-demo-user",
    name: "Lorenzo C.",
    email: "lorenzo@email.com",
    emailVerified: true,
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
  savedQuotes: SavedQuote[];
}

function isSavedQuote(value: unknown): value is SavedQuote {
  if (!value || typeof value !== "object") return false;
  const item = value as SavedQuote;
  return (
    typeof item.id === "string" &&
    typeof item.locationId === "string" &&
    typeof item.locationName === "string" &&
    typeof item.imageUrl === "string" &&
    item.quote != null &&
    typeof item.quote === "object" &&
    typeof item.quote.total === "number"
  );
}

function normalizeSavedQuotes(value: unknown): SavedQuote[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isSavedQuote).slice(0, MAX_SAVED_QUOTES);
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
    savedQuotes: normalizeSavedQuotes(state.savedQuotes),
    // Compare is session-only: never restore selections from previous visits.
    compareLocationIds: [],
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
    savedQuotes: [],
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
    // Legacy accounts without the field stay usable.
    emailVerified: account.emailVerified !== false,
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
    state.compareLocationIds.length === 0 &&
    state.savedQuotes.length === 0
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
    savedQuotes: [
      ...target.savedQuotes,
      ...source.savedQuotes.filter(
        (quote) => !target.savedQuotes.some((item) => item.id === quote.id),
      ),
    ].slice(0, MAX_SAVED_QUOTES),
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
    const parsed = scrubPersistedJson(
      JSON.parse(rawValue) as StoredAppState,
    );
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

  const stripHeavyAvatars = (accounts: CurrentUser[] | undefined) =>
    accounts?.map((account) =>
      account.avatarUrl?.startsWith("data:")
        ? { ...account, avatarUrl: undefined }
        : account,
    );

  const buildPayload = (
    aggressive: boolean,
    dropDataAvatars: boolean,
  ): StoredAppState => {
    const userStates = state.userStates
      ? Object.fromEntries(
          Object.entries(state.userStates).map(([userId, userState]) => {
            const pruned = prunePastEventsFromState(userState);
            return [
              userId,
              {
                ...pruned,
                // Never persist compare picks — favorites/events stay as-is.
                compareLocationIds: [],
                favoriteLocationIds: aggressive
                  ? pruned.favoriteLocationIds.slice(0, 40)
                  : pruned.favoriteLocationIds,
                favoriteServiceIds: aggressive
                  ? pruned.favoriteServiceIds.slice(0, 40)
                  : pruned.favoriteServiceIds,
                savedQuotes: aggressive
                  ? pruned.savedQuotes.slice(0, 10)
                  : pruned.savedQuotes.slice(0, MAX_SAVED_QUOTES),
                events: aggressive ? pruned.events.slice(0, 20) : pruned.events,
              },
            ];
          }),
        )
      : state.userStates;

    const accounts = dropDataAvatars
      ? stripHeavyAvatars(state.accounts)
      : state.accounts
        ? sanitizeAccountPaymentCards(state.accounts)
        : state.accounts;

    return {
      ...state,
      userStates,
      compareLocationIds: undefined,
      managedListings: aggressive
        ? (state.managedListings ?? []).slice(0, 30)
        : state.managedListings,
      accounts: dropDataAvatars
        ? accounts
          ? sanitizeAccountPaymentCards(accounts)
          : accounts
        : accounts,
    };
  };

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(buildPayload(false, false)),
    );
  } catch {
    // Quota / private mode: compact, then drop data-URL avatars (main quota hog).
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(buildPayload(true, false)),
      );
    } catch {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(buildPayload(true, true)),
        );
      } catch {
        // Keep working in memory if storage is unavailable.
      }
    }
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
  const unlockSessionRef = useRef(0);
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
  const savedQuotes = currentUserState.savedQuotes;
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

    const userId = currentUserId;
    touchAccountActivity(userId);

    let lastTouchMs = Date.now();
    const onUserActivity = () => {
      const now = Date.now();
      // Avoid rewriting storage on every click; once a minute is enough for idle.
      if (now - lastTouchMs < 60_000) return;
      lastTouchMs = now;
      touchAccountActivity(currentUserIdRef.current);
    };

    window.addEventListener("pointerdown", onUserActivity, { passive: true });
    window.addEventListener("keydown", onUserActivity);
    window.addEventListener("touchstart", onUserActivity, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
      window.removeEventListener("touchstart", onUserActivity);
    };
  }, [
    currentUserId,
    hydratedFromStorage,
    isAccountLocked,
    isGuest,
    touchAccountActivity,
  ]);

  useEffect(() => {
    if (!hydratedFromStorage) return;

    const recheckIdleLock = () => {
      const userId = currentUserIdRef.current;
      if (userId === GUEST_USER.id) return;

      const account = accounts.find((item) => item.id === userId);
      if (!account?.passwordHash) return;

      if (isAccountIdle(account.lastActiveAt)) {
        setIsAccountLocked(true);
        setUnlockError(null);
        setPendingBiometricSetup(false);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        recheckIdleLock();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", recheckIdleLock);
    window.addEventListener("focus", recheckIdleLock);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", recheckIdleLock);
      window.removeEventListener("focus", recheckIdleLock);
    };
  }, [accounts, hydratedFromStorage]);

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

  // Leaving the site (or restoring from bfcache) clears compare; favorites stay.
  useEffect(() => {
    if (!hydratedFromStorage) return;

    const clearCompareSelections = () => {
      setUserStatesMap((map) => {
        let changed = false;
        const next: Record<string, UserScopedState> = { ...map };

        for (const [userId, state] of Object.entries(map)) {
          if (state.compareLocationIds.length === 0) continue;
          next[userId] = { ...state, compareLocationIds: [] };
          changed = true;
        }

        return changed ? next : map;
      });
    };

    const onPageHide = () => {
      clearCompareSelections();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) clearCompareSelections();
    };

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [hydratedFromStorage]);

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

  const mergeCloudEvents = useCallback(
    (cloudEvents: UserEvent[]) => {
      if (cloudEvents.length === 0) return;
      updateCurrentUserState((state) => {
        const byId = new Map<string, UserEvent>();
        for (const event of state.events) byId.set(event.id, event);
        for (const event of cloudEvents) byId.set(event.id, event);
        return {
          ...state,
          events: Array.from(byId.values()).sort((a, b) => {
            const aStamp = Date.parse(a.createdAt ?? a.date) || 0;
            const bStamp = Date.parse(b.createdAt ?? b.date) || 0;
            return bStamp - aStamp;
          }),
        };
      });
    },
    [updateCurrentUserState],
  );

  const getEvent = useCallback(
    (id: string) => events.find((event) => event.id === id),
    [events],
  );

  const deleteEvent = useCallback(
    (eventId: string) => {
      updateCurrentUserState((state) => {
        const paymentStates = Object.fromEntries(
          Object.entries(state.paymentStates ?? {}).filter(
            ([key]) => !key.startsWith(`${eventId}:`),
          ),
        );

        return {
          ...state,
          events: state.events.filter((event) => event.id !== eventId),
          paymentStates,
        };
      });
    },
    [updateCurrentUserState],
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

  const updateEventMenuAllergens = useCallback(
    (eventId: string, allergens: MenuAllergenRestriction[]) => {
      updateCurrentUserState((state) => ({
        ...state,
        events: state.events.map((event) => {
          if (event.id !== eventId) return event;

          const nextAllergens = normalizeAllergenRestrictions(
            allergens,
            event.guestCount,
          );
          const nextNames = allergenRestrictionNames(nextAllergens);

          const locationService = event.services.find(
            (service) =>
              service.status !== "cancelled" && service.category === "location",
          );
          const hasVenueMenu =
            locationService?.allergens !== undefined ||
            /menu|catering|buffet|food/i.test(locationService?.name ?? "");

          const services = event.services.map((service) => {
            if (service.status === "cancelled") return service;

            const touchesMenu =
              service.category === "menu" ||
              service.category === "catering" ||
              (service.category === "location" &&
                (hasVenueMenu || nextAllergens.length > 0));

            if (!touchesMenu) return service;

            return {
              ...service,
              allergens: nextAllergens,
            };
          });

          return {
            ...event,
            services,
            menuSelections: pruneMenuSelectionsForAllergens(
              event.menuSelections ?? [],
              nextNames,
            ),
          };
        }),
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
          const nextDeposit =
            event.depositAmount && event.depositAmount > 0
              ? event.depositAmount
              : calculateLocationDeposit(locationCost);

          return {
            ...event,
            services,
            totalCost,
            depositAmount: nextDeposit,
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

  const saveQuote = useCallback(
    (quote: SavedQuote) => {
      updateCurrentUserState((state) => {
        const without = state.savedQuotes.filter((item) => item.id !== quote.id);
        return {
          ...state,
          savedQuotes: [quote, ...without].slice(0, MAX_SAVED_QUOTES),
        };
      });
    },
    [updateCurrentUserState],
  );

  const removeSavedQuote = useCallback(
    (id: string) => {
      updateCurrentUserState((state) => {
        if (!state.savedQuotes.some((item) => item.id === id)) return state;
        return {
          ...state,
          savedQuotes: state.savedQuotes.filter((item) => item.id !== id),
        };
      });
    },
    [updateCurrentUserState],
  );

  const isQuoteSaved = useCallback(
    (id: string) => savedQuotes.some((item) => item.id === id),
    [savedQuotes],
  );

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
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextPublished = !item.published;
        return {
          ...item,
          published: nextPublished,
          status: nextPublished ? ("published" as const) : ("draft" as const),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, []);

  const setManagedListingStatus = useCallback(
    (
      id: string,
      status: "draft" | "pending_review" | "published",
    ) => {
    setManagedListings((prev) =>
      prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                published: status === "published",
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    },
    [],
  );

  const applySupabaseIdentity = useCallback(
    async (params: {
      userId: string;
      email: string;
      displayName: string;
      phone?: string;
      emailVerified?: boolean;
      preferredRole?: AppRole;
    }) => {
      const profile = await fetchSupabaseProfile(params.userId);
      const role: AppRole =
        profile?.role ?? params.preferredRole ?? "consumer";
      const accountType = mapProfileRoleToAccountType(role);
      const now = new Date().toISOString();
      const nextAccount = normalizeAccount({
        id: params.userId,
        name:
          profile?.display_name ||
          sanitizePlainText(params.displayName, 80) ||
          params.email,
        email: profile?.email || params.email,
        phoneNumber: profile?.phone || params.phone,
        avatarUrl: profile?.avatar_url ?? undefined,
        accountType,
        role,
        authProvider: "supabase",
        emailVerified: params.emailVerified ?? true,
        lastActiveAt: now,
      });

      setAccounts((prev) => {
        const withoutDupes = prev.filter(
          (item) =>
            item.id !== nextAccount.id &&
            item.email.toLowerCase() !== nextAccount.email.toLowerCase(),
        );
        return [nextAccount, ...withoutDupes];
      });
      setUserStatesMap((map) => claimGuestStateInto(map, nextAccount.id));
      setCurrentUserId(nextAccount.id);
      setIsAccountLocked(false);
      setUnlockError(null);
      return nextAccount;
    },
    [],
  );

  const createAccount = useCallback(
    async (account: CreateAccountInput): Promise<CreateAccountResult> => {
      const normalizedEmail = sanitizeEmail(account.email);
      const password = account.password;
      const mode = account.mode ?? (account.requireNew ? "register" : "login");

      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        return { ok: false, error: "Inserisci un’email valida." };
      }

      const nextName =
        sanitizePlainText(account.name, 80) || normalizedEmail;
      const nextAccountType =
        account.accountType === "business" || account.businessProfile
          ? ("business" as const)
          : ("consumer" as const);
      const now = new Date().toISOString();
      const safePhone = account.phoneNumber
        ? sanitizePlainText(account.phoneNumber, 32)
        : undefined;
      const phoneDigits = safePhone?.replace(/\D/g, "") ?? "";
      const safeInstagram = account.instagramHandle
        ? sanitizeHandle(account.instagramHandle)
        : undefined;
      const safeAvatar = account.avatarUrl
        ? sanitizeUrl(account.avatarUrl) ?? undefined
        : undefined;

      if (isSupabaseBrowserConfigured()) {
        if (mode === "reset") {
          const result = await supabaseResetPassword(normalizedEmail);
          if (!result.ok) return result;
          return { ok: true };
        }

        if (mode === "login" && !account.requireNew) {
          const result = await supabaseSignIn({
            email: normalizedEmail,
            password,
          });
          if (!result.ok) {
            return {
              ok: false,
              error:
                result.error === "Invalid login credentials"
                  ? "Email o password non corretti."
                  : result.error,
            };
          }
          await applySupabaseIdentity({
            userId: result.user.id,
            email: result.user.email ?? normalizedEmail,
            displayName:
              (result.user.user_metadata?.display_name as string | undefined) ||
              nextName,
            phone: safePhone,
            emailVerified: Boolean(result.user.email_confirmed_at),
          });
          return { ok: true };
        }

        if (phoneDigits.length < 8) {
          return {
            ok: false,
            error: "Inserisci un numero di telefono valido.",
          };
        }
        if (!password || password.length < 8) {
          return {
            ok: false,
            error: "La password deve avere almeno 8 caratteri.",
          };
        }
        if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
          return {
            ok: false,
            error: "La password deve contenere almeno una lettera e un numero.",
          };
        }

        const signUp = await supabaseSignUp({
          email: normalizedEmail,
          password,
          displayName: nextName,
          phone: safePhone,
          role: nextAccountType === "business" ? "business" : "consumer",
        });
        if (!signUp.ok) {
          const message = signUp.error.toLowerCase();
          if (message.includes("already") || message.includes("registered")) {
            return {
              ok: false,
              error: "Esiste già un account con questa email. Usa Accedi.",
            };
          }
          return { ok: false, error: signUp.error };
        }

        if (signUp.user && signUp.session) {
          await applySupabaseIdentity({
            userId: signUp.user.id,
            email: signUp.user.email ?? normalizedEmail,
            displayName: nextName,
            phone: safePhone,
            emailVerified: Boolean(signUp.user.email_confirmed_at),
            preferredRole:
              nextAccountType === "business" ? "business" : "consumer",
          });
          void promptBiometricSetupIfAvailable();
          return { ok: true };
        }

        return {
          ok: true,
          needsEmailActivation: true,
          email: normalizedEmail,
          name: nextName,
        };
      }

      /* ——— Local fallback (no Supabase env) ——— */
      if (mode === "reset") {
        return {
          ok: false,
          error: "Recupero password disponibile solo con Supabase Auth.",
        };
      }

      if (!password || password.length < 8) {
        return {
          ok: false,
          error: "La password deve avere almeno 8 caratteri.",
        };
      }
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return {
          ok: false,
          error: "La password deve contenere almeno una lettera e un numero.",
        };
      }

      const passwordHash = await hashPassword(password);
      const existing = accounts.find(
        (item) => item.email.toLowerCase() === normalizedEmail,
      );

      if (!existing && phoneDigits.length < 8 && mode !== "login") {
        return {
          ok: false,
          error: "Inserisci un numero di telefono valido.",
        };
      }

      if (existing) {
        if (account.requireNew || mode === "register") {
          return {
            ok: false,
            error: "Esiste già un account con questa email.",
          };
        }

        if (existing.passwordHash) {
          const matches = await verifyPassword(password, existing.passwordHash);
          if (!matches) {
            return {
              ok: false,
              error: "Password non corretta per questo account.",
            };
          }
        }

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
                  name: existing.name || nextName,
                  email: normalizedEmail,
                  accountType: resolvedAccountType,
                  businessProfile: upgradedToBusiness
                    ? (account.businessProfile ??
                      item.businessProfile ??
                      null)
                    : (item.businessProfile ?? null),
                  phoneNumber: item.phoneNumber ?? safePhone,
                  avatarUrl: item.avatarUrl ?? safeAvatar,
                  instagramHandle: item.instagramHandle ?? safeInstagram,
                  passwordHash: needsPasswordRehash(existing.passwordHash)
                    ? passwordHash
                    : (existing.passwordHash ?? passwordHash),
                  lastActiveAt: now,
                  authProvider: "local",
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

      if (mode === "login") {
        return {
          ok: false,
          error: "Nessun account con questa email. Registrati prima.",
        };
      }

      const id = `account-${Date.now()}`;
      const activationToken = createActivationToken();
      const nextAccount = normalizeAccount({
        id,
        name: nextName,
        email: normalizedEmail,
        phoneNumber: safePhone,
        avatarUrl: safeAvatar,
        instagramHandle: safeInstagram,
        accountType: nextAccountType,
        businessProfile:
          nextAccountType === "business"
            ? (account.businessProfile ?? null)
            : null,
        passwordHash,
        lastActiveAt: now,
        emailVerified: false,
        activationToken,
        activationTokenExpiresAt: getActivationExpiryIso(),
        authProvider: "local",
      });

      setAccounts((prev) => [nextAccount, ...prev]);
      setUserStatesMap((map) => claimGuestStateInto(map, id));
      setCurrentUserId(id);
      setIsAccountLocked(false);
      setUnlockError(null);
      void promptBiometricSetupIfAvailable();
      return {
        ok: true,
        needsEmailActivation: true,
        activationToken,
        email: normalizedEmail,
        name: nextName,
      };
    },
    [accounts, applySupabaseIdentity, promptBiometricSetupIfAvailable],
  );

  useEffect(() => {
    if (!hydratedFromStorage || !isSupabaseBrowserConfigured()) return;

    let cancelled = false;
    const supabase = getSupabaseBrowser();

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;
      await applySupabaseIdentity({
        userId: session.user.id,
        email: session.user.email ?? "",
        displayName:
          (session.user.user_metadata?.display_name as string | undefined) ||
          session.user.email?.split("@")[0] ||
          "Utente VibeUp",
        phone:
          typeof session.user.user_metadata?.phone === "string"
            ? session.user.user_metadata.phone
            : undefined,
        emailVerified: Boolean(session.user.email_confirmed_at),
      });
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        setCurrentUserId(GUEST_USER.id);
        setIsAccountLocked(false);
        return;
      }
      void applySupabaseIdentity({
        userId: session.user.id,
        email: session.user.email ?? "",
        displayName:
          (session.user.user_metadata?.display_name as string | undefined) ||
          session.user.email?.split("@")[0] ||
          "Utente VibeUp",
        phone:
          typeof session.user.user_metadata?.phone === "string"
            ? session.user.user_metadata.phone
            : undefined,
        emailVerified: Boolean(session.user.email_confirmed_at),
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applySupabaseIdentity, hydratedFromStorage]);

  useEffect(() => {
    if (!hydratedFromStorage) return;
    if (currentUser.authProvider !== "supabase" || isGuest) return;

    let cancelled = false;
    void fetch("/api/bookings", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json().catch(() => null)) as {
          events?: UserEvent[];
        } | null;
      })
      .then((payload) => {
        if (cancelled || !payload?.events) return;
        mergeCloudEvents(payload.events);
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentUser.authProvider,
    currentUser.id,
    hydratedFromStorage,
    isGuest,
    mergeCloudEvents,
  ]);

  const createBusinessAccount = useCallback(
    async (
      input: CreateBusinessAccountInput,
    ): Promise<CreateBusinessAccountResult> => {
      const normalizedEmail = sanitizeEmail(input.email);
      const nextName = sanitizePlainText(input.ownerName, 80);
      const phoneNumber = sanitizePlainText(input.phoneNumber, 32);
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
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return {
          ok: false,
          error: "La password deve contenere almeno una lettera e un numero.",
        };
      }

      const sameEmail = accounts.some(
        (account) => account.email.toLowerCase() === normalizedEmail,
      );

      if (sameEmail) {
        return {
          ok: false,
          error:
            "Esiste già un account con questa email. Per creare un account Pro usa un’email diversa.",
        };
      }

      const passwordHash = await hashPassword(password);
      const id = `account-pro-${Date.now()}`;
      const activationToken = createActivationToken();
      const nextAccount = normalizeAccount({
        id,
        name: nextName,
        email: normalizedEmail,
        phoneNumber,
        accountType: "business",
        businessProfile: input.businessProfile,
        passwordHash,
        lastActiveAt: new Date().toISOString(),
        emailVerified: false,
        activationToken,
        activationTokenExpiresAt: getActivationExpiryIso(),
      });

      setAccounts((prev) => [nextAccount, ...prev]);
      setUserStatesMap((map) => claimGuestStateInto(map, id));
    setCurrentUserId(id);
      setIsAccountLocked(false);
      setUnlockError(null);
      void promptBiometricSetupIfAvailable();

      return {
        ok: true,
        needsEmailActivation: true,
        activationToken,
        email: normalizedEmail,
        name: nextName,
      };
    },
    [accounts, promptBiometricSetupIfAvailable],
  );

  const activateAccountWithToken = useCallback(
    (token: string): CreateAccountResult => {
      const cleaned = token.trim().toLowerCase();
      if (cleaned.length < 32) {
        return { ok: false, error: "Link di attivazione non valido." };
      }

      const match = accounts.find(
        (account) => account.activationToken?.toLowerCase() === cleaned,
      );
      if (!match) {
        return {
          ok: false,
          error:
            "Link non valido o già usato. Se hai creato l’account su questo dispositivo, richiedi una nuova email.",
        };
      }
      if (isActivationTokenExpired(match.activationTokenExpiresAt)) {
        return {
          ok: false,
          error: "Questo link è scaduto. Richiedi una nuova email di attivazione.",
        };
      }

      setAccounts((prev) =>
        prev.map((account) =>
          account.id === match.id
            ? normalizeAccount({
                ...account,
                emailVerified: true,
                activationToken: undefined,
                activationTokenExpiresAt: undefined,
                lastActiveAt: new Date().toISOString(),
              })
            : account,
        ),
      );
      setCurrentUserId(match.id);
      setIsAccountLocked(false);
      setUnlockError(null);
      return { ok: true };
    },
    [accounts],
  );

  const issueActivationToken = useCallback(
    (accountId?: string) => {
      const targetId = accountId ?? currentUserId;
      if (!targetId || targetId === GUEST_USER.id) {
        return { ok: false as const, error: "Nessun account da attivare." };
      }

      const target = accounts.find((account) => account.id === targetId);
      if (!target) {
        return { ok: false as const, error: "Account non trovato." };
      }
      if (target.emailVerified !== false) {
        return { ok: true as const };
      }

      const activationToken = createActivationToken();
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === targetId
            ? normalizeAccount({
                ...account,
                emailVerified: false,
                activationToken,
                activationTokenExpiresAt: getActivationExpiryIso(),
              })
            : account,
        ),
      );

      return {
        ok: true as const,
        needsEmailActivation: true,
        activationToken,
        email: target.email,
        name: target.name,
      };
    },
    [accounts, currentUserId],
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

    // Drop chat / profile comms / availability rows that live outside app-state.
    purgeUserSatelliteStorage(id);
  }, []);

  const switchAccount = useCallback(
    (id: string) => {
      setPendingBiometricSetup(false);
      unlockSessionRef.current += 1;
      if (id === GUEST_USER.id) {
        void supabaseSignOut();
        setCurrentUserId(GUEST_USER.id);
        setIsAccountLocked(false);
        setUnlockError(null);
        return;
      }
      const target = accounts.find((account) => account.id === id);
      if (!target) return;
      setCurrentUserId((current) => (current === id ? current : id));
      if (
        target.authProvider !== "supabase" &&
        target.passwordHash &&
        isAccountIdle(target.lastActiveAt)
      ) {
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

      if (needsPasswordRehash(account.passwordHash)) {
        const nextHash = await hashPassword(password);
        setAccounts((prev) =>
          prev.map((item) =>
            item.id === userId
              ? normalizeAccount({ ...item, passwordHash: nextHash })
              : item,
          ),
        );
      }

      markUnlocked(userId);
      return { ok: true };
    },
    [accounts, markUnlocked],
  );

  const unlockAccountWithBiometric = useCallback(async (): Promise<CreateAccountResult> => {
    const userId = currentUserIdRef.current;
    const session = unlockSessionRef.current;
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
      // Ignore late results if the user switched account/guest mid-prompt.
      if (
        unlockSessionRef.current !== session ||
        currentUserIdRef.current !== userId
      ) {
        return { ok: false, error: "Sessione di sblocco annullata." };
      }
      markUnlocked(userId);
      return { ok: true };
    } catch (error) {
      if (
        unlockSessionRef.current !== session ||
        currentUserIdRef.current !== userId
      ) {
        return { ok: false, error: "Sessione di sblocco annullata." };
      }
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

      if (nextPassword.length < 8) {
        return {
          ok: false,
          error: "La nuova password deve avere almeno 8 caratteri.",
        };
      }
      if (!/[A-Za-z]/.test(nextPassword) || !/[0-9]/.test(nextPassword)) {
        return {
          ok: false,
          error:
            "La nuova password deve contenere almeno una lettera e un numero.",
        };
      }

      if (
        account.authProvider === "supabase" ||
        isSupabaseBrowserConfigured()
      ) {
        const verify = await supabaseSignIn({
          email: account.email,
          password: currentPassword,
        });
        if (!verify.ok) {
          return { ok: false, error: "Password attuale non corretta." };
        }
        const updated = await supabaseUpdatePassword(nextPassword);
        if (!updated.ok) return updated;
        setAccounts((prev) =>
          prev.map((item) =>
            item.id === userId
              ? normalizeAccount({
                  ...item,
                  lastActiveAt: new Date().toISOString(),
                })
              : item,
          ),
        );
        return { ok: true };
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
      if ("name" in safeUpdates && typeof safeUpdates.name === "string") {
        safeUpdates.name = sanitizePlainText(safeUpdates.name, 80);
      }
      if ("email" in safeUpdates && typeof safeUpdates.email === "string") {
        safeUpdates.email = sanitizeEmail(safeUpdates.email);
      }
      if (
        "phoneNumber" in safeUpdates &&
        typeof safeUpdates.phoneNumber === "string"
      ) {
        safeUpdates.phoneNumber = sanitizePlainText(
          safeUpdates.phoneNumber,
          32,
        );
      }
      if (
        "instagramHandle" in safeUpdates &&
        typeof safeUpdates.instagramHandle === "string"
      ) {
        safeUpdates.instagramHandle = sanitizeHandle(
          safeUpdates.instagramHandle,
        );
      }
      if ("avatarUrl" in safeUpdates && typeof safeUpdates.avatarUrl === "string") {
        safeUpdates.avatarUrl =
          sanitizeUrl(safeUpdates.avatarUrl) ?? undefined;
      }
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
      savedQuotes,
      managedListings,
      addEvent,
      getEvent,
      deleteEvent,
      prunePastEvents,
      updateEventTitle,
      updateEventMenuSelections,
      updateEventMenuAllergens,
      addServiceToEvent,
      markServicePaid,
      toggleFavoriteLocation,
      removeFavoriteLocation,
      toggleFavoriteService,
      removeFavoriteService,
      toggleCompareLocation,
      removeCompareLocation,
      saveQuote,
      removeSavedQuote,
      isQuoteSaved,
      upsertManagedListing,
      removeManagedListing,
      toggleManagedListingPublication,
      setManagedListingStatus,
      createAccount,
      createBusinessAccount,
      activateAccountWithToken,
      issueActivationToken,
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
      savedQuotes,
      managedListings,
      addEvent,
      getEvent,
      deleteEvent,
      prunePastEvents,
      updateEventTitle,
      updateEventMenuSelections,
      updateEventMenuAllergens,
      addServiceToEvent,
      markServicePaid,
      toggleFavoriteLocation,
      removeFavoriteLocation,
      toggleFavoriteService,
      removeFavoriteService,
      toggleCompareLocation,
      removeCompareLocation,
      saveQuote,
      removeSavedQuote,
      isQuoteSaved,
      upsertManagedListing,
      removeManagedListing,
      toggleManagedListingPublication,
      setManagedListingStatus,
      createAccount,
      createBusinessAccount,
      activateAccountWithToken,
      issueActivationToken,
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
              normalizeUserSettings(currentUser.settings).security
                .biometricUnlock,
          )}
          onSubmit={async (password) => {
            await unlockAccount(password);
          }}
          onUnlockBiometric={
            currentUser.biometricCredentialId &&
            normalizeUserSettings(currentUser.settings).security.biometricUnlock
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
