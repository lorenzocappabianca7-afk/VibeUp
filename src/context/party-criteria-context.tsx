"use client";

import type { PartyCriteria } from "@/types/party-criteria";
import {
  emptyPartyCriteria,
  normalizePartyCriteria,
} from "@/types/party-criteria";
import { forgetPersistedPartyCriteria } from "@/lib/party-criteria-storage";
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
  /** True after the user completed the Home wizard in this app session. */
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

  useEffect(() => {
    forgetPersistedPartyCriteria();
  }, []);

  const applyCriteria = useCallback((next: PartyCriteria) => {
    const normalized = normalizePartyCriteria({
      ...next,
      freeText: next.freeText.trim(),
    });
    setCriteria(normalized);
    setHasAppliedCriteria(true);
  }, []);

  const clearCriteria = useCallback(() => {
    setCriteria(emptyPartyCriteria);
    setHasAppliedCriteria(false);
    forgetPersistedPartyCriteria();
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
