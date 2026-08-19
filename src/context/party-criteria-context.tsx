"use client";

import type { PartyCriteria } from "@/types/party-criteria";
import {
  emptyPartyCriteria,
  normalizePartyCriteria,
} from "@/types/party-criteria";
import { GUEST_USER, useAppState } from "@/context/app-state-context";
import {
  clearPartyCriteriaProfile,
  clearPartyCriteriaSession,
  hydratePartyCriteria,
  writePartyCriteriaProfile,
  writePartyCriteriaSession,
} from "@/lib/party-criteria-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface PartyCriteriaContextValue {
  criteria: PartyCriteria;
  /** True after the user completed the Home wizard at least once this session/profile. */
  hasAppliedCriteria: boolean;
  homeBannerText: string;
  setHomeBannerText: (text: string) => void;
  applyCriteria: (next: PartyCriteria) => void;
  clearCriteria: () => void;
}

const PartyCriteriaContext = createContext<PartyCriteriaContextValue | null>(
  null,
);

const DEFAULT_BANNER = "Organizza il tuo 18";

export function PartyCriteriaProvider({ children }: { children: ReactNode }) {
  const { currentUser, isGuest } = useAppState();
  const [criteria, setCriteria] = useState<PartyCriteria>(emptyPartyCriteria);
  const [hasAppliedCriteria, setHasAppliedCriteria] = useState(false);
  const [homeBannerText, setHomeBannerText] = useState(DEFAULT_BANNER);
  const userId = isGuest ? null : currentUser.id;

  useEffect(() => {
    const stored = hydratePartyCriteria(
      userId && userId !== GUEST_USER.id ? userId : null,
    );
    queueMicrotask(() => {
      setCriteria(normalizePartyCriteria(stored.criteria));
      setHasAppliedCriteria(stored.hasApplied);
    });
  }, [userId]);

  const persist = useCallback(
    (next: PartyCriteria, hasApplied: boolean) => {
      const normalized = normalizePartyCriteria(next);
      writePartyCriteriaSession({ criteria: normalized, hasApplied });
      if (userId && userId !== GUEST_USER.id) {
        writePartyCriteriaProfile(userId, {
          criteria: normalized,
          hasApplied,
        });
      }
    },
    [userId],
  );

  const applyCriteria = useCallback(
    (next: PartyCriteria) => {
      const normalized = normalizePartyCriteria({
        ...next,
        freeText: next.freeText.trim(),
      });
      setCriteria(normalized);
      setHasAppliedCriteria(true);
      persist(normalized, true);
    },
    [persist],
  );

  const clearCriteria = useCallback(() => {
    setCriteria(emptyPartyCriteria);
    setHasAppliedCriteria(false);
    clearPartyCriteriaSession();
    if (userId && userId !== GUEST_USER.id) {
      clearPartyCriteriaProfile(userId);
    }
  }, [userId]);

  const value = useMemo(
    () => ({
      criteria,
      hasAppliedCriteria,
      homeBannerText,
      setHomeBannerText,
      applyCriteria,
      clearCriteria,
    }),
    [
      applyCriteria,
      clearCriteria,
      criteria,
      hasAppliedCriteria,
      homeBannerText,
    ],
  );

  return (
    <PartyCriteriaContext.Provider value={value}>
      {children}
    </PartyCriteriaContext.Provider>
  );
}

export function usePartyCriteria() {
  const context = useContext(PartyCriteriaContext);
  if (!context) {
    throw new Error(
      "usePartyCriteria must be used within PartyCriteriaProvider",
    );
  }
  return context;
}
