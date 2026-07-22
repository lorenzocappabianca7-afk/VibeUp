"use client";

import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";

interface BookingSuccessModalProps {
  open: boolean;
  locationName: string;
  depositAmount: number;
  onClose: () => void;
  primaryLabel?: string;
  onPrimaryAction?: () => void;
}

export function BookingSuccessModal({
  open,
  locationName,
  depositAmount,
  onClose,
  primaryLabel = "Perfetto, grazie!",
  onPrimaryAction,
}: BookingSuccessModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="vibe-overlay-enter fixed inset-0 z-[70] flex items-center justify-center p-6"
      data-overlay-open="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-primary-black/50"
        onClick={onClose}
        aria-label="Chiudi"
      />

      <div
        className="vibe-sheet-enter relative max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-sm overflow-y-auto rounded-3xl bg-background p-6 text-center shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary-black/5 text-primary-black/50"
          aria-label="Chiudi"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-teal/15">
          <CheckCircle2 className="h-9 w-9 text-brand-teal" aria-hidden />
        </div>

        <h2
          id="success-title"
          className="text-xl font-bold text-primary-black"
        >
          Preventivo salvato!
        </h2>
        <p className="mt-2 text-sm text-primary-black/60">
          Hai salvato il preventivo per{" "}
          <span className="font-semibold">{locationName}</span>. La caparra
          stimata e&apos;{" "}
          <span className="font-semibold text-brand-pink">
            {formatCurrency(depositAmount)}
          </span>.
        </p>

        <p className="mt-4 rounded-xl bg-brand-teal/8 px-4 py-3 text-xs text-primary-black/70">
          Lo trovi nella sezione I Miei Eventi, cosi&apos; puoi tenere traccia
          di costi, servizi scelti e dettagli della festa.
        </p>

        <button
          type="button"
          onClick={() => {
            onClose();
            onPrimaryAction?.();
          }}
          className="mt-6 w-full rounded-2xl bg-brand-teal py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-teal/90"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
