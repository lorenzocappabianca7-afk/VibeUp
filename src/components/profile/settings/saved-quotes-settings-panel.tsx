"use client";

import { SettingsShell } from "@/components/profile/settings/settings-shell";
import { HardNavLink } from "@/components/navigation/hard-nav-link";
import { SafeImage } from "@/components/ui/safe-image";
import { useAppState } from "@/context/app-state-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SavedQuote } from "@/types/saved-quote";
import {
  Bookmark,
  ChevronDown,
  MapPin,
  ReceiptText,
  X,
} from "lucide-react";
import { useState } from "react";

interface SavedQuotesSettingsPanelProps {
  onBack: () => void;
}

export function SavedQuotesSettingsPanel({
  onBack,
}: SavedQuotesSettingsPanelProps) {
  const { savedQuotes, removeSavedQuote } = useAppState();

  return (
    <SettingsShell
      title="Preventivi salvati"
      subtitle="Confronta i preventivi che hai generato dalle location."
      onBack={onBack}
    >
      {savedQuotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary-black/12 bg-background px-4 py-8 text-center">
          <ReceiptText
            className="mx-auto h-8 w-8 text-primary-black/35"
            aria-hidden
          />
          <p className="mt-3 text-sm font-semibold text-primary-black">
            Nessun preventivo salvato
          </p>
          <p className="mt-1 text-xs text-primary-black/55">
            Genera un preventivo da una location e tocca il tasto rosa per
            salvarlo qui.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {savedQuotes.map((quote) => (
            <li key={quote.id}>
              <SavedQuoteCard
                quote={quote}
                onRemove={() => removeSavedQuote(quote.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </SettingsShell>
  );
}

function SavedQuoteCard({
  quote,
  onRemove,
}: {
  quote: SavedQuote;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const photos =
    quote.gallery.length > 0
      ? quote.gallery.slice(0, 4)
      : quote.imageUrl
        ? [quote.imageUrl]
        : [];

  return (
    <article className="overflow-hidden rounded-2xl border border-primary-black/10 bg-surface">
      <div className="relative p-3">
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background text-primary-black/45 shadow-sm transition-colors hover:text-brand-pink"
          aria-label={`Rimuovi preventivo di ${quote.locationName}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>

        <div className="flex gap-3 pr-8">
          <div className="flex shrink-0 gap-1">
            {photos.slice(0, 2).map((src, index) => (
              <div
                key={`${quote.id}-thumb-${index}`}
                className="relative h-16 w-14 overflow-hidden rounded-xl first:rounded-l-xl"
              >
                <SafeImage
                  src={src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <p className="truncate text-sm font-bold text-primary-black">
              {quote.locationName}
            </p>
            <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-primary-black/50">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">
                {quote.zoneLabel}
                {quote.locationCity ? ` · ${quote.locationCity}` : ""}
              </span>
            </p>
            <dl className="mt-2 grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg bg-background px-1.5 py-1.5">
                <dt className="text-[9px] font-semibold uppercase tracking-wide text-primary-black/45">
                  Caparra
                </dt>
                <dd className="mt-0.5 text-[11px] font-black tabular-nums text-brand-pink">
                  {formatCurrency(quote.quote.depositAmount)}
                </dd>
              </div>
              <div className="rounded-lg bg-background px-1.5 py-1.5">
                <dt className="text-[9px] font-semibold uppercase tracking-wide text-primary-black/45">
                  Location
                </dt>
                <dd className="mt-0.5 text-[11px] font-black tabular-nums text-primary-black">
                  {formatCurrency(quote.quote.locationCost)}
                </dd>
              </div>
              <div className="rounded-lg bg-background px-1.5 py-1.5">
                <dt className="text-[9px] font-semibold uppercase tracking-wide text-primary-black/45">
                  Totale
                </dt>
                <dd className="mt-0.5 text-[11px] font-black tabular-nums text-brand-teal">
                  {formatCurrency(quote.quote.total)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-primary-black/8 bg-background px-3 py-2 text-left text-xs font-semibold text-primary-black transition-colors hover:border-primary-black/20"
          aria-expanded={open}
        >
          <span className="inline-flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5 text-brand-pink" aria-hidden />
            {open ? "Nascondi dettagli" : "Mostra tutti i dettagli"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-primary-black/45 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-primary-black/8 bg-background px-3 py-3">
          {photos.length > 0 && (
            <div className="scrollbar-hidden flex gap-2 overflow-x-auto pb-1">
              {photos.map((src, index) => (
                <div
                  key={`${quote.id}-full-${index}`}
                  className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl"
                >
                  <SafeImage
                    src={src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
              ))}
            </div>
          )}

          <dl className="space-y-2 text-sm">
            {quote.eventTitle && (
              <div className="flex justify-between gap-3">
                <dt className="text-primary-black/55">Evento</dt>
                <dd className="font-medium text-primary-black">
                  {quote.eventTitle}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-primary-black/55">Data</dt>
              <dd className="font-medium text-primary-black">
                {quote.date ? formatDate(quote.date) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-primary-black/55">Orario</dt>
              <dd className="font-medium text-primary-black">
                {quote.startTime || "—"}
                {quote.endTime ? ` → ${quote.endTime}` : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-primary-black/55">Ospiti</dt>
              <dd className="font-medium text-primary-black">
                {quote.guestCount}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-primary-black/55">
                Location ({quote.quote.hours}h ×{" "}
                {formatCurrency(quote.hourlyPrice)}
                {quote.quote.drinksCost > 0 ? " + bevande" : ""}
                {(quote.quote.venueServicesCost ?? 0) > 0
                  ? " + servizi locale"
                  : ""}
                )
              </dt>
              <dd className="shrink-0 font-medium text-primary-black">
                {formatCurrency(quote.quote.locationCost)}
              </dd>
            </div>
            {quote.quote.extrasCost > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-primary-black/55">Servizi extra</dt>
                <dd className="font-medium text-primary-black">
                  {formatCurrency(quote.quote.extrasCost)}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3 border-t border-primary-black/8 pt-2">
              <dt className="font-semibold text-primary-black">Totale</dt>
              <dd className="text-base font-bold text-primary-black">
                {formatCurrency(quote.quote.total)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 rounded-xl bg-brand-pink/10 px-3 py-2">
              <dt className="text-sm font-medium text-primary-black">
                Caparra (30%)
              </dt>
              <dd className="text-sm font-bold text-brand-pink">
                {formatCurrency(quote.quote.depositAmount)}
              </dd>
            </div>
          </dl>

          <HardNavLink
            href={`/location/${quote.locationId}`}
            className="flex w-full items-center justify-center rounded-2xl bg-brand-teal px-4 py-2.5 text-sm font-semibold text-ink-inverse"
          >
            Apri location
          </HardNavLink>
        </div>
      )}
    </article>
  );
}
