"use client";

import {
  getInternalLocationServicePrice,
  type InternalLocationService,
  type InternalLocationServiceType,
} from "@/lib/location-services";
import { getExtraServicePrice } from "@/lib/location";
import { EXTRA_SERVICES } from "@/lib/mock/extra-services";
import { cn, formatCurrency } from "@/lib/utils";
import { VibeUpCalendar } from "@/components/ui/vibeup-calendar";
import type {
  BookingQuote,
  ExtraService,
  ExtraServiceId,
  PartyType,
} from "@/types/location";
import {
  Bot,
  Calendar,
  Camera,
  Cake,
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  Lightbulb,
  MapPin,
  Minus,
  Music,
  Plus,
  Sparkles,
  UtensilsCrossed,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

const SERVICE_ICONS: Record<ExtraServiceId, LucideIcon> = {
  menu: UtensilsCrossed,
  dj: Music,
  photographer: Camera,
  decorations: Sparkles,
  bakery: Cake,
  catering: UtensilsCrossed,
  audio_lights: Lightbulb,
};

const INTERNAL_SERVICE_ICONS: Record<InternalLocationServiceType, LucideIcon> = {
  menu: UtensilsCrossed,
  dj: Music,
  photographer: Camera,
  decorations: Sparkles,
  audio_lights: Lightbulb,
  bar: ChefHat,
  other: Check,
};

const TIME_GROUPS = [
  {
    title: "Pranzo",
    description: "Per eventi diurni",
    times: ["12:00", "13:00", "14:00"],
  },
  {
    title: "Pomeriggio",
    description: "Aperitivi e feste leggere",
    times: ["15:00", "16:00", "17:00", "18:00"],
  },
  {
    title: "Sera",
    description: "Le fasce piu' richieste",
    times: ["19:00", "20:00", "21:00", "22:00", "23:00"],
  },
  {
    title: "Notte",
    description: "Per party e after",
    times: ["00:00", "01:00", "02:00"],
  },
] as const;

type PickerPanel = "date" | "start" | "end" | null;

interface ExternalServiceSuggestionView {
  serviceId: ExtraServiceId;
  name: string;
  reason: string;
  estimatedCost: number;
}

interface SmartLocationDetailsSectionProps {
  partyType: PartyType;
  dateRangeTo?: string;
  guestCount: number;
  maxGuests: number;
  quote: BookingQuote | null;
  estimatedHours: number;
  hourlyPrice: number;
  minHours: number;
  date: string;
  startTime: string;
  endTime: string;
  internalServices: InternalLocationService[];
  selectedInternalServices: string[];
  selectedExtras: ExtraServiceId[];
  cakeKg: number;
  isAiPromptOpen: boolean;
  aiMissingPrompt: string;
  aiLoading: boolean;
  aiSuggestions: ExternalServiceSuggestionView[];
  aiError: string | null;
  onDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onGuestCountChange: (guestCount: number) => void;
  onToggleInternalService: (id: string) => void;
  onToggleExtra: (id: ExtraServiceId) => void;
  onCakeKgChange: (kg: number) => void;
  onGenerateQuote: () => void;
  canGenerateQuote: boolean;
  quoteNeedsRefresh: boolean;
  onOpenAiPrompt: () => void;
  onAiMissingPromptChange: (value: string) => void;
  onAskAiForSuggestions: () => void;
}

function formatInternalServicePrice(
  service: InternalLocationService,
  guestCount: number,
): string {
  if (service.pricing.type === "included") return "Incluso";
  if (service.pricing.type === "per_person") {
    return `${formatCurrency(service.pricing.pricePerPerson)}/persona`;
  }
  return formatCurrency(getInternalLocationServicePrice(service, guestCount));
}

function formatExternalServicePrice(service: ExtraService): string {
  if (service.pricing.type === "fixed") {
    return formatCurrency(service.pricing.price);
  }
  if (service.pricing.type === "per_kg") {
    return `${formatCurrency(service.pricing.pricePerKg)}/kg`;
  }
  return `da ${formatCurrency(service.pricing.pricePerPerson)}/persona`;
}

function formatDateLabel(value: string): string {
  if (!value) return "gg / mm / aaaa";

  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function clampGuestCount(value: number, maxGuests: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(maxGuests, Math.max(1, Math.round(value)));
}

function BookingTimePicker({
  activeValue,
  mode,
  onSelect,
}: {
  activeValue: string;
  mode: "start" | "end";
  onSelect: (time: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-primary-black/10 bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-primary-black">
            Scegli orario {mode === "start" ? "di inizio" : "di fine"}
          </p>
          <p className="mt-1 text-xs font-semibold text-primary-black/45">
            Tocca una fascia come nei siti di prenotazione.
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-teal/12 text-brand-teal">
          <Clock className="h-4 w-4" aria-hidden />
        </span>
      </div>

      <div className="space-y-3">
        {TIME_GROUPS.map((group) => (
          <section
            key={group.title}
            className="rounded-2xl bg-primary-black/[0.03] p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary-black">
                {group.title}
              </p>
              <p className="text-[11px] font-semibold text-primary-black/45">
                {group.description}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {group.times.map((time) => (
                <button
                  key={`${mode}-${time}`}
                  type="button"
                  onClick={() => onSelect(time)}
                  className={cn(
                    "rounded-2xl px-3 py-3 text-sm font-black transition-colors duration-150",
                    activeValue === time
                      ? "bg-primary-black text-white"
                      : "bg-white text-primary-black shadow-sm hover:bg-brand-teal/12",
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function SmartLocationDetailsSection({
  partyType,
  dateRangeTo,
  guestCount,
  maxGuests,
  quote,
  estimatedHours,
  hourlyPrice,
  minHours,
  date,
  startTime,
  endTime,
  internalServices,
  selectedInternalServices,
  selectedExtras,
  cakeKg,
  isAiPromptOpen,
  aiMissingPrompt,
  aiLoading,
  aiSuggestions,
  aiError,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onGuestCountChange,
  onToggleInternalService,
  onToggleExtra,
  onCakeKgChange,
  onGenerateQuote,
  canGenerateQuote,
  quoteNeedsRefresh,
  onOpenAiPrompt,
  onAiMissingPromptChange,
  onAskAiForSuggestions,
}: SmartLocationDetailsSectionProps) {
  const [openPicker, setOpenPicker] = useState<PickerPanel>(null);
  const [guestCountInput, setGuestCountInput] = useState(String(guestCount));
  const needsAssistant = internalServices.length === 0 || isAiPromptOpen;
  const hasTimeIssue = estimatedHours > 0 && estimatedHours < minHours;
  const generatedQuote = quote && quote.total > 0 ? quote : null;

  function togglePicker(panel: PickerPanel) {
    setOpenPicker((current) => (current === panel ? null : panel));
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-primary-black/10 bg-background shadow-sm">
      <div className="bg-gradient-to-br from-brand-teal/12 via-background to-brand-pink/14 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-teal">
              Dettagli Location
            </p>
            <h2 className="mt-1 text-xl font-black text-primary-black">
              Organizza con dati, servizi e IA
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-primary-black/62">
              Seleziona giorno, orario, invitati e servizi: poi genera il preventivo.
            </p>
          </div>
          <span className="rounded-full bg-primary-black px-3 py-1.5 text-xs font-bold text-white">
            AI ready
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="rounded-3xl border border-primary-black/8 bg-primary-black/[0.02] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-primary-black">
                Servizi interni
              </h3>
              <p className="text-xs text-primary-black/55">
                Menu, DJ del locale, bar, audio e allestimenti.
              </p>
            </div>
            <span className="rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-bold text-brand-teal">
              {selectedInternalServices.length}/{internalServices.length}
            </span>
          </div>

          <ul className="mt-3 grid gap-2">
            {internalServices.map((service) => {
              const Icon = INTERNAL_SERVICE_ICONS[service.type];
              const isSelected = selectedInternalServices.includes(service.id);

              return (
                <li key={service.id}>
                  <button
                    type="button"
                    disabled={!service.available}
                    onClick={() => onToggleInternalService(service.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors duration-150",
                      isSelected
                        ? "border-brand-teal bg-brand-teal/10"
                        : "border-primary-black/8 bg-background hover:border-primary-black/18",
                      !service.available && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isSelected
                          ? "bg-brand-teal text-white"
                          : "bg-primary-black/5 text-primary-black/50",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-primary-black">
                          {service.name}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-brand-teal">
                          {formatInternalServicePrice(service, guestCount)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-primary-black/58">
                        {service.description}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                        isSelected
                          ? "border-brand-teal bg-brand-teal text-white"
                          : "border-primary-black/20",
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" aria-hidden />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-brand-teal/20 bg-gradient-to-br from-brand-teal/18 via-brand-teal/10 to-brand-teal/[0.06] p-4 text-primary-black">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-brand-teal/20 blur-3xl"
            aria-hidden
          />
          <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-brand-teal/80">
                <Wand2 className="h-3.5 w-3.5" aria-hidden />
                Preventivo Istantaneo IA
              </p>
              <p className="mt-1 text-3xl font-black text-primary-black">
                {generatedQuote ? formatCurrency(generatedQuote.total) : "Da generare"}
              </p>
            </div>
            <div className="rounded-2xl border border-brand-teal/15 bg-white/80 px-3 py-2 text-right backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wide text-primary-black/55">
                Caparra 30% location
              </p>
              <p className="text-sm font-bold text-brand-teal">
                {generatedQuote
                  ? formatCurrency(generatedQuote.depositAmount)
                  : "—"}
              </p>
            </div>
          </div>

          {generatedQuote && (
            <div className="mt-4 grid gap-2 rounded-3xl border border-brand-teal/10 bg-white/85 p-3 text-primary-black shadow-sm backdrop-blur-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-brand-teal/8 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-teal">
                  Prezzo totale evento
                </p>
                <p className="mt-1 text-3xl font-black tabular-nums text-primary-black">
                  {formatCurrency(generatedQuote.total)}
                </p>
              </div>
              <div className="rounded-2xl bg-brand-pink/10 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-pink">
                  Caparra da pagare
                </p>
                <p className="mt-1 text-3xl font-black tabular-nums text-primary-black">
                  {formatCurrency(generatedQuote.depositAmount)}
                </p>
                <p className="mt-1 text-[11px] font-bold text-primary-black/50">
                  30% del costo location
                </p>
              </div>
            </div>
          )}

          {(date || dateRangeTo || guestCount) && (
            <p className="mt-3 rounded-2xl border border-brand-teal/10 bg-white/80 px-3 py-2 text-xs font-bold text-primary-black/65 backdrop-blur-sm">
              Abbiamo precompilato il preventivo con i dati della tua ricerca.
              {dateRangeTo && dateRangeTo !== date
                ? ` Fascia scelta fino al ${formatDateLabel(dateRangeTo)}.`
                : ""}
            </p>
          )}

          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => togglePicker("date")}
              className="w-full rounded-2xl border border-brand-teal/10 bg-white/85 p-3 text-left backdrop-blur-sm"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary-black/55">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                Data
              </span>
              <span className="mt-1 flex items-center justify-between gap-3">
                <span className="text-lg font-black text-primary-black">
                  {formatDateLabel(date)}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-brand-teal transition-transform",
                    openPicker === "date" && "rotate-180",
                  )}
                  aria-hidden
                />
              </span>
            </button>

            {openPicker === "date" && (
              <VibeUpCalendar
                selectedStart={date || null}
                className="mx-auto max-w-[18.5rem]"
                onSelectDate={(value) => {
                  onDateChange(value);
                  setOpenPicker(null);
                }}
              />
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => togglePicker("start")}
                className="rounded-2xl border border-brand-teal/10 bg-white/85 p-3 text-left backdrop-blur-sm"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary-black/55">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  Inizio
                </span>
                <span className="mt-1 block text-lg font-black text-primary-black">
                  {startTime}
                </span>
              </button>
              <button
                type="button"
                onClick={() => togglePicker("end")}
                className="rounded-2xl border border-brand-teal/10 bg-white/85 p-3 text-left backdrop-blur-sm"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary-black/55">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  Fine
                </span>
                <span className="mt-1 block text-lg font-black text-primary-black">
                  {endTime}
                </span>
              </button>
            </div>

            <div className="rounded-2xl bg-white p-3">
              <span className="text-xs font-semibold text-primary-black/55">
                Invitati
              </span>
              <div className="mt-1 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const nextValue = clampGuestCount(guestCount - 10, maxGuests);
                    setGuestCountInput(String(nextValue));
                    onGuestCountChange(nextValue);
                  }}
                  disabled={guestCount <= 1}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-pink/15 text-brand-pink disabled:opacity-40"
                  aria-label="Diminuisci invitati di 10"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <input
                  type="number"
                  min={1}
                  max={maxGuests}
                  inputMode="numeric"
                  value={guestCountInput}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (nextValue === "") {
                      setGuestCountInput("");
                      return;
                    }

                    const parsedValue = Number.parseInt(nextValue, 10);
                    if (!Number.isNaN(parsedValue)) {
                      const clampedValue = clampGuestCount(parsedValue, maxGuests);
                      setGuestCountInput(String(clampedValue));
                      onGuestCountChange(clampedValue);
                    }
                  }}
                  onBlur={() => {
                    if (guestCountInput === "") {
                      setGuestCountInput(String(guestCount));
                    }
                  }}
                  className="min-w-[3.5rem] flex-1 bg-transparent text-center text-lg font-black tabular-nums text-primary-black outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="Numero invitati"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextValue = clampGuestCount(guestCount + 10, maxGuests);
                    setGuestCountInput(String(nextValue));
                    onGuestCountChange(nextValue);
                  }}
                  disabled={guestCount >= maxGuests}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-teal/15 text-brand-teal disabled:opacity-40"
                  aria-label="Aumenta invitati di 10"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>

            {(openPicker === "start" || openPicker === "end") && (
              <BookingTimePicker
                mode={openPicker}
                activeValue={openPicker === "start" ? startTime : endTime}
                onSelect={(time) => {
                  if (openPicker === "start") {
                    onStartTimeChange(time);
                  } else {
                    onEndTimeChange(time);
                  }
                  setOpenPicker(null);
                }}
              />
            )}
          </div>

          <button
            type="button"
            disabled={!canGenerateQuote}
            onClick={onGenerateQuote}
            className="mt-4 w-full rounded-2xl bg-primary-black px-4 py-3 text-sm font-black text-white transition-opacity disabled:opacity-50"
          >
            Genera preventivo istantaneo
          </button>

          {quoteNeedsRefresh && (
            <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-primary-black">
              Hai modificato i dettagli: rigenera il preventivo per vedere il costo aggiornato.
            </p>
          )}

          {generatedQuote ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3 text-primary-black/55">
                <dt className="min-w-0">
                  Location ({generatedQuote.hours || 0}h x{" "}
                  {formatCurrency(hourlyPrice)})
                </dt>
                <dd className="shrink-0 font-bold text-primary-black">
                  {formatCurrency(generatedQuote.locationCost)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 text-primary-black/55">
                <dt className="min-w-0">Servizi selezionati</dt>
                <dd className="shrink-0 font-bold text-primary-black">
                  {formatCurrency(generatedQuote.extrasCost)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 rounded-xl border border-brand-teal/10 bg-white/80 px-3 py-2 text-xs font-semibold text-primary-black/70 backdrop-blur-sm">
              Il costo apparira&apos; qui solo dopo aver generato il preventivo.
            </p>
          )}
          {hasTimeIssue && (
            <p className="mt-3 rounded-xl border border-brand-teal/10 bg-white/80 px-3 py-2 text-xs font-semibold text-primary-black backdrop-blur-sm">
              Durata minima richiesta: {minHours} ore.
            </p>
          )}
          </div>
        </div>

        <div
          className={cn(
            "rounded-3xl border p-4 transition-colors duration-150",
            needsAssistant
              ? "border-brand-pink/30 bg-brand-pink/10"
              : "border-primary-black/8 bg-background",
          )}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-pink text-primary-black">
              <Bot className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-primary-black">
                Serve altro? Contatta l&apos;assistente IA
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-primary-black/60">
                Se menu, DJ o allestimenti del locale non bastano, descrivi cosa manca e ricevi alternative esterne per la tua festa.
              </p>
            </div>
          </div>

          {!isAiPromptOpen ? (
            <button
              type="button"
              onClick={onOpenAiPrompt}
              className="mt-3 w-full rounded-2xl bg-brand-pink px-4 py-3 text-sm font-black text-primary-black transition-opacity hover:opacity-90"
            >
              Attiva assistente IA
            </button>
          ) : (
            <div className="mt-3 space-y-3">
              <textarea
                value={aiMissingPrompt}
                onChange={(event) => onAiMissingPromptChange(event.target.value)}
                rows={3}
                placeholder={`Es. per questa ${partyType} mi serve un DJ, un menu vegetariano e decorazioni a tema...`}
                className="w-full rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-sm text-primary-black outline-none transition-colors focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/15"
              />
              <button
                type="button"
                onClick={onAskAiForSuggestions}
                disabled={aiLoading}
                className="w-full rounded-2xl bg-primary-black px-4 py-3 text-sm font-black text-white transition-opacity disabled:opacity-60"
              >
                {aiLoading ? "Sto cercando alternative..." : "Suggerisci servizi esterni"}
              </button>
              {aiError && <p className="text-xs text-brand-pink">{aiError}</p>}
              {aiSuggestions.length > 0 && (
                <ul className="space-y-2">
                  {aiSuggestions.map((suggestion) => (
                    <li
                      key={`${suggestion.serviceId}-${suggestion.name}`}
                      className="rounded-2xl border border-primary-black/8 bg-background p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-primary-black">
                            {suggestion.name}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-primary-black/60">
                            {suggestion.reason}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-black text-brand-pink">
                          {formatCurrency(suggestion.estimatedCost)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleExtra(suggestion.serviceId)}
                        className="mt-2 text-xs font-black text-brand-teal"
                      >
                        {selectedExtras.includes(suggestion.serviceId)
                          ? "Rimuovi dagli extra"
                          : "Aggiungi al preventivo"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <details className="rounded-3xl border border-primary-black/8 bg-background p-4">
          <summary className="cursor-pointer text-sm font-black text-primary-black">
            Servizi esterni opzionali
          </summary>
          <ul className="mt-3 space-y-2">
            {EXTRA_SERVICES.map((service) => {
              const Icon = SERVICE_ICONS[service.id];
              const isSelected = selectedExtras.includes(service.id);
              const isBakery = service.id === "bakery";
              const perKgPricing =
                service.pricing.type === "per_kg" ? service.pricing : null;

              return (
                <li key={service.id}>
                  <button
                    type="button"
                    onClick={() => onToggleExtra(service.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors",
                      isSelected
                        ? "border-brand-teal bg-brand-teal/10"
                        : "border-primary-black/8 bg-primary-black/[0.02]",
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-black/5 text-primary-black/55">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2">
                        <span className="text-sm font-bold text-primary-black">
                          {service.name}
                        </span>
                        <span className="shrink-0 text-xs font-bold text-primary-black/70">
                          {formatExternalServicePrice(service)}
                        </span>
                      </span>
                      {service.providerName && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-brand-pink">
                          <MapPin className="h-3 w-3" aria-hidden />
                          {service.providerName}
                        </span>
                      )}
                      <span className="mt-0.5 block text-xs text-primary-black/58">
                        {service.description}
                      </span>
                      {isBakery && isSelected && perKgPricing && (
                        <span
                          className="mt-2 flex items-center gap-2"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                          role="presentation"
                        >
                          <span className="text-xs font-semibold text-primary-black/60">
                            Peso torta
                          </span>
                          <select
                            value={cakeKg}
                            onChange={(event) =>
                              onCakeKgChange(Number(event.target.value))
                            }
                            className="rounded-lg border border-primary-black/10 bg-background px-2 py-1 text-xs text-primary-black focus:border-brand-teal focus:outline-none"
                          >
                            {Array.from(
                              {
                                length:
                                  perKgPricing.maxKg - perKgPricing.minKg + 1,
                              },
                              (_, index) => perKgPricing.minKg + index,
                            ).map((kg) => (
                              <option key={kg} value={kg}>
                                {kg} kg -{" "}
                                {formatCurrency(
                                  getExtraServicePrice(service, { cakeKg: kg }),
                                )}
                              </option>
                            ))}
                          </select>
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      </div>
    </section>
  );
}
