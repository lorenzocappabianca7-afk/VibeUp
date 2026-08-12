"use client";

import { useAccountGate } from "@/context/account-gate-context";
import { useAppState } from "@/context/app-state-context";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import type { AvailabilityEventPayload } from "@/types/availability-request";
import {
  getServiceProviderById,
  type ServiceProvider,
} from "@/lib/mock/service-providers";
import { APP_SHELL_WIDTH_CLASS, cn, formatCurrency } from "@/lib/utils";
import { isEventPast } from "@/lib/event";
import type { ManagedListing, ManagedServiceListing } from "@/types/admin";
import { isManagedListingLive } from "@/types/admin";
import type { BookedService, BookedServiceCategory } from "@/types/event";
import type { MusicType, PartyType } from "@/types/location";
import { HomeTabLink } from "@/components/navigation/home-tab-link";
import {
  ImageCarousel,
  uniqueImages,
} from "@/components/ui/image-carousel";
import { ArrowLeft, Calendar, Check, Clock, MapPin, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface ServiceProfileViewProps {
  serviceId: string;
  initialContext?: {
    eventId?: string;
    dateFrom?: string;
    dateTo?: string;
    eventAddress?: string;
    guestCount?: string;
    hours?: string;
  };
}

const MUSIC_LABELS: Record<MusicType, string> = {
  commerciale: "Commerciale",
  house: "House",
  hip_hop: "Hip hop",
  latino: "Latino",
  anni_90: "Anni '90",
  elettronica: "Elettronica",
};

const PARTY_LABELS: Record<PartyType, string> = {
  compleanno: "Compleanni",
  matrimonio: "Matrimoni",
  aziendale: "Eventi aziendali",
  laurea: "Lauree",
  festa: "Feste private",
};

const REVIEWS = [
  {
    name: "Giulia R.",
    text: "Preciso, disponibile e perfetto per una festa privata.",
  },
  {
    name: "Lorenzo M.",
    text: "Preventivo chiaro e organizzazione molto semplice.",
  },
  {
    name: "Sara P.",
    text: "Ottimo servizio, comunicazione veloce e risultato curato.",
  },
];

const STAR_INDICES = [0, 1, 2, 3, 4];

function getBookedCategoryForService(
  service: ServiceProvider,
): BookedServiceCategory {
  if (service.category === "dj") return "dj";
  if (service.category === "fotografo") return "photographer";
  if (service.category === "decorazioni") return "decorations";

  const text = `${service.id} ${service.name} ${service.description}`.toLowerCase();
  if (/buttafuori|security|sicurezza|guard/.test(text)) return "security";
  if (/catering|menu|buffet/.test(text)) return "catering";
  if (/torta|pasticceria|sweet/.test(text)) return "bakery";
  return "audio_lights";
}

function getDaysCount(dateFrom: string, dateTo: string) {
  if (!dateFrom) return 0;
  const start = new Date(dateFrom);
  const end = new Date(dateTo || dateFrom);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diff / 86_400_000) + 1);
}

function calculateServiceQuote(
  service: ServiceProvider,
  days: number,
  hours: number,
  guests: number,
) {
  if (days <= 0 || hours <= 0) return 0;

  if (service.priceSuffix === "persona" || service.priceSuffix === "invitato") {
    return service.price * Math.max(guests, 10) * days;
  }
  if (service.priceSuffix === "kg") {
    return service.price * 3 * days;
  }
  if (service.category === "dj" || service.category === "fotografo") {
    return service.price * Math.max(1, hours / 4) * days;
  }
  return service.price * days;
}

function getServiceTags(service: ServiceProvider) {
  if (service.category === "dj" && service.musicTypes) {
    return service.musicTypes.map((type) => MUSIC_LABELS[type]);
  }
  if (service.partyTypes) {
    return service.partyTypes.map((type) => PARTY_LABELS[type]);
  }
  if (service.category === "fotografo") {
    return ["Reportage", "Foto evento", "Gallery digitale"];
  }
  return ["Evento privato", "Supporto festa", "Preventivo rapido"];
}

function isPublishedManagedService(
  listing: ManagedListing,
): listing is ManagedServiceListing {
  return listing.category !== "locali" && isManagedListingLive(listing);
}

function managedListingToServiceProvider(
  listing: ManagedServiceListing,
): ServiceProvider {
  return {
    id: listing.id,
    category: listing.category,
    name: listing.name,
    description: listing.description,
    providerZone: listing.providerZone,
    price: listing.price,
    priceSuffix: listing.priceSuffix,
    imageUrl: listing.imageUrl,
    galleryImageUrls: listing.galleryImageUrls,
    musicTypes: listing.musicTypes,
    partyTypes: listing.partyTypes,
    supportsInPerson: listing.category === "decorazioni" ? true : undefined,
  };
}

export function ServiceProfileView({
  serviceId,
  initialContext,
}: ServiceProfileViewProps) {
  const { events, getEvent, isStorageHydrated, managedListings } = useAppState();
  const { sendAvailabilityRequest } = useAvailabilityRequests();
  const { requireAccount } = useAccountGate();
  const [requestError, setRequestError] = useState<string | null>(null);
  const service = useMemo(() => {
    const staticService = getServiceProviderById(serviceId);
    if (staticService) return staticService;

    const managedService = managedListings.find(
      (listing) => isPublishedManagedService(listing) && listing.id === serviceId,
    );

    return managedService && isPublishedManagedService(managedService)
      ? managedListingToServiceProvider(managedService)
      : undefined;
  }, [managedListings, serviceId]);
  const event = initialContext?.eventId
    ? getEvent(initialContext.eventId)
    : undefined;
  const availableEvents = useMemo(
    () =>
      events.filter(
        (item) => item.status !== "completed" && !isEventPast(item),
      ),
    [events],
  );
  const [selectedEventId, setSelectedEventId] = useState(event?.id ?? "");
  const selectedEvent = useMemo(
    () => (selectedEventId ? getEvent(selectedEventId) : undefined),
    [getEvent, selectedEventId],
  );
  const [dateFrom, setDateFrom] = useState(
    event?.date ?? initialContext?.dateFrom ?? "",
  );
  const [dateTo, setDateTo] = useState(initialContext?.dateTo ?? "");
  const [hoursInput, setHoursInput] = useState(
    String(Math.min(12, Math.max(1, Number(initialContext?.hours) || 4))),
  );
  const hours = Number.parseInt(hoursInput, 10);
  const validHours = Number.isNaN(hours) ? 0 : hours;
  const initialGuestCount = Number.parseInt(initialContext?.guestCount ?? "", 10);
  const guestCount =
    event?.guestCount ?? (Number.isNaN(initialGuestCount) ? 30 : initialGuestCount);
  const [eventAddress, setEventAddress] = useState(
    initialContext?.eventAddress ??
      (event ? `${event.locationName}, ${event.city}` : ""),
  );

  useEffect(() => {
    if (!isStorageHydrated || !initialContext?.eventId) return;

    const linkedEvent = getEvent(initialContext.eventId);
    if (!linkedEvent) return;

    queueMicrotask(() => {
      setSelectedEventId((current) => current || linkedEvent.id);
      setDateFrom((current) => current || linkedEvent.date);
      setEventAddress(
        (current) =>
          current ||
          `${linkedEvent.locationName}, ${linkedEvent.city}`,
      );
    });
  }, [getEvent, initialContext?.eventId, isStorageHydrated]);
  const [generatedQuote, setGeneratedQuote] = useState<number | null>(null);
  const [serviceAdded, setServiceAdded] = useState(false);
  const resetGeneratedQuote = useCallback(() => {
    setGeneratedQuote(null);
    setServiceAdded(false);
  }, []);
  const isDecorationShop = service?.category === "decorazioni";
  const showEventSelection = availableEvents.length > 0;
  const usesEventSelection = Boolean(selectedEvent);
  const serviceRoleLabel =
    service?.category === "fotografo"
      ? "fotografo"
      : service?.category === "dj"
        ? "DJ"
        : "servizio";
  const serviceRoleName =
    service?.category === "fotografo"
      ? "Fotografo"
      : service?.category === "dj"
        ? "DJ"
        : "Servizio";
  const quoteDate = usesEventSelection ? selectedEvent?.date ?? "" : dateFrom;
  const quoteAddress = usesEventSelection
    ? selectedEvent
      ? `${selectedEvent.locationName}, ${selectedEvent.city}`
      : ""
    : eventAddress;
  const quoteGuests = selectedEvent?.guestCount ?? guestCount;

  const days = getDaysCount(
    quoteDate,
    usesEventSelection ? quoteDate : dateTo || dateFrom,
  );
  const quotePreview = useMemo(() => {
    if (!service) return 0;
    return calculateServiceQuote(service, days, validHours, quoteGuests);
  }, [days, quoteGuests, service, validHours]);
  const canGenerate = Boolean(service && quoteDate && quoteAddress.trim() && validHours > 0);
  const serviceImages = uniqueImages([
    service?.imageUrl,
    ...(service?.galleryImageUrls ?? []),
  ]);

  function buildServiceRequestPayload(
    pendingService: BookedService,
  ): AvailabilityEventPayload | null {
    if (!service || !selectedEvent) return null;
    return {
      title: selectedEvent.title,
      description: `Richiesta servizio: ${pendingService.name}`,
      date: selectedEvent.date,
      time: selectedEvent.time,
      endTime: selectedEvent.endTime ?? selectedEvent.time,
      locationId: service.id,
      locationName: service.name,
      city: selectedEvent.city,
      guestCount: selectedEvent.guestCount,
      services: [pendingService],
      totalCost: pendingService.amountPaid,
      depositAmount: 0,
      requestKind: "service",
      targetEventId: selectedEvent.id,
      pendingService,
    };
  }

  function requestServiceForEvent(pendingService: BookedService) {
    requireAccount(() => {
      const eventPayload = buildServiceRequestPayload(pendingService);
      if (!eventPayload || !service) return;

      void sendAvailabilityRequest({
        locationId: service.id,
        locationName: service.name,
        eventPayload,
      }).then((result) => {
        if (!result.ok) {
          setRequestError(result.error);
          setServiceAdded(false);
          return;
        }
        setRequestError(null);
        setServiceAdded(true);
      });
    }, "Per richiedere un servizio crea un account.");
  }

  function addGeneratedServiceToEvent() {
    if (!service || !generatedQuote || !selectedEventId) return;

    requestServiceForEvent({
      id: `${selectedEventId}-${service.id}-${Date.now()}`,
      category: getBookedCategoryForService(service),
      name: serviceRoleName,
      providerName: service.name,
      status: "pending",
      amountPaid: generatedQuote,
    });
  }

  function addDecorationShopToEvent() {
    if (!service || !selectedEventId) return;

    requestServiceForEvent({
      id: `${selectedEventId}-${service.id}-${Date.now()}`,
      category: "decorations",
      name: "Decorazioni",
      providerName: service.name,
      status: "pending",
      amountPaid: 0,
    });
  }

  if (!service) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-xl font-black text-primary-black">
          Servizio non trovato
        </h1>
        <HomeTabLink
          tab="explore"
          className="mt-6 rounded-2xl bg-brand-teal px-6 py-3 text-sm font-black text-ink-inverse"
        >
          Torna alla home
        </HomeTabLink>
      </div>
    );
  }

  const tags = getServiceTags(service);

  return (
    <div
      className={cn(
        "mx-auto min-h-dvh bg-background pt-4 shadow-none sm:shadow-[0_0_60px_-15px_rgba(15,15,17,0.12)] lg:pt-8",
        APP_SHELL_WIDTH_CLASS,
      )}
      style={{
        paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
        paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
      }}
    >
      <div className="min-w-0 space-y-4 pb-8">
        <HomeTabLink
          tab="explore"
          search={`category=${service.category}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-black/60 transition-colors hover:text-primary-black sm:text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          Torna ai servizi
        </HomeTabLink>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)] xl:gap-6">
          <div className="space-y-3 sm:space-y-4">
            {serviceImages.length > 0 && (
              <section className="render-contained overflow-hidden rounded-2xl border border-primary-black/10 bg-primary-black/[0.02] sm:rounded-3xl">
                <ImageCarousel
                  images={serviceImages}
                  alt={service.name}
                  frameClassName="aspect-[16/9]"
                  sizes="(max-width: 448px) 100vw, 720px"
                  priority
                  showDots={serviceImages.length > 1}
                  showCounter={serviceImages.length > 1}
                />
              </section>
            )}

            <div className="render-contained rounded-2xl border border-primary-black/10 bg-primary-black/[0.02] p-3.5 sm:rounded-3xl sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-teal sm:text-xs sm:tracking-[0.18em]">
                {service.category}
              </p>
              <h1 className="mt-1 text-xl font-black text-primary-black sm:mt-2 sm:text-3xl">
                {service.name}
              </h1>
              <p className="mt-1.5 text-sm leading-snug text-primary-black/70 sm:mt-2 sm:text-base sm:leading-relaxed">
                {service.description}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-primary-black/55 sm:mt-3 sm:text-sm">
                <MapPin className="h-3.5 w-3.5 text-brand-teal sm:h-4 sm:w-4" aria-hidden />
                {service.providerZone}
              </p>
            </div>

            <section className="render-contained rounded-2xl border border-primary-black/10 bg-surface p-3.5 sm:rounded-3xl sm:p-5">
              <h2 className="text-sm font-black text-primary-black sm:text-lg">
                Preferenze e stile
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-brand-teal/10 px-2.5 py-1 text-xs font-bold text-brand-teal sm:px-3 sm:py-2 sm:text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="render-contained rounded-2xl border border-primary-black/10 bg-surface p-3.5 sm:rounded-3xl sm:p-5">
              <h2 className="text-sm font-black text-primary-black sm:text-lg">
                Recensioni
              </h2>
              <ul className="mt-2 space-y-2 sm:mt-3 sm:space-y-3">
                {REVIEWS.map((review) => (
                  <li
                    key={review.name}
                    className="rounded-xl bg-primary-black/[0.03] p-2.5 sm:rounded-2xl sm:p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-primary-black">
                        {review.name}
                      </p>
                      <span className="flex shrink-0 gap-0.5 text-brand-pink">
                        {STAR_INDICES.map((index) => (
                          <Star
                            key={index}
                            className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                            fill="currentColor"
                            aria-hidden
                          />
                        ))}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-snug text-primary-black/60 sm:mt-1 sm:text-sm">
                      {review.text}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {isDecorationShop ? (
            <aside className="smooth-scroll rounded-2xl bg-brand-teal p-3.5 text-ink-inverse sm:rounded-3xl sm:p-4 xl:sticky xl:top-8 xl:max-h-[calc(100dvh-4rem)] xl:overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-inverse/80 sm:text-xs sm:tracking-[0.18em]">
                Seleziona negozio
              </p>
              <h2 className="mt-1 text-lg font-black sm:text-2xl">
                Collega questo negozio a un evento
              </h2>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-surface p-3 text-primary-black">
                  <p className="text-xs font-bold text-primary-black/55">
                    Tipo negozio
                  </p>
                  <p className="mt-1 text-base font-black">
                    {service.supportsInPerson
                      ? "Negozio fisico"
                      : "Servizio online / consegna"}
                  </p>
                </div>

                {service.supportsInPerson && (
                  <>
                    <div className="rounded-2xl bg-surface p-3 text-primary-black">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-primary-black/55">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        Indirizzo
                      </p>
                      <p className="mt-1 text-base font-black">
                        {service.providerZone}, Torino
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface p-3 text-primary-black">
                      <p className="text-xs font-bold text-primary-black/55">
                        Contatti
                      </p>
                      <p className="mt-1 text-base font-black">
                        +39 011 000 000 · @{service.id}
                      </p>
                    </div>
                  </>
                )}

                <label className="block rounded-2xl bg-surface p-3 text-primary-black">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-primary-black/55">
                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                    Evento per cui ti servono le decorazioni
                  </span>
                  <select
                    value={selectedEventId}
                    onChange={(event) => {
                      setSelectedEventId(event.target.value);
                      setServiceAdded(false);
                    }}
                    className="mt-1 w-full bg-transparent text-base font-black outline-none"
                  >
                    <option value="">Seleziona un evento</option>
                    {availableEvents.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} - {item.date}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="button"
                disabled={!selectedEventId || serviceAdded}
                onClick={addDecorationShopToEvent}
                className={cn(
                  "mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white transition-colors disabled:pointer-events-none",
                  serviceAdded
                    ? "bg-emerald-500 disabled:opacity-100"
                    : "bg-primary-black disabled:opacity-55",
                )}
              >
                <Check className="h-4 w-4" aria-hidden />
                {serviceAdded ? (
                  <>Richiesta inviata al negozio</>
                ) : (
                  <>Richiedi per questo evento</>
                )}
              </button>
              {requestError && (
                <p className="mt-2 text-xs font-semibold text-brand-pink">
                  {requestError}
                </p>
              )}
              {serviceAdded && (
                <HomeTabLink
                  tab="events"
                  className="mt-3 flex w-full items-center justify-center rounded-2xl bg-surface px-4 py-3 text-sm font-black text-brand-teal transition-colors hover:bg-surface/90"
                >
                  Vai ai miei eventi
                </HomeTabLink>
              )}
            </aside>
          ) : (
            <aside className="smooth-scroll rounded-2xl bg-brand-teal p-3.5 text-ink-inverse sm:rounded-3xl sm:p-4 xl:sticky xl:top-8 xl:max-h-[calc(100dvh-4rem)] xl:overflow-y-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-inverse/80 sm:text-xs sm:tracking-[0.18em]">
              Preventivo servizio
            </p>
            <p className="mt-1 text-2xl font-black sm:text-3xl">
              {generatedQuote ? formatCurrency(generatedQuote) : "Da generare"}
            </p>

            {event && (
              <p className="mt-3 rounded-2xl bg-surface px-3 py-2 text-sm font-bold text-primary-black">
                Dati precompilati da {event.title}: data e location sono già
                inserite.
              </p>
            )}

            <div className="mt-4 space-y-3">
              {showEventSelection && (
                <label className="block rounded-2xl bg-surface p-3 text-primary-black">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-primary-black/55">
                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                    Evento per cui ti serve il {serviceRoleLabel}
                  </span>
                  <select
                    value={selectedEventId}
                    onChange={(event) => {
                      setSelectedEventId(event.target.value);
                      resetGeneratedQuote();
                    }}
                    className="mt-1 w-full bg-transparent text-base font-black outline-none"
                  >
                    <option value="">Seleziona un evento</option>
                    {availableEvents.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} - {item.date}
                      </option>
                    ))}
                  </select>
                  {selectedEvent && (
                    <span className="mt-2 block text-xs font-bold text-primary-black/60">
                      {selectedEvent.date} · {selectedEvent.locationName},{" "}
                      {selectedEvent.city}
                    </span>
                  )}
                </label>
              )}

              {!usesEventSelection && (
                <>
                  <label className="block rounded-2xl bg-surface p-3 text-primary-black">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-primary-black/55">
                      <Calendar className="h-3.5 w-3.5" aria-hidden />
                      Data inizio
                    </span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(event) => {
                        setDateFrom(event.target.value);
                        resetGeneratedQuote();
                      }}
                      className="mt-1 w-full bg-transparent text-base font-black outline-none"
                    />
                  </label>

                  <label className="block rounded-2xl bg-surface p-3 text-primary-black">
                    <span className="text-xs font-bold text-primary-black/55">
                      Data fine, se serve più giorni
                    </span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(event) => {
                        setDateTo(event.target.value);
                        resetGeneratedQuote();
                      }}
                      className="mt-1 w-full bg-transparent text-base font-black outline-none"
                    />
                  </label>
                </>
              )}

              <label className="block rounded-2xl bg-surface p-3 text-primary-black">
                <span className="flex items-center gap-1.5 text-xs font-bold text-primary-black/55">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  Ore di servizio
                </span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={hoursInput}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (nextValue === "") {
                      setHoursInput("");
                      resetGeneratedQuote();
                      return;
                    }

                    const parsedValue = Number.parseInt(nextValue, 10);
                    if (!Number.isNaN(parsedValue)) {
                      setHoursInput(String(Math.min(12, Math.max(1, parsedValue))));
                      resetGeneratedQuote();
                    }
                  }}
                  className="mt-1 w-full bg-transparent text-base font-black outline-none"
                />
              </label>

              {!usesEventSelection && (
                <label className="block rounded-2xl bg-surface p-3 text-primary-black">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-primary-black/55">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    Indirizzo locale
                  </span>
                  <input
                    value={eventAddress}
                    onChange={(event) => {
                      setEventAddress(event.target.value);
                      resetGeneratedQuote();
                    }}
                    placeholder="Via, locale o città"
                    className="mt-1 w-full bg-transparent text-base font-black outline-none"
                  />
                </label>
              )}
            </div>

            <button
              type="button"
              disabled={!canGenerate}
              onClick={() => {
                requireAccount(
                  () => {
                    setGeneratedQuote(quotePreview);
                    setServiceAdded(false);
                  },
                  "Per generare un preventivo crea un account.",
                );
              }}
              className={cn(
                "mt-4 w-full rounded-2xl bg-paper px-4 py-3 text-sm font-black text-ink-inverse transition-opacity",
                !canGenerate && "opacity-50",
              )}
            >
              Genera preventivo
            </button>

            {generatedQuote && selectedEventId && (
              <>
                <button
                  type="button"
                  disabled={!selectedEventId || serviceAdded}
                  onClick={addGeneratedServiceToEvent}
                  className={cn(
                    "mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-colors disabled:pointer-events-none",
                    serviceAdded
                      ? "bg-emerald-500 text-white disabled:opacity-100"
                      : "bg-surface text-primary-black disabled:opacity-55",
                  )}
                >
                  <Check className="h-4 w-4" aria-hidden />
                  {serviceAdded ? (
                    <>Richiesta inviata al fornitore</>
                  ) : (
                    <>Richiedi {serviceRoleName} per l&apos;evento</>
                  )}
                </button>
                {requestError && (
                  <p className="mt-2 text-xs font-semibold text-brand-pink">
                    {requestError}
                  </p>
                )}
                {serviceAdded && (
                  <HomeTabLink
                    tab="events"
                    className="mt-3 flex w-full items-center justify-center rounded-2xl bg-surface px-4 py-3 text-sm font-black text-brand-teal transition-colors hover:bg-surface/90"
                  >
                    Vai ai miei eventi
                  </HomeTabLink>
                )}
              </>
            )}

            <p className="mt-3 rounded-2xl bg-surface px-3 py-2 text-xs font-bold text-primary-black/70">
              Prima la disponibilità: il fornitore deve accettare. Poi confermi e
              il servizio entra nell&apos;evento (caparra online alla conferma).
            </p>
          </aside>
          )}
        </section>
      </div>
    </div>
  );
}
