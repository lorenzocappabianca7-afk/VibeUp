"use client";

import {
  SettingsInfoCard,
  SettingsSection,
} from "@/components/profile/settings/settings-section";
import { SettingsShell } from "@/components/profile/settings/settings-shell";
import { SettingsToggle } from "@/components/profile/settings/settings-toggle";
import { useAppState } from "@/context/app-state-context";
import { normalizeUserSettings } from "@/types/user-settings";

interface PrivacySettingsPanelProps {
  onBack: () => void;
}

export function PrivacySettingsPanel({ onBack }: PrivacySettingsPanelProps) {
  const { currentUser, isGuest, updateUserSettings } = useAppState();
  const settings = normalizeUserSettings(currentUser.settings);
  const privacy = settings.privacy;

  return (
    <SettingsShell
      title="Privacy e Visibilità"
      subtitle="Controlla cosa vedono invitati e fornitori"
      onBack={onBack}
    >
      {isGuest && (
        <SettingsInfoCard tone="pink">
          Crea un account per salvare le preferenze di privacy sul tuo profilo.
        </SettingsInfoCard>
      )}

      <SettingsSection
        title="Visibilità feste"
        description="Gestisci cosa possono vedere le persone invitate all'evento."
      >
        <div className="divide-y divide-primary-black/8">
          <SettingsToggle
            label="Dettagli evento per gli invitati"
            description="Data, orario e location visibili a chi ha ricevuto l'invito."
            checked={privacy.eventsVisibleToInvitedGuests}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({
                privacy: { eventsVisibleToInvitedGuests: next },
              })
            }
          />
          <SettingsToggle
            label="Lista invitati ai fornitori"
            description="I vendor possono vedere quanti ospiti e chi partecipa."
            checked={privacy.showGuestListToVendors}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({
                privacy: { showGuestListToVendors: next },
              })
            }
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Dati condivisi">
        <div className="divide-y divide-primary-black/8">
          <SettingsToggle
            label="Condividi telefono con i fornitori"
            description="Utile per coordinare consegne e setup il giorno dell'evento."
            checked={privacy.sharePhoneWithVendors}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({
                privacy: { sharePhoneWithVendors: next },
              })
            }
          />
          <SettingsToggle
            label="Profilo trovabile in ricerca"
            description="Altri organizzatori possono trovarti per collaborazioni."
            checked={privacy.showProfileInSearch}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({
                privacy: { showProfileInSearch: next },
              })
            }
          />
          <SettingsToggle
            label="Consigli personalizzati"
            description="Usiamo le tue ricerche per proporti locali e servizi più adatti."
            checked={privacy.personalizedRecommendations}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({
                privacy: { personalizedRecommendations: next },
              })
            }
          />
        </div>
      </SettingsSection>

      <SettingsInfoCard>
        Puoi richiedere l&apos;esportazione o la cancellazione dei tuoi dati
        scrivendo a privacy@vibeup.app. Le modifiche qui restano salvate sul
        tuo account.
      </SettingsInfoCard>
    </SettingsShell>
  );
}
