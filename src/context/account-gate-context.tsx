"use client";

import { CreateAccountModal } from "@/components/auth/create-account-modal";
import { GUEST_USER, useAppState } from "@/context/app-state-context";
import { requestActivationEmail } from "@/lib/auth/request-activation-email";
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
  const {
    createAccount,
    currentUser,
    isGuest,
    isStorageHydrated,
    isAccountLocked,
  } = useAppState();
  const [modalReason, setModalReason] = useState<string | null>(null);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const runAfterAccountRef = useRef(false);
  const pendingReasonRef = useRef(DEFAULT_REASON);
  const waitingForHydrationRef = useRef(false);
  const wasLockedRef = useRef(false);

  const hasAccount =
    !isGuest && currentUser.id !== GUEST_USER.id;
  const canUseAccount = hasAccount && !isAccountLocked;

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
    if (isAccountLocked) {
      wasLockedRef.current = true;
    }
  }, [isAccountLocked]);

  useEffect(() => {
    if (!isStorageHydrated) return;

    if (canUseAccount) {
      wasLockedRef.current = false;
      if (runAfterAccountRef.current || pendingActionRef.current) {
        runPendingAction();
      }
      return;
    }

    // Drop queued actions only when leaving a locked session as guest.
    if (wasLockedRef.current && isGuest) {
      pendingActionRef.current = null;
      runAfterAccountRef.current = false;
      wasLockedRef.current = false;
    }

    if (waitingForHydrationRef.current && pendingActionRef.current) {
      waitingForHydrationRef.current = false;
      setModalReason(pendingReasonRef.current);
    }
  }, [canUseAccount, isGuest, isStorageHydrated, runPendingAction]);

  const requireAccount = useCallback(
    (action: PendingAction, nextReason = DEFAULT_REASON) => {
      if (!isStorageHydrated) {
        pendingActionRef.current = action;
        pendingReasonRef.current = nextReason;
        waitingForHydrationRef.current = true;
        return false;
      }

      if (canUseAccount) {
        action();
        return true;
      }

      // Account exists but is locked: wait for unlock, then run the action.
      if (hasAccount && isAccountLocked) {
        pendingActionRef.current = action;
        return false;
      }

      pendingActionRef.current = action;
      pendingReasonRef.current = nextReason;
      setModalReason(nextReason);
      return false;
    },
    [canUseAccount, hasAccount, isAccountLocked, isStorageHydrated],
  );

  function handleClose() {
    setModalReason(null);
    pendingActionRef.current = null;
    runAfterAccountRef.current = false;
    waitingForHydrationRef.current = false;
  }

  function handleSubmit(account: {
    name: string;
    email: string;
    phoneNumber: string;
    password: string;
  }) {
    runAfterAccountRef.current = true;
    return (async () => {
      const result = await createAccount(account);
      if (!result.ok) {
        runAfterAccountRef.current = false;
        throw new Error(result.error);
      }
      if (
        result.needsEmailActivation &&
        result.activationToken &&
        result.email
      ) {
        const emailResult = await requestActivationEmail({
          email: result.email,
          name: result.name ?? account.name,
          token: result.activationToken,
        });
        if (!emailResult.ok) {
          // Account is created; surface mail issues without blocking entry.
          console.warn("[activation-email]", emailResult.error);
        }
      }
      setModalReason(null);
    })();
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
