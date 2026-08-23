"use client";

import { RequestStatusBadge } from "@/components/availability/request-status-badge";
import { Button } from "@/components/ui/button";
import { getDepositCheckoutAmounts } from "@/lib/booking-money";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { AvailabilityRequestStatus } from "@/types/availability-request";
import type { BookingQuote } from "@/types/location";
import { Check, Clock3, GitCompareArrows, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

export interface CandidateDatePrice {
  date: string;
  total: number;
  locationCost: number;
  band: "Weekend" | "Feriale";
}

interface BookingSummaryProps {
  quote: BookingQuote;
  hourlyPrice: number;
  /** Override the location line label (e.g. serata / a partecipante). */
  locationPriceLabel?: string;
  isReady: boolean;
  quoteGenerated: boolean;
  quoteNeedsRefresh: boolean;
  candidateDatePrices?: CandidateDatePrice[];
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  requestStatus?: AvailabilityRequestStatus | null;
  confirmationDeadline?: string | null;
  requestError?: string | null;
  eventTitle: string;
  eventTitlePlaceholder: string;
  onEventTitleChange: (title: string) => void;
  onSendRequest: () => void;
  onAddToCompare?: () => void;
  isCompareSelected?: boolean;
  showAllergenPicker?: boolean;
  allergenCount?: number;
  onOpenAllergenPicker?: () => void;
}

export function BookingSummary({
  quote,
  hourlyPrice,
  locationPriceLabel,
  isReady,
  quoteGenerated,
  quoteNeedsRefresh,
  candidateDatePrices = [],
  selectedDate,
  onSelectDate,
  requestStatus = null,
  confirmationDeadline = null,
  requestError = null,
  eventTitle,
  eventTitlePlaceholder,
  onEventTitleChange,
  onSendRequest,
  onAddToCompare,
  isCompareSelected = false,
  showAllergenPicker = false,
  allergenCount = 0,
  onOpenAllergenPicker,
}: BookingSummaryProps) {
  const [sendHint, setSendHint] = useState<string | null>(null);
  const isPendingManager = requestStatus === "pending_manager";
  const isPendingUserConfirm = requestStatus === "pending_user_confirm";
  const isLocked = isPendingManager || isPendingUserConfirm;
  const canRetry =
    requestStatus === "declined" || requestStatus === "cancelled";
  const locationLine =
    locationPriceLabel ??
    `${quote.hours} ore × ${formatCurrency(hourlyPrice)}`;
  const depositCheckout = useMemo(
    () => getDepositCheckoutAmounts(quote.depositAmount),
    [quote.depositAmount],
  );
  const pricesDiffer =
    candidateDatePrices.length > 1 &&
    candidateDatePrices.some(
      (item) => item.total !== candidateDatePrices[0].total,
    );

  function handleSend() {
    if (isPendingUserConfirm) {
      setSendHint(null);
      onSendRequest();
      return;
    }
    if (!quoteGenerated || !isReady || quote.total <= 0) {
      setSendHint(
        "Prima genera il preventivo nel riquadro Configura la tua serata. Poi puoi inviare la richiesta di disponibilità al gestore.",
      );
      return;
    }
    setSendHint(null);
    onSendRequest();
  }

  return (
    <section className="space-y-4 rounded-2xl border border-white bg-primary-black/[0.02] p-5">
      <h2 className="text-base font-bold text-primary-black">Riepilogo</h2>

      <ol className="grid gap-2">
        <li
          className={cn(
            "rounded-2xl border px-3 py-2.5",
            quoteGenerated && !quoteNeedsRefresh
              ? "border-brand-teal/35 bg-brand-teal/10"
              : "border-primary-black/10 bg-background",
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-teal">
            Passo 1
          </p>
          <p className="mt-0.5 text-sm font-bold text-primary-black">
            Genera preventivo
          </p>
          <p className="mt-0.5 text-xs text-primary-black/55">
            Calcola il prezzo della combinazione data/orario scelta.
          </p>
        </li>
        <li
          className={cn(
            "rounded-2xl border px-3 py-2.5",
            isPendingManager || isPendingUserConfirm
              ? "border-brand-teal/35 bg-brand-teal/10"
              : "border-primary-black/10 bg-background",
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-pink">
            Passo 2
          </p>
          <p className="mt-0.5 text-sm font-bold text-primary-black">
            Invia richiesta di disponibilità al gestore
          </p>
          <p className="mt-0.5 text-xs text-primary-black/55">
            Niente prenotazione istantanea: il gestore risponde, poi confermi e
            paghi la caparra.
          </p>
        </li>
      </ol>

      {candidateDatePrices.length > 1 ? (
        <div className="space-y-2 rounded-2xl border border-primary-black/10 bg-background p-3">
          <p className="text-xs font-bold text-primary-black">
            Prezzo per data selezionata
          </p>
          <p className="text-[11px] leading-relaxed text-primary-black/55">
            Il preventivo e la richiesta restano legati a una sola data.
            {pricesDiffer
              ? " Weekend e feriali hanno tariffe diverse: scegli quella da inviare."
              : " Le date hanno lo stesso prezzo: scegli comunque il giorno da richiedere."}
          </p>
          <ul className="space-y-1.5">
            {candidateDatePrices.map((item) => {
              const selected = selectedDate === item.date;
              return (
                <li key={item.date}>
                  <button
                    type="button"
                    onClick={() => onSelectDate?.(item.date)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                      selected
                        ? "border-brand-teal bg-brand-teal/15"
                        : "border-primary-black/8 bg-primary-black/[0.02]",
                    )}
                  >
                    <span>
                      <span className="block text-xs font-bold text-primary-black">
                        {formatDate(item.date)}
                      </span>
                      <span className="text-[11px] font-semibold text-primary-black/50">
                        {item.band}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-black text-primary-black">
                      {formatCurrency(item.total)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <dl className="space-y-2 text-sm">
        {(quote.hours > 0 || locationPriceLabel) && (
          <div className="flex justify-between gap-3">
            <dt className="min-w-0 text-primary-black/60">
              Location ({locationLine}
              {(quote.drinksCost ?? 0) > 0 ? " + bevande" : ""}
              {(quote.venueServicesCost ?? 0) > 0 ? " + servizi locale" : ""})
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
            {quote.total > 0 && quoteGenerated ? formatCurrency(quote.total) : "—"}
          </dd>
        </div>
        <div className="space-y-1.5 rounded-xl bg-brand-pink/10 px-3 py-2.5">
          <div className="flex justify-between gap-3">
            <dt className="min-w-0 text-sm font-medium text-primary-black">
              Caparra (30% location)
            </dt>
            <dd className="shrink-0 text-sm font-bold text-brand-pink">
              {depositCheckout.base > 0 && quoteGenerated
                ? formatCurrency(depositCheckout.base)
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <dt className="min-w-0 text-primary-black/65">
              + Commissioni VibeUp (5%)
            </dt>
            <dd className="shrink-0 font-semibold text-primary-black/80">
              {depositCheckout.fee > 0 && quoteGenerated
                ? formatCurrency(depositCheckout.fee)
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-brand-pink/20 pt-1.5">
            <dt className="min-w-0 text-sm font-semibold text-primary-black">
              Totale caparra (pagamento online)
            </dt>
            <dd className="shrink-0 text-sm font-bold text-brand-pink">
              {depositCheckout.total > 0 && quoteGenerated
                ? formatCurrency(depositCheckout.total)
                : "—"}
            </dd>
          </div>
        </div>
      </dl>

      <div className="flex items-start gap-2.5 rounded-xl bg-brand-teal p-3">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-ink-inverse"
          aria-hidden
        />
        <p className="text-xs leading-relaxed text-ink-inverse/90">
          <span className="font-semibold text-ink-inverse">
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

      {showAllergenPicker && onOpenAllergenPicker ? (
        <button
          type="button"
          onClick={onOpenAllergenPicker}
          disabled={isLocked}
          className="flex w-full items-start gap-3 rounded-2xl border border-brand-pink/25 bg-brand-pink/8 px-4 py-3 text-left transition-colors hover:bg-brand-pink/12 disabled:opacity-60"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-pink/20 text-brand-pink">
            <ShieldAlert className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-primary-black">
              Allergie e allergeni
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-primary-black/55">
              {allergenCount > 0
                ? `${allergenCount} segnalati — il gestore li vedrà nella richiesta`
                : "Da indicare in prenotazione, solo se hai scelto menu o catering"}
            </span>
          </span>
        </button>
      ) : null}

      <div className="space-y-2">
        {quoteNeedsRefresh && quoteGenerated ? (
          <p className="text-center text-xs text-primary-black/55">
            Hai cambiato i dettagli: rigenera il preventivo nel riquadro sopra
            prima di inviare.
          </p>
        ) : null}

        {requestStatus ? (
          <div className="flex justify-center">
            <RequestStatusBadge
              status={requestStatus}
              confirmationDeadline={confirmationDeadline}
              size="md"
            />
          </div>
        ) : null}

        <Button
          className={cn(
            "w-full rounded-2xl py-4 text-base font-semibold",
            isPendingManager &&
              "bg-primary-black/70 hover:bg-primary-black/70 disabled:opacity-100",
            isPendingUserConfirm &&
              "bg-brand-teal hover:bg-brand-teal disabled:opacity-100",
          )}
          disabled={isPendingManager}
          onClick={handleSend}
        >
          {isPendingUserConfirm ? (
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
            "Invia richiesta di disponibilità al gestore"
          )}
        </Button>

        {sendHint ? (
          <p className="text-center text-xs font-semibold text-brand-pink">
            {sendHint}
          </p>
        ) : null}

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

      {onAddToCompare ? (
        <button
          type="button"
          onClick={onAddToCompare}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-teal/35 bg-brand-teal/10 px-4 py-3 text-sm font-black text-brand-teal"
        >
          <GitCompareArrows className="h-4 w-4" strokeWidth={2.75} aria-hidden />
          {isCompareSelected
            ? "Vedi confronto location"
            : "Confronta questa location"}
        </button>
      ) : null}
    </section>
  );
}
