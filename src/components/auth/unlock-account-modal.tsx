"use client";

import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { getBiometricLabel } from "@/lib/auth/biometric";
import { Fingerprint, LockKeyhole, ScanFace } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

interface UnlockAccountModalProps {
  accountName: string;
  accountEmail: string;
  error?: string | null;
  biometricEnabled?: boolean;
  onSubmit: (password: string) => void | Promise<void>;
  onUnlockBiometric?: () => void | Promise<void>;
  onSwitchGuest?: () => void;
}

export function UnlockAccountModal({
  accountName,
  accountEmail,
  error,
  biometricEnabled = false,
  onSubmit,
  onUnlockBiometric,
  onSwitchGuest,
}: UnlockAccountModalProps) {
  useBodyScrollLock(true);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [biometricSubmitting, setBiometricSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const autoTriedRef = useRef(false);
  const onUnlockBiometricRef = useRef(onUnlockBiometric);
  const label = useMemo(() => getBiometricLabel(), []);
  const isFace = label.toLowerCase().includes("face");

  useEffect(() => {
    onUnlockBiometricRef.current = onUnlockBiometric;
  }, [onUnlockBiometric]);

  async function handleBiometric() {
    const unlockBiometric = onUnlockBiometricRef.current;
    if (!unlockBiometric || biometricSubmitting) return;
    setBiometricSubmitting(true);
    setLocalError(null);
    try {
      await unlockBiometric();
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Verifica biometrica non riuscita.",
      );
    } finally {
      setBiometricSubmitting(false);
    }
  }

  useEffect(() => {
    if (!biometricEnabled || autoTriedRef.current) return;
    autoTriedRef.current = true;
    const timer = window.setTimeout(() => {
      void handleBiometric();
    }, 350);
    return () => window.clearTimeout(timer);
    // Auto-try once when biometric unlock is available for this locked session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricEnabled]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!password) {
      setLocalError("Inserisci la password.");
      return;
    }

    setSubmitting(true);
    setLocalError(null);
    try {
      await onSubmit(password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="vibe-overlay-enter fixed inset-0 z-[90] flex items-center justify-center p-6"
      data-overlay-open="true"
    >
      <div className="absolute inset-0 bg-primary-black/55" aria-hidden />

      <div
        className="vibe-sheet-enter relative w-full max-w-sm rounded-3xl bg-background p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-account-title"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal">
          <LockKeyhole className="h-7 w-7" aria-hidden />
        </div>

        <h2
          id="unlock-account-title"
          className="text-center text-xl font-bold text-primary-black"
        >
          Sblocca account
        </h2>
        <p className="mt-2 text-center text-sm text-primary-black/60">
          È passato un po&apos; dall&apos;ultimo accesso a{" "}
          <span className="font-semibold text-primary-black">{accountName}</span>
          . Usa {biometricEnabled ? `${label} o la password` : "la password"} per
          continuare.
        </p>
        <p className="mt-1 text-center text-xs text-primary-black/45">
          {accountEmail}
        </p>

        {biometricEnabled && onUnlockBiometric && (
          <button
            type="button"
            disabled={biometricSubmitting || submitting}
            onClick={() => void handleBiometric()}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary-black/10 bg-primary-black/[0.03] px-4 py-3 text-sm font-semibold text-primary-black transition-colors hover:bg-primary-black/[0.06] disabled:opacity-60"
          >
            {isFace ? (
              <ScanFace className="h-5 w-5" aria-hidden />
            ) : (
              <Fingerprint className="h-5 w-5" aria-hidden />
            )}
            {biometricSubmitting ? "Verifico…" : `Sblocca con ${label}`}
          </button>
        )}

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-4 space-y-3"
        >
          {biometricEnabled && (
            <p className="text-center text-[11px] font-medium uppercase tracking-wide text-primary-black/35">
              oppure password
            </p>
          )}
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setLocalError(null);
            }}
            placeholder="Password"
            autoComplete="current-password"
            autoFocus={!biometricEnabled}
            className="w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-base outline-none focus:border-brand-teal"
          />
          {(localError || error) && (
            <p className="text-xs font-medium text-brand-pink">
              {localError || error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || biometricSubmitting}
            className="w-full rounded-2xl bg-primary-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Verifico…" : "Sblocca con password"}
          </button>
        </form>

        {onSwitchGuest && (
          <button
            type="button"
            onClick={onSwitchGuest}
            className="mt-3 w-full text-center text-xs font-semibold text-primary-black/45 underline-offset-2 hover:underline"
          >
            Continua come ospite
          </button>
        )}
      </div>
    </div>
  );
}
