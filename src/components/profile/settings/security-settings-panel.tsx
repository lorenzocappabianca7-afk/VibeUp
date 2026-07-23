"use client";

import {
  SettingsInfoCard,
  SettingsNavRow,
  SettingsSection,
} from "@/components/profile/settings/settings-section";
import { SettingsShell } from "@/components/profile/settings/settings-shell";
import { SettingsToggle } from "@/components/profile/settings/settings-toggle";
import { useAppState } from "@/context/app-state-context";
import { getBiometricLabel } from "@/lib/auth/biometric";
import { normalizeUserSettings } from "@/types/user-settings";
import { Fingerprint, KeyRound, ScanFace, ShieldCheck, Star } from "lucide-react";
import { useMemo, useState } from "react";

interface SecuritySettingsPanelProps {
  onBack: () => void;
}

type SecuritySubview = "home" | "password" | "reviews" | "biometric";

const MOCK_REVIEWS = [
  {
    id: "rev-1",
    target: "Loft San Salvario",
    rating: 5,
    date: "15 giu 2026",
    note: "Spazio perfetto, staff super disponibile.",
  },
  {
    id: "rev-2",
    target: "DJ Luna",
    rating: 4,
    date: "2 mag 2026",
    note: "Ottima selezione, un po' di ritardo sul setup.",
  },
];

export function SecuritySettingsPanel({ onBack }: SecuritySettingsPanelProps) {
  const {
    currentUser,
    isGuest,
    updateUserSettings,
    changePassword,
    enrollBiometric,
    disableBiometric,
  } = useAppState();
  const settings = normalizeUserSettings(currentUser.settings);
  const security = settings.security;
  const biometricLabel = useMemo(() => getBiometricLabel(), []);
  const biometricActive = Boolean(currentUser.biometricCredentialId);
  const isFaceLabel = biometricLabel.toLowerCase().includes("face");
  const BiometricIcon = isFaceLabel ? ScanFace : Fingerprint;
  const [view, setView] = useState<SecuritySubview>("home");
  const [passwordDraft, setPasswordDraft] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [biometricMessage, setBiometricMessage] = useState<string | null>(null);

  function handleBack() {
    if (view !== "home") {
      setView("home");
      setBiometricError(null);
      setBiometricMessage(null);
      return;
    }
    onBack();
  }

  async function handleChangePassword() {
    if (isGuest) {
      setPasswordError("Crea un account per gestire la password.");
      return;
    }
    if (passwordDraft.next.length < 8) {
      setPasswordError("La nuova password deve avere almeno 8 caratteri.");
      return;
    }
    if (passwordDraft.next !== passwordDraft.confirm) {
      setPasswordError("Le password non coincidono.");
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);
    const result = await changePassword(
      passwordDraft.current,
      passwordDraft.next,
    );
    setSavingPassword(false);

    if (!result.ok) {
      setPasswordError(result.error);
      return;
    }

    setPasswordMessage(
      "Password aggiornata. Ti servirà per accedere se non usi VibeUp da un po’.",
    );
    setPasswordDraft({ current: "", next: "", confirm: "" });
  }

  async function handleEnableBiometric() {
    if (isGuest || biometricBusy) return;
    setBiometricBusy(true);
    setBiometricError(null);
    setBiometricMessage(null);
    const result = await enrollBiometric();
    setBiometricBusy(false);
    if (!result.ok) {
      setBiometricError(result.error);
      return;
    }
    setBiometricMessage(`${biometricLabel} attivato su questo dispositivo.`);
  }

  async function handleDisableBiometric() {
    if (isGuest || biometricBusy) return;
    setBiometricBusy(true);
    setBiometricError(null);
    setBiometricMessage(null);
    await disableBiometric();
    setBiometricBusy(false);
    setBiometricMessage(`${biometricLabel} disattivato.`);
  }

  if (view === "password") {
    return (
      <SettingsShell
        title="Modifica password"
        subtitle="Proteggi l'accesso al tuo account"
        onBack={handleBack}
      >
        <SettingsSection>
          <label className="block border-b border-primary-black/8 px-4 py-3">
            <span className="text-xs font-bold text-primary-black/55">
              Password attuale
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={passwordDraft.current}
              disabled={isGuest}
              onChange={(event) =>
                setPasswordDraft((current) => ({
                  ...current,
                  current: event.target.value,
                }))
              }
              className="mt-1.5 w-full bg-transparent text-sm font-semibold outline-none disabled:opacity-60"
            />
          </label>
          <label className="block border-b border-primary-black/8 px-4 py-3">
            <span className="text-xs font-bold text-primary-black/55">
              Nuova password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordDraft.next}
              disabled={isGuest}
              onChange={(event) =>
                setPasswordDraft((current) => ({
                  ...current,
                  next: event.target.value,
                }))
              }
              className="mt-1.5 w-full bg-transparent text-sm font-semibold outline-none disabled:opacity-60"
            />
          </label>
          <label className="block px-4 py-3">
            <span className="text-xs font-bold text-primary-black/55">
              Conferma nuova password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordDraft.confirm}
              disabled={isGuest}
              onChange={(event) =>
                setPasswordDraft((current) => ({
                  ...current,
                  confirm: event.target.value,
                }))
              }
              className="mt-1.5 w-full bg-transparent text-sm font-semibold outline-none disabled:opacity-60"
            />
          </label>
        </SettingsSection>

        {passwordError && (
          <SettingsInfoCard tone="pink">{passwordError}</SettingsInfoCard>
        )}
        {passwordMessage && (
          <SettingsInfoCard tone="teal">{passwordMessage}</SettingsInfoCard>
        )}

        <button
          type="button"
          disabled={isGuest || savingPassword}
          onClick={() => void handleChangePassword()}
          className="w-full rounded-2xl bg-primary-black px-4 py-3 text-sm font-black text-white transition-colors hover:bg-primary-black/90 disabled:opacity-50"
        >
          {savingPassword ? "Aggiorno…" : "Aggiorna password"}
        </button>
      </SettingsShell>
    );
  }

  if (view === "reviews") {
    return (
      <SettingsShell
        title="Le tue recensioni"
        subtitle="Feedback lasciati ai fornitori"
        onBack={handleBack}
      >
        <SettingsSection>
          {MOCK_REVIEWS.map((review) => (
            <div
              key={review.id}
              className="border-b border-primary-black/8 px-4 py-3.5 last:border-b-0"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-primary-black">
                  {review.target}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-black text-brand-teal">
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                  {review.rating}/5
                </span>
              </div>
              <p className="mt-1 text-xs text-primary-black/45">{review.date}</p>
              <p className="mt-2 text-sm leading-relaxed text-primary-black/70">
                {review.note}
              </p>
            </div>
          ))}
        </SettingsSection>
      </SettingsShell>
    );
  }

  if (view === "biometric") {
    return (
      <SettingsShell
        title={biometricLabel}
        subtitle="Sblocco rapido dell’account"
        onBack={handleBack}
      >
        {isGuest && (
          <SettingsInfoCard tone="pink">
            Crea un account per configurare {biometricLabel}.
          </SettingsInfoCard>
        )}

        <SettingsInfoCard tone={biometricActive ? "teal" : "neutral"}>
          {biometricActive
            ? `${biometricLabel} è attivo su questo dispositivo. Potrai usarlo per sbloccare l’account dopo un periodo di inattività.`
            : `Non hai ancora configurato ${biometricLabel}. Puoi farlo adesso: ti servirà per accedere più in fretta se non usi VibeUp da un po’.`}
        </SettingsInfoCard>

        {biometricError && (
          <SettingsInfoCard tone="pink">{biometricError}</SettingsInfoCard>
        )}
        {biometricMessage && (
          <SettingsInfoCard tone="teal">{biometricMessage}</SettingsInfoCard>
        )}

        {!biometricActive ? (
          <button
            type="button"
            disabled={isGuest || biometricBusy}
            onClick={() => void handleEnableBiometric()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-black px-4 py-3 text-sm font-black text-white transition-colors hover:bg-primary-black/90 disabled:opacity-50"
          >
            <BiometricIcon className="h-4 w-4" aria-hidden />
            {biometricBusy ? "Configuro…" : `Configura ${biometricLabel}`}
          </button>
        ) : (
          <button
            type="button"
            disabled={isGuest || biometricBusy}
            onClick={() => void handleDisableBiometric()}
            className="w-full rounded-2xl border border-brand-pink/30 bg-brand-pink/10 px-4 py-3 text-sm font-black text-brand-pink transition-colors hover:bg-brand-pink/15 disabled:opacity-50"
          >
            {biometricBusy ? "Disattivo…" : `Disattiva ${biometricLabel}`}
          </button>
        )}
      </SettingsShell>
    );
  }

  return (
    <SettingsShell
      title="Sicurezza e Recensioni"
      subtitle="Accesso, protezioni e feedback"
      onBack={onBack}
    >
      {isGuest && (
        <SettingsInfoCard tone="pink">
          Crea un account per attivare le protezioni di sicurezza.
        </SettingsInfoCard>
      )}

      <SettingsSection title="Accesso">
        <SettingsNavRow
          icon={KeyRound}
          label="Modifica password"
          description="Cambia la password di accesso all'account."
          onClick={() => setView("password")}
        />
        <SettingsNavRow
          icon={BiometricIcon}
          label={biometricLabel}
          description={
            biometricActive
              ? "Attivo su questo dispositivo."
              : "Configura Face ID o impronta quando vuoi."
          }
          value={biometricActive ? "Attivo" : "Da configurare"}
          disabled={isGuest}
          onClick={() => {
            setBiometricError(null);
            setBiometricMessage(null);
            setView("biometric");
          }}
        />
        <div className="divide-y divide-primary-black/8 border-t border-primary-black/8">
          <SettingsToggle
            label="Autenticazione a due fattori"
            description="Codice extra al login da email o app authenticator."
            checked={security.twoFactorEnabled}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({ security: { twoFactorEnabled: next } })
            }
          />
          <SettingsToggle
            label="Avvisi di accesso"
            description="Ricevi una notifica per nuovi login sospetti."
            checked={security.loginAlerts}
            disabled={isGuest}
            onChange={(next) =>
              updateUserSettings({ security: { loginAlerts: next } })
            }
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Recensioni">
        <SettingsNavRow
          icon={Star}
          label="Storico feedback"
          description="Recensioni che hai lasciato a locali e servizi."
          onClick={() => setView("reviews")}
        />
      </SettingsSection>

      <SettingsSection title="Stato protezione">
        <SettingsNavRow
          icon={ShieldCheck}
          label="Protezione account"
          value={
            security.twoFactorEnabled || biometricActive ? "Elevata" : "Standard"
          }
          description={
            biometricActive
              ? `${biometricLabel} attivo sul tuo account.`
              : security.twoFactorEnabled
                ? "2FA attiva sul tuo account."
                : "Attiva Face ID, impronta o 2FA per un livello superiore."
          }
        />
        <SettingsNavRow
          icon={Fingerprint}
          label="Dispositivi fidati"
          description="Questo browser è considerato un dispositivo di fiducia."
          value="1 attivo"
        />
      </SettingsSection>
    </SettingsShell>
  );
}
