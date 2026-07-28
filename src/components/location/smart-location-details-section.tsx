"use client";

import {
  getInternalLocationServicePrice,
  type InternalLocationService,
  type InternalLocationServiceType,
} from "@/lib/location-services";
import {
  calculateDrinksCost,
  DRINK_UNIT_PRICE,
  MAX_DRINKS_PER_INVITEE,
  MIN_DRINKS_PER_INVITEE,
  OPEN_BAR_PER_INVITEE,
  type DrinkPackageMode,
} from "@/lib/drinks-quote";
import {
  getExtraServicePrice,
  isEndTimeAfterStart,
  suggestEndTimeAfterStart,
} from "@/lib/location";
import { EXTRA_SERVICES } from "@/lib/mock/extra-services";
import { cn, formatCurrency } from "@/lib/utils";
import { VibeUpCalendar } from "@/components/ui/vibeup-calendar";
import type {
  BookingQuote,
  ExtraService,
  ExtraServiceId,
} from "@/types/location";
import {
  Bookmark,
  Calendar,
  Camera,
  Cake,
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  GlassWater,
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
    times: ["12:00", "13:00", "14:00"],
  },
  {
    title: "Pomeriggio",
    times: ["15:00", "16:00", "17:00", "18:00"],
  },
  {
    title: "Sera",
    times: ["19:00", "20:00", "21:00", "22:00", "23:00"],
  },
  {
    title: "Notte",
    times: ["00:00", "01:00", "02:00", "03:00"],
  },
] as const;

const ALL_BOOKING_TIMES = TIME_GROUPS.flatMap((group) => [...group.times]);

type PickerPanel = "date" | "start" | "end" | null;

interface SmartLocationDetailsSectionProps {
  guestCount: number;
  maxGuests: number;
  quote: BookingQuote | null;
  estimatedHours: number;
  minHours: number;
  date: string;
  startTime: string;
  endTime: string;
  internalServices: InternalLocationService[];
  selectedInternalServices: string[];
  selectedExtras: ExtraServiceId[];
  cakeKg: number;
  drinkMode: DrinkPackageMode;
  drinksPerInvitee: number;
  onDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onGuestCountChange: (guestCount: number) => void;
  onToggleInternalService: (id: string) => void;
  onToggleExtra: (id: ExtraServiceId) => void;
  onCakeKgChange: (kg: number) => void;
  onDrinkModeChange: (mode: DrinkPackageMode) => void;
  onDrinksPerInviteeChange: (drinks: number) => void;
  onGenerateQuote: () => void;
  canGenerateQuote: boolean;
  quoteNeedsRefresh: boolean;
  quoteSaved?: boolean;
  onSaveQuote?: () => void;
}

function formatInternalServicePrice(
  service: InternalLocationService,
  guestCount: number,
): string {
  if (service.pricing.type === "included") return "Incluso";
  if (service.pricing.type === "per_person") {
    return `${formatCurrency(service.pricing.pricePerPerson)}/invitato`;
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
  return `da ${formatCurrency(service.pricing.pricePerPerson)}/invitato`;
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
  startTime,
  onSelect,
}: {
  activeValue: string;
  mode: "start" | "end";
  startTime: string;
  onSelect: (time: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-primary-black/10 bg-paper p-2.5 shadow-sm">
      <p className="mb-2 text-[11px] font-bold text-ink-inverse/70">
        {mode === "start" ? "Orario inizio" : "Orario fine (fino alle 03:00)"}
      </p>
      <div className="space-y-2">
        {TIME_GROUPS.map((group) => (
          <div key={group.title} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10px] font-bold uppercase tracking-wide text-ink-inverse/45">
              {group.title}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {group.times.map((time) => {
                const disabled =
                  mode === "end" && !isEndTimeAfterStart(startTime, time);
                const selected = activeValue === time;

                return (
                  <button
                    key={`${mode}-${time}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(time)}
                    className={cn(
                      "rounded-lg px-2 py-1 text-[11px] font-bold tabular-nums transition-colors",
                      selected
                        ? "bg-brand-teal text-ink-inverse"
                        : "bg-primary-black/[0.04] text-ink-inverse hover:bg-brand-teal/15",
                      disabled && "cursor-not-allowed opacity-30 hover:bg-primary-black/[0.04]",
                    )}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {mode === "end" && (
        <p className="mt-2 text-[10px] font-semibold text-ink-inverse/45">
          La fine deve essere dopo l&apos;inizio (anche dopo mezzanotte, max
          03:00).
        </p>
      )}
    </div>
  );
}

export function SmartLocationDetailsSection({
  guestCount,
  maxGuests,
  quote,
  estimatedHours,
  minHours,
  date,
  startTime,
  endTime,
  internalServices,
  selectedInternalServices,
  selectedExtras,
  cakeKg,
  drinkMode,
  drinksPerInvitee,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onGuestCountChange,
  onToggleInternalService,
  onToggleExtra,
  onCakeKgChange,
  onDrinkModeChange,
  onDrinksPerInviteeChange,
  onGenerateQuote,
  canGenerateQuote,
  quoteNeedsRefresh,
  quoteSaved = false,
  onSaveQuote,
}: SmartLocationDetailsSectionProps) {
  const [openPicker, setOpenPicker] = useState<PickerPanel>(null);
  const [guestCountInput, setGuestCountInput] = useState(String(guestCount));
  const hasTimeIssue = estimatedHours > 0 && estimatedHours < minHours;
  const hasInvalidTimeOrder =
    Boolean(startTime && endTime) && !isEndTimeAfterStart(startTime, endTime);
  const generatedQuote = quote && quote.total > 0 ? quote : null;

  function togglePicker(panel: PickerPanel) {
    setOpenPicker((current) => (current === panel ? null : panel));
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white bg-background shadow-sm">
      <div className="bg-brand-teal p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-inverse/80">
              Dettagli Location
            </p>
            <h2 className="mt-1 text-xl font-black text-ink-inverse">
              Organizza con dati, servizi e IA
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-inverse/75">
              Seleziona giorno, orario, invitati e servizi: poi genera il preventivo.
            </p>
          </div>
          <span className="rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-ink-inverse">
            AI ready
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="rounded-3xl bg-surface-2 p-4 shadow-[0_8px_28px_-16px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white">
                Servizi disponibili
              </h3>
              <p className="text-xs text-primary-black/55">
                Menu, DJ del locale, bar, audio e allestimenti.
              </p>
            </div>
            <span className="rounded-full bg-brand-teal/20 px-3 py-1 text-xs font-bold text-brand-teal">
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
                        ? "border-brand-teal bg-brand-teal/15"
                        : "border-white/15 bg-surface hover:border-white/30",
                      !service.available && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isSelected
                          ? "bg-brand-teal text-ink-inverse"
                          : "bg-background/70 text-white/55",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-white">
                          {service.name}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-brand-teal">
                          {formatInternalServicePrice(service, guestCount)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-primary-black/55">
                        {service.description}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                        isSelected
                          ? "border-brand-teal bg-brand-teal text-ink-inverse"
                          : "border-white/25",
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

        <div className="rounded-3xl border border-white/20 bg-brand-teal p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper text-brand-teal">
              <GlassWater className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-ink-inverse">Bevande</h3>
              <p className="text-xs text-ink-inverse/70">
                Scegli drink a invitato oppure open bar: il costo è compreso nel
                prezzo del locale.
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-white/15 p-1">
            {(
              [
                { id: "none", label: "Nessuna" },
                { id: "per_invitee", label: "Drink/invitato" },
                { id: "open_bar", label: "Open bar" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onDrinkModeChange(option.id)}
                className={cn(
                  "rounded-xl px-2 py-2.5 text-center text-[11px] font-bold transition-colors sm:text-xs",
                  drinkMode === option.id
                    ? "bg-paper text-ink-inverse shadow-sm"
                    : "bg-transparent text-ink-inverse/65 hover:bg-white/20 hover:text-ink-inverse",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {drinkMode === "per_invitee" && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-paper px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-inverse">
                  Drink per invitato
                </p>
                <p className="text-[11px] text-ink-inverse/55">
                  {formatCurrency(DRINK_UNIT_PRICE)} ciascuno
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onDrinksPerInviteeChange(drinksPerInvitee - 1)
                  }
                  disabled={drinksPerInvitee <= MIN_DRINKS_PER_INVITEE}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal-strong disabled:opacity-35"
                  aria-label="Riduci drink per invitato"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span className="min-w-[2rem] text-center text-lg font-black tabular-nums text-ink-inverse">
                  {drinksPerInvitee}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onDrinksPerInviteeChange(drinksPerInvitee + 1)
                  }
                  disabled={drinksPerInvitee >= MAX_DRINKS_PER_INVITEE}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal text-ink-inverse disabled:opacity-35"
                  aria-label="Aumenta drink per invitato"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          )}

          {drinkMode === "open_bar" && (
            <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-xs font-semibold text-ink-inverse/80">
              Open bar stimato a {formatCurrency(OPEN_BAR_PER_INVITEE)}/invitato
              per tutta la serata.
            </p>
          )}

          {drinkMode !== "none" && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/25 pt-3 text-sm">
              <span className="text-ink-inverse/70">
                Incluso nel costo locale
              </span>
              <span className="font-bold text-ink-inverse">
                {formatCurrency(
                  calculateDrinksCost({
                    mode: drinkMode,
                    drinksPerInvitee,
                    guestCount,
                  }),
                )}
              </span>
            </div>
          )}
        </div>

        <details className="rounded-3xl border border-primary-black/8 bg-surface p-4">
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

        <div className="relative overflow-hidden rounded-2xl border border-brand-teal bg-brand-teal p-3 text-ink-inverse">
          <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.12em] text-ink-inverse/80">
                <Wand2 className="h-3 w-3 shrink-0" aria-hidden />
                Preventivo istantaneo IA
              </p>
              <p
                className={cn(
                  "mt-0.5 font-black text-ink-inverse",
                  generatedQuote ? "text-2xl" : "text-sm font-semibold text-ink-inverse/70",
                )}
              >
                {generatedQuote ? formatCurrency(generatedQuote.total) : "Da generare"}
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-white/35 bg-paper px-2.5 py-1.5 text-right">
              <p className="text-[9px] uppercase tracking-wide text-ink-inverse/55">
                Caparra 30%
              </p>
              <p className="text-xs font-bold text-brand-teal-strong">
                {generatedQuote
                  ? formatCurrency(generatedQuote.depositAmount)
                  : "—"}
              </p>
            </div>
          </div>

          <div className="mt-2.5 space-y-2">
            <button
              type="button"
              onClick={() => togglePicker("date")}
              className="w-full rounded-xl border border-white/35 bg-paper px-2.5 py-2 text-left"
            >
              <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-inverse/55">
                <Calendar className="h-3 w-3" aria-hidden />
                Data
              </span>
              <span className="mt-0.5 flex items-center justify-between gap-2">
                <span className="text-sm font-black text-ink-inverse">
                  {formatDateLabel(date)}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-brand-teal-strong transition-transform",
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

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => togglePicker("start")}
                className="rounded-xl border border-white/35 bg-paper px-2.5 py-2 text-left"
              >
                <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-inverse/55">
                  <Clock className="h-3 w-3" aria-hidden />
                  Inizio
                </span>
                <span className="mt-0.5 block text-sm font-black text-ink-inverse">
                  {startTime}
                </span>
              </button>
              <button
                type="button"
                onClick={() => togglePicker("end")}
                className="rounded-xl border border-white/35 bg-paper px-2.5 py-2 text-left"
              >
                <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-inverse/55">
                  <Clock className="h-3 w-3" aria-hidden />
                  Fine
                </span>
                <span className="mt-0.5 block text-sm font-black text-ink-inverse">
                  {endTime}
                </span>
              </button>
            </div>

            <div className="rounded-xl border border-white/35 bg-paper px-2.5 py-2">
              <span className="text-[10px] font-semibold text-ink-inverse/55">
                Invitati
              </span>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextValue = clampGuestCount(guestCount - 10, maxGuests);
                    setGuestCountInput(String(nextValue));
                    onGuestCountChange(nextValue);
                  }}
                  disabled={guestCount <= 1}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-pink text-white disabled:opacity-40"
                  aria-label="Diminuisci invitati di 10"
                >
                  <Minus className="h-3 w-3" aria-hidden />
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
                  className="min-w-[3rem] flex-1 bg-transparent text-center text-sm font-black tabular-nums text-ink-inverse outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-teal-strong text-white disabled:opacity-40"
                  aria-label="Aumenta invitati di 10"
                >
                  <Plus className="h-3 w-3" aria-hidden />
                </button>
              </div>
            </div>

            {(openPicker === "start" || openPicker === "end") && (
              <BookingTimePicker
                mode={openPicker}
                startTime={startTime}
                activeValue={openPicker === "start" ? startTime : endTime}
                onSelect={(time) => {
                  if (openPicker === "start") {
                    onStartTimeChange(time);
                    if (!isEndTimeAfterStart(time, endTime)) {
                      onEndTimeChange(
                        suggestEndTimeAfterStart(
                          time,
                          endTime,
                          ALL_BOOKING_TIMES,
                          minHours,
                        ),
                      );
                    }
                  } else if (isEndTimeAfterStart(startTime, time)) {
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
            className="mt-2.5 w-full rounded-xl bg-paper px-3 py-2.5 text-xs font-black text-ink-inverse transition-opacity disabled:opacity-50"
          >
            Genera preventivo istantaneo
          </button>

          {quoteNeedsRefresh && (
            <p className="mt-2 rounded-lg border border-white/35 bg-paper px-2.5 py-1.5 text-[11px] font-semibold text-ink-inverse">
              Hai modificato i dettagli: rigenera il preventivo per vedere il costo aggiornato.
            </p>
          )}

          {generatedQuote && (
            <>
              <dl className="mt-2.5 space-y-1.5 text-xs">
                <div className="flex justify-between gap-3 text-ink-inverse/80">
                  <dt className="min-w-0">
                    Location
                    {generatedQuote.drinksCost > 0 ? " + bevande" : ""}
                    {(generatedQuote.venueServicesCost ?? 0) > 0
                      ? " + servizi locale"
                      : ""}
                  </dt>
                  <dd className="shrink-0 font-bold text-ink-inverse">
                    {formatCurrency(generatedQuote.locationCost)}
                  </dd>
                </div>
                {generatedQuote.extrasCost > 0 && (
                  <div className="flex justify-between gap-3 text-ink-inverse/80">
                    <dt className="min-w-0">Servizi selezionati</dt>
                    <dd className="shrink-0 font-bold text-ink-inverse">
                      {formatCurrency(generatedQuote.extrasCost)}
                    </dd>
                  </div>
                )}
              </dl>

              {onSaveQuote && (
                <button
                  type="button"
                  onClick={onSaveQuote}
                  className={cn(
                    "mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-colors",
                    quoteSaved
                      ? "bg-brand-pink/25 text-ink-inverse ring-1 ring-white/25"
                      : "bg-brand-pink text-ink-inverse hover:bg-brand-pink/90",
                  )}
                  aria-pressed={quoteSaved}
                >
                  <Bookmark
                    className="h-3.5 w-3.5"
                    fill={quoteSaved ? "currentColor" : "none"}
                    aria-hidden
                  />
                  {quoteSaved ? "Preventivo salvato" : "Salva preventivo"}
                </button>
              )}
            </>
          )}
          {hasInvalidTimeOrder && (
            <p className="mt-2 rounded-lg border border-white/35 bg-paper px-2.5 py-1.5 text-[11px] font-semibold text-ink-inverse">
              L&apos;orario di fine deve essere successivo a quello di inizio
              (fino alle 03:00 di notte).
            </p>
          )}
          {hasTimeIssue && (
            <p className="mt-2 rounded-lg border border-white/35 bg-paper px-2.5 py-1.5 text-[11px] font-semibold text-ink-inverse">
              Durata minima richiesta: {minHours} ore.
            </p>
          )}
          </div>
        </div>

      </div>
    </section>
  );
}
