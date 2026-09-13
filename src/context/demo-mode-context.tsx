"use client";

import { isDemoMode as readDemoModeFlag } from "@/lib/demo/mode";
import {
  DEMO_PICK_LIMIT,
  clearDemoHomeTip,
  clearDemoSession,
  clearDemoVisit,
  dismissDemoHomeTip,
  isDemoHomeTipDismissed,
  readDemoSession,
  resolveDemoLanding,
  writeDemoSession,
  writeDemoVisitId,
} from "@/lib/demo/session";
import {
  dispatchDemoLocalReset,
  isUnlimitedDemoTesterEmail,
} from "@/lib/demo/testers";
import { saveDemoSubmission } from "@/lib/demo/submissions";
import type {
  DemoChosenLocation,
  DemoFeedback,
  DemoLandingState,
  DemoSession,
} from "@/types/demo";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface StartDemoSessionInput {
  firstName: string;
  lastName: string;
  email: string;
  privacyConsentAt: string;
}

interface DemoModeContextValue {
  isDemoMode: boolean;
  session: DemoSession | null;
  landingState: DemoLandingState;
  selectedLocations: DemoChosenLocation[];
  bookedLocation: DemoChosenLocation | null;
  bookingConfirmed: boolean;
  homeTipDismissed: boolean;
  startDemoSession: (input: StartDemoSessionInput) => Promise<DemoSession>;
  toggleDemoLocation: (location: DemoChosenLocation) => void;
  persistDemoSelections: () => Promise<void>;
  setDemoBookedLocation: (location: DemoChosenLocation) => Promise<void>;
  markDemoBookingConfirmed: () => Promise<void>;
  dismissHomeTip: () => void;
  completeDemoSession: (feedback: DemoFeedback) => Promise<void>;
  canRestartDemo: boolean;
  restartDemoSession: () => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

function persist(session: DemoSession) {
  writeDemoSession(session);
  return session;
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const isDemoMode = readDemoModeFlag();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [landingState, setLandingState] = useState<DemoLandingState>(() =>
    isDemoMode ? "loading" : "ready",
  );
  const [homeTipDismissed, setHomeTipDismissed] = useState(true);

  useEffect(() => {
    if (!isDemoMode) {
      setSession(null);
      setLandingState("ready");
      setHomeTipDismissed(true);
      return;
    }

    const resolved = resolveDemoLanding(readDemoSession());
    setSession(resolved.session);
    setLandingState(resolved.state);
    setHomeTipDismissed(
      !resolved.session || isDemoHomeTipDismissed(resolved.session.id),
    );
  }, [isDemoMode]);

  const startDemoSession = useCallback(
    async (input: StartDemoSessionInput) => {
      if (!isDemoMode) {
        throw new Error("La modalità demo non è attiva.");
      }

      const sessionCreatedAt = new Date().toISOString();
      const saved = await saveDemoSubmission({
        payload: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          privacyConsentAt: input.privacyConsentAt,
          sessionCreatedAt,
          selectedLocations: [],
          bookedLocation: null,
          bookingConfirmed: false,
          completed: false,
          completedAt: null,
        },
      });

      if (!saved) {
        throw new Error("Non riesco a salvare i dati della demo. Riprova.");
      }

      const next: DemoSession = {
        id: saved.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        privacyConsentAt: input.privacyConsentAt,
        sessionCreatedAt,
        selectedLocations: [],
        bookedLocation: null,
        bookingConfirmed: false,
        completed: false,
        completedAt: null,
      };

      writeDemoSession(next);
      writeDemoVisitId(next.id);
      setSession(next);
      setHomeTipDismissed(false);
      setLandingState("ready");
      return next;
    },
    [isDemoMode],
  );

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
    if (!isDemoMode || !current || current.completed) return;
    await saveDemoSubmission({
      id: current.id,
      payload: { selectedLocations: current.selectedLocations },
      optional: true,
    });
  }, [isDemoMode]);

  const setDemoBookedLocation = useCallback(
    async (location: DemoChosenLocation) => {
      if (!isDemoMode) return;
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
    [isDemoMode],
  );

  const markDemoBookingConfirmed = useCallback(async () => {
    if (!isDemoMode) return;
    const current = readDemoSession();
    if (!current || current.completed) return;
    const next = persist({ ...current, bookingConfirmed: true });
    setSession(next);
    await saveDemoSubmission({
      id: next.id,
      payload: {
        bookingConfirmed: true,
        bookedLocation: next.bookedLocation,
        selectedLocations: next.selectedLocations,
      },
      optional: true,
    });
  }, [isDemoMode]);

  const dismissHomeTip = useCallback(() => {
    if (!session) return;
    dismissDemoHomeTip(session.id);
    setHomeTipDismissed(true);
  }, [session]);

  const completeDemoSession = useCallback(
    async (feedback: DemoFeedback) => {
      if (!isDemoMode || !session || session.completed) return;

      const completedAt = new Date().toISOString();
      await saveDemoSubmission({
        id: session.id,
        payload: {
          selectedLocations: feedback.selectedLocations,
          bookedLocation: session.bookedLocation,
          bookingConfirmed: session.bookingConfirmed,
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
      setSession(next);
      setLandingState("completed");
    },
    [isDemoMode, session],
  );

  const canRestartDemo = isUnlimitedDemoTesterEmail(session?.email);

  const restartDemoSession = useCallback(() => {
    if (!isDemoMode) return;
    const current = readDemoSession();
    if (!isUnlimitedDemoTesterEmail(current?.email ?? session?.email)) return;

    clearDemoSession();
    clearDemoVisit();
    clearDemoHomeTip();
    dispatchDemoLocalReset();
    setSession(null);
    setHomeTipDismissed(false);
    setLandingState("form");
  }, [isDemoMode, session?.email]);

  const value = useMemo<DemoModeContextValue>(
    () => ({
      isDemoMode,
      session,
      landingState,
      selectedLocations: session?.selectedLocations ?? [],
      bookedLocation: session?.bookedLocation ?? null,
      bookingConfirmed: session?.bookingConfirmed === true,
      homeTipDismissed,
      startDemoSession,
      toggleDemoLocation,
      persistDemoSelections,
      setDemoBookedLocation,
      markDemoBookingConfirmed,
      dismissHomeTip,
      completeDemoSession,
      canRestartDemo,
      restartDemoSession,
    }),
    [
      canRestartDemo,
      completeDemoSession,
      dismissHomeTip,
      homeTipDismissed,
      isDemoMode,
      landingState,
      markDemoBookingConfirmed,
      persistDemoSelections,
      restartDemoSession,
      session,
      setDemoBookedLocation,
      startDemoSession,
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
  selectedLocations: [],
  bookedLocation: null,
  bookingConfirmed: false,
  homeTipDismissed: true,
  startDemoSession: async () => {
    throw new Error("La modalità demo non è attiva.");
  },
  toggleDemoLocation: () => undefined,
  persistDemoSelections: async () => undefined,
  setDemoBookedLocation: async () => undefined,
  markDemoBookingConfirmed: async () => undefined,
  dismissHomeTip: () => undefined,
  completeDemoSession: async () => undefined,
  canRestartDemo: false,
  restartDemoSession: () => undefined,
};

export function useDemoMode(): DemoModeContextValue {
  return useContext(DemoModeContext) ?? DEMO_MODE_FALLBACK;
}
