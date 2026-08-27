"use client";

import { RequestStatusBadge } from "@/components/availability/request-status-badge";
import { DiscountInviteBanner } from "@/components/discount-invite-banner";
import { EventCountdown } from "@/components/events/event-countdown";
import { EventHintLink } from "@/components/events/event-hint-link";
import { SiaeDocumentCard } from "@/components/events/siae-document-card";
import { HardNavLink } from "@/components/navigation/hard-nav-link";
import {
  EVENT_CHECKLIST,
  EVENT_CHECKLIST_INTRO,
  EVENT_CHECKLIST_TITLE,
  EVENT_TIPS,
  EVENT_TIPS_INTRO,
  EVENT_TIPS_TITLE,
} from "@/lib/event-organizer-guides";
import { canAccessAdminCatalog } from "@/lib/admin-access";
import {
  buildAdminPreviewEvent,
  getAdminPreviewDepositPaymentKey,
  isAdminPreviewEventId,
} from "@/lib/admin-preview-event";
import { useAppState } from "@/context/app-state-context";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import { useProfileCommunications } from "@/context/profile-communications-context";
import { getCountdown, isEventPast } from "@/lib/event";
import { formatSiaePrice, isCloudBookingId, SIAE_VIBEUP_TOTAL_EUR, type SiaeChoice, type SiaeStatus } from "@/lib/siae";
import { calculateLocationDeposit } from "@/lib/booking-money";
import {
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
  CircleAlert,
  CreditCard,
  Gift,
  MapPin,
  Music,
  Pencil,
  ShieldCheck,
  UtensilsCrossed,
  Users,
  WalletCards,
  Bell,
  X,
} from "lucide-react";
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { getDepositCheckoutAmounts } from "@/lib/booking-money";

/** Platform fee applied on top of the location deposit — paid via Stripe Checkout. */

interface MyEventsScreenProps {
  onCreateEvent?: () => void;
  /** False when the tab is mounted but hidden (keep-alive) */
  isActive?: boolean;
}

type PaymentMethod = "bank_transfer" | "card" | "apple_pay" | "paypal" | "cash";

interface ServicePaymentState {
  paid: boolean;
  method?: string;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  bank_transfer: "Bonifico",
  card: "Carta",
  apple_pay: "Apple Pay",
  paypal: "PayPal",
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
  // Stable fallback for UUID bookings without createdAt (avoid Date.now() drift).
  const dateStamp = Date.parse(event.date);
  if (!Number.isNaN(dateStamp)) {
    return new Date(dateStamp);
  }
  return new Date(0);
}

function formatDepositDeadline(deadline: Date) {
  return depositDeadlineFormatter.format(deadline);
}

export const MyEventsScreen = memo(function MyEventsScreen({
  onCreateEvent,
  isActive = true,
}: MyEventsScreenProps) {
  const {
    currentUser,
    events,
    deleteEvent,
    markServicePaid: markServicePaidInState,
    paymentStates,
    prunePastEvents,
    updateEventTitle,
    updateEventSiae,
    toggleEventChecklistItem,
  } = useAppState();
  const isAdminCatalog = canAccessAdminCatalog(
    currentUser.email,
    currentUser.role,
  );
  const { organizerOpenRequests, resumeAvailabilityConfirm } =
    useAvailabilityRequests();
  const { communications, markRequestStatusSeen } = useProfileCommunications();
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

  useEffect(() => {
    if (!isActive) return;
    markRequestStatusSeen();
  }, [isActive, markRequestStatusSeen, communications]);

  const statusNotices = useMemo(
    () =>
      isAdminCatalog
        ? []
        : communications
            .filter((item) => item.kind === "request_status")
            .slice(0, 4),
    [communications, isAdminCatalog],
  );

  const visibleOrganizerRequests = isAdminCatalog
    ? []
    : organizerOpenRequests;

  const activeEvents = useMemo(() => {
    const upcoming = events.filter((event) => !isEventPast(event));
    if (!isAdminCatalog) {
      return upcoming.filter((event) => !isAdminPreviewEventId(event.id));
    }
    const storedPreview = events.find((event) =>
      isAdminPreviewEventId(event.id),
    );
    const preview = storedPreview
      ? {
          ...buildAdminPreviewEvent(),
          checklistCheckedIds: storedPreview.checklistCheckedIds,
          siaeChoice: storedPreview.siaeChoice,
          siaeStatus: storedPreview.siaeStatus,
          siaePaidAt: storedPreview.siaePaidAt,
        }
      : buildAdminPreviewEvent();
    return [preview];
  }, [events, isAdminCatalog]);

  const eventPaymentStates = useMemo(() => {
    if (!isAdminCatalog) return paymentStates;
    return {
      ...paymentStates,
      [getAdminPreviewDepositPaymentKey()]: {
        paid: true,
        method: "card",
      },
    };
  }, [isAdminCatalog, paymentStates]);

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
    const depositBase =
      selectedEvent.depositAmount ?? calculateLocationDeposit(locationAmount);
    const { total } = getDepositCheckoutAmounts(depositBase);

    setPaymentModal({
      event: selectedEvent,
      service: {
        id: `${selectedEvent.id}-deposit`,
        category: "location",
        name: "Caparra location",
        providerName: selectedEvent.locationName,
        status: "pending",
        amountPaid: total,
      },
    });
  }, []);

  return (
    <div className="box-border min-w-0 w-full max-w-full space-y-5 overflow-x-clip sm:space-y-6">
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
              className="fixed inset-0 z-40 cursor-default bg-black/45"
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

      {statusNotices.length > 0 && (
        <section className="min-w-0 space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-primary-black">
            <Bell className="h-4 w-4 text-brand-teal" aria-hidden />
            Aggiornamenti richieste
          </h2>
          <ul className="space-y-2">
            {statusNotices.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-brand-teal/25 bg-brand-teal/10 p-4"
              >
                <p className="text-sm font-semibold text-primary-black">
                  {item.title}
                </p>
                <p className="mt-0.5 text-sm text-primary-black/60">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {visibleOrganizerRequests.length > 0 && (
        <section className="min-w-0 space-y-3">
          <h2 className="text-base font-semibold text-primary-black">
            Richieste in corso
          </h2>
          <ul className="space-y-2">
            {visibleOrganizerRequests.map((request) => (
              <li
                key={request.id}
                className="rounded-2xl border border-primary-black/10 bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary-black">
                      {request.eventPayload.title}
                    </p>
                    <p className="mt-0.5 text-xs text-primary-black/55">
                      {request.locationName} ·{" "}
                      {formatDate(request.eventPayload.date)}
                    </p>
                  </div>
                  <RequestStatusBadge
                    status={request.status}
                    confirmationDeadline={request.confirmationDeadline}
                  />
                </div>
                {(request.status === "pending_user_confirm" ||
                  request.status === "pending_user_review_proposal" ||
                  request.status === "pending_deposit_payment") && (
                  <button
                    type="button"
                    onClick={() => resumeAvailabilityConfirm(request.id)}
                    className="mt-3 w-full rounded-2xl bg-brand-teal px-3 py-2 text-xs font-bold text-primary-black"
                  >
                    Continua conferma
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeEvents.length === 0 && visibleOrganizerRequests.length === 0 && (
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
              className="mt-4 inline-flex rounded-2xl bg-paper px-4 py-2.5 text-sm font-semibold text-ink-inverse"
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
                  paymentStates={eventPaymentStates}
                  onOpenDepositPayment={openDepositPayment}
                  onTitleChange={updateEventTitle}
                  onSiaePatch={updateEventSiae}
                  onToggleChecklistItem={toggleEventChecklistItem}
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

export const ExpandedEventCard = memo(function ExpandedEventCard({
  event,
  isActive,
  paymentStates,
  onOpenDepositPayment,
  onTitleChange,
  onSiaePatch,
  onToggleChecklistItem,
  onDeleteEvent,
}: {
  event: UserEvent;
  isActive: boolean;
  paymentStates: Record<string, ServicePaymentState>;
  onOpenDepositPayment: (event: UserEvent) => void;
  onTitleChange: (eventId: string, title: string) => void;
  onSiaePatch: (
    eventId: string,
    patch: {
      siaeChoice?: SiaeChoice | null;
      siaeStatus?: SiaeStatus;
      siaePaidAt?: string;
    },
  ) => void;
  onToggleChecklistItem: (eventId: string, itemId: string) => void;
  onDeleteEvent: (eventId: string) => void;
}) {
  const [titleDraft, setTitleDraft] = useState(event.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (!isActive && (tipsOpen || checklistOpen || paymentOpen)) {
    setTipsOpen(false);
    setChecklistOpen(false);
    setPaymentOpen(false);
  }
  const titleInputRef = useRef<HTMLInputElement>(null);
  const totalCost =
    event.totalCost ??
    event.services.reduce((sum, service) => sum + service.amountPaid, 0);
  const locationCost =
    event.services.find((service) => service.category === "location")
      ?.amountPaid ?? 0;
  const depositAmount =
    event.depositAmount ?? calculateLocationDeposit(locationCost);
  const depositPayment = paymentStates[`${event.id}:${event.id}-deposit`] ?? {
    paid: false,
  };
  const depositPaid = depositPayment.paid || isCloudBookingId(event.id);
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
            <div className="flex flex-wrap items-center gap-2">
              <RequestStatusBadge kind="event" status={event.status} />
              {isAdminPreviewEventId(event.id) ? (
                <span className="inline-flex items-center rounded-full bg-brand-teal/15 px-2 py-0.5 text-[11px] font-semibold leading-tight text-brand-teal-strong">
                  Anteprima
                </span>
              ) : null}
            </div>
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
                  className="vibeup-light-field box-border min-w-0 flex-1 bg-transparent text-lg font-bold leading-snug text-[color:var(--postit-ink)] outline-none placeholder:text-[color:var(--postit-ink-muted)] sm:text-xl"
                  style={{ colorScheme: "light" }}
                  aria-label="Titolo evento"
                />
              ) : (
                <HardNavLink
                  href={`/event/${event.id}`}
                  className="min-w-0 flex-1 truncate text-lg font-bold leading-snug text-[color:var(--postit-ink)] underline-offset-2 hover:underline sm:text-xl"
                >
                  {event.title}
                </HardNavLink>
              )}
              {isAdminPreviewEventId(event.id) ? null : (
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
              )}
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

          <div className="mt-3 flex flex-col items-start gap-2">
            <div className="w-full min-w-0">
              <EventHintLink
                icon="none"
                expanded={checklistOpen}
                onClick={() => setChecklistOpen((open) => !open)}
                className="text-[color:var(--postit-ink)]"
              >
                {EVENT_CHECKLIST_TITLE}
              </EventHintLink>
              {checklistOpen ? (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-[color:var(--postit-ink-muted)]">
                    {EVENT_CHECKLIST_INTRO}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {EVENT_CHECKLIST.map((item) => {
                      const checked =
                        event.checklistCheckedIds?.includes(item.id) ?? false;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() =>
                              onToggleChecklistItem(event.id, item.id)
                            }
                            className="flex w-full gap-2.5 text-left text-sm font-semibold leading-relaxed text-[color:var(--postit-ink)]"
                          >
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                checked
                                  ? "border-brand-teal bg-brand-teal text-white"
                                  : "border-[color:var(--postit-ink)]/25"
                              }`}
                              aria-hidden
                            >
                              {checked ? (
                                <Check className="h-3 w-3" strokeWidth={3} />
                              ) : null}
                            </span>
                            <span
                              className={
                                checked ? "line-through opacity-55" : undefined
                              }
                            >
                              {item.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <DepositDeadlineTimer
          event={event}
          isActive={isActive}
          depositAmount={depositAmount}
          payment={depositPayment}
          onPayDeposit={payDeposit}
        />

        <section className="event-postit-section min-w-0 overflow-hidden border-t px-3 sm:px-4">
          <EventHintLink
            icon="none"
            expanded={tipsOpen}
            onClick={() => setTipsOpen((open) => !open)}
            className="text-[color:var(--postit-ink)]"
          >
            {EVENT_TIPS_TITLE}
          </EventHintLink>
          {tipsOpen ? (
            <div className="mt-2">
              <p className="text-xs font-semibold text-[color:var(--postit-ink-muted)]">
                {EVENT_TIPS_INTRO}
              </p>
              <ol className="mt-2 space-y-2">
                {EVENT_TIPS.map((tip, index) => (
                  <li
                    key={tip}
                    className="flex gap-2.5 text-sm font-semibold leading-relaxed text-[color:var(--postit-ink)]"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-teal/20 text-[11px] font-black text-brand-teal-strong">
                      {index + 1}
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>

        {depositPaid ? (
          <SiaeDocumentCard event={event} onLocalPatch={onSiaePatch} />
        ) : null}

        <section className="event-postit-section min-w-0 overflow-hidden border-t px-3 sm:px-4">
          <EventHintLink
            icon="none"
            expanded={paymentOpen}
            onClick={() => setPaymentOpen((open) => !open)}
            className="text-[color:var(--postit-ink)]"
          >
            Dettaglio del pagamento
          </EventHintLink>
          {paymentOpen ? (
            <div className="mt-2">
              <p className="text-xs font-semibold text-[color:var(--postit-ink-muted)]">
                Costi della festa, caparra e servizi prenotati.
              </p>
              <ul className="mt-2 space-y-2">
                {event.services.map((service) => (
                  <li
                    key={service.id}
                    className="flex items-baseline justify-between gap-3 text-sm font-semibold text-[color:var(--postit-ink)]"
                  >
                    <span className="min-w-0 truncate">{service.name}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatCurrency(service.amountPaid)}
                    </span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-2 border-t border-[color:var(--postit-ink)]/12 pt-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-semibold text-[color:var(--postit-ink-muted)]">
                    Caparra location
                  </dt>
                  <dd className="font-bold tabular-nums text-[color:var(--postit-ink)]">
                    {formatCurrency(depositAmount)}
                  </dd>
                </div>
                {event.siaeStatus === "managed" ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-semibold text-[color:var(--postit-ink-muted)]">
                      Documento SIAE (VibeUp)
                    </dt>
                    <dd className="font-bold tabular-nums text-[color:var(--postit-ink)]">
                      {formatSiaePrice(SIAE_VIBEUP_TOTAL_EUR)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-bold text-[color:var(--postit-ink)]">
                    Totale festa
                  </dt>
                  <dd className="text-base font-extrabold tabular-nums text-[color:var(--postit-ink)]">
                    {formatCurrency(totalCost)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </section>

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
        {isAdminPreviewEventId(event.id) ? (
          <p className="text-center text-[11px] font-medium text-primary-black/45">
            Pannello di riferimento: così lo vedono gli organizzatori dopo la
            caparra.
          </p>
        ) : confirmDelete ? (
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
  const [feeInfoOpen, setFeeInfoOpen] = useState(false);
  const feeInfoRef = useRef<HTMLDivElement>(null);
  const { base, fee, total } = useMemo(
    () => getDepositCheckoutAmounts(depositAmount),
    [depositAmount],
  );

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

  useEffect(() => {
    if (!feeInfoOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!feeInfoRef.current?.contains(event.target as Node)) {
        setFeeInfoOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFeeInfoOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [feeInfoOpen]);

  return (
    <section className="event-postit-section min-w-0 overflow-hidden border-b px-3 sm:px-4">
      <div className="event-postit-dark p-3.5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="min-w-0 text-sm font-bold text-white">
                Caparra {formatCurrency(total)}
              </p>
              <div className="relative shrink-0" ref={feeInfoRef}>
                <button
                  type="button"
                  onClick={() => setFeeInfoOpen((open) => !open)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/35 text-white/70 transition-colors hover:border-white/55 hover:text-white"
                  aria-label="Dettaglio commissioni VibeUp"
                  aria-expanded={feeInfoOpen}
                >
                  <CircleAlert className="h-3 w-3" aria-hidden />
                </button>
                {feeInfoOpen && (
                  <div
                    role="dialog"
                    aria-label="Dettaglio commissioni VibeUp"
                    className="absolute left-0 top-[calc(100%+0.4rem)] z-20 w-[min(16.5rem,calc(100vw-3rem))] rounded-xl border border-white/15 bg-[#1A1C21] p-3 shadow-xl"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                      Dettaglio importo
                    </p>
                    <dl className="mt-2 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="font-semibold text-white/65">Caparra</dt>
                        <dd className="font-bold tabular-nums text-white">
                          {formatCurrency(base)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="font-semibold text-white/65">
                          Commissioni VibeUp (5%)
                        </dt>
                        <dd className="font-bold tabular-nums text-white">
                          {formatCurrency(fee)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-1.5">
                        <dt className="font-bold text-white">Totale</dt>
                        <dd className="font-extrabold tabular-nums text-white">
                          {formatCurrency(total)}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-[11px] font-semibold leading-snug text-white/55">
                      Il 5% aggiunto alla caparra sono le commissioni VibeUp.
                    </p>
                  </div>
                )}
              </div>
            </div>
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

