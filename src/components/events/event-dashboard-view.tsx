"use client";

import { RequestStatusBadge } from "@/components/availability/request-status-badge";
import { EventCountdown } from "@/components/events/event-countdown";
import { EventHintLink } from "@/components/events/event-hint-link";
import { EventInfoSheet } from "@/components/events/event-info-sheet";
import { EventManagerContactSection } from "@/components/events/event-manager-contact-section";
import { SiaeDocumentCard } from "@/components/events/siae-document-card";
import { RefundReportModal } from "@/components/events/refund-report-modal";
import { ServiceStatusList } from "@/components/events/service-status-list";
import { HardNavLink } from "@/components/navigation/hard-nav-link";
import { HomeTabLink } from "@/components/navigation/home-tab-link";
import { useAppState } from "@/context/app-state-context";
import { calculateLocationDeposit, getDepositCheckoutAmounts, getEventDepositPaymentKey } from "@/lib/booking-money";
import type { BookedService, UserEvent } from "@/types/event";
import { formatCurrency, formatDate, MODAL_SAFE_BOTTOM_STYLE } from "@/lib/utils";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import {
  ArrowLeft,
  Camera,
  Gift,
  MapPin,
  Music,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

interface EventDashboardViewProps {
  eventId: string;
  initialEvent: UserEvent | null;
}

export function EventDashboardView({
  eventId,
  initialEvent,
}: EventDashboardViewProps) {
  const { getEvent, isStorageHydrated, paymentStates, updateEventSiae } =
    useAppState();
  const event = getEvent(eventId) ?? initialEvent;
  const [refundService, setRefundService] = useState<BookedService | null>(
    null,
  );
  const [refundOpen, setRefundOpen] = useState(false);
  const [addServicesOpen, setAddServicesOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (!event) {
    if (!isStorageHydrated) {
      return (
        <div className="space-y-6 pb-8">
          <div className="h-8 w-40 animate-pulse rounded-xl bg-primary-black/10" />
          <div className="h-48 animate-pulse rounded-3xl bg-primary-black/[0.04]" />
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-8">
        <HomeTabLink
          tab="events"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-black/60 transition-colors hover:text-primary-black"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Torna ai Miei Eventi
        </HomeTabLink>
        <div className="rounded-3xl border border-dashed border-primary-black/15 bg-primary-black/[0.02] p-8 text-center">
          <h1 className="text-lg font-bold text-primary-black">
            Evento non trovato
          </h1>
          <p className="mt-2 text-sm text-primary-black/60">
            L&apos;evento potrebbe non essere più disponibile in questa sessione.
          </p>
        </div>
      </div>
    );
  }

  const currentEvent = event;
  const totalCost =
    currentEvent.totalCost ??
    currentEvent.services.reduce((sum, service) => sum + service.amountPaid, 0);
  const locationCost =
    currentEvent.services.find((service) => service.category === "location")
      ?.amountPaid ?? 0;
  const depositAmount =
    currentEvent.depositAmount ?? calculateLocationDeposit(locationCost);
  const depositCheckout = getDepositCheckoutAmounts(depositAmount);
  const remainingAmount = Math.max(0, totalCost - depositAmount);

  function handleRequestRefund(service: BookedService) {
    setRefundService(service);
    setRefundOpen(true);
  }

  function handleCloseRefund() {
    setRefundOpen(false);
    setRefundService(null);
  }

  return (
    <div className="space-y-6 pb-8">
      <HomeTabLink
        tab="events"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-black/60 transition-colors hover:text-primary-black"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Torna ai Miei Eventi
      </HomeTabLink>

      <header>
        <RequestStatusBadge
          kind="event"
          status={currentEvent.status}
          size="md"
        />
        <h1 className="mt-3 text-2xl font-bold text-primary-black">
          {currentEvent.title}
        </h1>
        {currentEvent.description && (
          <p className="mt-2 text-sm text-primary-black/70">
            {currentEvent.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-primary-black/60">
          <span>{formatDate(currentEvent.date)} · ore {currentEvent.time}</span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {currentEvent.locationName}, {currentEvent.city}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {currentEvent.guestCount} ospiti
          </span>
        </div>
      </header>

      <EventCountdown event={currentEvent} />

      <EventManagerContactSection event={currentEvent} />

      {paymentStates[getEventDepositPaymentKey(currentEvent.id)]?.paid ? (
        <SiaeDocumentCard
          event={currentEvent}
          layout="page"
          onLocalPatch={updateEventSiae}
        />
      ) : null}

      <section className="rounded-2xl border border-brand-pink/20 bg-brand-pink/12 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background text-brand-pink">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-black text-primary-black">
              Sconto sulla location con i servizi VibeUp
            </h2>
            <p className="mt-1 text-sm font-bold leading-relaxed text-primary-black/72">
              Se richiedi DJ, fotografi, decorazioni o altri servizi tramite
              l&apos;app, puoi ottenere uno sconto sulla location del tuo evento.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-primary-black/10 bg-primary-black/[0.02] p-5">
        <div className="flex items-center justify-between gap-3">
          <EventHintLink
            expanded={paymentOpen}
            onClick={() => setPaymentOpen(true)}
          >
            Dettaglio del pagamento
          </EventHintLink>
          <button
            type="button"
            onClick={() => setAddServicesOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-teal text-ink-inverse transition-colors duration-150 hover:bg-brand-teal/90"
            aria-label="Aggiungi servizio"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </section>

      <ServiceStatusList
        event={currentEvent}
        onRequestRefund={handleRequestRefund}
      />

      <RefundReportModal
        open={refundOpen}
        service={refundService}
        onClose={handleCloseRefund}
      />

      <EventInfoSheet
        open={paymentOpen}
        title="Dettaglio del pagamento"
        intro="Costi della festa, caparra e servizi prenotati."
        onClose={() => setPaymentOpen(false)}
      >
        <ul className="space-y-2 text-sm">
          {currentEvent.services.map((service) => (
            <li key={service.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-primary-black/70">
                {service.name} · {service.providerName}
              </span>
              <span className="shrink-0 font-semibold text-primary-black">
                {formatCurrency(service.amountPaid)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-3 border-t border-primary-black/10 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="font-semibold text-primary-black">Totale evento</dt>
            <dd className="text-lg font-bold text-primary-black">
              {formatCurrency(totalCost)}
            </dd>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-brand-pink/10 px-3 py-2.5">
              <dt className="text-xs font-medium text-primary-black/60">
                Caparra + fee 5% (online)
              </dt>
              <dd className="text-sm font-bold text-brand-pink">
                {formatCurrency(depositCheckout.total)}
              </dd>
              <p className="mt-1 text-[11px] font-semibold text-primary-black/50">
                Base {formatCurrency(depositCheckout.base)} + commissioni{" "}
                {formatCurrency(depositCheckout.fee)}
              </p>
            </div>
            <div className="rounded-xl bg-brand-teal/10 px-3 py-2.5">
              <dt className="text-xs font-medium text-primary-black/60">
                Saldo stimato
              </dt>
              <dd className="text-sm font-bold text-brand-teal">
                {formatCurrency(remainingAmount)}
              </dd>
            </div>
          </div>
        </dl>
      </EventInfoSheet>

      <AddServicesModal
        open={addServicesOpen}
        event={currentEvent}
        onClose={() => setAddServicesOpen(false)}
      />
    </div>
  );
}

function AddServicesModal({
  open,
  event,
  onClose,
}: {
  open: boolean;
  event: UserEvent;
  onClose: () => void;
}) {
  useBodyScrollLock(open);

  if (!open) return null;

  const serviceCategories = [
    {
      id: "dj",
      label: "DJ",
      description: "Musica, console e animazione per la serata.",
      icon: Music,
    },
    {
      id: "fotografo",
      label: "Fotografo",
      description: "Foto, video recap e ricordi della festa.",
      icon: Camera,
    },
    {
      id: "decorazioni",
      label: "Decorazioni",
      description: "Allestimenti, palloncini, backdrop e dettagli tema.",
      icon: Gift,
    },
    {
      id: "altri",
      label: "Altri servizi",
      description: "Catering, torte, audio-luci e supporti extra.",
      icon: Sparkles,
    },
  ] as const;

  return (
    <div
      className="vibe-overlay-enter fixed inset-0 z-[70] flex items-end justify-center lg:items-center"
      data-overlay-open="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Chiudi aggiunta servizi"
      />

      <div
        className="vibe-sheet-enter smooth-scroll relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-xl lg:rounded-3xl"
        style={MODAL_SAFE_BOTTOM_STYLE}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary-black">
              Di cosa hai bisogno?
            </h2>
            <p className="mt-1 text-sm text-primary-black/60">
              Scegli una categoria: ti portiamo nella home di quel servizio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-black/5 text-primary-black/50"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <ul className="space-y-3">
          {serviceCategories.map((category) => {
            const Icon = category.icon;
            const href = `/?tab=explore&category=${category.id}&eventId=${event.id}`;

            return (
              <li key={category.id}>
                <HardNavLink
                  href={href}
                  className="flex w-full items-start gap-3 rounded-2xl border border-primary-black/10 bg-surface p-4 text-left transition-colors duration-150 hover:border-primary-black"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-teal/12 text-brand-teal">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-primary-black">
                      {category.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-primary-black/60">
                      {category.description}
                    </p>
                  </div>
                </HardNavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
