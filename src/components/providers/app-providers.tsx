"use client";

import { AccountGateProvider } from "@/context/account-gate-context";
import { AppStateProvider } from "@/context/app-state-context";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <AccountGateProvider>{children}</AccountGateProvider>
    </AppStateProvider>
  );
}
