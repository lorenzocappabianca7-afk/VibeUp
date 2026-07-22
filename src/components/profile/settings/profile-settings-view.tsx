"use client";

import { AccountSettingsPanel } from "@/components/profile/settings/account-settings-panel";
import { HelpSettingsPanel } from "@/components/profile/settings/help-settings-panel";
import { NotificationsSettingsPanel } from "@/components/profile/settings/notifications-settings-panel";
import { PaymentsSettingsPanel } from "@/components/profile/settings/payments-settings-panel";
import { PrivacySettingsPanel } from "@/components/profile/settings/privacy-settings-panel";
import { SecuritySettingsPanel } from "@/components/profile/settings/security-settings-panel";
import type { SettingsPanelId } from "@/types/user-settings";
import { useEffect } from "react";

interface ProfileSettingsViewProps {
  panel: SettingsPanelId;
  onClose: () => void;
}

export function ProfileSettingsView({
  panel,
  onClose,
}: ProfileSettingsViewProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  switch (panel) {
    case "settings":
      return <AccountSettingsPanel onBack={onClose} />;
    case "payments":
      return <PaymentsSettingsPanel onBack={onClose} />;
    case "help":
      return <HelpSettingsPanel onBack={onClose} />;
    case "privacy":
      return <PrivacySettingsPanel onBack={onClose} />;
    case "notifications":
      return <NotificationsSettingsPanel onBack={onClose} />;
    case "security":
      return <SecuritySettingsPanel onBack={onClose} />;
    default:
      return null;
  }
}
