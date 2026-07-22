export interface UserPrivacySettings {
  eventsVisibleToInvitedGuests: boolean;
  showGuestListToVendors: boolean;
  sharePhoneWithVendors: boolean;
  personalizedRecommendations: boolean;
  showProfileInSearch: boolean;
}

export interface UserNotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  quoteUpdates: boolean;
  bookingUpdates: boolean;
  eventReminders: boolean;
  marketingTips: boolean;
}

export interface UserSecuritySettings {
  twoFactorEnabled: boolean;
  biometricUnlock: boolean;
  loginAlerts: boolean;
}

export interface UserAccountSettings {
  language: "it" | "en";
  currency: "EUR";
}

export interface UserSettings {
  privacy: UserPrivacySettings;
  notifications: UserNotificationSettings;
  security: UserSecuritySettings;
  account: UserAccountSettings;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  privacy: {
    eventsVisibleToInvitedGuests: true,
    showGuestListToVendors: false,
    sharePhoneWithVendors: true,
    personalizedRecommendations: true,
    showProfileInSearch: false,
  },
  notifications: {
    pushEnabled: true,
    emailEnabled: true,
    whatsappEnabled: false,
    quoteUpdates: true,
    bookingUpdates: true,
    eventReminders: true,
    marketingTips: false,
  },
  security: {
    twoFactorEnabled: false,
    biometricUnlock: false,
    loginAlerts: true,
  },
  account: {
    language: "it",
    currency: "EUR",
  },
};

export function normalizeUserSettings(
  value?: Partial<UserSettings> | null,
): UserSettings {
  return {
    privacy: {
      ...DEFAULT_USER_SETTINGS.privacy,
      ...(value?.privacy ?? {}),
    },
    notifications: {
      ...DEFAULT_USER_SETTINGS.notifications,
      ...(value?.notifications ?? {}),
    },
    security: {
      ...DEFAULT_USER_SETTINGS.security,
      ...(value?.security ?? {}),
    },
    account: {
      ...DEFAULT_USER_SETTINGS.account,
      ...(value?.account ?? {}),
    },
  };
}

export type SettingsPanelId =
  | "settings"
  | "payments"
  | "help"
  | "privacy"
  | "notifications"
  | "security";

export const SETTINGS_PANEL_TITLES: Record<SettingsPanelId, string> = {
  settings: "Impostazioni account",
  payments: "Pagamenti e abbonamento",
  help: "Aiuto e supporto",
  privacy: "Privacy e Visibilità",
  notifications: "Notifiche e Comunicazioni",
  security: "Sicurezza e Recensioni",
};
