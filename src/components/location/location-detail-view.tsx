"use client";

import { BookingSummary } from "@/components/location/booking-summary";
import { LocationGallery } from "@/components/location/location-gallery";
import { LocationInfo, LocationReviewsSection } from "@/components/location/location-info";
import { SmartLocationDetailsSection } from "@/components/location/smart-location-details-section";
import { useAccountGate } from "@/context/account-gate-context";
import { useAppState } from "@/context/app-state-context";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import type { AvailabilityEventPayload } from "@/types/availability-request";
import {
  calculateBookingQuote,
  calculateHours,
  getExtraServicePrice,
} from "@/lib/location";
import {
  calculateDrinksCost,
  clampDrinksPerInvitee,
  DEFAULT_DRINKS_PER_INVITEE,
  getDrinkPackageLabel,
  type DrinkPackageMode,
} from "@/lib/drinks-quote";
import {
  getInternalLocationServicePrice,
  getInternalLocationServices,
} from "@/lib/location-services";
import { EXTRA_SERVICES } from "@/lib/mock/extra-services";
import { MOCK_LOCATIONS } from "@/lib/mock/locations";
import { SERVICE_PROVIDERS } from "@/lib/mock/service-providers";
import { getLocationPricePresentation } from "@/lib/utils";
import type { ManagedLocationListing } from "@/types/admin";
import type { BookedServiceCategory } from "@/types/event";
import type { BookingQuote, ExtraServiceId, Location } from "@/types/location";
import {
  ArrowDown,
  ArrowLeft,
  Disc3,
  GitCompareArrows,
  Heart,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

interface LocationDetailViewProps {
  location: Location;
  initialQuoteContext?: {
    guestCount?: string;
    partyType?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

const EXTRA_SERVICE_CATEGORY: Record<ExtraServiceId, BookedServiceCategory> = {
  menu: "menu",
  dj: "dj",
  photographer: "photographer",
  decorations: "decorations",
  bakery: "bakery",
  catering: "catering",
  audio_lights: "audio_lights",
};

function getMenuAllergens(serviceName: string): string[] | undefined {
  const lowered = serviceName.toLowerCase();
  const isMenuService =
    lowered.includes("menu") ||
    lowered.includes("catering") ||
    lowered.includes("food") ||
    lowered.includes("buffet");

  if (!isMenuService) return undefined;

  return ["Glutine", "Latte", "Uova", "Frutta a guscio", "Sedano", "Senape"];
}

const EMPTY_QUOTE: BookingQuote = {
  hours: 0,
  locationCost: 0,
  extrasCost: 0,
  drinksCost: 0,
  venueServicesCost: 0,
  total: 0,
  depositAmount: 0,
};

const MAX_QUOTE_GUESTS = 300;
const MAX_COMPARE_LOCATIONS = 3;

export function LocationDetailView({
  location,
  initialQuoteContext,
}: LocationDetailViewProps) {
  const {
    compareLocationIds,
    currentUser,
    favoriteLocationIds,
    managedListings,
    removeCompareLocation,
    toggleCompareLocation,
    toggleFavoriteLocation,
  } = useAppState();
  const { requireAccount } = useAccountGate();
  const { requests, sendAvailabilityRequest } = useAvailabilityRequests();
  const defaultEventTitle = `Festa da ${location.name}`;
  const isFavorite = favoriteLocationIds.includes(location.id);
  const isCompareSelected = compareLocationIds.includes(location.id);
  const [eventTitle, setEventTitle] = useState(defaultEventTitle);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [date, setDate] = useState(initialQuoteContext?.dateFrom ?? "");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:00");
  const [guestCount, setGuestCount] = useState(
    Math.min(
      Math.max(Number(initialQuoteContext?.guestCount) || 60, 1),
      MAX_QUOTE_GUESTS,
    ),
  );
  const internalServices = useMemo(
    () => getInternalLocationServices(location),
    [location],
  );
  const [selectedInternalServices, setSelectedInternalServices] = useState<
    string[]
  >([]);
  const [selectedExtras, setSelectedExtras] = useState<ExtraServiceId[]>([]);
  const [cakeKg, setCakeKg] = useState(3);
  const [drinkMode, setDrinkMode] = useState<DrinkPackageMode>("none");
  const [drinksPerInvitee, setDrinksPerInvitee] = useState(
    DEFAULT_DRINKS_PER_INVITEE,
  );
  const [generatedQuote, setGeneratedQuote] = useState<{
    key: string;
    quote: BookingQuote;
  } | null>(null);
  const activeRequest = useMemo(() => {
    const mine = requests.filter(
      (item) =>
        item.locationId === location.id &&
        item.requesterUserId === currentUser.id,
    );
    return (
      mine.find(
        (item) =>
          item.status === "pending_manager" ||
          item.status === "pending_user_confirm",
      ) ??
      mine.find((item) => item.status === "confirmed") ??
      mine[0] ??
      null
    );
  }, [currentUser.id, location.id, requests]);
  const similarLocations = useMemo(() => {
    const managedLocations = managedListings
      .filter(
        (listing): listing is ManagedLocationListing =>
          listing.category === "locali" && listing.published,
      )
      .map((listing) => listing.location);
    const allLocations = [...managedLocations, ...MOCK_LOCATIONS];
    const uniqueLocations = Array.from(
      new Map(allLocations.map((item) => [item.id, item])).values(),
    );

    return uniqueLocations
      .filter((item) => item.id !== location.id)
      .map((item) => {
        const partyMatch = item.partyTypes.some((type) =>
          location.partyTypes.includes(type),
        );
        const sameArea = item.geoArea === location.geoArea;
        const sameDistrict =
          item.district !== undefined && item.district === location.district;
        const capacityDiff = Math.abs(item.capacity - location.capacity);

        return {
          location: item,
          score:
            (sameDistrict ? 4 : 0) +
            (sameArea ? 2 : 0) +
            (partyMatch ? 2 : 0) +
            (capacityDiff <= 40 ? 1 : 0),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((item) => item.location);
  }, [location, managedListings]);
  const recommendedDjs = useMemo(
    () => SERVICE_PROVIDERS.filter((service) => service.category === "dj"),
    [],
  );

  const draftQuote = useMemo(() => {
    const baseQuote = calculateBookingQuote({
      hourlyPrice: location.hourlyPrice,
      startTime,
      endTime,
      selectedExtras,
      cakeKg,
      guestCount,
    });
    const drinksCost = calculateDrinksCost({
      mode: drinkMode,
      drinksPerInvitee,
      guestCount,
    });
    const venueServicesCost = selectedInternalServices.reduce((sum, id) => {
      const service = internalServices.find((item) => item.id === id);
      if (!service) return sum;
      // Paid drink package replaces any paid bar line to avoid double counting.
      if (
        drinkMode !== "none" &&
        service.type === "bar" &&
        service.pricing.type !== "included"
      ) {
        return sum;
      }
      return sum + getInternalLocationServicePrice(service, guestCount);
    }, 0);
    // Venue services + drinks are part of the location package (deposit base).
    const locationCost =
      baseQuote.locationCost + drinksCost + venueServicesCost;
    const extrasCost = baseQuote.extrasCost;
    const total = locationCost + extrasCost;

    return {
      ...baseQuote,
      locationCost,
      extrasCost,
      drinksCost,
      venueServicesCost,
      total,
      depositAmount: locationCost * 0.3,
    } satisfies BookingQuote;
  }, [
    location.hourlyPrice,
    startTime,
    endTime,
    selectedExtras,
    cakeKg,
    guestCount,
    drinkMode,
    drinksPerInvitee,
    selectedInternalServices,
    internalServices,
  ]);

  const hours = calculateHours(startTime, endTime);
  const quoteKey = useMemo(
    () =>
      JSON.stringify({
        date,
        startTime,
        endTime,
        guestCount,
        cakeKg,
        drinkMode,
        drinksPerInvitee,
        selectedExtras: [...selectedExtras].sort(),
        selectedInternalServices: [...selectedInternalServices].sort(),
      }),
    [
      date,
      startTime,
      endTime,
      guestCount,
      cakeKg,
      drinkMode,
      drinksPerInvitee,
      selectedExtras,
      selectedInternalServices,
    ],
  );
  const quoteIsCurrent = generatedQuote?.key === quoteKey;
  const quote = quoteIsCurrent ? generatedQuote.quote : null;
  const canGenerateQuote =
    date.length > 0 &&
    hours >= location.technicalDetails.minHours &&
    guestCount > 0 &&
    guestCount <= MAX_QUOTE_GUESTS &&
    draftQuote.total > 0;
  const isReady =
    quote !== null &&
    date.length > 0 &&
    hours >= location.technicalDetails.minHours &&
    quote.total > 0;

  function updateGuestCount(value: number) {
    setGuestCount(Math.min(Math.max(value, 1), MAX_QUOTE_GUESTS));
  }

  function generateQuote() {
    if (!canGenerateQuote) return;
    requireAccount(
      () => {
        setGeneratedQuote({ key: quoteKey, quote: draftQuote });
        setRequestError(null);
      },
      "Per generare un preventivo crea un account.",
    );
  }

  function toggleExtra(id: ExtraServiceId) {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  }

  function toggleInternalService(id: string) {
    setSelectedInternalServices((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  }

  function toggleCompare() {
    if (isCompareSelected) {
      toggleCompareLocation(location.id);
      return;
    }

    requireAccount(
      () => {
        if (compareLocationIds.length >= MAX_COMPARE_LOCATIONS) {
          removeCompareLocation(compareLocationIds[0]);
        }
        toggleCompareLocation(location.id);
      },
      "Per aggiungere un locale al confronto crea un account.",
    );
  }

  function toggleFavorite() {
    if (isFavorite) {
      toggleFavoriteLocation(location.id);
      return;
    }

    requireAccount(
      () => toggleFavoriteLocation(location.id),
      "Per salvare un locale tra i preferiti crea un account.",
    );
  }

  function sendRequestFromBooking() {
    if (!quote) return;

    requireAccount(
      () => {
        const includedVenueParts = selectedInternalServices.flatMap(
          (serviceId) => {
            const service = internalServices.find(
              (item) => item.id === serviceId,
            );
            if (!service) return [];
            if (
              drinkMode !== "none" &&
              service.type === "bar" &&
              service.pricing.type !== "included"
            ) {
              return [];
            }
            return [service.name];
          },
        );
        const locationNameParts = [
          "Location",
          ...includedVenueParts,
          ...(drinkMode !== "none"
            ? [
                getDrinkPackageLabel({
                  mode: drinkMode,
                  drinksPerInvitee,
                }),
              ]
            : []),
        ];
        const venueMenuAllergens = selectedInternalServices.flatMap(
          (serviceId) => {
            const service = internalServices.find(
              (item) => item.id === serviceId,
            );
            if (!service || service.type !== "menu") return [];
            return getMenuAllergens(service.name) ?? [];
          },
        );

        const services = [
          {
            id: "draft-location",
            category: "location" as const,
            name: locationNameParts.join(" · "),
            providerName: location.name,
            status: "confirmed" as const,
            amountPaid: quote.locationCost,
            allergens:
              venueMenuAllergens.length > 0
                ? Array.from(new Set(venueMenuAllergens))
                : undefined,
          },
          ...selectedExtras.flatMap((extraId) => {
            const service = EXTRA_SERVICES.find((item) => item.id === extraId);
            if (!service) return [];

            return {
              id: `draft-${extraId}`,
              category: EXTRA_SERVICE_CATEGORY[extraId],
              name: service.name,
              providerName: service.providerName ?? service.name,
              status: "pending" as const,
              amountPaid: getExtraServicePrice(service, {
                cakeKg,
                guestCount,
              }),
              allergens: getMenuAllergens(service.name),
            };
          }),
        ];

        const eventPayload: AvailabilityEventPayload = {
          title: eventTitle.trim() || defaultEventTitle,
          description: "Preventivo richiesto dalla scheda location.",
          date,
          time: startTime,
          endTime,
          locationId: location.id,
          locationName: location.name,
          city: location.city,
          guestCount,
          services,
          totalCost: quote.total,
          depositAmount: quote.depositAmount,
        };

        const result = sendAvailabilityRequest({
          locationId: location.id,
          locationName: location.name,
          eventPayload,
        });

        if (!result.ok) {
          setRequestError(result.error);
          return;
        }
        setRequestError(null);
      },
      "Per inviare una richiesta di disponibilità crea un account.",
    );
  }

  return (
    <div className="space-y-6 pb-8 lg:pb-12">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-black/60 transition-colors hover:text-primary-black"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Torna a Esplora
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleCompare}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
              isCompareSelected
                ? "border-brand-teal-strong bg-brand-teal-strong text-white"
                : "border-brand-teal-strong/30 bg-white text-brand-teal-strong hover:bg-brand-teal/10"
            }`}
            aria-label={
              isCompareSelected
                ? `Rimuovi ${location.name} dal confronto`
                : `Aggiungi ${location.name} al confronto`
            }
          >
            <GitCompareArrows
              className="h-4 w-4"
              strokeWidth={2.75}
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={toggleFavorite}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
              isFavorite
                ? "border-brand-pink bg-brand-pink text-white"
                : "border-primary-black/10 bg-white text-primary-black/65 hover:bg-white/90 hover:text-brand-pink"
            }`}
            aria-label={
              isFavorite
                ? `Rimuovi ${location.name} dai preferiti`
                : `Aggiungi ${location.name} ai preferiti`
            }
          >
            <Heart
              className="h-4 w-4"
              strokeWidth={2.75}
              fill={isFavorite ? "currentColor" : "none"}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] xl:items-start">
        <div className="space-y-6">
          <LocationGallery images={location.gallery} name={location.name} />

          <LocationInfo location={location} />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-8">
          <SmartLocationDetailsSection
            dateRangeTo={initialQuoteContext?.dateTo}
            guestCount={guestCount}
            maxGuests={MAX_QUOTE_GUESTS}
            quote={quote}
            estimatedHours={hours}
            hourlyPrice={location.hourlyPrice}
            minHours={location.technicalDetails.minHours}
            date={date}
            startTime={startTime}
            endTime={endTime}
            internalServices={internalServices}
            selectedInternalServices={selectedInternalServices}
            selectedExtras={selectedExtras}
            cakeKg={cakeKg}
            drinkMode={drinkMode}
            drinksPerInvitee={drinksPerInvitee}
            onDateChange={setDate}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
            onGuestCountChange={updateGuestCount}
            onToggleInternalService={toggleInternalService}
            onToggleExtra={toggleExtra}
            onCakeKgChange={setCakeKg}
            onDrinkModeChange={setDrinkMode}
            onDrinksPerInviteeChange={(value) =>
              setDrinksPerInvitee(clampDrinksPerInvitee(value))
            }
            onGenerateQuote={generateQuote}
            canGenerateQuote={canGenerateQuote}
            quoteNeedsRefresh={generatedQuote !== null && !quoteIsCurrent}
          />

          <BookingSummary
            quote={quote ?? EMPTY_QUOTE}
            hourlyPrice={location.hourlyPrice}
            isReady={isReady}
            requestStatus={activeRequest?.status ?? null}
            requestError={requestError}
            savedEventHref="/?tab=events"
            eventTitle={eventTitle}
            eventTitlePlaceholder={defaultEventTitle}
            onEventTitleChange={(title) => {
              setEventTitle(title);
              setRequestError(null);
            }}
            onSendRequest={sendRequestFromBooking}
          />
        </aside>
      </div>

      <ScrollForSimilarHint />
      <SimilarLocationsCarousel locations={similarLocations} />
      <RecommendedDjsCarousel djs={recommendedDjs} />
      <LocationReviewsSection location={location} />

    </div>
  );
}

function ScrollForSimilarHint() {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary-black/10 bg-primary-black/[0.03] px-4 py-2 text-xs font-black text-primary-black/55 shadow-sm">
        <ArrowDown className="h-4 w-4 animate-bounce text-brand-teal" aria-hidden />
        Scorri per vedere location simili
      </div>
    </div>
  );
}

function SimilarLocationsCarousel({ locations }: { locations: Location[] }) {
  if (locations.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-black text-primary-black">
          Altre location simili
        </h2>
        <p className="mt-1 text-sm text-primary-black/55">
          Locali con stile, zona o capienza simile a questa scheda.
        </p>
      </div>

      <div className="scrollbar-hidden smooth-scroll max-w-full overflow-x-auto pb-2">
        <ul className="flex w-max gap-3">
          {locations.map((similarLocation) => {
            const price = getLocationPricePresentation(similarLocation);

            return (
            <li
              key={similarLocation.id}
              className="w-[15rem] shrink-0 lg:w-[17rem]"
            >
              <Link
                href={`/location/${similarLocation.id}`}
                className="block h-full overflow-hidden rounded-3xl border border-primary-black/10 bg-background shadow-sm transition-colors duration-150 hover:border-primary-black"
              >
                <div className="relative aspect-[16/10]">
                  <Image
                    src={similarLocation.imageUrl}
                    alt={similarLocation.name}
                    fill
                    className="object-cover"
                    sizes="272px"
                  />
                </div>
                <div className="space-y-2 p-3">
                  <h3 className="truncate text-sm font-black text-primary-black">
                    {similarLocation.name}
                  </h3>
                  <p className="flex items-center gap-1 text-xs text-primary-black/50">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">
                      {similarLocation.zoneLabel} · fino a{" "}
                      {similarLocation.capacity} ospiti
                    </span>
                  </p>
                  <p className="text-sm font-black text-brand-teal">
                    {price.eyebrow} {price.price} {price.unit}
                  </p>
                  <p className="text-[10px] font-bold text-primary-black/45">
                    {price.badge}
                  </p>
                </div>
              </Link>
            </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function RecommendedDjsCarousel({
  djs,
}: {
  djs: typeof SERVICE_PROVIDERS;
}) {
  if (djs.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-black text-primary-black">
          DJ consigliati
        </h2>
        <p className="mt-1 text-sm text-primary-black/55">
          Profili musicali adatti alla tua festa, da aggiungere al preventivo.
        </p>
      </div>

      <div className="scrollbar-hidden smooth-scroll max-w-full overflow-x-auto pb-2">
        <ul className="flex w-max gap-3">
          {djs.map((dj) => (
            <li key={dj.id} className="w-[15rem] shrink-0 lg:w-[17rem]">
              <Link
                href={`/service/${dj.id}?category=dj`}
                className="flex h-full gap-3 rounded-3xl border border-primary-black/10 bg-background p-4 shadow-sm transition-colors duration-150 hover:border-primary-black"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-primary-black/10 bg-brand-teal/12 text-brand-teal">
                  {dj.imageUrl ? (
                    <Image
                      src={dj.imageUrl}
                      alt={`Foto profilo di ${dj.name}`}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Disc3 className="h-6 w-6" aria-hidden />
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="truncate text-sm font-black text-primary-black">
                    {dj.name}
                  </h3>
                  <p className="line-clamp-2 text-xs leading-relaxed text-primary-black/58">
                    {dj.description}
                  </p>
                  <p className="flex items-center gap-1 text-xs font-semibold text-primary-black/50">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">{dj.providerZone}</span>
                  </p>
                  {dj.musicTypes && (
                    <div className="flex flex-wrap gap-1.5">
                      {dj.musicTypes.slice(0, 3).map((type) => (
                        <span
                          key={type}
                          className="rounded-full bg-brand-pink/12 px-2 py-1 text-[10px] font-bold text-primary-black"
                        >
                          {type.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm font-black text-brand-teal">
                    da {dj.price} €/{dj.priceSuffix}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
