"use client";

import { LocationGallery } from "@/components/location/location-gallery";
import { LocationInfo, LocationReviewsSection } from "@/components/location/location-info";
import { SmartLocationDetailsSection } from "@/components/location/smart-location-details-section";
import { useAccountGate } from "@/context/account-gate-context";
import { useAppState } from "@/context/app-state-context";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import { useChat } from "@/context/chat-context";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { pushHomeHref } from "@/lib/home-navigation";
import {
  buildLocationHref,
  buildLocationQuoteShareHref,
} from "@/lib/location-href";
import {
  parseSharedDrinkMode,
  parseSharedDrinksPerInvitee,
  parseSharedServiceIds,
  parseSharedTime,
} from "@/lib/quote-share";
import { datePriceBandLabel } from "@/lib/location-date-price";
import type { AvailabilityEventPayload } from "@/types/availability-request";
import { calculateBookingQuote, calculateHours } from "@/lib/location";
import { calculateLocationDeposit } from "@/lib/booking-money";
import {
  calculateDrinksCost,
  clampDrinksPerInvitee,
  getDrinkPackageLabel,
  type DrinkPackageMode,
} from "@/lib/drinks-quote";
import {
  getInternalLocationServicePrice,
  getInternalLocationServices,
} from "@/lib/location-services";
import { MOCK_LOCATIONS } from "@/lib/mock/locations";
import { SERVICE_PROVIDERS } from "@/lib/mock/service-providers";
import {
  readQuoteSessionDraft,
  writeQuoteSessionDraft,
} from "@/lib/quote-session-draft";
import { getFilteredLocationPricePresentation } from "@/lib/location-preview-price";
import { formatCurrency } from "@/lib/utils";
import type { ManagedLocationListing } from "@/types/admin";
import { isManagedListingLive } from "@/types/admin";
import {
  EXPLORE_GUEST_MIN,
  type BookingQuote,
  type Location,
} from "@/types/location";
import {
  buildSavedQuoteId,
  type SavedQuote,
} from "@/types/saved-quote";
import {
  ArrowDown,
  ArrowLeft,
  Disc3,
  GitCompareArrows,
  Heart,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { SoftNavLink } from "@/components/navigation/soft-nav-link";
import { HomeTabLink } from "@/components/navigation/home-tab-link";
import { HorizontalTouchScroll } from "@/components/ui/horizontal-touch-scroll";
import { SafeImage } from "@/components/ui/safe-image";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizePartyDates } from "@/types/party-criteria";

interface LocationDetailViewProps {
  location: Location;
  initialQuoteContext?: {
    guestCount?: string;
    partyType?: string;
    dateFrom?: string;
    dateTo?: string;
    dates?: string;
    startTime?: string;
    endTime?: string;
    drinkMode?: string;
    drinks?: string;
    services?: string;
    title?: string;
  };
}

const MAX_QUOTE_GUESTS = 300;
const MAX_COMPARE_LOCATIONS = 3;

function parseIncomingGuestCount(
  queryValue?: string,
  criteriaValue?: number | null,
) {
  const fromQuery = Number(queryValue);
  if (Number.isFinite(fromQuery) && fromQuery >= 1) return fromQuery;
  if (
    typeof criteriaValue === "number" &&
    Number.isFinite(criteriaValue) &&
    criteriaValue >= 1
  ) {
    return criteriaValue;
  }
  return null;
}

function clampQuoteGuests(value: number) {
  return Math.min(Math.max(value, 1), MAX_QUOTE_GUESTS);
}

export function LocationDetailView({
  location,
  initialQuoteContext,
}: LocationDetailViewProps) {
  const {
    compareLocationIds,
    currentUser,
    favoriteLocationIds,
    isQuoteSaved,
    managedListings,
    removeCompareLocation,
    removeSavedQuote,
    saveQuote,
    toggleCompareLocation,
    toggleFavoriteLocation,
  } = useAppState();
  const { requireAccount } = useAccountGate();
  const { startVendorConversation } = useChat();
  const { setTab } = useTabNavigation();
  const { criteria, hasAppliedCriteria } = usePartyCriteria();
  const router = useRouter();
  const [chatError, setChatError] = useState<string | null>(null);
  const {
    requests,
    sendAvailabilityRequest,
    resumeAvailabilityConfirm,
  } = useAvailabilityRequests();
  const defaultEventTitle = `Festa da ${location.name}`;
  const isFavorite = favoriteLocationIds.includes(location.id);
  const isCompareSelected = compareLocationIds.includes(location.id);
  const [eventTitle, setEventTitle] = useState(
    initialQuoteContext?.title?.trim() || defaultEventTitle,
  );
  const [requestError, setRequestError] = useState<string | null>(null);
  const incomingPreferredDates = useMemo(() => {
    const fromQuery = normalizePartyDates(
      (initialQuoteContext?.dates ?? "")
        .split(",")
        .concat(initialQuoteContext?.dateFrom ?? [])
        .concat(initialQuoteContext?.dateTo ?? []),
    );
    if (fromQuery.length > 0) return fromQuery;
    return criteria.dates;
  }, [
    criteria.dates,
    initialQuoteContext?.dateFrom,
    initialQuoteContext?.dateTo,
    initialQuoteContext?.dates,
  ]);
  const [preferredDates, setPreferredDates] = useState(incomingPreferredDates);
  useEffect(() => {
    if (incomingPreferredDates.length === 0) return;
    setPreferredDates((current) =>
      current.length === 0 ? incomingPreferredDates : current,
    );
  }, [incomingPreferredDates]);
  const [date, setDate] = useState(
    initialQuoteContext?.dateFrom ?? incomingPreferredDates[0] ?? "",
  );
  const sharedStartTime = parseSharedTime(initialQuoteContext?.startTime);
  const sharedEndTime = parseSharedTime(initialQuoteContext?.endTime);
  const sharedDrinkMode = parseSharedDrinkMode(initialQuoteContext?.drinkMode);
  const sharedDrinksPerInvitee = parseSharedDrinksPerInvitee(
    initialQuoteContext?.drinks,
  );
  const sharedServiceIds = useMemo(
    () => parseSharedServiceIds(initialQuoteContext?.services),
    [initialQuoteContext?.services],
  );
  const [startTime, setStartTime] = useState(sharedStartTime ?? "18:00");
  const [endTime, setEndTime] = useState(sharedEndTime ?? "23:00");
  const incomingGuestCount = parseIncomingGuestCount(
    initialQuoteContext?.guestCount,
    criteria.guestCount,
  );
  const [guestCount, setGuestCount] = useState(
    clampQuoteGuests(incomingGuestCount ?? EXPLORE_GUEST_MIN),
  );
  useEffect(() => {
    if (incomingGuestCount == null) return;
    setGuestCount(clampQuoteGuests(incomingGuestCount));
  }, [incomingGuestCount]);
  const internalServices = useMemo(
    () => getInternalLocationServices(location),
    [location],
  );
  const [selectedInternalServices, setSelectedInternalServices] = useState<
    string[]
  >([]);
  useEffect(() => {
    const includedIds = internalServices
      .filter(
        (service) => service.available && service.pricing.type === "included",
      )
      .map((service) => service.id);
    const sharedIds = sharedServiceIds.filter((id) =>
      internalServices.some((service) => service.id === id),
    );
    const extraIds = [...new Set([...includedIds, ...sharedIds])];
    if (extraIds.length === 0) return;
    setSelectedInternalServices((current) => {
      const missing = extraIds.filter((id) => !current.includes(id));
      return missing.length === 0 ? current : [...current, ...missing];
    });
  }, [internalServices, sharedServiceIds]);
  const comingFromExploreQuote = Boolean(
    initialQuoteContext?.guestCount ||
      initialQuoteContext?.dateFrom ||
      initialQuoteContext?.dates,
  );
  const [drinkMode, setDrinkMode] = useState<DrinkPackageMode>(
    sharedDrinkMode ?? criteria.drinkMode,
  );
  const [drinksPerInvitee, setDrinksPerInvitee] = useState(
    clampDrinksPerInvitee(
      sharedDrinksPerInvitee ?? criteria.drinksPerInvitee,
    ),
  );
  const drinksTouchedRef = useRef(false);
  const [quoteSessionReady, setQuoteSessionReady] = useState(false);
  const hasSharedDrinkParams = Boolean(
    initialQuoteContext?.drinkMode || initialQuoteContext?.drinks,
  );

  // Restore tab-local quote inputs, but wizard/explore filters always win.
  useEffect(() => {
    const draft = readQuoteSessionDraft();
    queueMicrotask(() => {
      const wizardApplied = hasAppliedCriteria;
      const wizardDrinks = criteria;

      if (draft) {
        if (!initialQuoteContext?.dateFrom && draft.date) {
          if (
            incomingPreferredDates.length === 0 ||
            incomingPreferredDates.includes(draft.date)
          ) {
            setDate(draft.date);
          }
        }
        if (!initialQuoteContext?.guestCount && incomingGuestCount == null) {
          setGuestCount(clampQuoteGuests(draft.guestCount));
        }
        if (!comingFromExploreQuote && !sharedStartTime) {
          setStartTime(draft.startTime);
        }
        if (!comingFromExploreQuote && !sharedEndTime) {
          setEndTime(draft.endTime);
        }
        if (
          !hasSharedDrinkParams &&
          !wizardApplied &&
          !drinksTouchedRef.current
        ) {
          setDrinkMode(draft.drinkMode);
          setDrinksPerInvitee(clampDrinksPerInvitee(draft.drinksPerInvitee));
        }
      }
      if (
        !hasSharedDrinkParams &&
        wizardApplied &&
        !drinksTouchedRef.current
      ) {
        setDrinkMode(wizardDrinks.drinkMode);
        setDrinksPerInvitee(
          clampDrinksPerInvitee(wizardDrinks.drinksPerInvitee),
        );
      }
      setQuoteSessionReady(true);
    });
    // Only hydrate once per location mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount hydrate
  }, []);

  useEffect(() => {
    if (!quoteSessionReady || drinksTouchedRef.current || !hasAppliedCriteria) {
      return;
    }
    // A shared link already carries drinks — do not let in-session wizard
    // filters overwrite the quote the recipient opened.
    if (hasSharedDrinkParams) return;
    queueMicrotask(() => {
      if (drinksTouchedRef.current) return;
      setDrinkMode(criteria.drinkMode);
      setDrinksPerInvitee(clampDrinksPerInvitee(criteria.drinksPerInvitee));
    });
  }, [
    quoteSessionReady,
    hasAppliedCriteria,
    hasSharedDrinkParams,
    criteria.drinkMode,
    criteria.drinksPerInvitee,
  ]);

  useEffect(() => {
    if (preferredDates.length === 0) return;
    if (!preferredDates.includes(date)) {
      setDate(preferredDates[0]);
    }
  }, [date, preferredDates]);

  useEffect(() => {
    if (!quoteSessionReady) return;
    writeQuoteSessionDraft({
      date,
      startTime,
      endTime,
      guestCount,
      drinkMode,
      drinksPerInvitee,
      cakeKg: 3,
    });
  }, [
    quoteSessionReady,
    date,
    startTime,
    endTime,
    guestCount,
    drinkMode,
    drinksPerInvitee,
  ]);
  const activeRequest = useMemo(() => {
    const mine = [...requests]
      .filter(
        (item) =>
          item.locationId === location.id &&
          item.requesterUserId === currentUser.id,
      )
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const inFlight = mine.find(
      (item) =>
        item.status === "pending_manager" ||
        item.status === "pending_admin_review" ||
        item.status === "pending_user_confirm" ||
        item.status === "pending_user_review_proposal" ||
        item.status === "pending_deposit_payment",
    );
    if (inFlight) return inFlight;
    return (
      mine.find(
        (item) => item.status === "declined" || item.status === "cancelled",
      ) ?? null
    );
  }, [currentUser.id, location.id, requests]);
  const similarLocations = useMemo(() => {
    const managedLocations = managedListings
      .filter(
        (listing): listing is ManagedLocationListing =>
          listing.category === "locali" && isManagedListingLive(listing),
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
      selectedExtras: [],
      guestCount,
      location,
      date,
    });
    const drinksCost = calculateDrinksCost({
      mode: drinkMode,
      drinksPerInvitee,
      guestCount,
      drinkUnitPrice: location.drinksPricing?.drinkUnitPrice,
      openBarPerInvitee: location.drinksPricing?.openBarPerInvitee,
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
      depositAmount: calculateLocationDeposit(locationCost),
    } satisfies BookingQuote;
  }, [
    location,
    date,
    startTime,
    endTime,
    guestCount,
    drinkMode,
    drinksPerInvitee,
    selectedInternalServices,
    internalServices,
  ]);

  const candidateDatePrices = useMemo(() => {
    const dates =
      preferredDates.length > 0 ? preferredDates : date ? [date] : [];
    const unique = [...new Set(dates.filter(Boolean))];
    const drinksCost = draftQuote.drinksCost ?? 0;
    const venueServicesCost = draftQuote.venueServicesCost ?? 0;

    return unique.map((isoDate) => {
      const base = calculateBookingQuote({
        hourlyPrice: location.hourlyPrice,
        startTime,
        endTime,
        selectedExtras: [],
        guestCount,
        location,
        date: isoDate,
      });
      const locationCost =
        base.locationCost + drinksCost + venueServicesCost;
      return {
        date: isoDate,
        locationCost,
        total: locationCost + base.extrasCost,
        band: datePriceBandLabel(isoDate),
      };
    });
  }, [
    date,
    draftQuote.drinksCost,
    draftQuote.venueServicesCost,
    endTime,
    guestCount,
    location,
    preferredDates,
    startTime,
  ]);
  const hours = calculateHours(startTime, endTime);
  const quoteKey = useMemo(
    () =>
      JSON.stringify({
        date,
        startTime,
        endTime,
        guestCount,
        drinkMode,
        drinksPerInvitee,
        selectedInternalServices: [...selectedInternalServices].sort(),
      }),
    [
      date,
      startTime,
      endTime,
      guestCount,
      drinkMode,
      drinksPerInvitee,
      selectedInternalServices,
    ],
  );
  const isQuoteReady =
    date.length > 0 &&
    hours >= location.technicalDetails.minHours &&
    guestCount > 0 &&
    guestCount <= MAX_QUOTE_GUESTS &&
    draftQuote.total > 0;
  const savedQuoteId = isQuoteReady
    ? buildSavedQuoteId(location.id, quoteKey)
    : null;
  const quoteSaved = savedQuoteId ? isQuoteSaved(savedQuoteId) : false;

  function updateGuestCount(value: number) {
    setGuestCount(Math.min(Math.max(value, 1), MAX_QUOTE_GUESTS));
  }

  function handleSaveQuote() {
    if (!isQuoteReady) return;

    requireAccount(
      () => {
        const id = buildSavedQuoteId(location.id, quoteKey);
        if (isQuoteSaved(id)) {
          removeSavedQuote(id);
          return;
        }

        const gallery = Array.from(
          new Set(
            [location.imageUrl, ...(location.gallery ?? [])].filter(Boolean),
          ),
        ).slice(0, 4);

        const snapshot: SavedQuote = {
          id,
          savedAt: new Date().toISOString(),
          locationId: location.id,
          locationName: location.name,
          locationCity: location.city || location.comune,
          zoneLabel: location.zoneLabel,
          imageUrl: location.imageUrl,
          gallery,
          quote: { ...draftQuote },
          hourlyPrice: location.hourlyPrice,
          date,
          startTime,
          endTime,
          guestCount,
          eventTitle: eventTitle.trim() || undefined,
          drinkMode,
          drinksPerInvitee,
          selectedExtraIds: [],
          selectedInternalServiceIds: [...selectedInternalServices],
        };
        saveQuote(snapshot);
      },
      "Per salvare un preventivo crea un account.",
    );
  }

  function toggleInternalService(id: string) {
    const service = internalServices.find((item) => item.id === id);
    if (service?.pricing.type === "included") return;
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

  function goToCompareLocations() {
    const openCompare = () => {
      if (
        !compareLocationIds.includes(location.id) &&
        compareLocationIds.length >= MAX_COMPARE_LOCATIONS
      ) {
        removeCompareLocation(compareLocationIds[0]);
      }
      if (!compareLocationIds.includes(location.id)) {
        toggleCompareLocation(location.id);
      }
      pushHomeHref(router, "/?tab=explore&view=compare");
    };

    if (isCompareSelected) {
      openCompare();
      return;
    }

    requireAccount(
      openCompare,
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
    if (
      activeRequest?.status === "pending_user_confirm" ||
      activeRequest?.status === "pending_user_review_proposal" ||
      activeRequest?.status === "pending_deposit_payment"
    ) {
      resumeAvailabilityConfirm(activeRequest.id);
      return;
    }

    if (!isQuoteReady) return;

    requireAccount(
      () => {
        const includedVenueParts = [
          ...internalServices
            .filter(
              (service) =>
                service.available && service.pricing.type === "included",
            )
            .map((service) => service.name),
          ...selectedInternalServices.flatMap((serviceId) => {
            const service = internalServices.find(
              (item) => item.id === serviceId,
            );
            if (!service || service.pricing.type === "included") return [];
            if (drinkMode !== "none" && service.type === "bar") return [];
            return [service.name];
          }),
        ].filter((name, index, list) => list.indexOf(name) === index);
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
        const services = [
          {
            id: "draft-location",
            category: "location" as const,
            name: locationNameParts.join(" · "),
            providerName: location.name,
            status: "confirmed" as const,
            amountPaid: draftQuote.locationCost,
          },
        ];

        const eventPayload: AvailabilityEventPayload = {
          title: eventTitle.trim() || defaultEventTitle,
          description:
            preferredDates.length > 1
              ? `Preventivo richiesto dalla scheda location. Date preferite: ${preferredDates.join(", ")}. Richiesta per il ${date}.`
              : "Preventivo richiesto dalla scheda location.",
          date,
          time: startTime,
          endTime,
          locationId: location.id,
          locationName: location.name,
          city: location.city,
          guestCount,
          services,
          totalCost: draftQuote.total,
          depositAmount: draftQuote.depositAmount,
        };

        void sendAvailabilityRequest({
          locationId: location.id,
          locationName: location.name,
          eventPayload,
        }).then((result) => {
          if (!result.ok) {
            setRequestError(result.error);
            return;
          }
          setRequestError(null);
        });
      },
      "Per inviare una richiesta di disponibilità crea un account.",
    );
  }

  function contactVenue() {
    requireAccount(() => {
      setChatError(null);
      void startVendorConversation({
        displayName: location.name,
        locationId: location.id,
        category: "locali",
      }).then((result) => {
        if (!result.ok) {
          setChatError(result.error);
          return;
        }
        setTab("messages");
      });
    }, "Per messaggiare la location crea un account.");
  }

  return (
    <div className="space-y-6 pb-8 lg:pb-12">
      <div className="flex items-center justify-between gap-3">
        <HomeTabLink
          tab="explore"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-black/60 transition-colors hover:text-primary-black"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Torna a Esplora
        </HomeTabLink>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={contactVenue}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-teal-strong/30 bg-surface text-brand-teal-strong backdrop-blur-md transition-colors hover:bg-brand-teal/10"
            aria-label={`Messaggia ${location.name}`}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={toggleCompare}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
              isCompareSelected
                ? "border-brand-teal-strong bg-brand-teal-strong text-ink-inverse"
                : "border-brand-teal-strong/30 bg-surface text-brand-teal-strong hover:bg-brand-teal/10"
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
                : "border-primary-black/10 bg-surface text-primary-black/65 hover:bg-surface/90 hover:text-brand-pink"
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
      {chatError ? (
        <p className="text-xs font-semibold text-brand-pink">{chatError}</p>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] xl:items-start">
        <div className="space-y-6">
          <LocationGallery images={location.gallery} name={location.name} />

          <LocationInfo
            location={location}
            quotePrice={
              quoteSessionReady && draftQuote.total > 0
                ? formatCurrency(draftQuote.total)
                : undefined
            }
            quoteDetail={
              quoteSessionReady
                ? [
                    `${guestCount} ${guestCount === 1 ? "ospite" : "ospiti"}`,
                    drinkMode === "none"
                      ? null
                      : getDrinkPackageLabel({
                          mode: drinkMode,
                          drinksPerInvitee,
                        }),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : undefined
            }
          />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-8">
          <SmartLocationDetailsSection
            guestCount={guestCount}
            maxGuests={MAX_QUOTE_GUESTS}
            quote={draftQuote}
            estimatedHours={hours}
            minHours={location.technicalDetails.minHours}
            date={date}
            preferredDates={preferredDates}
            startTime={startTime}
            endTime={endTime}
            internalServices={internalServices}
            selectedInternalServices={selectedInternalServices}
            drinkMode={drinkMode}
            drinksPerInvitee={drinksPerInvitee}
            onDateChange={setDate}
            onPreferredDatesChange={setPreferredDates}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
            onGuestCountChange={updateGuestCount}
            onToggleInternalService={toggleInternalService}
            onDrinkModeChange={(mode) => {
              drinksTouchedRef.current = true;
              setDrinkMode(mode);
            }}
            onDrinksPerInviteeChange={(value) => {
              drinksTouchedRef.current = true;
              setDrinksPerInvitee(clampDrinksPerInvitee(value));
            }}
            wantedExtraServices={
              hasAppliedCriteria ? criteria.wantedServices : []
            }
            quoteReady={quoteSessionReady}
            shareHref={buildLocationQuoteShareHref(location.id, {
              guestCount,
              dates: preferredDates,
              dateFrom: date || preferredDates[0] || null,
              dateTo:
                preferredDates[preferredDates.length - 1] ?? date ?? null,
              startTime,
              endTime,
              drinkMode,
              drinksPerInvitee,
              serviceIds: selectedInternalServices,
              title: eventTitle,
            })}
            isQuoteReady={isQuoteReady}
            quoteSaved={quoteSaved}
            onSaveQuote={handleSaveQuote}
            hourlyPrice={location.hourlyPrice}
            locationPriceLabel={
              location.priceModel === "person"
                ? `prezzo a partecipante × ${guestCount} invitati`
                : location.priceModel === "event" || location.eventPrice != null
                  ? "tariffa a serata"
                  : undefined
            }
            candidateDatePrices={candidateDatePrices}
            selectedDate={date}
            onSelectDate={setDate}
            requestStatus={activeRequest?.status ?? null}
            confirmationDeadline={activeRequest?.confirmationDeadline ?? null}
            requestError={requestError}
            eventTitle={eventTitle}
            eventTitlePlaceholder={defaultEventTitle}
            onEventTitleChange={(title) => {
              setEventTitle(title);
              setRequestError(null);
            }}
            onSendRequest={sendRequestFromBooking}
            onAddToCompare={goToCompareLocations}
            isCompareSelected={isCompareSelected}
            drinkUnitPrice={location.drinksPricing?.drinkUnitPrice}
            openBarPerInvitee={location.drinksPricing?.openBarPerInvitee}
          />
        </aside>
      </div>

      <ScrollForSimilarHint />
      <SimilarLocationsCarousel
        locations={similarLocations}
        hrefFor={(id) =>
          buildLocationHref(id, {
            guestCount,
            dates:
              preferredDates.length > 0
                ? preferredDates
                : date
                  ? [date]
                  : [],
          })
        }
      />
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

function SimilarLocationsCarousel({
  locations,
  hrefFor,
}: {
  locations: Location[];
  hrefFor: (locationId: string) => string;
}) {
  const { criteria } = usePartyCriteria();
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

      <HorizontalTouchScroll className="scrollbar-hidden max-w-full pb-2">
        <ul className="flex w-max gap-3">
          {locations.map((similarLocation) => {
            const price = getFilteredLocationPricePresentation(
              similarLocation,
              criteria,
            );

            return (
            <li
              key={similarLocation.id}
              className="w-[15rem] shrink-0 lg:w-[17rem]"
            >
              <SoftNavLink
                href={hrefFor(similarLocation.id)}
                className="block h-full overflow-clip rounded-3xl border border-primary-black/10 bg-background shadow-sm transition-colors duration-150 hover:border-primary-black touch-pan-y"
                draggable={false}
              >
                <div className="relative aspect-[16/10] overflow-clip">
                  <SafeImage
                    src={similarLocation.imageUrl}
                    alt={similarLocation.name}
                    fill
                    draggable={false}
                    className="pointer-events-none select-none object-cover"
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
                    {price.price}
                  </p>
                  <p className="text-[10px] font-bold text-primary-black/45">
                    {price.detail}
                  </p>
                </div>
              </SoftNavLink>
            </li>
            );
          })}
        </ul>
      </HorizontalTouchScroll>
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
          Profili musicali adatti alla tua festa. Li aggiungi dopo, da I miei eventi.
        </p>
      </div>

      <HorizontalTouchScroll className="scrollbar-hidden max-w-full pb-2">
        <ul className="flex w-max gap-3">
          {djs.map((dj) => (
            <li key={dj.id} className="w-[15rem] shrink-0 lg:w-[17rem]">
              <SoftNavLink
                href={`/service/${dj.id}?category=dj`}
                className="flex h-full gap-3 rounded-3xl border border-primary-black/10 bg-surface p-4 shadow-sm transition-colors duration-150 hover:border-primary-black"
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
              </SoftNavLink>
            </li>
          ))}
        </ul>
      </HorizontalTouchScroll>
    </section>
  );
}
