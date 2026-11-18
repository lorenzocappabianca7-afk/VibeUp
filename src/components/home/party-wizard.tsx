"use client";

import {
  GuestCountStepper,
  type GuestCountStepperHandle,
} from "@/components/explore/guest-count-stepper";
import { Button } from "@/components/ui/button";
import { VibeUpCalendar } from "@/components/ui/vibeup-calendar";
import { useDemoLanguage } from "@/context/demo-language-context";
import { formatLongDate } from "@/lib/locale/format";
import { translate } from "@/lib/locale/translate";
import { useDemoMode } from "@/context/demo-mode-context";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { partyServiceLabel } from "@/lib/included-party-services";
import { cn } from "@/lib/utils";
import {
  clampDrinksPerInvitee,
  DEFAULT_DRINKS_PER_INVITEE,
  MAX_DRINKS_PER_INVITEE,
  MIN_DRINKS_PER_INVITEE,
  type DrinkPackageMode,
} from "@/lib/drinks-quote";
import {
  emptyPartyCriteria,
  MAX_PARTY_DATES,
  PARTY_BUDGET_BANDS,
  PARTY_SERVICE_OPTIONS,
  partyBudgetBand,
  normalizePartyCriteria,
  syncPartyDateRange,
  type PartyCriteria,
  type PartyServicePick,
} from "@/types/party-criteria";
import {
  EXPLORE_GUEST_MIN,
} from "@/types/location";
import { Cake, Calendar, Camera, Check, ChevronDown, Disc3, Gift, Info, Minus, Plus, ShieldCheck, UtensilsCrossed, X } from "lucide-react";
import { useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";

const STEPS = [
  "date",
  "guests",
  "budget",
  "drinks",
  "services",
] as const;

const STEP_QUESTIONS: Record<(typeof STEPS)[number], string> = {
  date: "Quando vuoi festeggiare?",
  guests: "Quanti siete?",
  budget: "Quanto vuoi spendere per la location?",
  drinks: "Bevande della serata",
  services: "Quali servizi vuoi già inclusi nel prezzo?",
};

const SERVICE_ICONS = {
  dj: Disc3,
  photographer: Camera,
  bakery: Cake,
  security: ShieldCheck,
  catering: UtensilsCrossed,
  decorations: Gift,
} as const;

function formatWizardDateLabel(dates: string[], locale: "it" | "en") {
  if (dates.length === 0) return translate(locale, "Scegli fino a 5 date");
  if (dates.length === 1) return formatLongDate(locale, dates[0]);
  return `${translate(locale, "{n} date").replaceAll("{n}", String(dates.length))}: ${dates
    .map((value) => formatLongDate(locale, value))
    .join(", ")}`;
}

interface PartyWizardProps {
  open: boolean;
  onClose: () => void;
  startStep?: "services" | null;
}

export function PartyWizard({ open, onClose, startStep = null }: PartyWizardProps) {
  const { t } = useDemoLanguage();
  const { isDemoMode } = useDemoMode();
  const { applyCriteria, criteria: savedCriteria } = usePartyCriteria();
  const { setTab } = useTabNavigation();
  const [stepIndex, setStepIndex] = useState(0);
  const [criteria, setCriteria] = useState<PartyCriteria>(emptyPartyCriteria);
  const [wasOpen, setWasOpen] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const guestsRef = useRef<GuestCountStepperHandle>(null);

  useBodyScrollLock(open);

  const steps = isDemoMode ? STEPS.filter((id) => id !== "drinks") : STEPS;

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStepError(null);
      const opened = normalizePartyCriteria(savedCriteria);
      const band = partyBudgetBand(opened.budgetMin, opened.budgetMax);
      const hasBand =
        opened.budgetMin === band.min && opened.budgetMax === band.max;
      setCriteria(
        hasBand
          ? opened
          : { ...opened, budgetMin: 1000, budgetMax: 2000 },
      );
      const servicesIndex = steps.indexOf("services");
      setStepIndex(
        startStep === "services" && servicesIndex >= 0 ? servicesIndex : 0,
      );
    }
  }

  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeIndex];
  const isLast = safeIndex === steps.length - 1;

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

    if (isLast) {
      if (criteria.dates.length === 0) {
        setStepError("Scegli almeno una data per continuare.");
        return;
      }
      const finalized = normalizePartyCriteria({
        ...criteria,
        guestCount: criteria.guestCount ?? EXPLORE_GUEST_MIN,
        budgetMin: criteria.budgetMin ?? 1000,
        budgetMax: criteria.budgetMax === undefined ? 2000 : criteria.budgetMax,
        ...(isDemoMode ? { drinkMode: "none" as const } : {}),
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
        aria-label={t("Chiudi")}
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
              <p className="text-xs font-semibold text-primary-black/45">
                {t("Crea la tua festa")} · {t("{current} di {total}").replaceAll("{current}", String(safeIndex + 1)).replaceAll("{total}", String(steps.length))}
              </p>
              <h2
                id="party-wizard-title"
                className="mt-1 text-[1.65rem] font-bold leading-tight text-primary-black"
              >
                {t(STEP_QUESTIONS[step])}
              </h2>
              {step === "budget" ? (
                <p className="mt-1 text-sm text-primary-black/55">
                  {t("Sala e drink inclusi. Tocca una fascia.")}
                </p>
              ) : null}
              {step === "services" ? (
                <p className="mt-1 text-sm text-primary-black/55">
                  {t("Ti mostriamo solo le location che li hanno già compresi.")}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-ink-inverse/70"
              aria-label={t("Chiudi")}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="mb-4 flex gap-1.5" aria-hidden>
            {steps.map((id, i) => (
              <div
                key={id}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i <= safeIndex ? "bg-brand-teal" : "bg-primary-black/10",
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
              <BudgetStep criteria={criteria} onChange={patch} />
            ) : null}
            {step === "drinks" ? (
              <DrinksStep criteria={criteria} onChange={patch} />
            ) : null}
            {step === "services" ? (
              <ServicesStep criteria={criteria} onChange={patch} />
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
              {t(stepError)}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className={cn(
                "rounded-2xl",
                step === "services" ? "h-[50px] shrink-0 px-4" : "h-[52px] flex-1",
              )}
              onClick={back}
            >
              {t("Indietro")}
            </Button>
            {step === "services" && isDemoMode ? (
              <button
                type="button"
                onClick={next}
                className={cn(
                  "flex h-[50px] min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-2xl border-0 px-1.5 text-center text-[10px] font-bold tracking-tight text-[#0F1115] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background min-[375px]:text-[13px] min-[375px]:tracking-normal min-[430px]:px-3 min-[430px]:text-[15px]",
                  criteria.partyServices.length === 0
                    ? "bg-brand-teal"
                    : "bg-brand-pink",
                )}
              >
                {criteria.partyServices.length === 0
                  ? t("Aggiungi in seguito separatamente")
                  : t("Continua")}
              </button>
            ) : step === "services" && criteria.partyServices.length === 0 ? (
              <button
                type="button"
                onClick={next}
                className="h-[50px] min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-2xl border border-[#2A2C33] bg-transparent px-3 text-[15px] font-bold text-[#F5F5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="min-[430px]:hidden">
                  {t("Aggiungili dopo")}
                </span>
                <span className="hidden min-[430px]:inline">
                  {t("Aggiungi in seguito separatamente")}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className={cn(
                  "rounded-2xl bg-brand-pink font-bold text-[#0F1115] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  step === "services"
                    ? "h-[50px] min-w-0 flex-1 text-[15px]"
                    : "h-[52px] flex-[1.7] text-base",
                )}
              >
                {step === "services"
                  ? t("Continua")
                  : isLast
                    ? t("Cerca location")
                    : t("Avanti")}
              </button>
            )}
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
  const { lang } = useDemoLanguage();
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
              {formatWizardDateLabel(dates, lang)}
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
          className="mt-3 text-xs font-semibold text-primary-black/45"
        >
          {translate(lang, "Cancella date")}
        </button>
      )}
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
      <GuestCountStepper
        ref={stepperRef}
        showHeading={false}
        value={guestCount}
        onChange={(next) => onChange({ guestCount: next })}
      />
    </fieldset>
  );
}

function DrinksStep({
  criteria,
  onChange,
}: {
  criteria: PartyCriteria;
  onChange: (partial: Partial<PartyCriteria>) => void;
}) {
  const { t } = useDemoLanguage();
  function setDrinkMode(drinkMode: DrinkPackageMode) {
    onChange({
      drinkMode,
      drinksPerInvitee:
        drinkMode === "per_invitee" &&
        criteria.drinksPerInvitee < MIN_DRINKS_PER_INVITEE
          ? DEFAULT_DRINKS_PER_INVITEE
          : criteria.drinksPerInvitee,
    });
  }

  return (
    <fieldset>
      <p className="mb-3 text-xs leading-relaxed text-primary-black/50">
        {t("I drink li fornisce il locale. Il costo entra nel prezzo della location, insieme alla sala.")}
      </p>
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-paper p-1 ring-1 ring-primary-black/8">
        {(
          [
            { id: "none", label: "Nessuno" },
            { id: "per_invitee", label: "Drink" },
            { id: "open_bar", label: "Open bar" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setDrinkMode(option.id)}
            aria-pressed={criteria.drinkMode === option.id}
            className={cn(
              "rounded-xl px-2 py-2.5 text-center text-[11px] font-bold transition-colors sm:text-xs",
              criteria.drinkMode === option.id
                ? "bg-brand-teal text-ink-inverse shadow-sm"
                : "bg-transparent text-ink-inverse/55 hover:bg-white/40 hover:text-ink-inverse",
            )}
          >
            {t(option.label)}
          </button>
        ))}
      </div>

      {criteria.drinkMode === "per_invitee" ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-primary-black/10 bg-paper px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-inverse">
              Drink per ospite
            </p>
            <p className="text-[11px] text-ink-inverse/50">
              Da {MIN_DRINKS_PER_INVITEE} a {MAX_DRINKS_PER_INVITEE}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onChange({
                  drinksPerInvitee: clampDrinksPerInvitee(
                    criteria.drinksPerInvitee - 1,
                  ),
                })
              }
              disabled={criteria.drinksPerInvitee <= MIN_DRINKS_PER_INVITEE}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal disabled:opacity-35"
              aria-label={t("Riduci drink per persona")}
            >
              <Minus className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span className="min-w-[2rem] text-center text-lg font-black tabular-nums text-ink-inverse">
              {criteria.drinksPerInvitee}
            </span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  drinksPerInvitee: clampDrinksPerInvitee(
                    criteria.drinksPerInvitee + 1,
                  ),
                })
              }
              disabled={criteria.drinksPerInvitee >= MAX_DRINKS_PER_INVITEE}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal text-ink-inverse disabled:opacity-35"
              aria-label={t("Aumenta drink per persona")}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      {criteria.drinkMode === "open_bar" ? (
        <p className="mt-3 rounded-xl border border-primary-black/10 bg-paper px-3 py-2 text-xs font-semibold text-ink-inverse/70">
          {t("Open bar per tutta la serata, a partecipante. Lo fornisce il locale ed è incluso nel prezzo.")}
        </p>
      ) : null}
    </fieldset>
  );
}

function BudgetStep({
  criteria,
  onChange,
}: {
  criteria: PartyCriteria;
  onChange: (partial: Partial<PartyCriteria>) => void;
}) {
  const selected = partyBudgetBand(criteria.budgetMin, criteria.budgetMax);

  return (
    <fieldset>
      <div className="grid grid-cols-2 gap-2">
        {PARTY_BUDGET_BANDS.map((band) => {
          const active = selected.id === band.id;
          return (
            <button
              key={band.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ budgetMin: band.min, budgetMax: band.max })}
              className={cn(
                "flex min-h-[72px] items-center justify-between gap-2 rounded-2xl border-2 px-3 py-3 text-left text-sm font-bold",
                active
                  ? "border-brand-teal bg-brand-teal/15 text-primary-black"
                  : "border-white/10 bg-surface text-primary-black/80",
              )}
            >
              <span>{band.label}</span>
              {active ? <Check className="h-4 w-4 shrink-0 text-brand-teal" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-primary-black/50">
        Il prezzo cambia tra feriale e weekend.
      </p>
    </fieldset>
  );
}

function ServicesStep({
  criteria,
  onChange,
}: {
  criteria: PartyCriteria;
  onChange: (partial: Partial<PartyCriteria>) => void;
}) {
  const { lang, t } = useDemoLanguage();

  function toggle(id: PartyServicePick) {
    const current = criteria.partyServices;
    onChange({
      partyServices: current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    });
  }

  return (
    <fieldset>
      <div className="flex flex-wrap gap-2">
        {PARTY_SERVICE_OPTIONS.map((option) => {
          const active = criteria.partyServices.includes(option.id);
          const Icon = SERVICE_ICONS[option.id];
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(option.id)}
              className={cn(
                "relative flex min-h-[4.5rem] flex-1 basis-[calc(50%-0.25rem)] flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-3 py-2 text-center",
                active
                  ? "border-brand-teal bg-brand-teal text-[#0F1115]"
                  : "border-white/10 bg-surface text-primary-black/80",
              )}
            >
              {active ? (
                <Check className="absolute right-2 top-2 h-3.5 w-3.5" aria-hidden />
              ) : null}
              <Icon className="h-4 w-4" aria-hidden />
              <span className="text-sm font-bold leading-tight">
                {partyServiceLabel(option.id, lang)}
              </span>
              <span
                className={cn(
                  "text-[11px] font-semibold leading-none",
                  active ? "visible" : "invisible",
                )}
                aria-hidden={!active}
              >
                {t("Incluso")}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex items-start gap-2 text-[13px] leading-snug text-primary-black/50">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          {t("Quelli che non selezioni potrai aggiungerli dopo alla tua festa.")}
        </span>
      </p>
      <label className="mt-4 block text-xs font-semibold text-primary-black/55">
        {t("Altri dettagli (facoltativo)")}
        <textarea
          value={criteria.freeText}
          onChange={(event) => onChange({ freeText: event.target.value })}
          rows={2}
          placeholder={t("Es. area esterna, cena, stile")}
          className="mt-1 w-full resize-none rounded-2xl border border-primary-black/10 bg-paper px-3 py-2 text-base text-ink-inverse placeholder:text-ink-inverse/40 focus:border-brand-teal focus:outline-none"
        />
      </label>
    </fieldset>
  );
}
