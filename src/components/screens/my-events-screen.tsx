"use client";

import { DiscountInviteBanner } from "@/components/discount-invite-banner";
import { useAppState } from "@/context/app-state-context";
import {
  Calendar,
  Cake,
  Camera,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Gift,
  MapPin,
  Music,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { getCountdown, getEventDateTime } from "@/lib/event";
import {
  EVENT_STATUS_LABELS,
  type BookedService,
  type EventMenuSelection,
  type UserEvent,
} from "@/types/event";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

interface MyEventsScreenProps {
  onCreateEvent?: () => void;
}

type PaymentMethod = "card" | "apple_pay" | "paypal" | "bank_transfer" | "cash";

interface ServicePaymentState {
  paid: boolean;
  method?: string;
}

const statusColors: Record<UserEvent["status"], string> = {
  draft: "bg-primary-black/10 text-primary-black/60",
  organizing: "bg-brand-teal/15 text-brand-teal",
  confirmed: "bg-brand-pink/15 text-primary-black",
  completed: "bg-primary-black/10 text-primary-black/60",
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
  },
  {
    id: "dj",
    label: "DJ",
    description: "Musica e intrattenimento per la serata.",
    categories: ["dj"],
    exploreCategory: "dj",
    icon: Music,
  },
  {
    id: "bakery",
    label: "Torta",
    description: "Torta personalizzata o sweet table.",
    categories: ["bakery"],
    exploreCategory: "altri",
    icon: Cake,
  },
  {
    id: "photographer",
    label: "Fotografo",
    description: "Foto e ricordi dell'evento.",
    categories: ["photographer"],
    exploreCategory: "fotografo",
    icon: Camera,
  },
  {
    id: "decorations",
    label: "Decorazioni",
    description: "Allestimento, palloncini e dettagli tema.",
    categories: ["decorations"],
    exploreCategory: "decorazioni",
    icon: Gift,
  },
  {
    id: "security",
    label: "Buttafuori",
    description: "Controllo ingressi e sicurezza durante la festa.",
    categories: ["security"],
    exploreCategory: "altri",
    icon: ShieldCheck,
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

export const MyEventsScreen = memo(function MyEventsScreen({}: MyEventsScreenProps) {
  const {
    events,
    markServicePaid: markServicePaidInState,
    paymentStates,
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
  const upcomingEvents = useMemo(
    () => events.filter((e) => e.status !== "completed"),
    [events],
  );
  const pastEvents = useMemo(
    () => events.filter((e) => e.status === "completed"),
    [events],
  );

  const markServicePaid = useCallback((
    eventId: string,
    serviceId: string,
    method?: PaymentMethod,
  ) => {
    markServicePaidInState(eventId, serviceId, method);
    setPaymentModal(null);
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
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-black">
            I Miei Eventi
          </h1>
          <p className="mt-1 text-sm text-primary-black/60">
            Feste che stai organizzando
          </p>
        </div>
        <div className="relative mt-4 shrink-0">
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
            className="relative z-50 rounded-full border border-brand-pink bg-brand-pink/12 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-brand-pink transition-colors hover:bg-brand-pink/20"
            aria-expanded={discountBannerOpen}
          >
            Ottieni sconti
          </button>
          {discountBannerOpen && (
            <div className="absolute right-0 top-full z-50 mt-3 w-[min(calc(100vw-2rem),42rem)]">
              <span className="absolute -top-2 right-8 h-4 w-4 rotate-45 border-l-2 border-t-2 border-brand-pink bg-pink-50" />
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

      {upcomingEvents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-black/50">
            In programma
          </h2>
          <ul className="grid gap-5">
            {upcomingEvents.map((event) => (
              <li key={event.id}>
                <ExpandedEventCard
                  event={event}
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

      {pastEvents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-black/50">
            Passati
          </h2>
          <ul className="grid gap-5">
            {pastEvents.map((event) => (
              <li key={event.id}>
                <ExpandedEventCard
                  event={event}
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
  paymentStates,
  onOpenPayment,
  onOpenDepositPayment,
  onTitleChange,
  onMenuSelectionsChange,
}: {
  event: UserEvent;
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
  }, [event.id, event.title, onTitleChange, titleDraft]);

  useEffect(() => {
    queueMicrotask(() => {
      setTitleDraft(event.title);
    });
  }, [event.id, event.title]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusColors[event.status]}`}
          >
            {EVENT_STATUS_LABELS[event.status]}
          </span>
          <label className="mt-1.5 block">
            <span className="sr-only">Titolo evento</span>
            <input
              value={titleDraft}
              onChange={(inputEvent) => setTitleDraft(inputEvent.target.value)}
              onBlur={commitTitleDraft}
              onKeyDown={(inputEvent) => {
                if (inputEvent.key === "Enter") {
                  inputEvent.currentTarget.blur();
                }
              }}
              placeholder="Nome evento"
              className="w-full bg-transparent text-2xl font-black leading-tight text-primary-black outline-none placeholder:text-primary-black/35"
              aria-label="Titolo evento"
            />
          </label>
          {event.description && (
            <p className="mt-0.5 line-clamp-1 text-sm font-medium leading-snug text-primary-black/62">
              {event.description}
            </p>
          )}
        </div>
      </div>

      <article className="overflow-hidden rounded-[2rem] border-2 border-primary-black bg-white shadow-sm">
      <div className="border-b-2 border-primary-black bg-white p-3">
        <div className="flex items-start justify-between gap-3">
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <EventInfoItem
            icon={Calendar}
            label="Data"
            value={`${formatDate(event.date)} · ${event.time}`}
          />
          <EventInfoItem
            icon={MapPin}
            label="Location"
            value={`${event.locationName}, ${event.city}`}
          />
          <EventInfoItem
            icon={Users}
            label="Ospiti"
            value={`${event.guestCount} persone`}
          />
        </div>

        <DepositDeadlineTimer
          event={event}
          depositAmount={depositAmount}
          payment={depositPayment}
          onPayDeposit={payDeposit}
        />
      </div>

      <div className="space-y-4 p-5">
        <section className="rounded-2xl border border-primary-black bg-white p-4">
          <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-brand-teal">
            <Sparkles className="h-4 w-4" aria-hidden />
            Servizi inclusi
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {event.services.map((service) => (
              <div
                key={service.id}
                className="min-w-0 rounded-xl border border-primary-black/20 bg-white px-3 py-2"
              >
                <p className="truncate text-xs font-black text-primary-black">
                  {service.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-primary-black/55">
                  {service.providerName}
                </p>
              </div>
            ))}
          </div>
        </section>

        {menuServices.length > 0 && (
          <section className="rounded-2xl border border-primary-black bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-black/25 bg-white text-primary-black">
                <UtensilsCrossed className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-teal">
                  Menu scelto
                </h3>
                <p className="mt-1 text-sm text-primary-black/60">
                  Menu selezionato per questo evento e allergeni da comunicare agli invitati.
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {menuServices.map((service) => {
                const allergens = inferMenuAllergens(service);

                return (
                  <div
                    key={service.id}
                    className="rounded-2xl border border-primary-black/25 bg-white p-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-primary-black">
                          {service.name}
                        </p>
                        <p className="text-xs font-medium text-primary-black/55">
                          {service.providerName}
                        </p>
                      </div>
                      <span className="text-sm font-black text-primary-black">
                        {formatCurrency(service.amountPaid)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-primary-black/45">
                        Allergeni
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {allergens.map((allergen) => (
                          <span
                            key={allergen}
                            className="rounded-full border border-primary-black/25 px-3 py-1 text-xs font-bold text-primary-black"
                          >
                            {allergen}
                          </span>
                        ))}
                      </div>
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
          <section className="rounded-2xl border border-pink-300 bg-gradient-to-br from-pink-50 via-rose-100 to-fuchsia-100 p-3">
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-pink-700">
                Potrebbe mancare
              </h3>
              <p className="mt-0.5 text-xs text-primary-black/60">
                Suggerimenti automatici in base ai servizi già aggiunti
                all&apos;evento.
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {missingSuggestions.map((suggestion) => {
                const Icon = suggestion.icon;

                return (
                  <Link
                    key={suggestion.id}
                    href={buildSuggestionHref(event, suggestion.exploreCategory)}
                    className="flex min-w-0 items-start gap-2.5 rounded-2xl border border-pink-200 bg-white/80 px-3 py-2.5 transition-colors hover:bg-white"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-pink-200 bg-white text-pink-700">
                      <Icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-primary-black">
                        {suggestion.label}
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-xs leading-tight text-primary-black/58">
                        {suggestion.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-primary-black bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-brand-teal" aria-hidden />
            <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-teal">
              Tabella costi
            </h3>
          </div>

          <div className="space-y-2">
            {event.services.map((service) => {
              const payment =
                paymentStates[`${event.id}:${service.id}`] ?? { paid: false };

              return (
                <div
                  key={service.id}
                  className="grid gap-2 rounded-2xl border border-primary-black/25 bg-white p-3 xl:grid-cols-[1fr_auto_auto] xl:items-center"
                >
                  <div>
                    <p className="text-sm font-bold text-primary-black">
                      {service.name}
                    </p>
                    <p className="text-xs text-primary-black/55">
                      {service.providerName}
                    </p>
                  </div>
                  <p className="text-base font-black text-primary-black xl:text-right">
                    {formatCurrency(service.amountPaid)}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      payment.paid
                        ? undefined
                        : onOpenPayment({ event, service })
                    }
                    className={`rounded-full px-3 py-2 text-xs font-black transition-colors duration-150 ${
                      payment.paid
                        ? "bg-primary-black text-white"
                        : "border border-brand-teal bg-brand-teal text-white hover:bg-brand-teal/90"
                    }`}
                  >
                    {payment.paid ? "Pagato" : "Da pagare"}
                  </button>
                  {payment.method && (
                    <p className="text-xs font-semibold text-emerald-700 xl:col-start-3 xl:text-center">
                      con{" "}
                      {paymentMethodLabels[payment.method as PaymentMethod] ??
                        payment.method}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <dl className="mt-4 space-y-2 border-t border-primary-black/10 pt-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-primary-black/60">
                Caparra location stimata
              </dt>
              <dd className="font-bold text-primary-black">
                {formatCurrency(depositAmount)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-base font-black text-primary-black">
                Costo totale
              </dt>
              <dd className="text-xl font-black text-primary-black">
                {formatCurrency(totalCost)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </article>
    </div>
  );
});

const DepositDeadlineTimer = memo(function DepositDeadlineTimer({
  event,
  depositAmount,
  payment,
  onPayDeposit,
}: {
  event: UserEvent;
  depositAmount: number;
  payment: ServicePaymentState;
  onPayDeposit: () => void;
}) {
  const deadline = useMemo(() => getDepositDeadline(event), [event]);
  const [countdown, setCountdown] = useState(() => getCountdown(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdown(deadline));
    }, 60_000);

    return () => clearInterval(interval);
  }, [deadline]);

  const units = [
    { value: countdown.days, label: "gg" },
    { value: countdown.hours, label: "ore" },
    { value: countdown.minutes, label: "min" },
  ];

  return (
    <section className="mt-4 rounded-2xl border border-primary-black bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-primary-black">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Scadenza caparra
          </p>
          <p className="mt-2 text-sm font-bold text-primary-black">
            Entro {formatDepositDeadline(deadline)} ·{" "}
            {formatCurrency(depositAmount)}
          </p>
          <p className="mt-0.5 text-[11px] text-primary-black/55">
            La caparra va pagata entro 2 giorni lavorativi prima dell&apos;evento.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {countdown.isPast ? (
            <span className="rounded-full border border-primary-black/30 bg-white px-3 py-2 text-xs font-black text-primary-black">
              Scadenza superata
            </span>
          ) : (
            <div className="grid grid-cols-3 gap-1 sm:min-w-[9rem]">
              {units.map((unit) => (
                <div
                  key={unit.label}
                  className="rounded-xl border border-primary-black/25 bg-white px-2 py-1.5 text-center"
                >
                  <span className="block text-sm font-black tabular-nums text-primary-black">
                    {String(unit.value).padStart(2, "0")}
                  </span>
                  <span className="text-[9px] font-bold uppercase text-primary-black/45">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>
          )}
          {payment.paid ? (
            <span className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white">
              Caparra pagata
              {payment.method
                ? ` con ${
                    paymentMethodLabels[payment.method as PaymentMethod] ??
                    payment.method
                  }`
                : ""}
            </span>
          ) : (
            <button
              type="button"
              onClick={onPayDeposit}
              className="rounded-xl bg-primary-black px-4 py-2 text-xs font-black text-white transition-colors hover:bg-primary-black/85"
            >
              Paga caparra
            </button>
          )}
        </div>
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
    <div className="mt-4 border-t border-primary-black/10 pt-4">
      <div>
        <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-teal">
          Scegli portate e cibi
        </h4>
        <p className="mt-1 text-xs text-primary-black/55">
          Seleziona cosa includere nel menu da condividere con il fornitore.
        </p>
      </div>

      <div className="mt-3 space-y-3">
        {MENU_COURSES.map((course) => (
          <div key={course.id}>
            <p className="text-xs font-black text-primary-black">
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
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                      selected
                        ? "border-brand-teal bg-brand-teal text-white"
                        : "border-primary-black/25 bg-white text-primary-black hover:border-primary-black"
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
        <div className="mt-4 rounded-2xl border border-primary-black/25 bg-primary-black/[0.02] p-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary-black/45">
            Menu selezionato
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selections.map((selection) => (
              <span
                key={`${selection.courseId}-${selection.itemId}`}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-primary-black ring-1 ring-primary-black/20"
              >
                {selection.courseLabel}: {selection.itemLabel}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

const EventInfoItem = memo(function EventInfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 text-center">
      <p className="flex items-center justify-center gap-1 text-[11px] font-black text-brand-teal">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </p>
      <p className="mt-1 text-sm font-black leading-tight text-primary-black">
        {value}
      </p>
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
  const [showMethods, setShowMethods] = useState(false);
  const selectionKey = selection
    ? `${selection.event.id}:${selection.service.id}`
    : null;

  useEffect(() => {
    setShowMethods(false);
  }, [selectionKey]);

  if (!selection) return null;

  const { event, service } = selection;
  const isDepositPayment = service.id === `${event.id}-deposit`;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center lg:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-primary-black/35"
        onClick={onClose}
        aria-label="Chiudi scelta pagamento"
      />
      <div className="relative w-full max-w-lg rounded-t-[2rem] bg-background p-5 shadow-xl lg:rounded-[2rem]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-teal">
              Pagamento servizio
            </p>
            <h2 className="mt-1 text-xl font-black text-primary-black">
              {service.name}
            </h2>
            <p className="mt-1 text-sm text-primary-black/60">
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
              Paga con
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
        </div>
      </div>
    </div>
  );
});

