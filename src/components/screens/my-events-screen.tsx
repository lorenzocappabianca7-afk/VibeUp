"use client";

import { DiscountInviteBanner } from "@/components/discount-invite-banner";
import { EventCountdown } from "@/components/events/event-countdown";
import { HardNavLink } from "@/components/navigation/hard-nav-link";
import { useAppState } from "@/context/app-state-context";
import { getCountdown, isEventPast } from "@/lib/event";
import {
  EVENT_STATUS_LABELS,
  type BookedService,
  type UserEvent,
} from "@/types/event";
import {
  DISCOUNT_POPOVER_CLASS,
  formatCurrency,
  formatDate,
  MODAL_SAFE_BOTTOM_STYLE,
} from "@/lib/utils";
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
  draft: "text-[color:var(--postit-ink-muted)]",
  organizing: "text-[color:var(--postit-ink-muted)]",
  confirmed: "text-[color:var(--postit-ink-muted)]",
  completed: "text-[color:var(--postit-ink-muted)]",
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
    label: "Security",
    description: "Controllo ingressi e sicurezza durante la festa.",
    categories: ["security"],
    exploreCategory: "altri",
    icon: ShieldCheck,
    iconClass: "text-brand-teal",
  },
] as const;

function getMissingServiceSuggestions(event: UserEvent) {
  const bookedCategories = new Set(
    event.services
      .filter((service) => service.status !== "cancelled")
      .map((service) => service.category),
  );
  const hasVenueMenu = locationIncludesVenueMenu(event);

  return EVENT_SERVICE_SUGGESTIONS.filter((suggestion) => {
    if (
      suggestion.id === "menu" &&
      (hasVenueMenu ||
        suggestion.categories.some((category) => bookedCategories.has(category)))
    ) {
      return false;
    }
    return !suggestion.categories.some((category) =>
      bookedCategories.has(category),
    );
  });
}

function getLocationService(event: UserEvent) {
  return (
    event.services.find(
      (service) =>
        service.status !== "cancelled" && service.category === "location",
    ) ?? null
  );
}

function locationIncludesVenueMenu(event: UserEvent) {
  const locationService = getLocationService(event);
  if (!locationService) return false;
  if (locationService.allergens !== undefined) return true;
  return /menu|catering|buffet|food/i.test(locationService.name);
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
  const THIRTY_SIX_HOURS_MS = 36 * 60 * 60 * 1000;
  if (event.createdAt) {
    const created = Date.parse(event.createdAt);
    if (!Number.isNaN(created)) {
      return new Date(created + THIRTY_SIX_HOURS_MS);
    }
  }
  const idStamp = /^evt-(\d+)/.exec(event.id);
  if (idStamp) {
    return new Date(Number(idStamp[1]) + THIRTY_SIX_HOURS_MS);
  }
  return new Date(Date.now() + THIRTY_SIX_HOURS_MS);
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
    deleteEvent,
    markServicePaid: markServicePaidInState,
    paymentStates,
    prunePastEvents,
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
          <h1 className="text-[1.75rem] font-extrabold tracking-tight text-primary-black">
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
              className="fixed inset-0 z-40 cursor-default bg-black"
              onClick={closeDiscountBanner}
              aria-label="Chiudi banner sconti"
            />
          )}
          <button
            type="button"
            onClick={toggleDiscountBanner}
            className="relative z-50 max-w-[8.5rem] truncate rounded-full bg-brand-pink px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-brand-pink/90 sm:max-w-none sm:px-3 sm:py-2 sm:text-[11px] sm:tracking-[0.12em]"
            aria-expanded={discountBannerOpen}
          >
            Ottieni sconti
          </button>
          {discountBannerOpen && (
            <div className={DISCOUNT_POPOVER_CLASS}>
              <span className="absolute -top-2 right-8 hidden h-4 w-4 rotate-45 border-l-2 border-t-2 border-brand-pink bg-black sm:block" />
              <DiscountInviteBanner
                contact={inviteContact}
                sent={inviteSent}
                onContactChange={handleInviteContactChange}
                onSubmit={handleInviteSubmit}
                variant="solid"
                className="p-4"
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
              className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-ink-inverse"
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
          <ul className="mx-auto grid min-w-0 max-w-[24rem] gap-5 px-1 sm:max-w-[26.5rem] sm:gap-6">
            {activeEvents.map((event) => (
              <li key={event.id} className="min-w-0 max-w-full">
                <ExpandedEventCard
                  event={event}
                  isActive={isActive}
                  paymentStates={paymentStates}
                  onOpenDepositPayment={openDepositPayment}
                  onTitleChange={updateEventTitle}
                  onDeleteEvent={deleteEvent}
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
  onOpenDepositPayment,
  onTitleChange,
  onDeleteEvent,
}: {
  event: UserEvent;
  isActive: boolean;
  paymentStates: Record<string, ServicePaymentState>;
  onOpenDepositPayment: (event: UserEvent) => void;
  onTitleChange: (eventId: string, title: string) => void;
  onDeleteEvent: (eventId: string) => void;
}) {
  const [titleDraft, setTitleDraft] = useState(event.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    <>
      <article className="event-postit box-border mx-auto w-full min-w-0 max-w-full">
        <div className="event-postit-section min-w-0 border-b px-3 sm:px-4">
          <div className="min-w-0 overflow-hidden">
            <p
              className={`text-[11px] font-bold uppercase tracking-[0.14em] ${statusColors[event.status]}`}
            >
              {EVENT_STATUS_LABELS[event.status]}
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-2 leading-none">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={(inputEvent) =>
                    setTitleDraft(inputEvent.target.value)
                  }
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
                  className="box-border min-w-0 flex-1 bg-transparent text-lg font-bold leading-snug text-[color:var(--postit-ink)] outline-none placeholder:text-[color:var(--postit-ink-muted)] sm:text-xl"
                  aria-label="Titolo evento"
                />
              ) : (
                <h3 className="min-w-0 flex-1 truncate text-lg font-bold leading-snug text-[color:var(--postit-ink)] sm:text-xl">
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
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 text-[color:var(--postit-ink)] transition-colors hover:bg-black/10"
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
              <p className="mt-1 line-clamp-2 break-words text-sm font-semibold text-[color:var(--postit-ink-muted)]">
                {event.description}
              </p>
            )}
          </div>

          <div className="mt-4 min-w-0 space-y-1.5 text-sm font-semibold text-[color:var(--postit-ink)]">
            <p className="flex min-w-0 items-center gap-1.5">
              <Calendar
                className="h-4 w-4 shrink-0 text-brand-teal-strong"
                aria-hidden
              />
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
              <Users className="h-4 w-4 shrink-0 text-[#3B6FB6]" aria-hidden />
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

        <div className="event-postit-section min-w-0 overflow-hidden border-t px-3 sm:px-4">
          <h3 className="text-sm font-bold text-[color:var(--postit-ink)]">
            Da pagare
          </h3>

          <ul className="mt-3 min-w-0 space-y-2">
            {event.services.map((service) => (
              <li
                key={service.id}
                className="flex min-w-0 items-baseline justify-between gap-3 text-sm font-semibold text-[color:var(--postit-ink)]"
              >
                <span className="min-w-0 truncate font-bold">
                  {service.name}
                </span>
                <span className="shrink-0 font-bold tabular-nums">
                  {formatCurrency(service.amountPaid)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 min-w-0 space-y-2 border-t border-black/10 pt-4 text-sm">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <dt className="min-w-0 font-semibold text-[color:var(--postit-ink-muted)]">
                Caparra location
              </dt>
              <dd className="shrink-0 font-bold tabular-nums text-[color:var(--postit-ink)]">
                {formatCurrency(depositAmount)}
              </dd>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3">
              <dt className="font-bold text-[color:var(--postit-ink)]">
                Totale
              </dt>
              <dd className="shrink-0 text-base font-extrabold tabular-nums text-[color:var(--postit-ink)]">
                {formatCurrency(totalCost)}
              </dd>
            </div>
          </dl>
        </div>

        {missingSuggestions.length > 0 && (
          <section className="event-postit-section min-w-0 overflow-hidden border-t px-3 sm:px-4">
            <div className="event-postit-dark p-3.5">
              <p className="text-sm font-bold text-white">
                Potrebbe mancare
              </p>
              <p className="event-postit-dark-muted mt-0.5 text-xs font-semibold">
                Aggiungi altri servizi alla festa
              </p>
              <div className="scrollbar-hidden mt-3 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1">
                {missingSuggestions.map((suggestion) => {
                  const Icon = suggestion.icon;

                  return (
                    <HardNavLink
                      key={suggestion.id}
                      href={buildSuggestionHref(
                        event,
                        suggestion.exploreCategory,
                      )}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-pink px-3.5 py-2 text-sm font-bold text-ink-inverse transition-colors hover:bg-brand-pink/90"
                    >
                      <Icon className="h-4 w-4 text-ink-inverse" aria-hidden />
                      {suggestion.label}
                    </HardNavLink>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <EventCountdown event={event} embedded active={isActive} />
      </article>

      <div className="mt-2 flex flex-col items-center gap-2 px-1">
        {confirmDelete ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
            <p className="text-center text-xs text-primary-black/70">
              Eliminare “{event.title}”? L’azione non si può annullare.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs font-medium text-primary-black/55 transition-colors hover:text-primary-black"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => onDeleteEvent(event.id)}
                className="text-xs font-semibold text-brand-pink transition-colors hover:text-brand-pink/80"
              >
                Conferma elimina
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-[11px] font-medium text-primary-black/45 underline-offset-2 transition-colors hover:text-brand-pink hover:underline"
          >
            Elimina evento
          </button>
        )}
      </div>
    </>
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
    <section className="event-postit-section min-w-0 overflow-hidden border-b px-3 sm:px-4">
      <div className="event-postit-dark p-3.5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">
              Caparra {formatCurrency(depositAmount)}
            </p>
            <p className="event-postit-dark-muted mt-0.5 break-words text-xs font-semibold">
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

          <div className="flex w-full shrink-0 flex-col gap-1.5 sm:w-auto sm:max-w-[14rem] sm:items-end">
            {!payment.paid && (
              <p className="event-postit-dark-muted text-[11px] font-semibold leading-snug sm:text-right">
                Entro 36 ore dalla creazione: blocca {event.locationName} per il{" "}
                {formatDate(event.date)}. Se non la paghi, perdi la priorità.
              </p>
            )}
            {payment.paid ? (
              <span className="inline-flex w-full items-center justify-center rounded-lg bg-brand-teal px-4 py-2.5 text-xs font-bold text-ink-inverse sm:w-fit">
                Caparra pagata
              </span>
            ) : (
              <button
                type="button"
                onClick={onPayDeposit}
                className={`inline-flex w-full items-center justify-center rounded-lg bg-brand-teal px-4 py-2.5 text-xs font-bold text-ink-inverse transition-colors hover:bg-brand-teal/90 sm:w-fit ${
                  countdown.isPast ? "ring-2 ring-brand-teal/40" : ""
                }`}
              >
                {countdown.isPast ? "Paga caparra in ritardo" : "Paga caparra"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
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
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Chiudi scelta pagamento"
      />
      <div
        className="vibe-sheet-enter smooth-scroll relative max-h-[min(90dvh,calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px)))] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-surface p-5 shadow-xl lg:rounded-[2rem]"
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
                    className="flex items-center gap-2 rounded-2xl border border-primary-black/10 bg-surface px-4 py-3 text-sm font-bold text-primary-black transition-colors hover:border-primary-black"
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

