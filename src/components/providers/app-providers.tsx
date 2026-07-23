"use client";

import { AccountGateProvider } from "@/context/account-gate-context";
import { AppStateProvider } from "@/context/app-state-context";
import { ChatProvider } from "@/context/chat-context";
import { InboxBadgeProvider } from "@/context/inbox-badge-context";
import { TabNavigationProvider } from "@/context/tab-navigation-context";
import { SecurityRuntimeGuard } from "@/components/security/security-runtime-guard";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <AccountGateProvider>
        <InboxBadgeProvider>
          <ChatProvider>
            <SecurityRuntimeGuard />
            <TabNavigationProvider>{children}</TabNavigationProvider>
          </ChatProvider>
        </InboxBadgeProvider>
      </AccountGateProvider>
    </AppStateProvider>
  );
}
