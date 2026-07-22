"use client";

import { AccountGateProvider } from "@/context/account-gate-context";
import { AppStateProvider } from "@/context/app-state-context";
import {
  TabNavigationFallbackProvider,
  TabNavigationProvider,
} from "@/context/tab-navigation-context";
import { Suspense, type ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <AccountGateProvider>
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
