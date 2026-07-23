"use client";

import { AccountGateProvider } from "@/context/account-gate-context";
import { AppStateProvider } from "@/context/app-state-context";
import {
  TabNavigationFallbackProvider,
  TabNavigationProvider,
} from "@/context/tab-navigation-context";
import { SecurityRuntimeGuard } from "@/components/security/security-runtime-guard";
import { Suspense, type ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <AccountGateProvider>
        <SecurityRuntimeGuard />
        <Suspense
          fallback={
            <TabNavigationFallbackProvider>
              {children}
            </TabNavigationFallbackProvider>
          }
        >
          <TabNavigationProvider>{children}</TabNavigationProvider>
        </Suspense>
      </AccountGateProvider>
    </AppStateProvider>
  );
}
