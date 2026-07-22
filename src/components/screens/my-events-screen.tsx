"use client";

import { DiscountInviteBanner } from "@/components/discount-invite-banner";
import { EventCountdown } from "@/components/events/event-countdown";
import { useAppState } from "@/context/app-state-context";
import {
  Calendar,
  Cake,
  Camera,
  Check,
  ChevronDown,
  CreditCard,
  Gift,
  MapPin,
  Music,
  Pencil,
  ShieldCheck,
  UtensilsCrossed,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { getCountdown, getEventDateTime, isEventPast } from "@/lib/event";
import {
  EVENT_STATUS_LABELS,
  type BookedService,
  type EventMenuSelection,
  type UserEvent,
} from "@/types/event";
import {
  DISCOUNT_POPOVER_CLASS,
  formatCurrency,
  formatDate,
  MODAL_SAFE_BOTTOM_STYLE,
} from "@/lib/utils";
import Link from "next/link";
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";

interface MyEventsScreenProps {
  onCreateEvent?: () => void;
  /** False when the tab is mounted but hidden (keep-alive) */
  isActive?: boolean;
}

type PaymentMethod = "card" | "apple_pay" | "paypal" | "bank_transfer" | "cash";

interface ServicePaymentState {
  paid: boolean;
  method?: string;
}

const statusColors: Record<UserEvent["status"], string> = {
  draft: "text-primary-black/50",
  organizing: "text-primary-black",
  confirmed: "text-primary-black",
  completed: "text-primary-black/50",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  card: "Carta",
  apple_pay: "Apple Pay",
  paypal: "PayPal",
  bank_transfer: "Bonifico",
  cash: "Contanti",
};

const depositDeadlineFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const EVENT_SERVICE_SUGGESTIONS = [
  {
    id: "menu",
    label: "Menu o catering",
    description: "Cibo, buffet o opzioni vegetariane per gli invitati.",
    categories: ["menu", "catering"],
    exploreCategory: "altri",
    icon: UtensilsCrossed,
    iconClass: "text-[#E07A3D]",
  },
  {
    id: "dj",
    label: "DJ",
    description: "Musica e intrattenimento per la serata.",
    categories: ["dj"],
    exploreCategory: "dj",
    icon: Music,
    iconClass: "text-brand-pink",
  },
  {
    id: "bakery",
    label: "Torta",
    description: "Torta personalizzata o sweet table.",
    categories: ["bakery"],
    exploreCategory: "altri",
    icon: Cake,
    iconClass: "text-[#E8A54B]",
  },
  {
    id: "photographer",
    label: "Fotografo",
    description: "Foto e ricordi dell'evento.",
    categories: ["photographer"],
    exploreCategory: "fotografo",
    icon: Camera,
    iconClass: "text-[#4A8FE7]",
  },
  {
    id: "decorations",
    label: "Decorazioni",
    description: "Allestimento, palloncini e dettagli tema.",
    categories: ["decorations"],
    exploreCategory: "decorazioni",
    icon: Gift,
    iconClass: "text-[#2BB673]",
  },
  {
    id: "security",
    label: "Buttafuori",
    description: "Controllo ingressi e sicurezza durante la festa.",
    categories: ["security"],
    exploreCategory: "altri",
    icon: ShieldCheck,
    iconClass: "text-brand-teal",
  },
] as const;

const MENU_COURSES = [
  {
    id: "antipasti",
    label: "Antipasti",
    items: [
      { id: "taglieri", label: "Taglieri misti" },
      { id: "finger-food", label: "Finger food" },
      { id: "bruschette", label: "Bruschette gourmet" },
    ],
  },
  {
    id: "primi",
    label: "Primi",
    items: [
      { id: "pasta", label: "Pasta fresca" },
      { id: "risotto", label: "Risotto" },
      { id: "lasagne", label: "Lasagne vegetariane" },
    ],
  },
  {
    id: "secondi",
    label: "Secondi",
    items: [
      { id: "carne", label: "Secondo di carne" },
      { id: "pesce", label: "Secondo di pesce" },
      { id: "vegetariano", label: "Opzione vegetariana" },
    ],
  },
  {
    id: "dolci",
    label: "Dolci",
    items: [
      { id: "torta", label: "Torta evento" },
      { id: "mono-porzioni", label: "Monoporzioni" },
      { id: "frutta", label: "Frutta fresca" },
    ],
  },
  {
    id: "bevande",
    label: "Bevande",
    items: [
      { id: "soft-drink", label: "Soft drink" },
      { id: "vino", label: "Vino e prosecco" },
      { id: "open-bar", label: "Open bar" },
    ],
  },
] as const;

function getMissingServiceSuggestions(event: UserEvent) {
  const bookedCategories = new Set(
    event.services
      .filter((service) => service.status !== "cancelled")
      .map((service) => service.category),
  );

  return EVENT_SERVICE_SUGGESTIONS.filter(
    (suggestion) =>
      !suggestion.categories.some((category) => bookedCategories.has(category)),
  );
}

function getMenuServices(event: UserEvent) {
  return event.services.filter(
    (service) =>
      service.status !== "cancelled" &&
      (service.category === "menu" || service.category === "catering"),
  );
}

function inferMenuAllergens(service: BookedService): string[] {
  if (service.allergens && service.allergens.length > 0) {
    return service.allergens;
  }

  const lowered = `${service.name} ${service.providerName}`.toLowerCase();

  if (lowered.includes("vegetar")) {
    return ["Glutine", "Latte", "Uova", "Frutta a guscio"];
  }
  if (lowered.includes("catering") || lowered.includes("buffet")) {
    return ["Glutine", "Latte", "Uova", "Soia", "Sedano", "Senape"];
  }

  return ["Glutine", "Latte", "Uova", "Frutta a guscio", "Sedano", "Senape"];
}

function buildSuggestionHref(
  event: UserEvent,
  category: (typeof EVENT_SERVICE_SUGGESTIONS)[number]["exploreCategory"],
) {
  const params = new URLSearchParams({
    tab: "explore",
    category,
    eventId: event.id,
    dateFrom: event.date,
    dateTo: event.date,
    eventAddress: `${event.locationName}, ${event.city}`,
    guestCount: String(event.guestCount),
  });

  return `/?${params.toString()}`;
}

function getDepositDeadline(event: UserEvent) {
  const deadline = getEventDateTime(event);
  let businessDaysToSubtract = 2;

  while (businessDaysToSubtract > 0) {
    deadline.setDate(deadline.getDate() - 1);
    const day = deadline.getDay();
    if (day !== 0 && day !== 6) {
      businessDaysToSubtract--;
    }
  }

  return deadline;
}

function formatDepositDeadline(deadline: Date) {
  return depositDeadlineFormatter.format(deadline);
}

export const MyEventsScreen = memo(function MyEventsScreen({
  onCreateEvent,
  isActive = true,
}: MyEventsScreenProps) {
  const {
    events,
    markServicePaid: markServicePaidInState,
    paymentStates,
    prunePastEvents,
    updateEventMenuSelections,
    updateEventTitle,
  } = useAppState();
  const [paymentModal, setPaymentModal] = useState<{
    event: UserEvent;
    service: BookedService;
  } | null>(null);
  const [discountBannerOpen, setDiscountBannerOpen] = useState(false);
  const [inviteContact, setInviteContact] = useState("");
  const [inviteSent, setInviteSent] = useState(false);

  if (!isActive && paymentModal) {
    setPaymentModal(null);
  }

  useEffect(() => {
    prunePastEvents();
  }, [prunePastEvents]);

  const activeEvents = useMemo(
    () => events.filter((event) => !isEventPast(event)),
    [events],
  );

  const markServicePaid = useCallback((
    eventId: string,
    serviceId: string,
    method?: PaymentMethod,
  ) => {
    startTransition(() => {
      markServicePaidInState(eventId, serviceId, method);
      setPaymentModal(null);
    });
  }, [markServicePaidInState]);

  const closePaymentModal = useCallback(() => {
    setPaymentModal(null);
  }, []);

  const toggleDiscountBanner = useCallback(() => {
    setDiscountBannerOpen((current) => {
      if (current) {
        setInviteContact("");
        setInviteSent(false);
      }
      return !current;
    });
  }, []);

  const closeDiscountBanner = useCallback(() => {
    setDiscountBannerOpen(false);
    setInviteContact("");
    setInviteSent(false);
  }, []);

  const handleInviteContactChange = useCallback((value: string) => {
    setInviteContact(value);
    setInviteSent(false);
  }, []);

  const handleInviteSubmit = useCallback(() => {
    if (!inviteContact.trim()) return;
    setInviteSent(true);
  }, [inviteContact]);

  const openDepositPayment = useCallback((selectedEvent: UserEvent) => {
    const locationAmount =
      selectedEvent.services.find((service) => service.category === "location")
        ?.amountPaid ?? 0;

    setPaymentModal({
      event: selectedEvent,
      service: {
        id: `${selectedEvent.id}-deposit`,
        category: "location",
        name: "Caparra location",
        providerName: selectedEvent.locationName,
        status: "pending",
        amountPaid: selectedEvent.depositAmount ?? locationAmount * 0.3,
      },
    });
  }, []);

  return (
    <div className="box-border min-w-0 w-full max-w-full space-y-5 overflow-x-hidden sm:space-y-6">
      <header className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-primary-black">
            I Miei Eventi
          </h1>
          <p className="mt-1 text-sm text-primary-black/60">
            Feste che stai organizzando
          </p>
        </div>
        <div className="relative mt-1 shrink-0">
          {discountBannerOpen && (
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              onClick={closeDiscountBanner}
              aria-label="Chiudi banner sconti"
            />
          )}
          <button
            type="button"
            onClick={toggleDiscountBanner}
            className="relative z-50 max-w-[8.5rem] truncate rounded-full border border-brand-pink bg-brand-pink/12 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-brand-pink transition-colors hover:bg-brand-pink/20 sm:max-w-none sm:px-3 sm:py-2 sm:text-[11px] sm:tracking-[0.12em]"
            aria-expanded={discountBannerOpen}
          >
            Ottieni sconti
          </button>
          {discountBannerOpen && (
            <div className={DISCOUNT_POPOVER_CLASS}>
              <span className="absolute -top-2 right-8 hidden h-4 w-4 rotate-45 border-l-2 border-t-2 border-brand-pink bg-pink-50 sm:block" />
              <DiscountInviteBanner
                contact={inviteContact}
                sent={inviteSent}
                onContactChange={handleInviteContactChange}
                onSubmit={handleInviteSubmit}
                className="bg-gradient-to-br from-pink-50 via-rose-50 to-pink-50 p-4"
              />
            </div>
          )}
        </div>
      </header>

      {activeEvents.length === 0 && (
        <section className="min-w-0 rounded-2xl border border-dashed border-primary-black/15 bg-primary-black/[0.02] px-4 py-8 text-center">
          <p className="text-base font-semibold text-primary-black">
            Nessun evento ancora
          </p>
          <p className="mt-1 text-sm text-primary-black/55">
            Genera un preventivo da una location per salvarlo qui.
          </p>
          {onCreateEvent && (
            <button
              type="button"
              onClick={onCreateEvent}
              className="mt-4 inline-flex rounded-2xl bg-primary-black px-4 py-2.5 text-sm font-semibold text-white"
            >
              Esplora location
            </button>
          )}
        </section>
      )}

      {activeEvents.length > 0 && (
        <section className="min-w-0 space-y-4">
          <h2 className="text-base font-semibold text-primary-black">
            In programma
          </h2>
          <ul className="grid min-w-0 gap-5 sm:gap-6">
            {activeEvents.map((event) => (
              <li key={event.id} className="min-w-0 max-w-full">
                <ExpandedEventCard
                  event={event}
                  isActive={isActive}
                  paymentStates={paymentStates}
                  onOpenPayment={setPaymentModal}
                  onOpenDepositPayment={openDepositPayment}
                  onTitleChange={updateEventTitle}
                  onMenuSelectionsChange={updateEventMenuSelections}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <PaymentChoiceModal
        selection={paymentModal}
        onClose={closePaymentModal}
        onMarkPaid={markServicePaid}
      />
    </div>
  );
});

const ExpandedEventCard = memo(function ExpandedEventCard({
  event,
  isActive,
  paymentStates,
  onOpenPayment,
  onOpenDepositPayment,
  onTitleChange,
  onMenuSelectionsChange,
}: {
  event: UserEvent;
  isActive: boolean;
  paymentStates: Record<string, ServicePaymentState>;
  onOpenPayment: (selection: { event: UserEvent; service: BookedService }) => void;
  onOpenDepositPayment: (event: UserEvent) => void;
  onTitleChange: (eventId: string, title: string) => void;
  onMenuSelectionsChange: (
    eventId: string,
    selections: EventMenuSelection[],
  ) => void;
}) {
  const [titleDraft, setTitleDraft] = useState(event.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const totalCost =
    event.totalCost ??
    event.services.reduce((sum, service) => sum + service.amountPaid, 0);
  const locationCost =
    event.services.find((service) => service.category === "location")
      ?.amountPaid ?? 0;
  const depositAmount = event.depositAmount ?? locationCost * 0.3;
  const depositPayment = paymentStates[`${event.id}:${event.id}-deposit`] ?? {
    paid: false,
  };
  const missingSuggestions = getMissingServiceSuggestions(event);
  const menuServices = getMenuServices(event);
  const payDeposit = useCallback(() => {
    onOpenDepositPayment(event);
  }, [event, onOpenDepositPayment]);
  const commitTitleDraft = useCallback(() => {
    const nextTitle = titleDraft.trim() || "Evento senza titolo";
    if (nextTitle !== event.title) {
      onTitleChange(event.id, nextTitle);
    }
    setTitleDraft(nextTitle);
    setIsEditingTitle(false);
  }, [event.id, event.title, onTitleChange, titleDraft]);

  useEffect(() => {
    queueMicrotask(() => {
      setTitleDraft(event.title);
      setIsEditingTitle(false);
    });
  }, [event.id, event.title]);

  useEffect(() => {
    if (!isEditingTitle) return;
    queueMicrotask(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  }, [isEditingTitle]);

  return (
    <article className="box-border w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-primary-black/10 bg-white shadow-[0_6px_24px_-12px_rgba(15,15,17,0.18)]">
      <div className="min-w-0 border-b border-primary-black/8 px-3 py-4 sm:px-4">
        <div className="min-w-0 overflow-hidden">
          <p className={`text-xs font-medium ${statusColors[event.status]}`}>
            {EVENT_STATUS_LABELS[event.status]}
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(inputEvent) => setTitleDraft(inputEvent.target.value)}
                onBlur={commitTitleDraft}
                onKeyDown={(inputEvent) => {
                  if (inputEvent.key === "Enter") {
                    inputEvent.currentTarget.blur();
                  }
                  if (inputEvent.key === "Escape") {
                    setTitleDraft(event.title);
                    setIsEditingTitle(false);
                  }
                }}
                placeholder="Nome evento"
                className="box-border min-w-0 flex-1 bg-transparent text-lg font-semibold leading-snug text-primary-black outline-none placeholder:text-primary-black/35 sm:text-xl"
                aria-label="Titolo evento"
              />
            ) : (
              <h3 className="min-w-0 flex-1 truncate text-lg font-semibold leading-snug text-primary-black sm:text-xl">
                {event.title}
              </h3>
            )}
            <button
              type="button"
              onClick={() => {
                if (isEditingTitle) {
                  commitTitleDraft();
                  return;
                }
                setTitleDraft(event.title);
                setIsEditingTitle(true);
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-black/[0.04] text-primary-black/55 transition-colors hover:bg-primary-black/[0.08] hover:text-primary-black"
              aria-label={
                isEditingTitle ? "Salva nome evento" : "Modifica nome evento"
              }
            >
              {isEditingTitle ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          </div>
          {event.description && (
            <p className="mt-1 line-clamp-2 break-words text-sm text-primary-black/55">
              {event.description}
            </p>
          )}
        </div>

        <div className="mt-4 min-w-0 space-y-1.5 text-sm text-primary-black/65">
          <p className="flex min-w-0 items-center gap-1.5">
            <Calendar className="h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
            <span className="min-w-0 truncate">
              {formatDate(event.date)} · {event.time}
            </span>
          </p>
          <p className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0 text-brand-pink" aria-hidden />
            <span className="min-w-0 truncate">
              {event.locationName}, {event.city}
            </span>
          </p>
          <p className="flex min-w-0 items-center gap-1.5">
            <Users className="h-4 w-4 shrink-0 text-[#4A8FE7]" aria-hidden />
            <span className="min-w-0">{event.guestCount} ospiti</span>
          </p>
        </div>
      </div>

      <DepositDeadlineTimer
        event={event}
        isActive={isActive}
        depositAmount={depositAmount}
        payment={depositPayment}
        onPayDeposit={payDeposit}
      />

      <div className="min-w-0 overflow-hidden px-3 py-4 sm:px-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-primary-black">Servizi</h3>
          <p className="shrink-0 text-sm text-primary-black/50">
            {event.services.length}{" "}
            {event.services.length === 1 ? "voce" : "voci"}
          </p>
        </div>

        <ul className="mt-3 min-w-0 divide-y divide-primary-black/8">
          {event.services.map((service) => {
            const payment =
              paymentStates[`${event.id}:${service.id}`] ?? { paid: false };
            const requiresDepositFirst =
              service.category === "location" &&
              !depositPayment.paid &&
              !payment.paid;
            const canPay = !payment.paid && !requiresDepositFirst;
            const payableAmount =
              service.category === "location" && depositPayment.paid
                ? Math.max(0, service.amountPaid - depositAmount)
                : service.amountPaid;
            const displayAmount = payment.paid
              ? service.amountPaid
              : payableAmount;

            return (
              <li
                key={service.id}
                className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-primary-black">
                    {service.name}
                  </p>
                  <p className="truncate text-xs text-primary-black/50">
                    {service.providerName}
                  </p>
                  {requiresDepositFirst && (
                    <p className="mt-1 text-[11px] leading-snug text-primary-black/40">
                      Prima paga la caparra, poi la location
                    </p>
                  )}
                  {service.category === "location" &&
                    depositPayment.paid &&
                    !payment.paid &&
                    depositAmount > 0 && (
                      <p className="mt-1 text-[11px] leading-snug text-primary-black/40">
                        Saldo dopo caparra
                      </p>
                    )}
                </div>
                <div className="flex w-[6.75rem] shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      payment.paid
                        ? "text-emerald-600"
                        : requiresDepositFirst
                          ? "text-red-300"
                          : "text-red-500"
                    }`}
                  >
                    {formatCurrency(displayAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      canPay
                        ? onOpenPayment({
                            event,
                            service:
                              service.category === "location" &&
                              depositPayment.paid
                                ? {
                                    ...service,
                                    amountPaid: payableAmount,
                                    name:
                                      payableAmount < service.amountPaid
                                        ? "Saldo location"
                                        : service.name,
                                  }
                                : service,
                          })
                        : undefined
                    }
                    disabled={!canPay}
                    title={
                      requiresDepositFirst
                        ? "Paga prima la caparra per sbloccare il pagamento della location"
                        : undefined
                    }
                    className={`w-full rounded-lg px-2 py-1.5 text-center text-[11px] font-medium leading-tight transition-colors ${
                      payment.paid
                        ? "bg-primary-black text-white"
                        : requiresDepositFirst
                          ? "cursor-not-allowed border border-primary-black/10 bg-primary-black/[0.03] text-primary-black/35"
                          : "border border-primary-black/15 text-primary-black hover:border-primary-black/30"
                    }`}
                  >
                    {payment.paid ? "Pagato" : "Da pagare"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <dl className="mt-4 min-w-0 space-y-2 border-t border-primary-black/8 pt-4 text-sm">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <dt className="min-w-0 text-primary-black/55">Caparra location</dt>
            <dd className="shrink-0 font-medium tabular-nums text-primary-black">
              {formatCurrency(depositAmount)}
            </dd>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3">
            <dt className="font-semibold text-primary-black">Totale</dt>
            <dd className="shrink-0 text-base font-semibold tabular-nums text-primary-black">
              {formatCurrency(totalCost)}
            </dd>
          </div>
        </dl>
      </div>

      {menuServices.length > 0 && (
        <section className="min-w-0 border-t border-primary-black/8 px-3 py-4 sm:px-4">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-primary-black/45" aria-hidden />
            <h3 className="text-sm font-semibold text-primary-black">Menu</h3>
          </div>

          <div className="mt-3 space-y-3">
            {menuServices.map((service) => {
              const allergens = inferMenuAllergens(service);

              return (
                <div
                  key={service.id}
                  className="min-w-0 rounded-xl bg-primary-black/[0.03] p-3"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary-black">
                        {service.name}
                      </p>
                      <p className="truncate text-xs text-primary-black/50">
                        {service.providerName}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums text-primary-black">
                      {formatCurrency(service.amountPaid)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {allergens.map((allergen) => (
                      <span
                        key={allergen}
                        className="rounded-full bg-white px-2.5 py-0.5 text-[11px] text-primary-black/65 ring-1 ring-primary-black/10"
                      >
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <MenuCoursePicker
            selections={event.menuSelections ?? []}
            onChange={(selections) =>
              onMenuSelectionsChange(event.id, selections)
            }
          />
        </section>
      )}

      {missingSuggestions.length > 0 && (
        <section className="min-w-0 overflow-hidden border-t border-brand-pink/35 bg-brand-pink/25 px-3 py-4 sm:px-4">
          <p className="text-sm font-medium text-primary-black">
            Potrebbe mancare
          </p>
          <p className="mt-0.5 text-xs text-primary-black/55">
            Aggiungi altri servizi alla festa
          </p>
          <div className="scrollbar-hidden mt-3 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1">
            {missingSuggestions.map((suggestion) => {
              const Icon = suggestion.icon;

              return (
                <Link
                  key={suggestion.id}
                  href={buildSuggestionHref(event, suggestion.exploreCategory)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary-black/10 bg-white px-3.5 py-2 text-sm font-medium text-primary-black transition-colors hover:border-primary-black/25"
                >
                  <Icon
                    className={`h-4 w-4 ${suggestion.iconClass}`}
                    aria-hidden
                  />
                  {suggestion.label}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <EventCountdown event={event} embedded active={isActive} />
    </article>
  );
});

const DepositDeadlineTimer = memo(function DepositDeadlineTimer({
  event,
  isActive,
  depositAmount,
  payment,
  onPayDeposit,
}: {
  event: UserEvent;
  isActive: boolean;
  depositAmount: number;
  payment: ServicePaymentState;
  onPayDeposit: () => void;
}) {
  const deadline = useMemo(() => getDepositDeadline(event), [event]);
  const [countdown, setCountdown] = useState(() => getCountdown(deadline));

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = () => setCountdown(getCountdown(deadline));
    const start = () => {
      tick();
      interval = setInterval(tick, 10_000);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const canRun =
      isActive &&
      typeof document !== "undefined" &&
      document.visibilityState === "visible";

    if (canRun) start();

    const onVisibility = () => {
      if (isActive && document.visibilityState === "visible") {
        if (!interval) start();
      } else {
        stop();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [deadline, isActive]);

  return (
    <section className="min-w-0 overflow-hidden border-b border-primary-black/8 bg-primary-black/[0.02] px-3 py-3 sm:px-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary-black">
            Caparra {formatCurrency(depositAmount)}
          </p>
          <p className="mt-0.5 break-words text-xs text-primary-black/50">
            Entro {formatDepositDeadline(deadline)}
            {!countdown.isPast && (
              <>
                {" "}
                · {String(countdown.days).padStart(2, "0")}g{" "}
                {String(countdown.hours).padStart(2, "0")}h{" "}
                {String(countdown.minutes).padStart(2, "0")}m
              </>
            )}
          </p>
        </div>

        {payment.paid ? (
          <span className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-primary-black px-4 py-2.5 text-xs font-medium text-white sm:w-fit">
            Caparra pagata
          </span>
        ) : (
          <button
            type="button"
            onClick={onPayDeposit}
            className={`inline-flex w-full shrink-0 items-center justify-center rounded-lg px-4 py-2.5 text-xs font-medium transition-colors sm:w-fit ${
              countdown.isPast
                ? "border border-brand-pink/40 bg-brand-pink/15 text-primary-black hover:bg-brand-pink/25"
                : "bg-primary-black text-white hover:bg-primary-black/85"
            }`}
          >
            {countdown.isPast ? "Paga caparra in ritardo" : "Paga caparra"}
          </button>
        )}
      </div>
    </section>
  );
});

const MenuCoursePicker = memo(function MenuCoursePicker({
  selections,
  onChange,
}: {
  selections: EventMenuSelection[];
  onChange: (selections: EventMenuSelection[]) => void;
}) {
  function isSelected(courseId: string, itemId: string) {
    return selections.some(
      (selection) =>
        selection.courseId === courseId && selection.itemId === itemId,
    );
  }

  function toggleSelection(
    course: (typeof MENU_COURSES)[number],
    item: (typeof MENU_COURSES)[number]["items"][number],
  ) {
    if (isSelected(course.id, item.id)) {
      onChange(
        selections.filter(
          (selection) =>
            selection.courseId !== course.id || selection.itemId !== item.id,
        ),
      );
      return;
    }

    onChange([
      ...selections,
      {
        courseId: course.id,
        courseLabel: course.label,
        itemId: item.id,
        itemLabel: item.label,
      },
    ]);
  }

  return (
    <div className="mt-4 border-t border-primary-black/8 pt-4">
      <p className="text-sm font-medium text-primary-black">Portate</p>
      <p className="mt-0.5 text-xs text-primary-black/50">
        Seleziona cosa includere nel menu
      </p>

      <div className="mt-3 space-y-3">
        {MENU_COURSES.map((course) => (
          <div key={course.id}>
            <p className="text-xs font-medium text-primary-black/70">
              {course.label}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {course.items.map((item) => {
                const selected = isSelected(course.id, item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSelection(course, item)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? "bg-primary-black text-white"
                        : "bg-white text-primary-black ring-1 ring-primary-black/12 hover:ring-primary-black/25"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selections.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selections.map((selection) => (
            <span
              key={`${selection.courseId}-${selection.itemId}`}
              className="rounded-full bg-white px-3 py-1 text-xs text-primary-black ring-1 ring-primary-black/10"
            >
              {selection.courseLabel}: {selection.itemLabel}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

const PaymentChoiceModal = memo(function PaymentChoiceModal({
  selection,
  onClose,
  onMarkPaid,
}: {
  selection: { event: UserEvent; service: BookedService } | null;
  onClose: () => void;
  onMarkPaid: (
    eventId: string,
    serviceId: string,
    method?: PaymentMethod,
  ) => void;
}) {
  const { currentUser, isGuest } = useAppState();
  const savedCard = currentUser.paymentCard;
  const [showMethods, setShowMethods] = useState(false);
  const selectionKey = selection
    ? `${selection.event.id}:${selection.service.id}`
    : null;

  useEffect(() => {
    setShowMethods(false);
  }, [selectionKey]);

  useBodyScrollLock(Boolean(selection));

  if (!selection) return null;

  const { event, service } = selection;
  const isDepositPayment = service.id === `${event.id}-deposit`;

  return (
    <div
      className="vibe-overlay-enter fixed inset-0 z-[70] flex items-end justify-center lg:items-center"
      data-overlay-open="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-primary-black/35"
        onClick={onClose}
        aria-label="Chiudi scelta pagamento"
      />
      <div
        className="vibe-sheet-enter smooth-scroll relative max-h-[min(90dvh,calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px)))] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-background p-5 shadow-xl lg:rounded-[2rem]"
        style={MODAL_SAFE_BOTTOM_STYLE}
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-teal">
              Pagamento servizio
            </p>
            <h2 className="mt-1 truncate text-xl font-black text-primary-black">
              {service.name}
            </h2>
            <p className="mt-1 truncate text-sm text-primary-black/60">
              {event.title} · {formatCurrency(service.amountPaid)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-primary-black/5 p-2 text-primary-black/60 transition-colors hover:bg-primary-black/10"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {!isGuest && savedCard && (
            <button
              type="button"
              onClick={() => onMarkPaid(event.id, service.id, "card")}
              className="flex w-full items-center justify-between rounded-2xl border border-brand-teal/25 bg-brand-teal/10 px-4 py-3 text-left transition-colors hover:bg-brand-teal/16"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-black text-primary-black">
                  <CreditCard className="h-4 w-4 text-brand-teal" aria-hidden />
                  Paga con carta salvata
                </span>
                <span className="mt-1 block truncate text-xs text-primary-black/55">
                  {savedCard.brand} •••• {savedCard.last4} · scade{" "}
                  {savedCard.expiry}
                </span>
              </span>
            </button>
          )}

          {!isDepositPayment && (
            <button
              type="button"
              onClick={() => onMarkPaid(event.id, service.id)}
              className="flex w-full items-center justify-between rounded-2xl bg-emerald-500 px-4 py-3 text-left font-black text-white transition-colors hover:bg-emerald-600"
            >
              <span className="flex items-center gap-2">
                <Check className="h-5 w-5" aria-hidden />
                Segna come pagato
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowMethods((current) => !current)}
            className="flex w-full items-center justify-between rounded-2xl bg-brand-teal/12 px-4 py-3 text-left font-black text-brand-teal transition-colors hover:bg-brand-teal/20"
          >
            <span className="flex items-center gap-2">
              <WalletCards className="h-5 w-5" aria-hidden />
              Altri metodi
            </span>
            <ChevronDown
              className={`h-5 w-5 transition-transform ${showMethods ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>

          {showMethods && (
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map(
                (method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => onMarkPaid(event.id, service.id, method)}
                    className="flex items-center gap-2 rounded-2xl border border-primary-black/10 bg-white px-4 py-3 text-sm font-bold text-primary-black transition-colors hover:border-primary-black"
                  >
                    <CreditCard className="h-4 w-4 text-brand-teal" aria-hidden />
                    {paymentMethodLabels[method]}
                  </button>
                ),
              )}
            </div>
          )}

          {!savedCard && !isGuest && (
            <p className="text-center text-[11px] leading-relaxed text-primary-black/45">
              Puoi salvare una carta in Profilo → Pagamenti per pagare più
              velocemente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

