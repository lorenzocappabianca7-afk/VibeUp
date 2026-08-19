"use client";

import {
  SettingsInfoCard,
  SettingsSection,
} from "@/components/profile/settings/settings-section";
import { SettingsShell } from "@/components/profile/settings/settings-shell";
import { SettingsToggle } from "@/components/profile/settings/settings-toggle";
import { useAppState } from "@/context/app-state-context";
import { requestNotificationPermission } from "@/lib/browser-notifications";
import { fetchManagerNotificationPrefs } from "@/lib/profile/notification-prefs-client";
import {
  normalizeManagerNotificationPrefs,
  type ManagerNotificationChannel,
  type ManagerNotificationPrefs,
} from "@/types/manager-notification-prefs";
import { normalizeUserSettings } from "@/types/user-settings";
import { useEffect, useState } from "react";

interface NotificationsSettingsPanelProps {
  onBack: () => void;
}

export function NotificationsSettingsPanel({
  onBack,
}: NotificationsSettingsPanelProps) {
  const {
    currentUser,
    isGuest,
    isBusinessUser,
    updateUserSettings,
    updateCurrentUser,
    saveManagerNotificationPrefs,
  } = useAppState();
  const settings = normalizeUserSettings(currentUser.settings);
  const notifications = settings.notifications;
  const [permissionHint, setPermissionHint] = useState<string | null>(null);
  const [managerPrefs, setManagerPrefs] = useState<ManagerNotificationPrefs>(
    () =>
      normalizeManagerNotificationPrefs(currentUser.managerNotificationPrefs),
  );
  const [managerError, setManagerError] = useState<string | null>(null);
  const [managerSaved, setManagerSaved] = useState(false);
  const [managerSaving, setManagerSaving] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setManagerPrefs(
        normalizeManagerNotificationPrefs(currentUser.managerNotificationPrefs),
      );
    });
  }, [currentUser.managerNotificationPrefs]);

  useEffect(() => {
    if (!isBusinessUser || isGuest || currentUser.authProvider !== "supabase") {
      return;
    }
    let cancelled = false;
    void fetchManagerNotificationPrefs().then((result) => {
      if (cancelled || !result.ok || !result.prefs) return;
      setManagerPrefs(result.prefs);
      updateCurrentUser({ managerNotificationPrefs: result.prefs });
    });
    return () => {
      cancelled = true;
    };
  }, [
    isBusinessUser,
    isGuest,
    currentUser.authProvider,
    updateCurrentUser,
  ]);

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

  function setChannel(channel: ManagerNotificationChannel) {
    setManagerSaved(false);
    setManagerError(null);
    setManagerPrefs((prev) => ({ ...prev, channel }));
  }

  async function handleSaveManagerPrefs() {
    if (isGuest || !isBusinessUser) return;
    setManagerSaving(true);
    setManagerError(null);
    setManagerSaved(false);
    const result = await saveManagerNotificationPrefs(managerPrefs);
    setManagerSaving(false);
    if (!result.ok) {
      setManagerError(result.error);
      return;
    }
    setManagerSaved(true);
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

      {isBusinessUser && !isGuest && (
        <SettingsSection
          title="Richieste di disponibilità"
          description="Come vuoi ricevere le nuove richieste dai clienti per la tua location o i tuoi servizi. L’invio automatico arriverà in un secondo step."
        >
          <div className="space-y-4 p-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-primary-black">
                Canale preferito
              </legend>
              <label className="flex items-center gap-2 text-sm text-primary-black/80">
                <input
                  type="radio"
                  name="manager-notification-channel"
                  checked={managerPrefs.channel === "email"}
                  onChange={() => setChannel("email")}
                  className="accent-brand-teal"
                />
                Email
              </label>
              <label className="flex items-center gap-2 text-sm text-primary-black/80">
                <input
                  type="radio"
                  name="manager-notification-channel"
                  checked={managerPrefs.channel === "whatsapp"}
                  onChange={() => setChannel("whatsapp")}
                  className="accent-brand-teal"
                />
                WhatsApp
              </label>
            </fieldset>

            {managerPrefs.channel === "whatsapp" ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-primary-black/45">
                  Numero WhatsApp (E.164)
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+393331234567"
                  value={managerPrefs.whatsappNumber ?? ""}
                  onChange={(event) => {
                    setManagerSaved(false);
                    setManagerError(null);
                    setManagerPrefs((prev) => ({
                      ...prev,
                      whatsappNumber: event.target.value,
                    }));
                  }}
                  className="w-full rounded-xl border border-primary-black/12 bg-surface px-3 py-2.5 text-sm text-primary-black outline-none focus:border-brand-teal"
                />
              </label>
            ) : (
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-primary-black/45">
                  Email di destinazione (opzionale)
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={currentUser.email || "es. gestore@locale.it"}
                  value={managerPrefs.email ?? ""}
                  onChange={(event) => {
                    setManagerSaved(false);
                    setManagerError(null);
                    setManagerPrefs((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }));
                  }}
                  className="w-full rounded-xl border border-primary-black/12 bg-surface px-3 py-2.5 text-sm text-primary-black outline-none focus:border-brand-teal"
                />
                <span className="block text-xs text-primary-black/45">
                  Se la lasci vuota useremo l’email di login (
                  {currentUser.email || "non impostata"}).
                </span>
              </label>
            )}

            {managerError && (
              <p className="text-sm font-medium text-brand-pink">{managerError}</p>
            )}
            {managerSaved && !managerError && (
              <p className="text-sm font-medium text-brand-teal">
                Preferenze salvate.
              </p>
            )}

            <button
              type="button"
              disabled={managerSaving}
              onClick={() => {
                void handleSaveManagerPrefs();
              }}
              className="w-full rounded-2xl bg-brand-teal px-4 py-3 text-sm font-bold text-primary-black disabled:opacity-60"
            >
              {managerSaving ? "Salvataggio…" : "Salva preferenze gestore"}
            </button>
          </div>
        </SettingsSection>
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
