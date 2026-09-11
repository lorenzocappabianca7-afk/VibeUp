"use client";

import {
  getInternalLocationServicePrice,
  type InternalLocationService,
  type InternalLocationServiceType,
} from "@/lib/location-services";
import {
  calculateDrinksCost,
  DRINK_UNIT_PRICE,
  getDrinkPackageLabel,
  MAX_DRINKS_PER_INVITEE,
  MIN_DRINKS_PER_INVITEE,
  OPEN_BAR_PER_INVITEE,
  type DrinkPackageMode,
} from "@/lib/drinks-quote";
import {
  isEndTimeAfterStart,
  suggestEndTimeAfterStart,
} from "@/lib/location";
import { RequestStatusBadge } from "@/components/availability/request-status-badge";
import { Button } from "@/components/ui/button";
import { VibeUpCalendar } from "@/components/ui/vibeup-calendar";
import { getDepositCheckoutAmounts } from "@/lib/booking-money";
import { ONLINE_PAYMENTS_ENABLED } from "@/lib/payments/online-payments";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { MAX_PARTY_DATES, normalizePartyDates } from "@/types/party-criteria";
import type { AvailabilityRequestStatus } from "@/types/availability-request";
import type { BookingQuote } from "@/types/location";
import {
  Bookmark,
  Calendar,
  Camera,
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  Clock3,
  GitCompareArrows,
  GlassWater,
  Lightbulb,
  Minus,
  Music,
  Plus,
  Sparkles,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  collapseCaret,
  NUMERIC_FIELD_INPUT_PROPS,
  scheduleCollapseCaret,
} from "@/lib/numeric-field";
import { HoldStepButton } from "@/components/ui/hold-step-button";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import type { LucideIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";

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

export interface CandidateDatePrice {
  date: string;
  total: number;
  locationCost: number;
  band: "Weekend" | "Feriale";
}

interface SmartLocationDetailsSectionProps {
  guestCount: number;
  maxGuests: number;
  quote: BookingQuote;
  estimatedHours: number;
  minHours: number;
  date: string;
  preferredDates?: string[];
  startTime: string;
  endTime: string;
  internalServices: InternalLocationService[];
  selectedInternalServices: string[];
  drinkMode: DrinkPackageMode;
  drinksPerInvitee: number;
  onDateChange: (date: string) => void;
  onPreferredDatesChange?: (dates: string[]) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onGuestCountChange: (guestCount: number) => void;
  onToggleInternalService: (id: string) => void;
  onDrinkModeChange: (mode: DrinkPackageMode) => void;
  onDrinksPerInviteeChange: (drinks: number) => void;
  isQuoteReady: boolean;
  quoteSaved?: boolean;
  onSaveQuote?: () => void;
  hourlyPrice: number;
  locationPriceLabel?: string;
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
  drinkUnitPrice?: number;
  openBarPerInvitee?: number;
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

function formatDateLabel(value: string): string {
  if (!value) return "gg / mm / aaaa";

  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
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
    <div className="rounded-2xl border border-ink-inverse/8 bg-paper p-3 shadow-sm">
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
                        : "bg-ink-inverse/[0.04] text-ink-inverse hover:bg-brand-teal/15",
                      disabled &&
                        "cursor-not-allowed opacity-30 hover:bg-ink-inverse/[0.04]",
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
  drinkMode,
  drinksPerInvitee,
  onDateChange,
  onPreferredDatesChange,
  onStartTimeChange,
  onEndTimeChange,
  onGuestCountChange,
  onToggleInternalService,
  onDrinkModeChange,
  onDrinksPerInviteeChange,
  isQuoteReady,
  quoteSaved = false,
  onSaveQuote,
  hourlyPrice,
  locationPriceLabel,
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
  drinkUnitPrice,
  openBarPerInvitee,
}: SmartLocationDetailsSectionProps) {
  const [openPicker, setOpenPicker] = useState<PickerPanel>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [guestCountInput, setGuestCountInput] = useState(String(guestCount));
  const [guestCountFocused, setGuestCountFocused] = useState(false);
  const [sendHint, setSendHint] = useState<string | null>(null);
  const [bareQuoteConfirmOpen, setBareQuoteConfirmOpen] = useState(false);
  const extrasSectionRef = useRef<HTMLDivElement>(null);
  const venueDetailsRef = useRef<HTMLDetailsElement>(null);
  const drinksDetailsRef = useRef<HTMLDetailsElement>(null);
  const guestCountRef = useRef(guestCount);
  guestCountRef.current = guestCount;
  const guestCountVisible = guestCountFocused
    ? guestCountInput
    : String(guestCount);
  const hasTimeIssue = estimatedHours > 0 && estimatedHours < minHours;
  const hasInvalidTimeOrder =
    Boolean(startTime && endTime) && !isEndTimeAfterStart(startTime, endTime);
  const showLiveTotal = quote.total > 0;
  const isPendingManager = requestStatus === "pending_manager";
  const isPendingUserConfirm = requestStatus === "pending_user_confirm";
  const isPendingProposal = requestStatus === "pending_user_review_proposal";
  const isPendingDeposit = requestStatus === "pending_deposit_payment";
  const isPendingAdmin = requestStatus === "pending_admin_review";
  const isLocked =
    isPendingManager ||
    isPendingUserConfirm ||
    isPendingProposal ||
    isPendingDeposit ||
    isPendingAdmin;
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
  const hasAdditionalServices = selectedInternalServices.some((id) => {
    const service = internalServices.find((item) => item.id === id);
    return Boolean(service && service.pricing.type !== "included");
  });
  const hasDrinks = drinkMode !== "none";
  const sendingWithoutAddons = !hasAdditionalServices && !hasDrinks;
  useBodyScrollLock(bareQuoteConfirmOpen);

  function proceedWithSend() {
    setBareQuoteConfirmOpen(false);
    setSendHint(null);
    queueMicrotask(() => {
      onSendRequest();
    });
  }

  function handleSend() {
    if (isPendingUserConfirm || isPendingProposal || isPendingDeposit) {
      setSendHint(null);
      setBareQuoteConfirmOpen(false);
      onSendRequest();
      return;
    }
    if (!isQuoteReady) {
      setBareQuoteConfirmOpen(false);
      setSendHint(
        "Scegli una data e un orario validi per inviare la richiesta al gestore.",
      );
      return;
    }
    if (sendingWithoutAddons) {
      setSendHint(null);
      setBareQuoteConfirmOpen(true);
      return;
    }
    proceedWithSend();
  }

  function dismissBareQuoteConfirm() {
    setBareQuoteConfirmOpen(false);
    setScheduleOpen(true);
    extrasSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function togglePicker(panel: PickerPanel) {
    if (isLocked) return;
    setOpenPicker((current) => (current === panel ? null : panel));
  }

  function openScheduleEditor() {
    if (isLocked) return;
    setScheduleOpen(true);
  }

  function closeScheduleEditor() {
    setScheduleOpen(false);
    setOpenPicker(null);
  }

  const calendarDates = normalizePartyDates(
    preferredDates.length > 0
      ? [...preferredDates, date]
      : date
        ? [date]
        : [],
  );

  function selectPreferredDate(value: string) {
    if (isLocked) return;
    if (!onPreferredDatesChange) {
      onDateChange(value);
      setOpenPicker(null);
      return;
    }

    if (calendarDates.includes(value)) {
      if (date !== value) {
        onDateChange(value);
        setOpenPicker(null);
        return;
      }
      const next = calendarDates.filter((item) => item !== value);
      onPreferredDatesChange(next);
      onDateChange(next[0] ?? "");
      setOpenPicker(null);
      return;
    }

    if (calendarDates.length >= MAX_PARTY_DATES) {
      setSendHint(
        `Puoi proporre al massimo ${MAX_PARTY_DATES} date. Deseleziona una data per aggiungerne un’altra.`,
      );
      return;
    }
    setSendHint(null);
    onPreferredDatesChange(normalizePartyDates([...calendarDates, value]));
    onDateChange(value);
    setOpenPicker(null);
  }

  const dateRecap =
    calendarDates.length > 1
      ? `${calendarDates.length} date · ${formatDateLabel(date)}`
      : formatDateLabel(date);
  const guestsRecap = `${guestCount} ${guestCount === 1 ? "ospite" : "ospiti"}`;
  const timeRecap =
    startTime && endTime ? `${startTime}–${endTime}` : startTime || endTime || "Orario";
  const selectedVenueServices = internalServices.filter((service) =>
    selectedInternalServices.includes(service.id),
  );
  const venueRecap =
    selectedVenueServices.length === 0
      ? "Nessun extra del locale"
      : selectedVenueServices.map((service) => service.name).join(", ");
  const drinksRecap = getDrinkPackageLabel({
    mode: drinkMode,
    drinksPerInvitee,
  });

  function stepGuests(delta: number) {
    if (isLocked) return;
    const nextValue = clampGuestCount(guestCountRef.current + delta, maxGuests);
    if (nextValue === guestCountRef.current) return;
    guestCountRef.current = nextValue;
    setGuestCountInput(String(nextValue));
    onGuestCountChange(nextValue);
  }

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-black/10 bg-white text-[#1c2430] shadow-[0_8px_28px_-18px_rgba(0,0,0,0.35)]">
      <div className="sticky top-0 z-10 border-b border-black/10 bg-white px-5 py-4">
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-tight text-[#1c2430]">
              Ricapitoliamo
            </h2>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-teal">
              Totale
            </p>
            <p className="mt-0.5 text-[1.65rem] font-black leading-none tracking-tight text-[#1c2430]">
              {showLiveTotal ? formatCurrency(quote.total) : "—"}
            </p>
          </div>
        </div>
        {!isQuoteReady ? (
          <p className="relative mt-2 text-[11px] font-semibold text-ink-inverse/50">
            {hasInvalidTimeOrder
              ? "L'orario di fine deve essere successivo a quello di inizio."
              : hasTimeIssue
                ? `Durata minima richiesta: ${minHours} ore.`
                : date
                  ? "Completa data e orario per inviare la richiesta."
                  : "Il totale si aggiorna mentre configuri. Scegli una data per inviare."}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 p-5">
        {isLocked ? (
          <p className="rounded-xl border border-brand-teal/30 bg-brand-teal/10 px-3 py-2 text-[11px] font-semibold text-ink-inverse/70">
            {isPendingUserConfirm || isPendingProposal || (!ONLINE_PAYMENTS_ENABLED && isPendingDeposit)
              ? "Hai già una risposta del gestore: conferma sotto, senza modificare il preventivo."
              : isPendingDeposit
                ? "Stai completando il pagamento della caparra per questa richiesta."
                : isPendingAdmin
                  ? "La proposta del gestore è in verifica. I dettagli qui sotto restano bloccati."
                  : "Richiesta già inviata. Il gestore sta rispondendo: i dettagli qui sotto restano bloccati."}
          </p>
        ) : null}

        <div ref={extrasSectionRef} className="relative">
          {!scheduleOpen ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5 text-sm font-semibold text-[#1c2430]">
                  <p className="flex min-w-0 items-center gap-1.5">
                    <Calendar
                      className="h-4 w-4 shrink-0 text-brand-teal-strong"
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">{dateRecap}</span>
                  </p>
                  <p className="flex min-w-0 items-center gap-1.5">
                    <Clock
                      className="h-4 w-4 shrink-0 text-brand-teal-strong"
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">{timeRecap}</span>
                  </p>
                  <p className="flex min-w-0 items-center gap-1.5">
                    <Users
                      className="h-4 w-4 shrink-0 text-[#3B6FB6]"
                      aria-hidden
                    />
                    <span className="min-w-0">{guestsRecap}</span>
                  </p>
                  <p className="flex min-w-0 items-start gap-1.5">
                    <Sparkles
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-pink"
                      aria-hidden
                    />
                    <span className="min-w-0 leading-snug">
                      Servizi locale: {venueRecap}
                    </span>
                  </p>
                  <p className="flex min-w-0 items-center gap-1.5">
                    <GlassWater
                      className="h-4 w-4 shrink-0 text-brand-teal"
                      aria-hidden
                    />
                    <span className="min-w-0">Bevande: {drinksRecap}</span>
                  </p>
                </div>
                <div className="flex w-[7.25rem] shrink-0 flex-col items-end gap-1.5">
                  {!isLocked ? (
                    <button
                      type="button"
                      onClick={openScheduleEditor}
                      className="rounded-full bg-brand-teal px-3 py-1.5 text-[11px] font-black text-ink-inverse"
                    >
                      Modifica
                    </button>
                  ) : null}
                </div>
              </div>

              {(quote.hours > 0 || locationPriceLabel) && (
                <dl className="space-y-1.5 border-t border-ink-inverse/10 pt-3 text-xs">
                  <div className="flex justify-between gap-3 text-ink-inverse/70">
                    <dt className="min-w-0">
                      Location ({locationLine}
                      {(quote.drinksCost ?? 0) > 0 ? " + bevande" : ""}
                      {(quote.venueServicesCost ?? 0) > 0
                        ? " + servizi locale"
                        : ""}
                      )
                    </dt>
                    <dd className="shrink-0 font-bold text-ink-inverse">
                      {formatCurrency(quote.locationCost)}
                    </dd>
                  </div>
                  {(quote.extrasCost ?? 0) > 0 && (
                    <div className="flex justify-between gap-3 text-ink-inverse/70">
                      <dt className="min-w-0">Servizi extra</dt>
                      <dd className="shrink-0 font-bold text-ink-inverse">
                        {formatCurrency(quote.extrasCost)}
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              {hasInvalidTimeOrder && (
                <p className="rounded-lg border border-ink-inverse/10 bg-ink-inverse/[0.03] px-3 py-2 text-[11px] font-semibold text-ink-inverse">
                  L&apos;orario di fine deve essere successivo a quello di
                  inizio (fino alle 03:00 di notte).
                </p>
              )}
              {hasTimeIssue && (
                <p className="rounded-lg border border-ink-inverse/10 bg-ink-inverse/[0.03] px-3 py-2 text-[11px] font-semibold text-ink-inverse">
                  Durata minima richiesta: {minHours} ore.
                </p>
              )}
            </div>
          ) : (
            <>
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-teal">
              Dettagli evento
            </p>
            <button
              type="button"
              onClick={closeScheduleEditor}
              className="shrink-0 rounded-full bg-ink-inverse/8 px-3 py-1.5 text-[11px] font-black text-ink-inverse"
            >
              Fatto
            </button>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => togglePicker("date")}
              disabled={isLocked}
              className="w-full rounded-xl border border-ink-inverse/10 bg-paper px-3 py-2.5 text-left shadow-sm disabled:opacity-60"
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
              <>
                <VibeUpCalendar
                  selectedDates={calendarDates}
                  maxSelected={MAX_PARTY_DATES}
                  className="mx-auto max-w-[18.5rem]"
                  onSelectDate={selectPreferredDate}
                />
                {calendarDates.length >= MAX_PARTY_DATES ? (
                  <p className="text-center text-[11px] font-semibold text-ink-inverse/55">
                    Massimo {MAX_PARTY_DATES} date. Tocca una data già scelta
                    per toglierla.
                  </p>
                ) : null}
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => togglePicker("start")}
                disabled={isLocked}
                className="rounded-xl border border-ink-inverse/10 bg-paper px-3 py-2.5 text-left shadow-sm disabled:opacity-60"
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
                disabled={isLocked}
                className="rounded-xl border border-ink-inverse/10 bg-paper px-3 py-2.5 text-left shadow-sm disabled:opacity-60"
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

            <div className="vibeup-guest-stepper rounded-xl border border-ink-inverse/10 bg-paper px-3 py-2.5 shadow-sm">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-inverse/50">
                <Users className="h-3 w-3" aria-hidden />
                Invitati
              </span>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <HoldStepButton
                  label="Diminuisci invitati di 1"
                  disabled={isLocked || guestCount <= 1}
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
                    if (isLocked) return;
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
                  disabled={isLocked}
                  className="vibeup-light-field vibeup-numeric-field min-w-0 flex-1 bg-transparent text-center text-xl font-black tabular-nums text-ink-inverse outline-none"
                  style={{ colorScheme: "light" }}
                  aria-label="Numero invitati"
                />
                <HoldStepButton
                  label="Aumenta invitati di 1"
                  disabled={isLocked || guestCount >= maxGuests}
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

          {candidateDatePrices.length > 1 ? (
            <div className="mt-3 space-y-2 rounded-xl border border-ink-inverse/10 bg-ink-inverse/[0.03] p-3">
              <p className="text-xs font-bold text-ink-inverse">
                Prezzo per data
              </p>
              <p className="text-[11px] leading-relaxed text-ink-inverse/55">
                La richiesta al gestore parte con la data evidenziata. Weekend e
                feriali possono avere tariffe diverse.
                {pricesDiffer ? "" : " In questo caso le date hanno lo stesso totale."}
              </p>
              <ul className="space-y-1.5">
                {candidateDatePrices.map((item) => {
                  const selected = selectedDate === item.date;
                  return (
                    <li key={item.date}>
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => onSelectDate?.(item.date)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                          selected
                            ? "border-brand-teal bg-brand-teal/15"
                            : "border-ink-inverse/10 bg-white",
                          isLocked && "opacity-60",
                        )}
                      >
                        <span>
                          <span className="block text-xs font-bold text-ink-inverse">
                            {formatDate(item.date)}
                          </span>
                          <span className="text-[11px] font-semibold text-ink-inverse/50">
                            {item.band}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-black text-ink-inverse">
                          {formatCurrency(item.total)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {(quote.hours > 0 || locationPriceLabel) && (
            <dl className="mt-3 space-y-1.5 rounded-xl border border-ink-inverse/10 bg-ink-inverse/[0.03] px-3 py-2.5 text-xs">
              <div className="flex justify-between gap-3 text-ink-inverse/70">
                <dt className="min-w-0">
                  Location ({locationLine}
                  {(quote.drinksCost ?? 0) > 0 ? " + bevande" : ""}
                  {(quote.venueServicesCost ?? 0) > 0
                    ? " + servizi locale"
                    : ""}
                  )
                </dt>
                <dd className="shrink-0 font-bold text-ink-inverse">
                  {formatCurrency(quote.locationCost)}
                </dd>
              </div>
              {(quote.extrasCost ?? 0) > 0 && (
                <div className="flex justify-between gap-3 text-ink-inverse/70">
                  <dt className="min-w-0">Servizi extra</dt>
                  <dd className="shrink-0 font-bold text-ink-inverse">
                    {formatCurrency(quote.extrasCost)}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {ONLINE_PAYMENTS_ENABLED ? (
          <dl className="mt-3 space-y-1.5 rounded-xl bg-brand-pink/12 px-3 py-2.5">
            <div className="flex justify-between gap-3 text-sm">
              <dt className="min-w-0 font-medium text-ink-inverse">
                Caparra (30% location)
              </dt>
              <dd className="shrink-0 font-bold text-brand-pink">
                {showLiveTotal ? formatCurrency(depositCheckout.base) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <dt className="min-w-0 text-ink-inverse/65">
                + Commissioni VibeUp (5%)
              </dt>
              <dd className="shrink-0 font-semibold text-ink-inverse/80">
                {showLiveTotal ? formatCurrency(depositCheckout.fee) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-brand-pink/25 pt-1.5 text-sm">
              <dt className="min-w-0 font-semibold text-ink-inverse">
                Totale caparra (pagamento online)
              </dt>
              <dd className="shrink-0 font-bold text-brand-pink">
                {showLiveTotal ? formatCurrency(depositCheckout.total) : "—"}
              </dd>
            </div>
          </dl>
          ) : null}

          {hasInvalidTimeOrder && (
            <p className="mt-2 rounded-lg border border-ink-inverse/10 bg-paper px-3 py-2 text-[11px] font-semibold text-ink-inverse">
              L&apos;orario di fine deve essere successivo a quello di inizio
              (fino alle 03:00 di notte).
            </p>
          )}
          {hasTimeIssue && (
            <p className="mt-2 rounded-lg border border-ink-inverse/10 bg-paper px-3 py-2 text-[11px] font-semibold text-ink-inverse">
              Durata minima richiesta: {minHours} ore.
            </p>
          )}
            <div className="mt-4 grid gap-3">
        <details
          ref={venueDetailsRef}
          open
          className="group rounded-[0.85rem] border border-ink-inverse/10 bg-ink-inverse/[0.03] px-3 py-2.5"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
            <div>
              <h3 className="text-sm font-black leading-tight text-ink-inverse">
                Servizi del locale
              </h3>
              <p className="mt-0.5 text-[11px] font-medium leading-snug text-ink-inverse/50">
                Menu, DJ, bar, audio e allestimenti.
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-full bg-brand-teal/15 px-2 py-0.5 text-[10px] font-bold tabular-nums text-brand-teal">
                {selectedInternalServices.length}/{internalServices.length}
              </span>
              <ChevronDown
                className="h-3.5 w-3.5 text-ink-inverse/40 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </span>
          </summary>

          <ul className="mt-3 grid gap-2">
            {internalServices.map((service) => {
              const Icon = INTERNAL_SERVICE_ICONS[service.type];
              const isSelected = selectedInternalServices.includes(service.id);
              const isIncluded = service.pricing.type === "included";
              const drinksReplaceBar =
                drinkMode !== "none" &&
                service.type === "bar" &&
                !isIncluded &&
                isSelected;

              return (
                <li key={service.id}>
                  <button
                    type="button"
                    disabled={!service.available || isLocked || isIncluded}
                    onClick={() => onToggleInternalService(service.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all duration-150",
                      isSelected
                        ? "border-brand-teal/55 bg-brand-teal/12 shadow-[0_8px_24px_-18px_rgba(62,207,207,0.9)]"
                        : "border-ink-inverse/10 bg-white hover:border-ink-inverse/20",
                      (!service.available || isIncluded) &&
                        "cursor-not-allowed",
                      !service.available && "opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isSelected
                          ? "bg-brand-teal text-ink-inverse"
                          : "bg-ink-inverse/[0.06] text-ink-inverse/50",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-ink-inverse">
                          {service.name}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-brand-teal">
                          {formatInternalServicePrice(service, guestCount)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-inverse/48">
                        {service.description}
                      </span>
                      {isIncluded ? (
                        <span className="mt-1 block text-[11px] font-semibold text-brand-teal">
                          Sempre incluso nel prezzo del locale
                        </span>
                      ) : null}
                      {drinksReplaceBar ? (
                        <span className="mt-1 block text-[11px] font-semibold text-ink-inverse/55">
                          Non viene aggiunto al totale: vale il pacchetto
                          bevande.
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                        isSelected
                          ? "border-brand-teal bg-brand-teal text-ink-inverse"
                          : "border-ink-inverse/20",
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" aria-hidden />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </details>

        <details
          ref={drinksDetailsRef}
          open
          className="group rounded-[0.85rem] border border-ink-inverse/10 bg-ink-inverse/[0.03] px-3 py-2.5"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-teal/15 text-brand-teal">
                <GlassWater className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <h3 className="text-sm font-black leading-tight text-ink-inverse">
                  Bevande
                </h3>
                <p className="text-[11px] font-medium leading-snug text-ink-inverse/50">
                  Drink a partecipante oppure open bar.
                </p>
              </span>
            </div>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-full bg-brand-teal/15 px-2 py-0.5 text-[10px] font-bold text-brand-teal">
                {drinkMode === "none"
                  ? "Nessuna"
                  : drinkMode === "open_bar"
                    ? "Open bar"
                    : "Drink"}
              </span>
              <ChevronDown
                className="h-3.5 w-3.5 text-ink-inverse/40 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </span>
          </summary>

          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-ink-inverse/[0.04] p-1 ring-1 ring-ink-inverse/10">
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
                disabled={isLocked}
                className={cn(
                  "rounded-xl px-2 py-2.5 text-center text-[11px] font-bold transition-colors sm:text-xs",
                  drinkMode === option.id
                    ? "bg-brand-teal text-ink-inverse shadow-sm"
                    : "bg-transparent text-ink-inverse/55 hover:bg-ink-inverse/[0.04] hover:text-ink-inverse",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {drinkMode === "per_invitee" && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-ink-inverse/10 bg-white px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-inverse">
                  Drink per partecipante
                </p>
                <p className="text-[11px] text-ink-inverse/48">
                  {formatCurrency(drinkUnitPrice ?? DRINK_UNIT_PRICE)} ciascuno
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onDrinksPerInviteeChange(drinksPerInvitee - 1)
                  }
                  disabled={isLocked || drinksPerInvitee <= MIN_DRINKS_PER_INVITEE}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal disabled:opacity-35"
                  aria-label="Riduci drink per partecipante"
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
                  disabled={isLocked || drinksPerInvitee >= MAX_DRINKS_PER_INVITEE}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal text-ink-inverse disabled:opacity-35"
                  aria-label="Aumenta drink per partecipante"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          )}

          {drinkMode === "open_bar" && (
            <p className="mt-3 rounded-xl border border-ink-inverse/10 bg-ink-inverse/[0.03] px-3 py-2 text-xs font-semibold text-ink-inverse/70">
              Open bar stimato a {formatCurrency(openBarPerInvitee ?? OPEN_BAR_PER_INVITEE)}
              /partecipante per tutta la serata.
            </p>
          )}

          {drinkMode !== "none" && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink-inverse/8 pt-3 text-sm">
              <span className="text-ink-inverse/55">Incluso nel costo locale</span>
              <span className="font-bold text-ink-inverse">
                {formatCurrency(
                  quote.drinksCost ??
                    calculateDrinksCost({
                      mode: drinkMode,
                      drinksPerInvitee,
                      guestCount,
                      drinkUnitPrice,
                      openBarPerInvitee,
                    }),
                )}
              </span>
            </div>
          )}
        </details>
            </div>
            </>
          )}
        </div>

        <div className="border-t border-black/10 pt-4">
          <div className="flex items-end justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-teal">
              Totale
            </p>
            <p className="text-[1.45rem] font-black leading-none tracking-tight text-ink-inverse">
              {showLiveTotal ? formatCurrency(quote.total) : "—"}
            </p>
          </div>

          {onSaveQuote && showLiveTotal && !isLocked ? (
            <button
              type="button"
              onClick={onSaveQuote}
              className={cn(
                "mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-black transition-colors",
                quoteSaved
                  ? "bg-brand-pink/25 text-ink-inverse ring-1 ring-ink-inverse/10"
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
          ) : null}

          <label className="mt-3 block rounded-xl border border-ink-inverse/10 bg-paper px-3 py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-inverse/45">
              Nome evento
            </span>
            <input
              value={eventTitle}
              onChange={(event) => onEventTitleChange(event.target.value)}
              disabled={isLocked}
              placeholder={eventTitlePlaceholder}
              className="mt-0.5 w-full bg-transparent text-sm font-black leading-tight text-ink-inverse outline-none placeholder:text-ink-inverse/35 disabled:opacity-70"
              aria-label="Nome evento"
            />
          </label>

          <div className="mt-3 space-y-2">
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
                (isPendingManager || isPendingAdmin) &&
                  "bg-[#1c2430]/70 text-white hover:bg-[#1c2430]/70 disabled:opacity-100",
                (isPendingUserConfirm ||
                  isPendingProposal ||
                  isPendingDeposit) &&
                  "bg-brand-teal text-ink-inverse hover:bg-brand-teal disabled:opacity-100",
                !isPendingManager &&
                  !isPendingAdmin &&
                  !isPendingUserConfirm &&
                  !isPendingProposal &&
                  !isPendingDeposit &&
                  "!bg-[#1c2430] !text-white hover:!bg-[#11151c]",
              )}
              disabled={isPendingManager || isPendingAdmin}
              onClick={handleSend}
            >
              {isPendingUserConfirm ? (
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4" aria-hidden />
                  Gestore ha accettato — conferma
                </span>
              ) : isPendingProposal ? (
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4" aria-hidden />
                  Scegli la data e conferma
                </span>
              ) : isPendingDeposit ? (
                <span className="inline-flex items-center gap-2">
                  {ONLINE_PAYMENTS_ENABLED ? (
                    <>
                      <Clock3 className="h-4 w-4" aria-hidden />
                      Completa il pagamento della caparra
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" aria-hidden />
                      Conferma e crea evento
                    </>
                  )}
                </span>
              ) : isPendingManager || isPendingAdmin ? (
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

            {isPendingProposal && (
              <p className="text-center text-xs text-brand-teal">
                Il gestore ha proposto delle date. Scegli quella definitiva per
                confermare.
              </p>
            )}
            {isPendingDeposit && ONLINE_PAYMENTS_ENABLED && (
              <p className="text-center text-xs text-ink-inverse/50">
                Completa il pagamento della caparra per confermare l&apos;evento.
              </p>
            )}
            {isPendingDeposit && !ONLINE_PAYMENTS_ENABLED && (
              <p className="text-center text-xs text-brand-teal">
                Conferma per creare l&apos;evento nei tuoi eventi.
              </p>
            )}
            {isPendingManager && (
              <p className="text-center text-xs text-ink-inverse/50">
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
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-teal/35 bg-brand-teal/10 px-4 py-3 text-sm font-black text-brand-teal"
            >
              <GitCompareArrows className="h-4 w-4" strokeWidth={2.75} aria-hidden />
              {isCompareSelected
                ? "Vedi confronto location"
                : "Confronta questa location"}
            </button>
          ) : null}
        </div>
      </div>

      {bareQuoteConfirmOpen ? (
        <div
          className="vibe-overlay-enter fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
          data-overlay-open="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            onClick={() => setBareQuoteConfirmOpen(false)}
            aria-label="Chiudi"
          />
          <div
            className="vibe-sheet-enter relative w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bare-quote-confirm-title"
          >
            <button
              type="button"
              onClick={() => setBareQuoteConfirmOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-foreground/50"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <h3
              id="bare-quote-confirm-title"
              className="pr-8 text-lg font-black text-foreground"
            >
              Vuoi procedere senza extra a pagamento o bevande?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/60">
              Non hai aggiunto servizi del locale a pagamento né un pacchetto
              bevande. Puoi aggiungerli ora, oppure inviare la richiesta solo
              per la location. DJ, foto e altri servizi esterni si aggiungono
              dopo, da I miei eventi.
            </p>
            <div className="mt-5 grid gap-2">
              <Button className="w-full rounded-2xl py-3 font-semibold" onClick={proceedWithSend}>
                Procedi comunque
              </Button>
              <button
                type="button"
                onClick={dismissBareQuoteConfirm}
                className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-brand-teal"
              >
                Aggiungi dettagli
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
