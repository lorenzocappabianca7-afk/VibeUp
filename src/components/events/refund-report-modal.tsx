"use client";

import { formatCurrency } from "@/lib/utils";
import {
  REFUND_REASON_LABELS,
  type BookedService,
  type RefundReason,
} from "@/types/event";
import { CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface RefundReportModalProps {
  open: boolean;
  service: BookedService | null;
  onClose: () => void;
}

const REASONS = Object.entries(REFUND_REASON_LABELS) as [
  RefundReason,
  string,
][];

export function RefundReportModal({
  open,
  service,
  onClose,
}: RefundReportModalProps) {
  const [reason, setReason] = useState<RefundReason>("non_conforme");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

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

  if (!open || !service) return null;

  function handleClose() {
    setReason("non_conforme");
    setDescription("");
    setSubmitted(false);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-primary-black/50"
        onClick={handleClose}
        aria-label="Chiudi"
      />

      <div
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-6 shadow-xl sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-title"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary-black/5 text-primary-black/50"
          aria-label="Chiudi"
        >
          <X className="h-4 w-4" />
        </button>

        {submitted ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-teal/15">
              <CheckCircle2 className="h-8 w-8 text-brand-teal" aria-hidden />
            </div>
            <h2 className="text-lg font-bold text-primary-black">
              Segnalazione inviata
            </h2>
            <p className="mt-2 text-sm text-primary-black/60">
              Abbiamo ricevuto la tua richiesta di rimborso per{" "}
              <span className="font-semibold">{service.name}</span> (
              {service.providerName}). Il nostro team la esaminerà entro 48 ore e
              ti contatterà via email.
            </p>
            <p className="mt-4 rounded-xl bg-brand-pink/10 px-4 py-3 text-xs text-primary-black/70">
              Importo potenziale da rimborsare:{" "}
              <span className="font-bold text-brand-pink">
                {formatCurrency(service.amountPaid)}
              </span>
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-6 w-full rounded-2xl bg-brand-teal py-3.5 text-sm font-semibold text-white"
            >
              Chiudi
            </button>
          </div>
        ) : (
          <>
            <h2
              id="refund-title"
              className="pr-8 text-lg font-bold text-primary-black"
            >
              Richiedi Rimborso
            </h2>
            <p className="mt-1 text-sm text-primary-black/60">
              {service.name} — {service.providerName}
            </p>

            <div className="mt-4 rounded-xl bg-brand-teal/8 p-3 text-xs leading-relaxed text-primary-black/70">
              <span className="font-semibold text-primary-black">
                Politica di protezione utente:
              </span>{" "}
              se il servizio prenotato non soddisfa le aspettative concordate,
              hai diritto a richiedere un rimborso entro 7 giorni
              dall&apos;evento. Il team VibeUp valuterà la segnalazione e
              procederà al rimborso entro 7 giorni lavorativi.
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-primary-black">
                  Motivo della segnalazione
                </legend>
                <div className="space-y-2">
                  {REASONS.map(([value, label]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary-black/10 p-3 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal/5"
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={value}
                        checked={reason === value}
                        onChange={() => setReason(value)}
                        className="mt-0.5 accent-brand-teal"
                      />
                      <span className="text-sm text-primary-black">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-primary-black">
                  Descrivi il problema
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  minLength={20}
                  rows={4}
                  placeholder="Spiega cosa non ha soddisfatto le tue aspettative..."
                  className="w-full resize-none rounded-xl border border-primary-black/10 bg-background px-4 py-3 text-sm text-primary-black placeholder:text-primary-black/40 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl bg-brand-pink py-3.5 text-sm font-semibold text-primary-black transition-colors hover:bg-brand-pink/90"
              >
                Invia segnalazione
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
