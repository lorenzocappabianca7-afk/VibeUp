"use client";

import { AccountGateProvider } from "@/context/account-gate-context";
import { AppStateProvider } from "@/context/app-state-context";
import { AvailabilityRequestProvider } from "@/context/availability-request-context";
import { ChatProvider } from "@/context/chat-context";
import { InboxBadgeProvider } from "@/context/inbox-badge-context";
import { ProfileCommunicationsProvider } from "@/context/profile-communications-context";
import { TabNavigationProvider } from "@/context/tab-navigation-context";
import { ConfirmAvailabilityModal } from "@/components/availability/confirm-availability-modal";
import { SecurityRuntimeGuard } from "@/components/security/security-runtime-guard";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <AccountGateProvider>
        <InboxBadgeProvider>
          <ProfileCommunicationsProvider>
            <AvailabilityRequestProvider>
              <ChatProvider>
                <SecurityRuntimeGuard />
                <TabNavigationProvider>
                  <ConfirmAvailabilityModal />
                  {children}
                </TabNavigationProvider>
              </ChatProvider>
            </AvailabilityRequestProvider>
          </ProfileCommunicationsProvider>
        </InboxBadgeProvider>
      </AccountGateProvider>
    </AppStateProvider>
  );
}
