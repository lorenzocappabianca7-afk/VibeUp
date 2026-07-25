"use client";

import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { AvailabilityRequestStatus } from "@/types/availability-request";
import type { BookingQuote } from "@/types/location";
import { Check, Clock3, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface BookingSummaryProps {
  quote: BookingQuote;
  hourlyPrice: number;
  isReady: boolean;
  requestStatus?: AvailabilityRequestStatus | null;
  requestError?: string | null;
  savedEventHref?: string;
  eventTitle: string;
  eventTitlePlaceholder: string;
  onEventTitleChange: (title: string) => void;
  onSendRequest: () => void;
}

export function BookingSummary({
  quote,
  hourlyPrice,
  isReady,
  requestStatus = null,
  requestError = null,
  savedEventHref,
  eventTitle,
  eventTitlePlaceholder,
  onEventTitleChange,
  onSendRequest,
}: BookingSummaryProps) {
  const isPendingManager = requestStatus === "pending_manager";
  const isPendingUserConfirm = requestStatus === "pending_user_confirm";
  const isConfirmed = requestStatus === "confirmed";
  const isLocked =
    isPendingManager || isPendingUserConfirm || isConfirmed;
  const canRetry =
    requestStatus === "declined" || requestStatus === "cancelled";

  return (
    <section className="space-y-4 rounded-2xl border border-primary-black/10 bg-primary-black/[0.02] p-5">
      <h2 className="text-base font-bold text-primary-black">Riepilogo</h2>

      <dl className="space-y-2 text-sm">
        {quote.hours > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="min-w-0 text-primary-black/60">
              Location ({quote.hours} ore × {formatCurrency(hourlyPrice)}
              {(quote.drinksCost ?? 0) > 0 ? " + bevande" : ""})
            </dt>
            <dd className="shrink-0 font-medium text-primary-black">
              {formatCurrency(quote.locationCost)}
            </dd>
          </div>
        )}
        {(quote.extrasCost ?? 0) > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="min-w-0 text-primary-black/60">Servizi extra</dt>
            <dd className="shrink-0 font-medium text-primary-black">
              {formatCurrency(quote.extrasCost)}
            </dd>
          </div>
        )}
        <div className="flex justify-between border-t border-primary-black/10 pt-2">
          <dt className="font-semibold text-primary-black">Totale</dt>
          <dd className="text-lg font-bold text-primary-black">
            {quote.total > 0 ? formatCurrency(quote.total) : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-3 rounded-xl bg-brand-pink/10 px-3 py-2.5">
          <dt className="min-w-0 text-sm font-medium text-primary-black">
            Caparra stimata (30% location)
          </dt>
          <dd className="shrink-0 text-sm font-bold text-brand-pink">
            {quote.depositAmount > 0
              ? formatCurrency(quote.depositAmount)
              : "—"}
          </dd>
        </div>
      </dl>

      <div className="flex items-start gap-2.5 rounded-xl bg-brand-teal/8 p-3">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal"
          aria-hidden
        />
        <p className="text-xs leading-relaxed text-primary-black/70">
          <span className="font-semibold text-primary-black">
            Prima la disponibilità
          </span>{" "}
          Invia la richiesta al gestore. Se accetta, potrai confermare e solo
          allora l&apos;evento verrà aggiunto ai tuoi eventi.
        </p>
      </div>

      <label className="block rounded-2xl border border-primary-black/10 bg-background px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary-black/45">
          Nome evento
        </span>
        <input
          value={eventTitle}
          onChange={(event) => onEventTitleChange(event.target.value)}
          disabled={isLocked}
          placeholder={eventTitlePlaceholder}
          className="mt-1 w-full bg-transparent text-base font-black text-primary-black outline-none placeholder:text-primary-black/35 disabled:opacity-70"
          aria-label="Nome evento"
        />
      </label>

      <div className="space-y-2">
        {!isConfirmed && (
          <p className="text-center text-xs text-primary-black/45">
            Sei interessato?
          </p>
        )}

        <Button
          className={cn(
            "w-full rounded-2xl py-4 text-base font-semibold",
            isConfirmed &&
              "bg-emerald-500 hover:bg-emerald-500 disabled:opacity-100",
            isPendingManager &&
              "bg-primary-black/70 hover:bg-primary-black/70 disabled:opacity-100",
            isPendingUserConfirm &&
              "bg-brand-teal hover:bg-brand-teal disabled:opacity-100",
          )}
          disabled={
            !isReady ||
            quote.total <= 0 ||
            isPendingManager ||
            isPendingUserConfirm ||
            isConfirmed
          }
          onClick={onSendRequest}
        >
          {isConfirmed ? (
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4" aria-hidden />
              Evento creato nei miei eventi
            </span>
          ) : isPendingUserConfirm ? (
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4" aria-hidden />
              Gestore ha accettato — conferma
            </span>
          ) : isPendingManager ? (
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" aria-hidden />
              Richiesta inviata al gestore
            </span>
          ) : canRetry ? (
            "Invia di nuovo la richiesta"
          ) : (
            "Invia richiesta di disponibilità a gestore"
          )}
        </Button>

        {isPendingManager && (
          <p className="text-center text-xs text-primary-black/50">
            Il gestore riceverà data e dettagli. Ti avviseremo se accetta.
          </p>
        )}
        {isPendingUserConfirm && (
          <p className="text-center text-xs text-brand-teal">
            Il gestore ha accettato. Conferma nel messaggio per creare
            l&apos;evento.
          </p>
        )}
        {requestStatus === "declined" && (
          <p className="text-center text-xs text-brand-pink">
            Il gestore non ha accettato. Puoi inviare una nuova richiesta.
          </p>
        )}
        {requestError && (
          <p className="text-center text-xs text-brand-pink">{requestError}</p>
        )}
      </div>

      {isConfirmed && savedEventHref && (
        <Link
          href={savedEventHref}
          className="flex w-full items-center justify-center rounded-2xl border border-brand-teal/25 bg-brand-teal/10 px-4 py-3 text-sm font-black text-brand-teal transition-colors hover:bg-brand-teal/18"
        >
          Vai ai miei eventi
        </Link>
      )}
    </section>
  );
}
