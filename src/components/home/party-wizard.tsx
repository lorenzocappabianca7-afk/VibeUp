"use client";

import { GuestCountStepper } from "@/components/explore/guest-count-stepper";
import { Button } from "@/components/ui/button";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { cn, formatCurrency } from "@/lib/utils";
import {
  emptyPartyCriteria,
  type PartyCriteria,
} from "@/types/party-criteria";
import {
  DEFAULT_EXPLORE_MAX_PRICE,
  EXPLORE_GUEST_MIN,
  EXPLORE_PRICE_MIN,
} from "@/types/location";
import { useMemo, useState } from "react";

const STEPS = ["date", "guests", "budget", "description"] as const;

interface PartyWizardProps {
  open: boolean;
  onClose: () => void;
}

export function PartyWizard({ open, onClose }: PartyWizardProps) {
  const { applyCriteria } = usePartyCriteria();
  const { setTab } = useTabNavigation();
  const [stepIndex, setStepIndex] = useState(0);
  const [criteria, setCriteria] = useState<PartyCriteria>(emptyPartyCriteria);

  useBodyScrollLock(open);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const progressLabel = `${stepIndex + 1}/${STEPS.length}`;

  if (!open) return null;

  function patch(partial: Partial<PartyCriteria>) {
    setCriteria((prev) => ({ ...prev, ...partial }));
  }

  function next() {
    if (isLast) {
      const finalized: PartyCriteria = {
        ...criteria,
        guestCount: criteria.guestCount ?? EXPLORE_GUEST_MIN,
        dateTo: criteria.dateTo ?? criteria.dateFrom,
      };
      applyCriteria(finalized);
      onClose();
      setTab("explore");
      setStepIndex(0);
      return;
    }

    // Persist the guests value shown in the stepper when advancing without edits.
    if (step === "guests" && criteria.guestCount == null) {
      setCriteria((prev) => ({ ...prev, guestCount: EXPLORE_GUEST_MIN }));
    }
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
  }

  return (
    <div
      className="vibe-overlay-enter fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-4"
      data-overlay-open="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Chiudi"
        onClick={handleClose}
      />
      <div
        className="vibe-sheet-enter relative flex max-h-[min(92dvh,calc(100dvh-0.5rem))] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-surface shadow-xl sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="party-wizard-title"
      >
        <div className="shrink-0 border-b border-primary-black/8 px-5 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="party-wizard-title"
              className="text-lg font-bold text-primary-black"
            >
              Crea la tua festa
            </h2>
            <span className="text-xs font-semibold text-primary-black/45">
              Step {progressLabel}
            </span>
          </div>
          <div className="flex gap-1.5" aria-hidden>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {step === "date" ? (
            <DateStep criteria={criteria} onChange={patch} />
          ) : null}
          {step === "guests" ? (
            <GuestsStep criteria={criteria} onChange={patch} />
          ) : null}
          {step === "budget" ? (
            <BudgetStep criteria={criteria} onChange={patch} />
          ) : null}
          {step === "description" ? (
            <DescriptionStep criteria={criteria} onChange={patch} />
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-primary-black/8 px-5 py-4">
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
  );
}

function DateStep({
  criteria,
  onChange,
}: {
  criteria: PartyCriteria;
  onChange: (partial: Partial<PartyCriteria>) => void;
}) {
  const singleMode = !criteria.dateTo || criteria.dateTo === criteria.dateFrom;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-primary-black">Quando?</h3>
        <p className="mt-1 text-sm text-primary-black/55">
          Scegli una data o una fascia di date.
        </p>
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary-black/45">
          Data inizio
        </span>
        <input
          type="date"
          value={criteria.dateFrom ?? ""}
          onChange={(e) => {
            const value = e.target.value || null;
            onChange({
              dateFrom: value,
              dateTo: singleMode ? value : criteria.dateTo,
            });
          }}
          className="w-full rounded-2xl border border-primary-black/10 bg-paper px-3.5 py-3 text-base text-ink-inverse"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-primary-black/70">
        <input
          type="checkbox"
          checked={!singleMode}
          onChange={(e) => {
            if (e.target.checked) {
              onChange({
                dateTo: criteria.dateTo ?? criteria.dateFrom,
              });
            } else {
              onChange({ dateTo: criteria.dateFrom });
            }
          }}
        />
        Fascia di date
      </label>
      {!singleMode ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary-black/45">
            Data fine
          </span>
          <input
            type="date"
            value={criteria.dateTo ?? ""}
            min={criteria.dateFrom ?? undefined}
            onChange={(e) =>
              onChange({ dateTo: e.target.value || criteria.dateFrom })
            }
            className="w-full rounded-2xl border border-primary-black/10 bg-paper px-3.5 py-3 text-base text-ink-inverse"
          />
        </label>
      ) : null}
    </div>
  );
}

function GuestsStep({
  criteria,
  onChange,
}: {
  criteria: PartyCriteria;
  onChange: (partial: Partial<PartyCriteria>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-primary-black">
          Quanti invitati?
        </h3>
        <p className="mt-1 text-sm text-primary-black/55">
          Serve a mostrare location con capacità adeguata.
        </p>
      </div>
      <GuestCountStepper
        value={criteria.guestCount ?? EXPLORE_GUEST_MIN}
        onChange={(guestCount) => onChange({ guestCount })}
      />
    </div>
  );
}

function BudgetStep({
  criteria,
  onChange,
}: {
  criteria: PartyCriteria;
  onChange: (partial: Partial<PartyCriteria>) => void;
}) {
  const max = Math.max(
    EXPLORE_PRICE_MIN + 100,
    criteria.budgetMax ?? DEFAULT_EXPLORE_MAX_PRICE,
  );
  const value = criteria.budgetMax ?? DEFAULT_EXPLORE_MAX_PRICE;

  const ticks = useMemo(
    () => [500, 1000, 1500, 2000, 3000].filter((n) => n <= DEFAULT_EXPLORE_MAX_PRICE),
    [],
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-primary-black">
          Budget location
        </h3>
        <p className="mt-1 text-sm text-primary-black/55">
          Imposta il prezzo totale massimo che vuoi spendere per il locale.
        </p>
      </div>
      <p className="text-center text-2xl font-bold text-primary-black">
        fino a {formatCurrency(value)}
      </p>
      <input
        type="range"
        min={EXPLORE_PRICE_MIN}
        max={DEFAULT_EXPLORE_MAX_PRICE}
        step={50}
        value={value}
        onChange={(e) => onChange({ budgetMax: Number(e.target.value) })}
        className="w-full accent-brand-teal"
        aria-label="Budget massimo"
      />
      <div className="flex flex-wrap justify-center gap-2">
        {ticks.map((tick) => (
          <button
            key={tick}
            type="button"
            onClick={() => onChange({ budgetMax: tick })}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              value === tick
                ? "bg-brand-teal text-ink-inverse"
                : "bg-primary-black/6 text-primary-black/65",
            )}
          >
            {formatCurrency(tick)}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-primary-black/40">
        Max selezionabile: {formatCurrency(max > value ? DEFAULT_EXPLORE_MAX_PRICE : max)}
      </p>
    </div>
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
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-primary-black">
          Descrivi la festa
        </h3>
        <p className="mt-1 text-sm text-primary-black/55">
          Usiamo queste parole per ordinare le location più affini in cima —
          nessuna viene nascosta.
        </p>
      </div>
      <textarea
        value={criteria.freeText}
        onChange={(e) => onChange({ freeText: e.target.value })}
        rows={5}
        placeholder="Descrivi che tipo di festa hai in mente: musica, stile, atmosfera..."
        className="w-full resize-none rounded-2xl border border-primary-black/10 bg-paper px-3.5 py-3 text-base text-ink-inverse placeholder:text-ink-inverse/40 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
      />
    </div>
  );
}
