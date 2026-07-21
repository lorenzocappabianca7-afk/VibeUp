"use client";

import { CreateAccountModal } from "@/components/auth/create-account-modal";
import { useAppState } from "@/context/app-state-context";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type PendingAction = () => void;

interface AccountGateContextValue {
  requireAccount: (action: PendingAction, reason?: string) => boolean;
}

const AccountGateContext = createContext<AccountGateContextValue | null>(null);

const DEFAULT_REASON =
  "Per continuare ti chiediamo di creare un account. Ci vuole un momento.";

export function AccountGateProvider({ children }: { children: ReactNode }) {
  const { createAccount, isGuest, isStorageHydrated } = useAppState();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(DEFAULT_REASON);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const runAfterAccountRef = useRef(false);

  useEffect(() => {
    if (isGuest || !runAfterAccountRef.current) return;

    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    runAfterAccountRef.current = false;
    action?.();
  }, [isGuest]);

  const requireAccount = useCallback(
    (action: PendingAction, nextReason = DEFAULT_REASON) => {
      if (!isStorageHydrated) return false;

      if (!isGuest) {
        action();
        return true;
      }

      pendingActionRef.current = action;
      setReason(nextReason);
      setOpen(true);
      return false;
    },
    [isGuest, isStorageHydrated],
  );

  function handleClose() {
    setOpen(false);
    pendingActionRef.current = null;
    runAfterAccountRef.current = false;
  }

  function handleSubmit(account: { name: string; email: string }) {
    runAfterAccountRef.current = true;
    createAccount(account);
    setOpen(false);
  }

  return (
    <AccountGateContext.Provider value={{ requireAccount }}>
      {children}
      <CreateAccountModal
        open={open}
        reason={reason}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    </AccountGateContext.Provider>
  );
}

export function useAccountGate() {
  const context = useContext(AccountGateContext);
  if (!context) {
    throw new Error("useAccountGate must be used within AccountGateProvider");
  }
  return context;
}
