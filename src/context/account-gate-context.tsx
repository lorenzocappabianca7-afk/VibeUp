"use client";

import { CreateAccountModal } from "@/components/auth/create-account-modal";
import { GUEST_USER, useAppState } from "@/context/app-state-context";
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
  const { createAccount, currentUser, isGuest, isStorageHydrated } =
    useAppState();
  const [modalReason, setModalReason] = useState<string | null>(null);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const runAfterAccountRef = useRef(false);
  const pendingReasonRef = useRef(DEFAULT_REASON);
  const waitingForHydrationRef = useRef(false);

  const hasAccount =
    !isGuest && currentUser.id !== GUEST_USER.id;

  // Logged-in users never see the create-account modal.
  if (hasAccount && modalReason !== null) {
    setModalReason(null);
  }

  const open = modalReason !== null && !hasAccount;

  const runPendingAction = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    runAfterAccountRef.current = false;
    waitingForHydrationRef.current = false;
    action?.();
  }, []);

  useEffect(() => {
    if (!isStorageHydrated) return;

    if (hasAccount) {
      if (runAfterAccountRef.current || pendingActionRef.current) {
        runPendingAction();
      }
      return;
    }

    if (waitingForHydrationRef.current && pendingActionRef.current) {
      waitingForHydrationRef.current = false;
      setModalReason(pendingReasonRef.current);
    }
  }, [hasAccount, isStorageHydrated, runPendingAction]);

  const requireAccount = useCallback(
    (action: PendingAction, nextReason = DEFAULT_REASON) => {
      if (!isStorageHydrated) {
        pendingActionRef.current = action;
        pendingReasonRef.current = nextReason;
        waitingForHydrationRef.current = true;
        return false;
      }

      if (hasAccount) {
        action();
        return true;
      }

      pendingActionRef.current = action;
      pendingReasonRef.current = nextReason;
      setModalReason(nextReason);
      return false;
    },
    [hasAccount, isStorageHydrated],
  );

  function handleClose() {
    setModalReason(null);
    pendingActionRef.current = null;
    runAfterAccountRef.current = false;
    waitingForHydrationRef.current = false;
  }

  function handleSubmit(account: { name: string; email: string }) {
    runAfterAccountRef.current = true;
    createAccount(account);
    setModalReason(null);
  }

  return (
    <AccountGateContext.Provider value={{ requireAccount }}>
      {children}
      <CreateAccountModal
        open={open}
        reason={modalReason ?? DEFAULT_REASON}
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
