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
import { MAX_PARTY_DATES, normalizePartyDates } from "@/types/party-criteria";
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
  Users,
  UtensilsCrossed,
  Wand2,
} from "lucide-react";
import {
  collapseCaret,
  NUMERIC_FIELD_INPUT_PROPS,
  scheduleCollapseCaret,
} from "@/lib/numeric-field";
import { HoldStepButton } from "@/components/ui/hold-step-button";
import type { LucideIcon } from "lucide-react";
import { useRef, useState } from "react";

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
  preferredDates?: string[];
  startTime: string;
  endTime: string;
  internalServices: InternalLocationService[];
  selectedInternalServices: string[];
  selectedExtras: ExtraServiceId[];
  cakeKg: number;
  drinkMode: DrinkPackageMode;
  drinksPerInvitee: number;
  onDateChange: (date: string) => void;
  onPreferredDatesChange?: (dates: string[]) => void;
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
    return `${formatCurrency(service.pricing.pricePerPerson)}/partecipante`;
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
  return `da ${formatCurrency(service.pricing.pricePerPerson)}/partecipante`;
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
    <div className="rounded-2xl border border-primary-black/8 bg-paper p-3 shadow-sm">
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
                      disabled &&
                        "cursor-not-allowed opacity-30 hover:bg-primary-black/[0.04]",
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
  preferredDates = [],
  startTime,
  endTime,
  internalServices,
  selectedInternalServices,
  selectedExtras,
  cakeKg,
  drinkMode,
  drinksPerInvitee,
  onDateChange,
  onPreferredDatesChange,
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
  const [guestCountFocused, setGuestCountFocused] = useState(false);
  const guestCountRef = useRef(guestCount);
  guestCountRef.current = guestCount;
  const guestCountVisible = guestCountFocused
    ? guestCountInput
    : String(guestCount);
  const hasTimeIssue = estimatedHours > 0 && estimatedHours < minHours;
  const hasInvalidTimeOrder =
    Boolean(startTime && endTime) && !isEndTimeAfterStart(startTime, endTime);
  const generatedQuote = quote && quote.total > 0 ? quote : null;

  function togglePicker(panel: PickerPanel) {
    setOpenPicker((current) => (current === panel ? null : panel));
  }

  const calendarDates = normalizePartyDates(
    preferredDates.length > 0
      ? [...preferredDates, date]
      : date
        ? [date]
        : [],
  );

  function selectPreferredDate(value: string) {
    if (!onPreferredDatesChange) {
      onDateChange(value);
      setOpenPicker(null);
      return;
    }

    if (calendarDates.includes(value)) {
      if (date !== value) {
        onDateChange(value);
        return;
      }
      const next = calendarDates.filter((item) => item !== value);
      onPreferredDatesChange(next);
      onDateChange(next[0] ?? "");
      return;
    }

    if (calendarDates.length >= MAX_PARTY_DATES) return;
    onPreferredDatesChange(normalizePartyDates([...calendarDates, value]));
    onDateChange(value);
  }

  function stepGuests(delta: number) {
    const nextValue = clampGuestCount(guestCountRef.current + delta, maxGuests);
    if (nextValue === guestCountRef.current) return;
    guestCountRef.current = nextValue;
    setGuestCountInput(String(nextValue));
    onGuestCountChange(nextValue);
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-surface shadow-[0_28px_64px_-32px_rgba(0,0,0,0.7)]">
      <div className="relative overflow-hidden border-b border-white/8 px-5 py-5">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(62,207,207,0.22),transparent_42%),linear-gradient(180deg,rgba(62,207,207,0.08),transparent_70%)]"
          aria-hidden
        />
        <div className="relative">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-teal">
            Preventivo
          </p>
          <h2 className="mt-1.5 text-xl font-black tracking-tight text-foreground">
            Configura la tua serata
          </h2>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="rounded-[1.35rem] border border-white/8 bg-background/55 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-foreground">
                Servizi del locale
              </h3>
              <p className="mt-0.5 text-xs text-foreground/50">
                Menu, DJ, bar, audio e allestimenti.
              </p>
            </div>
            <span className="rounded-full bg-brand-teal/15 px-2.5 py-1 text-[11px] font-bold tabular-nums text-brand-teal">
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
                      "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all duration-150",
                      isSelected
                        ? "border-brand-teal/55 bg-brand-teal/12 shadow-[0_8px_24px_-18px_rgba(62,207,207,0.9)]"
                        : "border-white/8 bg-surface hover:border-white/18",
                      !service.available && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isSelected
                          ? "bg-brand-teal text-ink-inverse"
                          : "bg-background/80 text-foreground/50",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-foreground">
                          {service.name}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-brand-teal">
                          {formatInternalServicePrice(service, guestCount)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-foreground/48">
                        {service.description}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                        isSelected
                          ? "border-brand-teal bg-brand-teal text-ink-inverse"
                          : "border-white/20",
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

        <div className="rounded-[1.35rem] border border-white/8 bg-background/55 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/15 text-brand-teal">
              <GlassWater className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-foreground">Bevande</h3>
              <p className="text-xs text-foreground/50">
                Drink a partecipante oppure open bar, inclusi nel costo del
                locale.
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-surface p-1 ring-1 ring-white/8">
            {(
              [
                { id: "none", label: "Nessuna" },
                { id: "per_invitee", label: "Drink/partecipante" },
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
                    ? "bg-brand-teal text-ink-inverse shadow-sm"
                    : "bg-transparent text-foreground/55 hover:bg-white/6 hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {drinkMode === "per_invitee" && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-surface px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Drink per partecipante
                </p>
                <p className="text-[11px] text-foreground/48">
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
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal disabled:opacity-35"
                  aria-label="Riduci drink per partecipante"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span className="min-w-[2rem] text-center text-lg font-black tabular-nums text-foreground">
                  {drinksPerInvitee}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onDrinksPerInviteeChange(drinksPerInvitee + 1)
                  }
                  disabled={drinksPerInvitee >= MAX_DRINKS_PER_INVITEE}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal text-ink-inverse disabled:opacity-35"
                  aria-label="Aumenta drink per partecipante"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          )}

          {drinkMode === "open_bar" && (
            <p className="mt-3 rounded-xl border border-white/8 bg-surface px-3 py-2 text-xs font-semibold text-foreground/70">
              Open bar stimato a {formatCurrency(OPEN_BAR_PER_INVITEE)}
              /partecipante per tutta la serata.
            </p>
          )}

          {drinkMode !== "none" && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/8 pt-3 text-sm">
              <span className="text-foreground/55">Incluso nel costo locale</span>
              <span className="font-bold text-foreground">
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

        <details className="group rounded-[1.35rem] border border-white/8 bg-background/55 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-foreground [&::-webkit-details-marker]:hidden">
            <span>
              Servizi esterni opzionali
              <span className="mt-0.5 block text-xs font-medium text-foreground/48">
                DJ, foto, catering e altro da partner VibeUp
              </span>
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-foreground/40 transition-transform group-open:rotate-180"
              aria-hidden
            />
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
                        ? "border-brand-teal/50 bg-brand-teal/10"
                        : "border-white/8 bg-surface hover:border-white/16",
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/80 text-foreground/50">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {service.name}
                        </span>
                        <span className="shrink-0 text-xs font-bold text-foreground/70">
                          {formatExternalServicePrice(service)}
                        </span>
                      </span>
                      {service.providerName && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-brand-pink">
                          <MapPin className="h-3 w-3" aria-hidden />
                          {service.providerName}
                        </span>
                      )}
                      <span className="mt-0.5 block text-xs text-foreground/48">
                        {service.description}
                      </span>
                      {isBakery && isSelected && perKgPricing && (
                        <span
                          className="mt-2 flex items-center gap-2"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                          role="presentation"
                        >
                          <span className="text-xs font-semibold text-foreground/60">
                            Peso torta
                          </span>
                          <select
                            value={cakeKg}
                            onChange={(event) =>
                              onCakeKgChange(Number(event.target.value))
                            }
                            className="rounded-lg border border-white/12 bg-background px-2 py-1 text-xs text-foreground focus:border-brand-teal focus:outline-none"
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

        <div className="relative overflow-hidden rounded-[1.35rem] border border-brand-teal/25 bg-gradient-to-b from-brand-teal/16 to-background/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-brand-teal">
                <Wand2 className="h-3.5 w-3.5" aria-hidden />
                Preventivo istantaneo
              </p>
              <p
                className={cn(
                  "mt-1 font-black tracking-tight text-foreground",
                  generatedQuote
                    ? "text-[1.75rem] leading-none"
                    : "text-sm font-semibold text-foreground/55",
                )}
              >
                {generatedQuote
                  ? formatCurrency(generatedQuote.total)
                  : "Da generare"}
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-white/10 bg-paper px-3 py-2 text-right shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wide text-ink-inverse/50">
                Caparra 30%
              </p>
              <p className="text-sm font-black text-brand-teal-strong">
                {generatedQuote
                  ? formatCurrency(generatedQuote.depositAmount)
                  : "—"}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {preferredDates.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {preferredDates.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onDateChange(value)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold",
                      date === value
                        ? "bg-paper text-ink-inverse"
                        : "bg-white/8 text-foreground/75",
                    )}
                  >
                    {formatDateLabel(value)}
                  </button>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => togglePicker("date")}
              className="w-full rounded-xl border border-white/10 bg-paper px-3 py-2.5 text-left shadow-sm"
            >
              <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-inverse/50">
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
                selectedDates={calendarDates}
                maxSelected={MAX_PARTY_DATES}
                className="mx-auto max-w-[18.5rem]"
                onSelectDate={selectPreferredDate}
              />
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => togglePicker("start")}
                className="rounded-xl border border-white/10 bg-paper px-3 py-2.5 text-left shadow-sm"
              >
                <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-inverse/50">
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
                className="rounded-xl border border-white/10 bg-paper px-3 py-2.5 text-left shadow-sm"
              >
                <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-inverse/50">
                  <Clock className="h-3 w-3" aria-hidden />
                  Fine
                </span>
                <span className="mt-0.5 block text-sm font-black text-ink-inverse">
                  {endTime}
                </span>
              </button>
            </div>

            <div className="vibeup-guest-stepper rounded-xl border border-white/10 bg-paper px-3 py-2.5 shadow-sm">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-inverse/50">
                <Users className="h-3 w-3" aria-hidden />
                Invitati
              </span>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <HoldStepButton
                  label="Diminuisci invitati di 1"
                  disabled={guestCount <= 1}
                  onStep={() => stepGuests(-1)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-pink text-white shadow-sm transition-transform active:scale-95 disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </HoldStepButton>
                <input
                  {...NUMERIC_FIELD_INPUT_PROPS}
                  value={guestCountVisible}
                  onFocus={(event) => {
                    setGuestCountFocused(true);
                    setGuestCountInput(String(guestCount));
                    scheduleCollapseCaret(event.currentTarget);
                  }}
                  onMouseUp={(event) => {
                    event.preventDefault();
                    collapseCaret(event.currentTarget);
                  }}
                  onSelect={(event) => {
                    const node = event.currentTarget;
                    if (node.selectionStart !== node.selectionEnd) {
                      collapseCaret(node);
                    }
                  }}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/\D/g, "");
                    if (nextValue === "") {
                      setGuestCountInput("");
                      return;
                    }

                    const parsedValue = Number.parseInt(nextValue, 10);
                    if (!Number.isNaN(parsedValue)) {
                      const clampedValue = clampGuestCount(
                        parsedValue,
                        maxGuests,
                      );
                      setGuestCountInput(String(clampedValue));
                      onGuestCountChange(clampedValue);
                    }
                  }}
                  onBlur={() => {
                    if (guestCountInput === "") {
                      setGuestCountInput(String(guestCount));
                    }
                    setGuestCountFocused(false);
                  }}
                  size={1}
                  className="vibeup-light-field vibeup-numeric-field min-w-0 flex-1 bg-transparent text-center text-xl font-black tabular-nums text-ink-inverse outline-none"
                  style={{ colorScheme: "light" }}
                  aria-label="Numero invitati"
                />
                <HoldStepButton
                  label="Aumenta invitati di 1"
                  disabled={guestCount >= maxGuests}
                  onStep={() => stepGuests(1)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-teal-strong text-white shadow-sm transition-transform active:scale-95 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </HoldStepButton>
              </div>
              <p className="mt-1.5 text-center text-[10px] font-medium text-ink-inverse/40">
                ±1 a tap · tieni premuto per accelerare
              </p>
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
            className="mt-3 w-full rounded-xl bg-paper px-3 py-3 text-sm font-black text-ink-inverse shadow-sm transition-opacity hover:bg-paper-deep disabled:opacity-50"
          >
            Genera preventivo istantaneo
          </button>

          {quoteNeedsRefresh && (
            <p className="mt-2 rounded-lg border border-white/10 bg-paper px-3 py-2 text-[11px] font-semibold text-ink-inverse">
              Hai modificato i dettagli: rigenera il preventivo per vedere il
              costo aggiornato.
            </p>
          )}

          {generatedQuote && (
            <>
              <dl className="mt-3 space-y-1.5 rounded-xl border border-white/8 bg-background/40 px-3 py-2.5 text-xs">
                <div className="flex justify-between gap-3 text-foreground/70">
                  <dt className="min-w-0">
                    Location
                    {generatedQuote.drinksCost > 0 ? " + bevande" : ""}
                    {(generatedQuote.venueServicesCost ?? 0) > 0
                      ? " + servizi locale"
                      : ""}
                  </dt>
                  <dd className="shrink-0 font-bold text-foreground">
                    {formatCurrency(generatedQuote.locationCost)}
                  </dd>
                </div>
                {generatedQuote.extrasCost > 0 && (
                  <div className="flex justify-between gap-3 text-foreground/70">
                    <dt className="min-w-0">Servizi selezionati</dt>
                    <dd className="shrink-0 font-bold text-foreground">
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
                    "mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-black transition-colors",
                    quoteSaved
                      ? "bg-brand-pink/25 text-foreground ring-1 ring-white/15"
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
            <p className="mt-2 rounded-lg border border-white/10 bg-paper px-3 py-2 text-[11px] font-semibold text-ink-inverse">
              L&apos;orario di fine deve essere successivo a quello di inizio
              (fino alle 03:00 di notte).
            </p>
          )}
          {hasTimeIssue && (
            <p className="mt-2 rounded-lg border border-white/10 bg-paper px-3 py-2 text-[11px] font-semibold text-ink-inverse">
              Durata minima richiesta: {minHours} ore.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
