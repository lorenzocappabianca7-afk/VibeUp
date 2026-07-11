"use client";

import { CompareFavorites } from "@/components/explore/compare-favorites";
import { DiscountInviteBanner } from "@/components/discount-invite-banner";
import { ExploreFiltersSheet } from "@/components/explore/explore-filters-sheet";
import { ExploreSearchBar } from "@/components/explore/explore-search-bar";
import { LocationCard } from "@/components/explore/location-card";
import { useAppState } from "@/context/app-state-context";
import { MOCK_LOCATIONS } from "@/lib/mock/locations";
import {
  SERVICE_PROVIDERS,
  type ServiceCategory,
  type ServiceProvider,
} from "@/lib/mock/service-providers";
import {
  distanceToLocation,
  matchesGeoFilter,
  matchesNearMeFilter,
} from "@/lib/geo";
import { cn, formatCurrency } from "@/lib/utils";
import {
  DEFAULT_EXPLORE_FILTERS,
  DEFAULT_SERVICE_EXPLORE_FILTERS,
  EXPLORE_GUEST_MIN,
  EXPLORE_PRICE_MAX,
  EXPLORE_PRICE_MIN,
  type ExploreCategory,
  type ExploreFilters,
  type Location,
  type ServiceExploreFilters,
} from "@/types/location";
import {
  Camera,
  Disc3,
  Gift,
  GitCompareArrows,
  Heart,
  Music,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type { ManagedListing, ManagedLocationListing } from "@/types/admin";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ExploreView = "list" | "compare";

const MAX_COMPARE_LOCATIONS = 3;

const EXPLORE_CATEGORIES: {
  id: ExploreCategory;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "locali", label: "Locali", icon: Sparkles },
  { id: "dj", label: "DJ", icon: Disc3 },
  { id: "fotografo", label: "Fotografo", icon: Camera },
  { id: "decorazioni", label: "Decorazioni", icon: Gift },
  { id: "altri", label: "Altri servizi", icon: Music },
];

const SEARCH_PLACEHOLDERS: Record<ExploreCategory, string> = {
  locali: "Cerca location...",
  dj: "Cerca DJ...",
  fotografo: "Cerca fotografo...",
  decorazioni: "Cerca decorazioni...",
  altri: "Cerca altri servizi...",
};

export function parseExploreCategory(value: string | null): ExploreCategory {
  if (
    value === "locali" ||
    value === "dj" ||
    value === "fotografo" ||
    value === "decorazioni" ||
    value === "altri"
  ) {
    return value;
  }
  return "locali";
}

interface ExploreScreenProps {
  eventId?: string | null;
  initialCategory?: ExploreCategory;
}

function countActiveFilters(filters: ExploreFilters): number {
  let count = 0;
  if (
    filters.minHourlyPrice > EXPLORE_PRICE_MIN ||
    filters.maxHourlyPrice < EXPLORE_PRICE_MAX
  ) {
    count++;
  }
  if (filters.guestCount > EXPLORE_GUEST_MIN) count++;
  if (filters.dateFrom !== null) count++;
  // "Tipo di festa" non deve contribuire al badge dei filtri attivi.
  const hasGeoFilter =
    !filters.allPiemonte ||
    filters.selectedComune !== null ||
    filters.geoArea !== null ||
    filters.district !== null ||
    filters.zone !== null;
  if (hasGeoFilter) count++;
  if (filters.nearMe) count++;
  return count;
}

function countServiceFilters(
  category: ExploreCategory,
  filters: ServiceExploreFilters,
): number {
  if (category === "locali" || category === "altri") return 0;

  let count = 0;
  if (category === "dj" && filters.musicType !== null) count++;
  if (
    (category === "dj" || category === "fotografo") &&
    filters.activityHours !== DEFAULT_SERVICE_EXPLORE_FILTERS.activityHours
  ) {
    count++;
  }
  if (category === "decorazioni") {
    if (filters.partyType !== null) count++;
    if (filters.viewDecorationsInPerson) count++;
    if (filters.decorationFulfillment !== null) count++;
  }
  if (filters.eventAddress.trim()) count++;
  return count;
}

function filterLocations(
  locations: Location[],
  query: string,
  filters: ExploreFilters,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return locations.filter((location) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      location.name.toLowerCase().includes(normalizedQuery) ||
      location.city.toLowerCase().includes(normalizedQuery) ||
      location.comune.toLowerCase().includes(normalizedQuery) ||
      location.address.toLowerCase().includes(normalizedQuery);

    const matchesPrice =
      location.hourlyPrice >= filters.minHourlyPrice &&
      location.hourlyPrice <= filters.maxHourlyPrice;

    const matchesCapacity = location.capacity >= filters.guestCount;

    const matchesPartyType =
      filters.partyType === null ||
      location.partyTypes.includes(filters.partyType);

    const matchesGeo = matchesGeoFilter(location, filters);
    const matchesNearMe = matchesNearMeFilter(
      location,
      filters.nearMe,
      filters.userPosition,
    );

    return (
      matchesQuery &&
      matchesPrice &&
      matchesCapacity &&
      matchesPartyType &&
      matchesGeo &&
      matchesNearMe
    );
  });
}

function getServicePriceLabel(service: ServiceProvider): string {
  return `${formatCurrency(service.price)}/${service.priceSuffix}`;
}

function filterServices(
  category: ServiceCategory,
  query: string,
  filters: ServiceExploreFilters,
  services: ServiceProvider[] = SERVICE_PROVIDERS,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return services.filter((service) => {
    const matchesCategory = service.category === category;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      service.name.toLowerCase().includes(normalizedQuery) ||
      service.description.toLowerCase().includes(normalizedQuery) ||
      service.providerZone.toLowerCase().includes(normalizedQuery);

    const matchesMusic =
      category !== "dj" ||
      filters.musicType === null ||
      service.musicTypes?.includes(filters.musicType);

    const matchesPartyType =
      category !== "decorazioni" ||
      filters.partyType === null ||
      service.partyTypes?.includes(filters.partyType);

    const matchesInPerson =
      category !== "decorazioni" ||
      !filters.viewDecorationsInPerson ||
      service.supportsInPerson === true;

    const matchesFulfillment =
      category !== "decorazioni" ||
      filters.decorationFulfillment === null ||
      service.fulfillments?.includes(filters.decorationFulfillment);

    return (
      matchesCategory &&
      matchesQuery &&
      matchesMusic &&
      matchesPartyType &&
      matchesInPerson &&
      matchesFulfillment
    );
  });
}

function getPublishedManagedLocations(listings: ManagedListing[]) {
  return listings
    .filter(
      (listing): listing is ManagedLocationListing =>
        listing.category === "locali" && listing.published,
    )
    .map((listing) => listing.location);
}

function getPublishedManagedServices(listings: ManagedListing[]): ServiceProvider[] {
  return listings.flatMap((listing) => {
    if (listing.category === "locali" || !listing.published) return [];

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
  });
}

function buildLocationHref(locationId: string, filters: ExploreFilters): string {
  const params = new URLSearchParams();
  params.set("guestCount", String(filters.guestCount));
  if (filters.partyType) params.set("partyType", filters.partyType);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);

  const query = params.toString();
  return query ? `/location/${locationId}?${query}` : `/location/${locationId}`;
}

export function ExploreScreen({
  eventId: eventIdProp,
  initialCategory,
}: ExploreScreenProps = {}) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const eventId = eventIdProp ?? searchParams.get("eventId");
  const {
    compareLocationIds,
    favoriteLocationIds,
    favoriteServiceIds,
    getEvent,
    managedListings,
    removeCompareLocation,
    toggleCompareLocation,
    toggleFavoriteLocation,
    toggleFavoriteService,
  } = useAppState();
  const eventContext = eventId ? getEvent(eventId) ?? null : null;
  const [view, setView] = useState<ExploreView>("list");
  const [activeCategory, setActiveCategory] = useState<ExploreCategory>(() =>
    initialCategory ?? parseExploreCategory(categoryParam),
  );
  const [query, setQuery] = useState("");
  const [inviteContact, setInviteContact] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [discountBannerOpen, setDiscountBannerOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const [isCategoryPending, startCategoryTransition] = useTransition();
  const [filters, setFilters] = useState<ExploreFilters>(() => ({
    ...DEFAULT_EXPLORE_FILTERS,
    dateFrom: eventContext?.date ?? DEFAULT_EXPLORE_FILTERS.dateFrom,
    dateTo: eventContext?.date ?? DEFAULT_EXPLORE_FILTERS.dateTo,
    guestCount: eventContext?.guestCount ?? DEFAULT_EXPLORE_FILTERS.guestCount,
  }));
  const [serviceFilters, setServiceFilters] =
    useState<ServiceExploreFilters>(DEFAULT_SERVICE_EXPLORE_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;

      const nextCategory =
        initialCategory ?? parseExploreCategory(categoryParam);
      setActiveCategory(nextCategory);
      setView("list");
      setDiscountBannerOpen(false);
    });

    return () => {
      cancelled = true;
    };
  }, [categoryParam, initialCategory]);

  useEffect(() => {
    if (!eventContext) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;

      setFilters((current) => ({
        ...current,
        dateFrom: eventContext.date,
        dateTo: eventContext.date,
        guestCount: eventContext.guestCount,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [eventContext]);

  const publishedManagedLocations = useMemo(
    () => getPublishedManagedLocations(managedListings),
    [managedListings],
  );
  const publishedManagedServices = useMemo(
    () => getPublishedManagedServices(managedListings),
    [managedListings],
  );
  const allLocations = useMemo(
    () =>
      Array.from(
        new Map(
          [...publishedManagedLocations, ...MOCK_LOCATIONS].map((location) => [
            location.id,
            location,
          ]),
        ).values(),
      ),
    [publishedManagedLocations],
  );
  const allServices = useMemo(
    () => [...publishedManagedServices, ...SERVICE_PROVIDERS],
    [publishedManagedServices],
  );

  const filteredLocations = useMemo(() => {
    const results = filterLocations(allLocations, deferredQuery, filters);

    if (filters.nearMe && filters.userPosition) {
      return [...results].sort(
        (a, b) =>
          distanceToLocation(filters.userPosition!, a) -
          distanceToLocation(filters.userPosition!, b),
      );
    }

    return results;
  }, [allLocations, deferredQuery, filters]);

  const filteredServices = useMemo(() => {
    if (activeCategory === "locali") return [];
    return filterServices(
      activeCategory,
      deferredQuery,
      serviceFilters,
      allServices,
    );
  }, [activeCategory, allServices, deferredQuery, serviceFilters]);

  const compareLocations = useMemo(
    () =>
      compareLocationIds
        .map((id) => allLocations.find((loc) => loc.id === id))
        .filter((loc): loc is NonNullable<typeof loc> => loc !== undefined),
    [allLocations, compareLocationIds],
  );
  useEffect(() => {
    const availableLocationIds = new Set(allLocations.map((location) => location.id));
    for (const id of compareLocationIds) {
      if (!availableLocationIds.has(id)) {
        removeCompareLocation(id);
      }
    }
  }, [allLocations, compareLocationIds, removeCompareLocation]);
  const favoriteLocationIdSet = useMemo(
    () => new Set(favoriteLocationIds),
    [favoriteLocationIds],
  );
  const compareLocationIdSet = useMemo(
    () => new Set(compareLocationIds),
    [compareLocationIds],
  );
  const favoriteServiceIdSet = useMemo(
    () => new Set(favoriteServiceIds),
    [favoriteServiceIds],
  );

  const activeFilterCount =
    activeCategory === "locali"
      ? countActiveFilters(filters)
      : countServiceFilters(activeCategory, serviceFilters);

  const selectCategory = useCallback((category: ExploreCategory) => {
    if (category === activeCategory) return;

    startCategoryTransition(() => {
      setActiveCategory(category);
      setView("list");
      setInviteSent(false);
      setDiscountBannerOpen(false);
    });
  }, [activeCategory]);

  const handleInviteSubmit = useCallback(() => {
    if (!inviteContact.trim()) return;
    setInviteSent(true);
  }, [inviteContact]);

  const handleInviteContactChange = useCallback((value: string) => {
    setInviteContact(value);
    setInviteSent(false);
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

  const openFilters = useCallback(() => {
    setFiltersOpen(true);
  }, []);

  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
  }, []);

  const buildServiceHref = useCallback((service: ServiceProvider): string => {
    const params = new URLSearchParams();
    params.set("category", service.category);
    params.set("hours", String(serviceFilters.activityHours));
    params.set("guestCount", String(eventContext?.guestCount ?? filters.guestCount));

    if (eventContext) {
      params.set("eventId", eventContext.id);
      params.set("dateFrom", eventContext.date);
      params.set("eventAddress", `${eventContext.locationName}, ${eventContext.city}`);
    } else {
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (serviceFilters.eventAddress.trim()) {
        params.set("eventAddress", serviceFilters.eventAddress.trim());
      }
    }

    return `/service/${service.id}?${params.toString()}`;
  }, [
    eventContext,
    filters.dateFrom,
    filters.dateTo,
    filters.guestCount,
    serviceFilters,
  ]);
  const locationHrefById = useMemo(
    () =>
      new Map(
        filteredLocations.map((location) => [
          location.id,
          buildLocationHref(location.id, filters),
        ]),
      ),
    [filteredLocations, filters],
  );

  return (
    <div className="space-y-5 lg:space-y-6">
      <header className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary-black">Esplora</h1>
            <p className="mt-1 text-sm text-primary-black/60">
              Esplora i servizi per la tua festa
            </p>
          </div>
          {activeCategory === "locali" && (
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
          )}
        </div>
        <div className="scrollbar-hidden smooth-scroll -mx-1 mt-3 overflow-x-auto px-1 pb-1 lg:overflow-visible">
          <div className="mx-auto flex w-max max-w-full min-w-max justify-center gap-2 rounded-3xl border border-primary-black/10 bg-primary-black/[0.03] p-2 lg:min-w-0 lg:flex-wrap">
            {EXPLORE_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => selectCategory(category.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold transition-colors duration-150",
                    activeCategory === category.id
                      ? "bg-primary-black text-white shadow-sm"
                      : "bg-background text-primary-black/65 hover:text-primary-black",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <ExploreSearchBar
        query={query}
        onQueryChange={setQuery}
        activeFilterCount={activeFilterCount}
        onOpenFilters={openFilters}
        placeholder={SEARCH_PLACEHOLDERS[activeCategory]}
      />

      {activeCategory !== "locali" && (
        <DiscountInviteBanner
          contact={inviteContact}
          sent={inviteSent}
          onContactChange={handleInviteContactChange}
          onSubmit={handleInviteSubmit}
        />
      )}

      {activeCategory === "locali" && (
        <div className="flex rounded-2xl border border-primary-black/10 bg-primary-black/[0.04] p-1">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors duration-150",
              view === "list"
                ? "bg-primary-black text-white shadow-sm"
                : "text-primary-black/50",
            )}
          >
            Location
          </button>
          <button
            type="button"
            onClick={() => setView("compare")}
            disabled={compareLocationIds.length === 0}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors duration-150",
              view === "compare"
                ? "bg-primary-black text-white shadow-sm"
                : "text-primary-black/50",
              compareLocationIds.length === 0 && "opacity-50",
            )}
          >
            <GitCompareArrows className="h-4 w-4" aria-hidden />
            Compara
            {compareLocationIds.length > 0 && (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                  view === "compare"
                    ? "bg-brand-pink text-primary-black"
                    : "bg-primary-black/10 text-primary-black/60",
                )}
              >
                {compareLocationIds.length}
              </span>
            )}
          </button>
        </div>
      )}

      {activeCategory !== "locali" ? (
        <section
          className={cn(
            "space-y-4",
            isCategoryPending && "opacity-80",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-primary-black/60">
              {filteredServices.length}{" "}
              {filteredServices.length === 1
                ? "servizio trovato"
                : "servizi trovati"}
            </p>
          </div>

          {filteredServices.length > 0 ? (
            <>
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredServices.map((service) => (
                  <li key={service.id} className="render-contained h-full">
                    <ServiceCard
                      service={service}
                      href={buildServiceHref(service)}
                      isFavorite={favoriteServiceIdSet.has(service.id)}
                      onToggleFavorite={toggleFavoriteService}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-dashed border-primary-black/15 bg-primary-black/[0.02] p-8 text-center">
                <p className="text-sm text-primary-black/60">
                  Nessun servizio corrisponde alla ricerca.
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-3 text-sm font-medium text-brand-teal"
                >
                  Resetta ricerca
                </button>
              </div>
            </div>
          )}
        </section>
      ) : view === "list" ? (
        <section
          className={cn(
            "space-y-4",
            isCategoryPending && "opacity-80",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-primary-black/60">
              {filteredLocations.length}{" "}
              {filteredLocations.length === 1
                ? "location trovata"
                : "location trovate"}
              {filters.nearMe && filters.userPosition && (
                <span className="text-brand-teal"> · ordinate per distanza</span>
              )}
            </p>
            {compareLocationIds.length > 0 && (
              <p className="text-xs text-brand-teal">
                {compareLocationIds.length}/{MAX_COMPARE_LOCATIONS} in confronto
              </p>
            )}
          </div>

          {filteredLocations.length > 0 ? (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredLocations.map((location) => (
                <li key={location.id} className="render-contained h-full">
                  <LocationCard
                    location={location}
                    isFavorite={favoriteLocationIdSet.has(location.id)}
                    isCompareSelected={compareLocationIdSet.has(location.id)}
                    onToggleFavorite={toggleFavoriteLocation}
                    onToggleCompare={toggleCompareLocation}
                    href={locationHrefById.get(location.id)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-primary-black/15 bg-primary-black/[0.02] p-8 text-center">
              <p className="text-sm text-primary-black/60">
                Nessuna location corrisponde ai criteri selezionati.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilters(DEFAULT_EXPLORE_FILTERS);
                }}
                className="mt-3 text-sm font-medium text-brand-teal"
              >
                Resetta ricerca e filtri
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-primary-black">
              Compara location
            </h2>
            <p className="mt-1 text-sm text-primary-black/60">
              Gestisci fino a {MAX_COMPARE_LOCATIONS} location e confronta prezzo,
              servizi e caparra quando ne selezioni almeno 2.
            </p>
          </div>

          <CompareFavorites
            locations={compareLocations}
            onRemove={removeCompareLocation}
          />
        </section>
      )}

      <ExploreFiltersSheet
        open={filtersOpen}
        activeCategory={activeCategory}
        filters={filters}
        serviceFilters={serviceFilters}
        eventContext={eventContext}
        onClose={closeFilters}
        onApply={setFilters}
        onApplyServiceFilters={setServiceFilters}
      />
    </div>
  );
}

const ServiceCard = memo(function ServiceCard({
  service,
  href,
  isFavorite,
  onToggleFavorite,
}: {
  service: ServiceProvider;
  href: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <Link
      href={href}
      className="block h-full overflow-hidden rounded-2xl border border-primary-black/12 bg-background shadow-sm transition-colors duration-150 hover:border-primary-black"
    >
      {service.imageUrl && (
        <div className="relative aspect-[16/9] bg-primary-black/[0.03]">
          <Image
            src={service.imageUrl}
            alt={service.name}
            fill
            className="object-cover"
            sizes="(max-width: 448px) 100vw, 360px"
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-primary-black">
            {service.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-primary-black/60">
            {service.description}
          </p>
          <p className="mt-2 truncate text-xs text-primary-black/45">
            {service.providerZone}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary-black px-3 py-1.5 text-xs font-bold text-white">
          {getServicePriceLabel(service)}
        </span>
      </div>
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleFavorite(service.id);
          }}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition-colors",
            isFavorite
              ? "border-brand-pink bg-brand-pink text-white"
              : "border-primary-black/10 bg-primary-black/[0.02] text-primary-black/65 hover:border-brand-pink/40 hover:text-brand-pink",
          )}
          aria-label={
            isFavorite
              ? `Rimuovi ${service.name} dai preferiti`
              : `Aggiungi ${service.name} ai preferiti`
          }
        >
          <Heart
            className="h-3.5 w-3.5"
            fill={isFavorite ? "currentColor" : "none"}
            aria-hidden
          />
          {isFavorite ? "Nei preferiti" : "Aggiungi ai preferiti"}
        </button>
      </div>
    </Link>
  );
});
