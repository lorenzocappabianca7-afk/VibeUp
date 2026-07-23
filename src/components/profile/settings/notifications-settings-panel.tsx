"use client";

import {
  SettingsInfoCard,
  SettingsSection,
} from "@/components/profile/settings/settings-section";
import { SettingsShell } from "@/components/profile/settings/settings-shell";
import { SettingsToggle } from "@/components/profile/settings/settings-toggle";
import { useAppState } from "@/context/app-state-context";
import { requestNotificationPermission } from "@/lib/browser-notifications";
import { normalizeUserSettings } from "@/types/user-settings";
import { useState } from "react";

interface NotificationsSettingsPanelProps {
  onBack: () => void;
}

export function NotificationsSettingsPanel({
  onBack,
}: NotificationsSettingsPanelProps) {
  const { currentUser, isGuest, updateUserSettings } = useAppState();
  const settings = normalizeUserSettings(currentUser.settings);
  const notifications = settings.notifications;
  const [permissionHint, setPermissionHint] = useState<string | null>(null);

  async function handlePushChange(next: boolean) {
    if (isGuest) return;

    if (next) {
      const permission = await requestNotificationPermission();
      if (permission === "denied") {
        setPermissionHint(
          "Il browser ha bloccato le notifiche. Abilitale dalle impostazioni del dispositivo.",
        );
        updateUserSettings({ notifications: { pushEnabled: false } });
        return;
      }
      if (permission === "unsupported") {
        setPermissionHint(
          "Questo browser non supporta le notifiche push locali.",
        );
        updateUserSettings({ notifications: { pushEnabled: false } });
        return;
      }
      setPermissionHint(null);
      updateUserSettings({ notifications: { pushEnabled: true } });
      return;
    }

    setPermissionHint(null);
    updateUserSettings({ notifications: { pushEnabled: false } });
  }

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
        description="Come vuoi ricevere gli aggiornamenti sui preventivi, le prenotazioni e i messaggi."
      >
        <div className="divide-y divide-primary-black/8">
          <SettingsToggle
            label="Notifiche push"
            description="Avvisi del browser per nuovi messaggi in chat."
            checked={notifications.pushEnabled}
            disabled={isGuest}
            onChange={(next) => {
              void handlePushChange(next);
            }}
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

      {permissionHint && (
        <SettingsInfoCard tone="pink">{permissionHint}</SettingsInfoCard>
      )}

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
        Disattivando le notifiche push non riceverai avvisi del browser per i
        nuovi messaggi. I messaggi restano comunque disponibili nella chat.
      </SettingsInfoCard>
    </SettingsShell>
  );
}
