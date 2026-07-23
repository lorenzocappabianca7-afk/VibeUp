"use client";

import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { getBiometricLabel } from "@/lib/auth/biometric";
import { Fingerprint, ScanFace, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface BiometricSetupModalProps {
  open: boolean;
  accountName: string;
  onEnable: () => Promise<void>;
  onSkip: () => void;
}

export function BiometricSetupModal({
  open,
  accountName,
  onEnable,
  onSkip,
}: BiometricSetupModalProps) {
  useBodyScrollLock(open);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = useMemo(() => getBiometricLabel(), []);
  const isFace = label.toLowerCase().includes("face");

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setSubmitting(false);
      setError(null);
    });
  }, [open]);

  if (!open) return null;

  async function handleEnable() {
    setSubmitting(true);
    setError(null);
    try {
      await onEnable();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Non riesco ad attivare lo sblocco biometrico.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="vibe-overlay-enter fixed inset-0 z-[95] flex items-center justify-center p-6"
      data-overlay-open="true"
    >
      <div className="absolute inset-0 bg-primary-black/55" aria-hidden />

      <div
        className="vibe-sheet-enter relative w-full max-w-sm rounded-3xl bg-background p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="biometric-setup-title"
      >
        <button
          type="button"
          onClick={onSkip}
          disabled={submitting}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary-black/5 text-primary-black/50 disabled:opacity-40"
          aria-label="Chiudi"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal">
          {isFace ? (
            <ScanFace className="h-7 w-7" aria-hidden />
          ) : (
            <Fingerprint className="h-7 w-7" aria-hidden />
          )}
        </div>

        <h2
          id="biometric-setup-title"
          className="text-center text-xl font-bold text-primary-black"
        >
          Attiva {label}
        </h2>
        <p className="mt-2 text-center text-sm text-primary-black/60">
          Account creato per{" "}
          <span className="font-semibold text-primary-black">{accountName}</span>.
          Vuoi usare {label} per accedere più in fretta quando non usi VibeUp da
          un po&apos;?
        </p>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-primary-black/45">
          Se preferisci, puoi configurarlo dopo da Profilo → Impostazioni →
          Sicurezza e Recensioni.
        </p>

        {error && (
          <p className="mt-3 text-center text-xs font-medium text-brand-pink">
            {error}
          </p>
        )}

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleEnable()}
            className="w-full rounded-2xl bg-primary-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Attivo…" : `Attiva ${label}`}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onSkip}
            className="w-full rounded-2xl border border-primary-black/10 px-4 py-3 text-sm font-semibold text-primary-black/70 transition-colors hover:bg-primary-black/5 disabled:opacity-60"
          >
            Configura in seguito
          </button>
        </div>
      </div>
    </div>
  );
}
