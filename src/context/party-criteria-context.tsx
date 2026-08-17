"use client";

import type { PartyCriteria } from "@/types/party-criteria";
import { emptyPartyCriteria } from "@/types/party-criteria";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface PartyCriteriaContextValue {
  criteria: PartyCriteria;
  /** True after the user completed the Home wizard at least once this session. */
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
  const [criteria, setCriteria] = useState<PartyCriteria>(emptyPartyCriteria);
  const [hasAppliedCriteria, setHasAppliedCriteria] = useState(false);
  const [homeBannerText, setHomeBannerText] = useState(DEFAULT_BANNER);

  const applyCriteria = useCallback((next: PartyCriteria) => {
    setCriteria({
      dateFrom: next.dateFrom,
      dateTo: next.dateTo ?? next.dateFrom,
      guestCount: next.guestCount,
      budgetMax: next.budgetMax,
      freeText: next.freeText.trim(),
    });
    setHasAppliedCriteria(true);
  }, []);

  const clearCriteria = useCallback(() => {
    setCriteria(emptyPartyCriteria);
    setHasAppliedCriteria(false);
  }, []);

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
