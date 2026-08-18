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
  const {
    currentUser,
    isGuest,
    updateCurrentUser,
    updateUserSettings,
    changeAccountEmail,
  } = useAppState();
  const settings = normalizeUserSettings(currentUser.settings);
  const [draft, setDraft] = useState(() => profileDraftFromUser(currentUser));
  const [draftUserId, setDraftUserId] = useState(currentUser.id);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailPassword, setEmailPassword] = useState("");
  const [saving, setSaving] = useState(false);
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
    setEmailPassword("");
    setEmailError(null);
    setEmailMessage(null);
  }

  async function saveProfile() {
    if (isGuest || saving) return;
    setEmailError(null);
    setEmailMessage(null);

    const nextEmail = draft.email.trim().toLowerCase();
    const emailChanged = nextEmail !== currentUser.email.trim().toLowerCase();

    updateCurrentUser({
      name: draft.name.trim() || currentUser.name,
      phoneNumber: draft.phoneNumber.trim(),
      instagramHandle: draft.instagramHandle.replace(/^@+/, "").trim(),
    });

    if (emailChanged) {
      if (!emailPassword) {
        setEmailError("Inserisci la password attuale per cambiare email.");
        return;
      }
      setSaving(true);
      const result = await changeAccountEmail(nextEmail, emailPassword);
      setSaving(false);
      if (!result.ok) {
        setEmailError(result.error);
        return;
      }
      setEmailPassword("");
      if (result.needsEmailActivation) {
        setEmailMessage(
          `Ti abbiamo inviato una conferma a ${result.email}. L’indirizzo in account cambia dopo che apri il link (mittente info@vibeupevents.com).`,
        );
      } else {
        setEmailMessage("Profilo aggiornato correttamente.");
      }
      return;
    }

    setEmailMessage("Profilo aggiornato correttamente.");
    if (flashTimerRef.current != null) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => {
      setEmailMessage(null);
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

      {draft.email.trim().toLowerCase() !==
        currentUser.email.trim().toLowerCase() &&
        !isGuest && (
          <SettingsSection title="Conferma identità">
            <label className="block px-4 py-3">
              <span className="text-xs font-bold text-primary-black/55">
                Password attuale
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
                placeholder="Necessaria per cambiare email"
                className="mt-1.5 w-full bg-transparent text-sm font-semibold text-primary-black outline-none placeholder:text-primary-black/35"
              />
            </label>
          </SettingsSection>
        )}

      {!isGuest && (
        <button
          type="button"
          onClick={() => void saveProfile()}
          disabled={saving}
          className="w-full rounded-2xl bg-paper px-4 py-3 text-sm font-black text-ink-inverse transition-colors hover:bg-surface/90 disabled:opacity-60"
        >
          {saving ? "Salvataggio…" : "Salva modifiche"}
        </button>
      )}

      {emailError ? (
        <SettingsInfoCard tone="pink">{emailError}</SettingsInfoCard>
      ) : null}
      {emailMessage ? (
        <SettingsInfoCard tone="teal">{emailMessage}</SettingsInfoCard>
      ) : null}

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
