"use client";

import {
  SettingsInfoCard,
  SettingsSection,
} from "@/components/profile/settings/settings-section";
import { SettingsShell } from "@/components/profile/settings/settings-shell";
import { SettingsToggle } from "@/components/profile/settings/settings-toggle";
import { useAppState } from "@/context/app-state-context";
import { normalizeUserSettings } from "@/types/user-settings";

interface NotificationsSettingsPanelProps {
  onBack: () => void;
}

export function NotificationsSettingsPanel({
  onBack,
}: NotificationsSettingsPanelProps) {
  const { currentUser, isGuest, updateUserSettings } = useAppState();
  const settings = normalizeUserSettings(currentUser.settings);
  const notifications = settings.notifications;

  return (
    <SettingsShell
      title="Notifiche e Comunicazioni"
      subtitle="Scegli come e quando sentirci"
      onBack={onBack}
    >
      {isGuest && (
        <SettingsInfoCard tone="pink">
          Crea un account per personalizzare i canali di notifica.
        </SettingsInfoCard>
      )}

      <SettingsSection
        title="Canali"
        description="Come vuoi ricevere gli aggiornamenti sui preventivi e le prenotazioni."
      >
        <div className="divide-y divide-primary-black/8">
          <SettingsToggle
            label="Notifiche push"
            description="Avvisi istantanei sull'app."
            checked={notifications.pushEnabled}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({ notifications: { pushEnabled: next } })
            }
          />
          <SettingsToggle
            label="Email"
            description="Riepiloghi e conferme nella tua casella."
            checked={notifications.emailEnabled}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({ notifications: { emailEnabled: next } })
            }
          />
          <SettingsToggle
            label="WhatsApp"
            description="Messaggi rapidi su preventivi e reminder."
            checked={notifications.whatsappEnabled}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({ notifications: { whatsappEnabled: next } })
            }
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Tipologie di aggiornamento">
        <div className="divide-y divide-primary-black/8">
          <SettingsToggle
            label="Preventivi"
            description="Nuove proposte, modifiche e scadenze."
            checked={notifications.quoteUpdates}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({ notifications: { quoteUpdates: next } })
            }
          />
          <SettingsToggle
            label="Prenotazioni e pagamenti"
            description="Caparre, conferme e ricevute."
            checked={notifications.bookingUpdates}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({ notifications: { bookingUpdates: next } })
            }
          />
          <SettingsToggle
            label="Promemoria evento"
            description="Countdown e checklist prima della festa."
            checked={notifications.eventReminders}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({ notifications: { eventReminders: next } })
            }
          />
          <SettingsToggle
            label="Consigli e novità"
            description="Suggerimenti, sconti e novità del prodotto."
            checked={notifications.marketingTips}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({ notifications: { marketingTips: next } })
            }
          />
        </div>
      </SettingsSection>

      <SettingsInfoCard>
        Anche con le notifiche disattivate riceverai sempre messaggi critici su
        pagamenti e sicurezza dell&apos;account.
      </SettingsInfoCard>
    </SettingsShell>
  );
}
