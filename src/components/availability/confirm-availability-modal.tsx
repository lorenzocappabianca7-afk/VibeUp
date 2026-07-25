"use client";

import { useAvailabilityRequests } from "@/context/availability-request-context";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CalendarCheck2, MapPin, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ConfirmAvailabilityModal() {
  const router = useRouter();
  const {
    pendingUserConfirms,
    confirmAvailabilityRequest,
    cancelAvailabilityRequest,
  } = useAvailabilityRequests();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const request = pendingUserConfirms[0] ?? null;

  useBodyScrollLock(Boolean(request));

  if (!request) return null;

  const payload = request.eventPayload;

  function handleConfirm() {
    setSubmittingId(request.id);
    const result = confirmAvailabilityRequest(request.id);
    setSubmittingId(null);
    if (result.ok) {
      router.push("/?tab=events");
    }
  }

  return (
    <div
      className="vibe-overlay-enter fixed inset-0 z-[85] flex items-end justify-center p-4 sm:items-center"
      data-overlay-open="true"
    >
      <div className="absolute inset-0 bg-primary-black/55" aria-hidden />
      <div
        className="vibe-sheet-enter relative w-full max-w-md rounded-3xl bg-background p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-availability-title"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal">
          <CalendarCheck2 className="h-6 w-6" aria-hidden />
        </div>
        <h2
          id="confirm-availability-title"
          className="text-center text-lg font-bold text-primary-black"
        >
          Conferma creazione evento
        </h2>
        <p className="mt-2 text-center text-sm text-primary-black/60">
          Il gestore di{" "}
          <span className="font-semibold text-primary-black">
            {request.locationName}
          </span>{" "}
          ha accettato la tua richiesta. Confermi di voler creare l&apos;evento
          nei tuoi eventi?
        </p>

        <div className="mt-4 space-y-2 rounded-2xl border border-primary-black/8 bg-primary-black/[0.02] p-3 text-sm">
          <p className="font-semibold text-primary-black">{payload.title}</p>
          <p className="flex items-center gap-1.5 text-primary-black/60">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {payload.locationName} · {formatDate(payload.date)} · {payload.time}
            –{payload.endTime}
          </p>
          <p className="flex items-center gap-1.5 text-primary-black/60">
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {payload.guestCount} invitati · Totale{" "}
            {formatCurrency(payload.totalCost)}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => cancelAvailabilityRequest(request.id)}
            className="flex-1 rounded-2xl border border-primary-black/12 px-4 py-3 text-sm font-semibold text-primary-black/70"
          >
            Non ora
          </button>
          <button
            type="button"
            disabled={submittingId === request.id}
            onClick={handleConfirm}
            className="flex-1 rounded-2xl bg-brand-teal px-4 py-3 text-sm font-bold text-primary-black disabled:opacity-60"
          >
            Conferma e crea evento
          </button>
        </div>
      </div>
    </div>
  );
}
