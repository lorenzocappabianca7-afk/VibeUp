"use client";

import {
  GuestCountStepper,
  type GuestCountStepperHandle,
} from "@/components/explore/guest-count-stepper";
import {
  PriceRangeInputs,
  type PriceRangeInputsHandle,
} from "@/components/explore/price-range-inputs";
import { Button } from "@/components/ui/button";
import { VibeUpCalendar } from "@/components/ui/vibeup-calendar";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { cn, formatDate } from "@/lib/utils";
import {
  emptyPartyCriteria,
  MAX_PARTY_DATES,
  PARTY_DATES_MANAGER_HINT,
  normalizePartyCriteria,
  syncPartyDateRange,
  type PartyCriteria,
} from "@/types/party-criteria";
import {
  DEFAULT_EXPLORE_MAX_PRICE,
  EXPLORE_GUEST_MAX,
  EXPLORE_GUEST_MIN,
  EXPLORE_PRICE_MIN,
} from "@/types/location";
import { Calendar, ChevronDown, X } from "lucide-react";
import { useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";

const STEPS = ["date", "guests", "budget", "description"] as const;

const dateLabelFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
});

function formatWizardDateLabel(dates: string[]) {
  if (dates.length === 0) return "Scegli fino a 5 date";
  if (dates.length === 1) return dateLabelFormatter.format(new Date(dates[0]));
  return `${dates.length} date: ${dates
    .map((value) => dateLabelFormatter.format(new Date(value)))
    .join(", ")}`;
}

interface PartyWizardProps {
  open: boolean;
  onClose: () => void;
}

export function PartyWizard({ open, onClose }: PartyWizardProps) {
  const { applyCriteria, criteria: savedCriteria } = usePartyCriteria();
  const { setTab } = useTabNavigation();
  const [stepIndex, setStepIndex] = useState(0);
  const [criteria, setCriteria] = useState<PartyCriteria>(emptyPartyCriteria);
  const [wasOpen, setWasOpen] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const guestsRef = useRef<GuestCountStepperHandle>(null);
  const budgetRef = useRef<PriceRangeInputsHandle>(null);

  useBodyScrollLock(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStepIndex(0);
      setStepError(null);
      setCriteria(normalizePartyCriteria(savedCriteria));
    }
  }

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const progressLabel = `${stepIndex + 1}/${STEPS.length}`;

  if (!open || typeof document === "undefined") return null;

  function patch(partial: Partial<PartyCriteria>) {
    setStepError(null);
    setCriteria((prev) => normalizePartyCriteria({ ...prev, ...partial }));
  }

  function next() {
    if (step === "date" && criteria.dates.length === 0) {
      setStepError("Scegli almeno una data per continuare.");
      return;
    }

    if (step === "guests") {
      guestsRef.current?.commit();
    }

    if (step === "budget") {
      const range = budgetRef.current?.commit();
      if (!range) {
        setStepError("Inserisci un minimo e un massimo budget validi.");
        return;
      }
    }

    if (isLast) {
      if (criteria.dates.length === 0) {
        setStepError("Scegli almeno una data per continuare.");
        return;
      }
      const finalized = normalizePartyCriteria({
        ...criteria,
        guestCount: criteria.guestCount ?? EXPLORE_GUEST_MIN,
        budgetMin: criteria.budgetMin ?? EXPLORE_PRICE_MIN,
        budgetMax: criteria.budgetMax ?? DEFAULT_EXPLORE_MAX_PRICE,
      });
      applyCriteria(finalized);
      onClose();
      setTab("explore");
      setStepIndex(0);
      setStepError(null);
      return;
    }

    setStepError(null);
    setStepIndex((i) => i + 1);
  }

  function back() {
    if (stepIndex === 0) {
      onClose();
      return;
    }
    setStepIndex((i) => i - 1);
  }

  function handleClose() {
    onClose();
    setStepIndex(0);
    setStepError(null);
  }

  return createPortal(
    <div
      className="vibe-overlay-enter fixed inset-0 z-[85] flex items-end justify-center lg:items-center"
      data-overlay-open="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Chiudi"
        onClick={handleClose}
      />
      <div
        className="vibe-sheet-enter relative flex max-h-[min(92dvh,calc(100dvh-0.5rem))] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-background shadow-xl lg:max-w-lg lg:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="party-wizard-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-primary-black/15" />
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="party-wizard-title"
                className="text-lg font-bold text-primary-black"
              >
                Crea la tua festa
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-primary-black/45">
                Step {progressLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-ink-inverse/70"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="mb-4 flex gap-1.5" aria-hidden>
            {STEPS.map((id, i) => (
              <div
                key={id}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i <= stepIndex ? "bg-brand-teal" : "bg-primary-black/10",
                )}
              />
            ))}
          </div>
        </div>

        <div className="smooth-scroll min-h-0 flex-1 overflow-x-clip overflow-y-auto px-5">
          <div className="space-y-6 pb-8">
            {step === "date" ? (
              <DateStep criteria={criteria} onChange={patch} />
            ) : null}
            {step === "guests" ? (
              <GuestsStep
                criteria={criteria}
                onChange={patch}
                stepperRef={guestsRef}
              />
            ) : null}
            {step === "budget" ? (
              <BudgetStep
                criteria={criteria}
                onChange={patch}
                rangeRef={budgetRef}
              />
            ) : null}
            {step === "description" ? (
              <DescriptionStep criteria={criteria} onChange={patch} />
            ) : null}
          </div>
        </div>

        <div
          className="shrink-0 border-t border-primary-black/8 bg-background px-5 pt-3"
          style={{
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {stepError ? (
            <p className="mb-2 text-xs font-semibold text-brand-pink">
              {stepError}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={back}
            >
              Indietro
            </Button>
            <Button className="flex-1 rounded-2xl" onClick={next}>
              {isLast ? "Cerca location" : "Avanti"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DateStep({
  criteria,
  onChange,
}: {
  criteria: PartyCriteria;
  onChange: (partial: Partial<PartyCriteria>) => void;
}) {
  const [datePickerOpen, setDatePickerOpen] = useState(true);
  const dates = criteria.dates;
  const atMax = dates.length >= MAX_PARTY_DATES;

  function selectEventDate(value: string) {
    if (dates.includes(value)) {
      onChange(syncPartyDateRange(dates.filter((item) => item !== value)));
      return;
    }
    if (atMax) return;
    onChange(syncPartyDateRange([...dates, value]));
  }

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-primary-black">
        Quando vuoi festeggiare?
      </legend>
      <button
        type="button"
        onClick={() => setDatePickerOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-primary-black/10 bg-paper px-4 py-3 text-left transition-colors duration-150 hover:bg-brand-teal/8"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
            <Calendar className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-ink-inverse/50">
              Date preferite
            </span>
            <span className="block truncate text-sm font-black text-ink-inverse">
              {formatWizardDateLabel(dates)}
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-brand-teal transition-transform duration-150",
            datePickerOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {datePickerOpen ? (
        <VibeUpCalendar
          selectedDates={dates}
          maxSelected={MAX_PARTY_DATES}
          onSelectDate={selectEventDate}
          className="mx-auto mt-3"
        />
      ) : null}
      {dates.length > 0 && (
        <button
          type="button"
          onClick={() => {
            onChange(syncPartyDateRange([]));
            setDatePickerOpen(false);
          }}
          className="mt-3 text-xs font-bold text-brand-pink"
        >
          Cancella date
        </button>
      )}
      <p className="mt-2 text-xs leading-relaxed text-primary-black/50">
        Tocca i giorni che ti vanno bene, fino a {MAX_PARTY_DATES}. Il
        preventivo resta legato a una sola data: se weekend e feriali hanno
        prezzi diversi, li vedi prima di inviare la richiesta.
        {dates.length > 0 ? (
          <>
            {" "}
            Selezionate:{" "}
            {dates.map((value) => formatDate(value)).join(" · ")}.
          </>
        ) : null}
        {atMax ? ` Hai raggiunto il massimo di ${MAX_PARTY_DATES} date.` : null}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-primary-black/50">
        {PARTY_DATES_MANAGER_HINT}
      </p>
    </fieldset>
  );
}

function GuestsStep({
  criteria,
  onChange,
  stepperRef,
}: {
  criteria: PartyCriteria;
  onChange: (partial: Partial<PartyCriteria>) => void;
  stepperRef: Ref<GuestCountStepperHandle>;
}) {
  const guestCount = criteria.guestCount ?? EXPLORE_GUEST_MIN;

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-primary-black">
        Numero persone
      </legend>
      <GuestCountStepper
        ref={stepperRef}
        value={guestCount}
        onChange={(next) => onChange({ guestCount: next })}
      />
      <p className="mt-2 text-xs text-primary-black/50">
        Tocca il numero e digita gli invitati (es. 45). Mostra location con
        capienza da{" "}
        {guestCount >= EXPLORE_GUEST_MAX
          ? `${EXPLORE_GUEST_MAX}+`
          : guestCount}{" "}
        ospiti.
      </p>
    </fieldset>
  );
}

function BudgetStep({
  criteria,
  onChange,
  rangeRef,
}: {
  criteria: PartyCriteria;
  onChange: (partial: Partial<PartyCriteria>) => void;
  rangeRef: Ref<PriceRangeInputsHandle>;
}) {
  const minValue = criteria.budgetMin ?? EXPLORE_PRICE_MIN;
  const maxValue = criteria.budgetMax ?? DEFAULT_EXPLORE_MAX_PRICE;

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-primary-black">
        Budget location
      </legend>
      <PriceRangeInputs
        ref={rangeRef}
        value={[minValue, maxValue]}
        onChange={([budgetMin, budgetMax]) =>
          onChange({ budgetMin, budgetMax })
        }
      />
    </fieldset>
  );
}

function DescriptionStep({
  criteria,
  onChange,
}: {
  criteria: PartyCriteria;
  onChange: (partial: Partial<PartyCriteria>) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-primary-black">
        Dettagli e preferenze
      </legend>
      <textarea
        value={criteria.freeText}
        onChange={(e) => onChange({ freeText: e.target.value })}
        rows={4}
        placeholder="Scrivi qui se cerchi servizi particolari (es. area esterna, cena, DJ)"
        className="w-full resize-none rounded-2xl border border-primary-black/10 bg-paper px-4 py-3 text-base text-ink-inverse placeholder:text-ink-inverse/40 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
      />
      <p className="mt-2 text-xs text-primary-black/50">
        Usiamo queste parole per ordinare le location più affini in cima —
        nessuna viene nascosta.
      </p>
    </fieldset>
  );
}
