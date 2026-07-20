"use client";

import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { BookingQuote } from "@/types/location";
import { Check, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface BookingSummaryProps {
  quote: BookingQuote;
  hourlyPrice: number;
  isReady: boolean;
  isSaved?: boolean;
  savedEventHref?: string;
  eventTitle: string;
  eventTitlePlaceholder: string;
  onEventTitleChange: (title: string) => void;
  onBook: () => void;
}

export function BookingSummary({
  quote,
  hourlyPrice,
  isReady,
  isSaved = false,
  savedEventHref,
  eventTitle,
  eventTitlePlaceholder,
  onEventTitleChange,
  onBook,
}: BookingSummaryProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-primary-black/10 bg-primary-black/[0.02] p-5">
      <h2 className="text-base font-bold text-primary-black">Riepilogo</h2>

      <dl className="space-y-2 text-sm">
        {quote.hours > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="min-w-0 text-primary-black/60">
              Location ({quote.hours} ore × {formatCurrency(hourlyPrice)})
            </dt>
            <dd className="shrink-0 font-medium text-primary-black">
              {formatCurrency(quote.locationCost)}
            </dd>
          </div>
        )}
        {quote.extrasCost > 0 && (
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
            Traccia tutto nei tuoi eventi
          </span>{" "}
          Salva questo preventivo per ritrovare location, servizi, costi e
          dettagli nella sezione I Miei Eventi.
        </p>
      </div>

      <label className="block rounded-2xl border border-primary-black/10 bg-background px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary-black/45">
          Nome evento
        </span>
        <input
          value={eventTitle}
          onChange={(event) => onEventTitleChange(event.target.value)}
          disabled={isSaved}
          placeholder={eventTitlePlaceholder}
          className="mt-1 w-full bg-transparent text-base font-black text-primary-black outline-none placeholder:text-primary-black/35 disabled:opacity-70"
          aria-label="Nome evento"
        />
      </label>

      <Button
        className={cn(
          "w-full rounded-2xl py-4 text-base font-semibold",
          isSaved && "bg-emerald-500 hover:bg-emerald-500 disabled:opacity-100",
        )}
        disabled={!isReady || quote.total <= 0 || isSaved}
        onClick={onBook}
      >
        {isSaved ? (
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4" aria-hidden />
            Salvato nei miei eventi
          </span>
        ) : (
          "Salva nei miei eventi"
        )}
      </Button>

      {isSaved && savedEventHref && (
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
