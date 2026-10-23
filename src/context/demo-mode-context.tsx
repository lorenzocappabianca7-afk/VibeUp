"use client";

import {
  clearDemoModeCookie,
  publishDemoMode,
  readDemoModeCookie,
  writeDemoModeCookie,
} from "@/lib/demo/mode";
import {
  DEMO_PICK_LIMIT,
  clearDemoAttemptLocalState,
  clearDemoPartyCriteria,
  dismissDemoHomeTip,
  readDemoSession,
  writeDemoSession,
  writeDemoVisitId,
} from "@/lib/demo/session";
import {
  confirmVerifiedSignup,
  demoEntryIdentity,
  type DemoEntryIdentity,
} from "@/lib/demo/signup-gate";
import { saveDemoSubmission } from "@/lib/demo/submissions";
import { usesDemoShell } from "@/lib/demo/shell";
import {
  dispatchDemoLocalReset,
  isUnlimitedDemoTesterEmail,
  rememberDemoTesterEmail,
} from "@/lib/demo/testers";
import type {
  DemoChosenLocation,
  DemoFeedback,
  DemoLandingState,
  DemoSession,
} from "@/types/demo";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface DemoModeContextValue {
  isDemoMode: boolean;
  session: DemoSession | null;
  landingState: DemoLandingState;
  bootError: string | null;
  selectedLocations: DemoChosenLocation[];
  bookedLocation: DemoChosenLocation | null;
  bookingConfirmed: boolean;
  homeTipDismissed: boolean;
  isDemoHomeLocked: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
  toggleDemoLocation: (location: DemoChosenLocation) => void;
  persistDemoSelections: () => Promise<void>;
  setDemoBookedLocation: (location: DemoChosenLocation) => Promise<void>;
  markDemoBookingConfirmed: () => Promise<void>;
  dismissHomeTip: () => void;
  completeDemoSession: (feedback: DemoFeedback) => Promise<void>;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

function persist(session: DemoSession) {
  writeDemoSession(session);
  return session;
}

let demoBoot: Promise<DemoSession> | null = null;
let exitingToSite = false;

/** True from the click on «Torna al sito» / «Esci dalla demo» until the document unloads. */
export function isDemoExitToSite() {
  return exitingToSite;
}

/**
 * Drop the demo cookie and local attempt, then load `/` as a new document.
 * A client `router.replace` stays inside the demo shell: `/demo/book` and
 * `/demo/rating` answer `isDemoMode === false` with `router.replace("/demo")`,
 * and `/demo` then calls `enterDemo()` and writes the cookie back.
 */
export function leaveDemoForSite() {
  if (exitingToSite || typeof window === "undefined") return;
  exitingToSite = true;
  clearDemoModeCookie();
  publishDemoMode(false);
  demoBoot = null;
  clearDemoAttemptLocalState();
  dispatchDemoLocalReset();
  window.location.assign("/");
}

async function startDemoAttempt(identity: DemoEntryIdentity): Promise<DemoSession> {
  const sessionCreatedAt = new Date().toISOString();
  const saved = await saveDemoSubmission({
    payload: {
      signup_id: identity.signupId,
      firstName: "",
      lastName: "",
      email: identity.email,
      phone: "",
      privacyConsentAt: null,
      sessionCreatedAt,
      selectedLocations: [],
      bookedLocation: null,
      bookingConfirmed: false,
      bookingConfirmedAt: null,
      completed: false,
      completedAt: null,
    },
  });

  if (!saved) {
    throw new Error("Non riesco a salvare i dati della demo. Riprova.");
  }

  const next: DemoSession = {
    id: saved.id,
    firstName: "",
    lastName: "",
    email: identity.email,
    phone: "",
    privacyConsentAt: "",
    sessionCreatedAt,
    selectedLocations: [],
    bookedLocation: null,
    bookingConfirmed: false,
    bookingConfirmedAt: null,
    completed: false,
    completedAt: null,
  };

  writeDemoSession(next);
  writeDemoVisitId(next.id);
  if (identity.email) rememberDemoTesterEmail(identity.email);
  clearDemoPartyCriteria();
  return next;
}

function createDemoAttempt(identity: DemoEntryIdentity) {
  if (!demoBoot) {
    demoBoot = startDemoAttempt(identity).catch((error) => {
      demoBoot = null;
      throw error;
    });
  }
  return demoBoot;
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const [demoActive, setDemoActive] = useState(false);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [landingState, setLandingState] = useState<DemoLandingState>("ready");
  const [bootError, setBootError] = useState<string | null>(null);
  const [homeTipDismissed, setHomeTipDismissed] = useState(true);
  const bootedRef = useRef(false);
  const wasActiveRef = useRef(false);
  const attemptRef = useRef(0);
  const onDemoSurface = usesDemoShell(pathname, demoActive);

  if (!exitingToSite) publishDemoMode(onDemoSurface);

  const enterDemo = useCallback(() => {
    if (exitingToSite) return;
    writeDemoModeCookie();
    publishDemoMode(true);
    setDemoActive(true);
  }, []);

  const exitDemo = useCallback(() => {
    clearDemoModeCookie();
    publishDemoMode(false);
    demoBoot = null;
    bootedRef.current = false;
    wasActiveRef.current = false;
    attemptRef.current += 1;
    clearDemoAttemptLocalState();
    dispatchDemoLocalReset();
    setSession(null);
    setBootError(null);
    setHomeTipDismissed(true);
    setLandingState("ready");
    setDemoActive(false);
  }, []);

  useLayoutEffect(() => {
    if (exitingToSite) return;
    const cookieOn = readDemoModeCookie();
    if (cookieOn !== demoActive) {
      publishDemoMode(cookieOn && usesDemoShell(pathname, true));
      setDemoActive(cookieOn);
      return;
    }

    if (!demoActive) {
      if (wasActiveRef.current) {
        wasActiveRef.current = false;
        attemptRef.current += 1;
        demoBoot = null;
        bootedRef.current = false;
        setSession(null);
        setLandingState("ready");
        setBootError(null);
        setHomeTipDismissed(true);
      }
      return;
    }

    wasActiveRef.current = true;
    if (!usesDemoShell(pathname, true) || bootedRef.current) return;

    const identity = demoEntryIdentity();
    if (!identity) {
      clearDemoModeCookie();
      publishDemoMode(false);
      demoBoot = null;
      bootedRef.current = false;
      wasActiveRef.current = false;
      setDemoActive(false);
      return;
    }

    const attempt = attemptRef.current;
    bootedRef.current = true;

    const boot = () => {
      if (identity.email) rememberDemoTesterEmail(identity.email);
      setLandingState("loading");
      setBootError(null);
      clearDemoAttemptLocalState();
      dispatchDemoLocalReset();
      setSession(null);
      setHomeTipDismissed(true);

      void createDemoAttempt(identity)
        .then((next) => {
          if (exitingToSite || attempt !== attemptRef.current) return;
          setSession(next);
          setHomeTipDismissed(false);
          setLandingState("ready");
        })
        .catch((error: unknown) => {
          if (exitingToSite || attempt !== attemptRef.current) return;
          bootedRef.current = false;
          setBootError(
            error instanceof Error
              ? error.message
              : "Non riesco a salvare i dati della demo. Riprova.",
          );
          setLandingState("error");
        });
    };

    if (isUnlimitedDemoTesterEmail(identity.email)) {
      boot();
      return;
    }
    if (!identity.signupId) {
      bootedRef.current = false;
      clearDemoModeCookie();
      publishDemoMode(false);
      demoBoot = null;
      wasActiveRef.current = false;
      setDemoActive(false);
      return;
    }

    void confirmVerifiedSignup(identity.signupId).then((ok) => {
      if (exitingToSite || attempt !== attemptRef.current) return;
      if (!ok) {
        bootedRef.current = false;
        clearDemoModeCookie();
        publishDemoMode(false);
        demoBoot = null;
        wasActiveRef.current = false;
        setDemoActive(false);
        return;
      }
      boot();
    });
  }, [demoActive, pathname]);

  const toggleDemoLocation = useCallback((location: DemoChosenLocation) => {
    setSession((current) => {
      if (!current || current.completed) return current;
      const exists = current.selectedLocations.some((item) => item.id === location.id);
      let selectedLocations = current.selectedLocations;
      if (exists) {
        selectedLocations = current.selectedLocations.filter(
          (item) => item.id !== location.id,
        );
      } else if (current.selectedLocations.length < DEMO_PICK_LIMIT) {
        selectedLocations = [...current.selectedLocations, location];
      }
      return persist({ ...current, selectedLocations });
    });
  }, []);

  const persistDemoSelections = useCallback(async () => {
    const current = readDemoSession();
    if (!demoActive || !current || current.completed) return;
    await saveDemoSubmission({
      id: current.id,
      payload: { selectedLocations: current.selectedLocations },
      optional: true,
    });
  }, [demoActive]);

  const setDemoBookedLocation = useCallback(
    async (location: DemoChosenLocation) => {
      if (!demoActive) return;
      const current = readDemoSession();
      if (!current || current.completed) return;
      const next = persist({ ...current, bookedLocation: location });
      setSession(next);
      await saveDemoSubmission({
        id: next.id,
        payload: {
          selectedLocations: next.selectedLocations,
          bookedLocation: location,
        },
        optional: true,
      });
    },
    [demoActive],
  );

  const markDemoBookingConfirmed = useCallback(async () => {
    if (!demoActive) return;
    const current = readDemoSession();
    if (!current || current.completed) return;
    const bookingConfirmedAt =
      current.bookingConfirmedAt ?? new Date().toISOString();
    const next = persist({
      ...current,
      bookingConfirmed: true,
      bookingConfirmedAt,
    });
    setSession(next);
    await saveDemoSubmission({
      id: next.id,
      payload: {
        bookingConfirmed: true,
        bookingConfirmedAt,
        bookedLocation: next.bookedLocation,
        selectedLocations: next.selectedLocations,
      },
      optional: true,
    });
  }, [demoActive]);

  const dismissHomeTip = useCallback(() => {
    if (!session) return;
    dismissDemoHomeTip(session.id);
    setHomeTipDismissed(true);
  }, [session]);

  const completeDemoSession = useCallback(
    async (feedback: DemoFeedback) => {
      if (!demoActive || !session || session.completed) return;

      const completedAt = new Date().toISOString();
      await saveDemoSubmission({
        id: session.id,
        payload: {
          selectedLocations: feedback.selectedLocations,
          bookedLocation: session.bookedLocation,
          bookingConfirmed: session.bookingConfirmed,
          bookingConfirmedAt: session.bookingConfirmedAt,
          rating: feedback.rating,
          wouldUseForEighteenth: feedback.wouldUseForEighteenth,
          completed: true,
          completedAt,
        },
      });

      const next: DemoSession = {
        ...session,
        selectedLocations: feedback.selectedLocations,
        completed: true,
        completedAt,
      };
      writeDemoSession(next);
      writeDemoVisitId(next.id);
      if (next.email) rememberDemoTesterEmail(next.email);
      setSession(next);
      setLandingState("completed");
    },
    [demoActive, session],
  );

  const isDemoHomeLocked =
    onDemoSurface &&
    landingState === "ready" &&
    !!session &&
    !session.completed &&
    !homeTipDismissed;

  const value = useMemo<DemoModeContextValue>(
    () => ({
      isDemoMode: onDemoSurface,
      session,
      landingState,
      bootError,
      selectedLocations: session?.selectedLocations ?? [],
      bookedLocation: session?.bookedLocation ?? null,
      bookingConfirmed: session?.bookingConfirmed === true,
      homeTipDismissed,
      isDemoHomeLocked,
      enterDemo,
      exitDemo,
      toggleDemoLocation,
      persistDemoSelections,
      setDemoBookedLocation,
      markDemoBookingConfirmed,
      dismissHomeTip,
      completeDemoSession,
    }),
    [
      bootError,
      completeDemoSession,
      demoActive,
      dismissHomeTip,
      enterDemo,
      exitDemo,
      homeTipDismissed,
      isDemoHomeLocked,
      landingState,
      markDemoBookingConfirmed,
      onDemoSurface,
      persistDemoSelections,
      session,
      setDemoBookedLocation,
      toggleDemoLocation,
    ],
  );

  return (
    <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>
  );
}

const DEMO_MODE_FALLBACK: DemoModeContextValue = {
  isDemoMode: false,
  session: null,
  landingState: "ready",
  bootError: null,
  selectedLocations: [],
  bookedLocation: null,
  bookingConfirmed: false,
  homeTipDismissed: true,
  isDemoHomeLocked: false,
  enterDemo: () => undefined,
  exitDemo: () => undefined,
  toggleDemoLocation: () => undefined,
  persistDemoSelections: async () => undefined,
  setDemoBookedLocation: async () => undefined,
  markDemoBookingConfirmed: async () => undefined,
  dismissHomeTip: () => undefined,
  completeDemoSession: async () => undefined,
};

export function useDemoMode(): DemoModeContextValue {
  return useContext(DemoModeContext) ?? DEMO_MODE_FALLBACK;
}
