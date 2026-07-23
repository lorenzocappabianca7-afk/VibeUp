"use client";

import {
  SettingsInfoCard,
  SettingsNavRow,
  SettingsSection,
} from "@/components/profile/settings/settings-section";
import { SettingsShell } from "@/components/profile/settings/settings-shell";
import { useAppState } from "@/context/app-state-context";
import { normalizeUserSettings } from "@/types/user-settings";
import { AtSign, Globe, Mail, Phone, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AccountSettingsPanelProps {
  onBack: () => void;
}

function profileDraftFromUser(user: {
  name: string;
  email: string;
  phoneNumber?: string;
  instagramHandle?: string;
}) {
  return {
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber ?? "",
    instagramHandle: user.instagramHandle ?? "",
  };
}

export function AccountSettingsPanel({ onBack }: AccountSettingsPanelProps) {
  const { currentUser, isGuest, updateCurrentUser, updateUserSettings } =
    useAppState();
  const settings = normalizeUserSettings(currentUser.settings);
  const [draft, setDraft] = useState(() => profileDraftFromUser(currentUser));
  const [draftUserId, setDraftUserId] = useState(currentUser.id);
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current != null) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  if (draftUserId !== currentUser.id) {
    setDraftUserId(currentUser.id);
    setDraft(profileDraftFromUser(currentUser));
  }

  function saveProfile() {
    if (isGuest) return;
    updateCurrentUser({
      name: draft.name.trim() || currentUser.name,
      email: draft.email.trim() || currentUser.email,
      phoneNumber: draft.phoneNumber.trim(),
      instagramHandle: draft.instagramHandle.replace(/^@+/, "").trim(),
    });
    setSavedFlash(true);
    if (flashTimerRef.current != null) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => {
      setSavedFlash(false);
      flashTimerRef.current = null;
    }, 2000);
  }

  return (
    <SettingsShell
      title="Impostazioni account"
      subtitle="Dati personali e preferenze base"
      onBack={onBack}
    >
      {isGuest && (
        <SettingsInfoCard tone="pink">
          Crea un account per modificare e salvare i tuoi dati personali.
        </SettingsInfoCard>
      )}

      <SettingsSection title="Informazioni personali">
        <label className="block border-b border-primary-black/8 px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-bold text-primary-black/55">
            <UserRound className="h-3.5 w-3.5" aria-hidden />
            Nome
          </span>
          <input
            value={draft.name}
            disabled={isGuest}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            className="mt-1.5 w-full bg-transparent text-sm font-semibold text-primary-black outline-none disabled:opacity-60"
          />
        </label>
        <label className="block border-b border-primary-black/8 px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-bold text-primary-black/55">
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Email
          </span>
          <input
            type="email"
            value={draft.email}
            disabled={isGuest}
            onChange={(event) =>
              setDraft((current) => ({ ...current, email: event.target.value }))
            }
            className="mt-1.5 w-full bg-transparent text-sm font-semibold text-primary-black outline-none disabled:opacity-60"
          />
        </label>
        <label className="block border-b border-primary-black/8 px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-bold text-primary-black/55">
            <Phone className="h-3.5 w-3.5" aria-hidden />
            Telefono
          </span>
          <input
            type="tel"
            value={draft.phoneNumber}
            disabled={isGuest}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                phoneNumber: event.target.value,
              }))
            }
            placeholder="+39 333 000 0000"
            className="mt-1.5 w-full bg-transparent text-sm font-semibold text-primary-black outline-none placeholder:text-primary-black/35 disabled:opacity-60"
          />
        </label>
        <label className="block px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-bold text-primary-black/55">
            <AtSign className="h-3.5 w-3.5" aria-hidden />
            Instagram
          </span>
          <input
            value={draft.instagramHandle}
            disabled={isGuest}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                instagramHandle: event.target.value,
              }))
            }
            placeholder="@profilo"
            className="mt-1.5 w-full bg-transparent text-sm font-semibold text-primary-black outline-none placeholder:text-primary-black/35 disabled:opacity-60"
          />
        </label>
      </SettingsSection>

      {!isGuest && (
        <button
          type="button"
          onClick={saveProfile}
          className="w-full rounded-2xl bg-primary-black px-4 py-3 text-sm font-black text-white transition-colors hover:bg-primary-black/90"
        >
          Salva modifiche
        </button>
      )}

      {savedFlash && (
        <SettingsInfoCard tone="teal">
          Profilo aggiornato correttamente.
        </SettingsInfoCard>
      )}

      <SettingsSection
        title="Preferenze"
        description="Queste scelte restano salvate sul tuo account."
      >
        <SettingsNavRow
          icon={Globe}
          label="Lingua"
          value={settings.account.language === "it" ? "Italiano" : "English"}
          onClick={() =>
            updateUserSettings({
              account: {
                language: settings.account.language === "it" ? "en" : "it",
              },
            })
          }
          disabled={isGuest}
        />
        <SettingsNavRow
          icon={Globe}
          label="Valuta"
          value="EUR (€)"
          description="Usata per preventivi e pagamenti in app."
        />
      </SettingsSection>
    </SettingsShell>
  );
}
