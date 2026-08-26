"use client";

import { CompareFavorites } from "@/components/explore/compare-favorites";
import { DiscountInviteBanner } from "@/components/discount-invite-banner";
import { ExploreSearchBar } from "@/components/explore/explore-search-bar";
import { LocationCard } from "@/components/explore/location-card";
import { useAccountGate } from "@/context/account-gate-context";
import { useAppState } from "@/context/app-state-context";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { buildLocationHrefFromCriteria } from "@/lib/location-href";
import { MOCK_LOCATIONS } from "@/lib/mock/locations";
import {
  estimateLocationTotalCost,
  rankLocationsByKeywords,
} from "@/lib/rank-locations-by-keywords";
import {
  SERVICE_PROVIDERS,
  type ServiceCategory,
  type ServiceProvider,
} from "@/lib/mock/service-providers";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  EXPLORE_GUEST_MIN,
  type ExploreCategory,
  type Location,
} from "@/types/location";
import type { PartyCriteria } from "@/types/party-criteria";
import {
  Building2,
  Camera,
  ChevronDown,
  Disc3,
  Gift,
  GitCompareArrows,
  Heart,
  Megaphone,
  Music,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  memo,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type { ManagedListing, ManagedLocationListing } from "@/types/admin";
import { isManagedListingLive } from "@/types/admin";
import { SoftNavLink } from "@/components/navigation/soft-nav-link";
import {
  ImageCarousel,
  uniqueImages,
} from "@/components/ui/image-carousel";
import { SafeImage } from "@/components/ui/safe-image";
import { useSearchParams } from "next/navigation";

type ExploreView = "list" | "compare";

/**
 * useSearchParams() suspends. Keep it in a nested boundary so Esplora
 * paints immediately instead of leaving a blank shell (footer + nav only).
 */
function ExploreUrlParamsSync({
  onCategory,
  onEventId,
  onView,
}: {
  onCategory: (value: string | null) => void;
  onEventId: (value: string | null) => void;
  onView: (value: string | null) => void;
}) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const eventId = searchParams.get("eventId");
  const view = searchParams.get("view");

  useEffect(() => {
    onCategory(category);
    onEventId(eventId);
    onView(view);
  }, [category, eventId, onCategory, onEventId, onView, view]);

  return null;
}
const MAX_COMPARE_LOCATIONS = 3;

const EXPLORE_CATEGORIES: {
  id: ExploreCategory;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  activeClass: string;
}[] = [
  {
    id: "locali",
    label: "Locali",
    icon: Building2,
    iconClass: "text-primary-black/65",
    activeClass: "bg-brand-teal text-ink-inverse shadow-sm",
  },
  {
    id: "dj",
    label: "DJ",
    icon: Disc3,
    iconClass: "text-primary-black/65",
    activeClass: "bg-brand-teal text-ink-inverse shadow-sm",
  },
  {
    id: "fotografo",
    label: "Fotografo",
    icon: Camera,
    iconClass: "text-primary-black/65",
    activeClass: "bg-brand-teal text-ink-inverse shadow-sm",
  },
  {
    id: "decorazioni",
    label: "Decorazioni",
    icon: Gift,
    iconClass: "text-primary-black/65",
    activeClass: "bg-brand-teal text-ink-inverse shadow-sm",
  },
  {
    id: "altri",
    label: "Altri servizi",
    icon: Music,
    iconClass: "text-primary-black/65",
    activeClass: "bg-brand-teal text-ink-inverse shadow-sm",
  },
];

const SEARCH_PLACEHOLDERS: Record<ExploreCategory, string> = {
  locali: "Cerca location...",
  dj: "Cerca DJ...",
  fotografo: "Cerca fotografo...",
  decorazioni: "Cerca negozi...",
  altri: "Cerca altri servizi...",
};

const SERVICE_INVITE_CATEGORY_LABELS: Record<
  "dj" | "fotografo" | "decorazioni",
  string
> = {
  dj: "DJ",
  fotografo: "fotografo",
  decorazioni: "servizio di decorazioni",
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

/**
 * Hard filters from Home wizard (guests + budget). Search query is name/city only.
 * Free-text description is applied later as ranking, never as an excluding filter.
 * Date is booking context for detail links — catalog has no per-location availability.
 */
function filterLocationsByPartyCriteria(
  locations: Location[],
  query: string,
  criteria: PartyCriteria,
  hasAppliedCriteria: boolean,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const guestCount = hasAppliedCriteria ? criteria.guestCount : null;
  const budgetMin = hasAppliedCriteria ? criteria.budgetMin : null;
  const budgetMax = hasAppliedCriteria ? criteria.budgetMax : null;

  return locations.filter((location) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      location.name.toLowerCase().includes(normalizedQuery) ||
      location.city.toLowerCase().includes(normalizedQuery) ||
      location.comune.toLowerCase().includes(normalizedQuery) ||
      location.address.toLowerCase().includes(normalizedQuery) ||
      location.zoneLabel.toLowerCase().includes(normalizedQuery);

    const matchesCapacity =
      guestCount == null || location.capacity >= guestCount;

    const estimatedCost = estimateLocationTotalCost(
      location,
      guestCount ?? EXPLORE_GUEST_MIN,
    );
    const matchesBudgetMax =
      budgetMax == null || estimatedCost <= budgetMax;
    const matchesBudgetMin =
      budgetMin == null || estimatedCost >= budgetMin;

    return matchesQuery && matchesCapacity && matchesBudgetMax && matchesBudgetMin;
  });
}

function getServicePriceLabel(service: ServiceProvider): string {
  return `${formatCurrency(service.price)}/${service.priceSuffix}`;
}

function filterServices(
  category: ServiceCategory,
  query: string,
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

    return matchesCategory && matchesQuery;
  });
}

function getPublishedManagedLocations(listings: ManagedListing[]) {
  return listings
    .filter(
      (listing): listing is ManagedLocationListing =>
        listing.category === "locali" && isManagedListingLive(listing),
    )
    .map((listing) => listing.location);
}

function getPublishedManagedServices(listings: ManagedListing[]): ServiceProvider[] {
  return listings.flatMap((listing) => {
    if (listing.category === "locali" || !isManagedListingLive(listing)) return [];

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

export function ExploreScreen({
  eventId: eventIdProp,
  initialCategory,
}: ExploreScreenProps = {}) {
  const [categoryParam, setCategoryParam] = useState<string | null>(null);
  const [urlEventId, setUrlEventId] = useState<string | null>(null);
  const [viewParam, setViewParam] = useState<string | null>(null);
  const onCategoryParam = useCallback((value: string | null) => {
    setCategoryParam(value);
  }, []);
  const onEventIdParam = useCallback((value: string | null) => {
    setUrlEventId(value);
  }, []);
  const onViewParam = useCallback((value: string | null) => {
    setViewParam(value);
  }, []);
  const eventId = eventIdProp ?? urlEventId;
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
  const { requireAccount } = useAccountGate();
  const { activeTab } = useTabNavigation();
  const { criteria, hasAppliedCriteria, clearCriteria } = usePartyCriteria();

  function handleToggleFavoriteLocation(id: string) {
    if (favoriteLocationIds.includes(id)) {
      toggleFavoriteLocation(id);
      return;
    }

    requireAccount(
      () => toggleFavoriteLocation(id),
      "Per salvare un locale tra i preferiti crea un account.",
    );
  }

  function handleToggleFavoriteService(id: string) {
    if (favoriteServiceIds.includes(id)) {
      toggleFavoriteService(id);
      return;
    }

    requireAccount(
      () => toggleFavoriteService(id),
      "Per salvare un servizio tra i preferiti crea un account.",
    );
  }

  function handleToggleCompareLocation(id: string) {
    if (compareLocationIds.includes(id)) {
      toggleCompareLocation(id);
      return;
    }

    requireAccount(
      () => toggleCompareLocation(id),
      "Per aggiungere un locale al confronto crea un account.",
    );
  }
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

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;

      const nextCategory =
        initialCategory ?? parseExploreCategory(categoryParam);
      setActiveCategory(nextCategory);
      setView(viewParam === "compare" ? "compare" : "list");
      setDiscountBannerOpen(false);
    });

    return () => {
      cancelled = true;
    };
  }, [categoryParam, initialCategory, viewParam]);

  const [catalogLocations, setCatalogLocations] = useState<Location[]>([]);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/catalog/listings")
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          locations?: Location[];
        };
        if (!cancelled && Array.isArray(payload.locations)) {
          setCatalogLocations(payload.locations);
        }
      })
      .catch(() => {
        /* keep mock + local managed listings */
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
          [
            ...MOCK_LOCATIONS,
            ...catalogLocations,
            ...publishedManagedLocations,
          ].map((location) => [location.id, location]),
        ).values(),
      ),
    [catalogLocations, publishedManagedLocations],
  );
  const allServices = useMemo(
    () => [...publishedManagedServices, ...SERVICE_PROVIDERS],
    [publishedManagedServices],
  );

  const filteredLocations = useMemo(() => {
    const hardFiltered = filterLocationsByPartyCriteria(
      allLocations,
      deferredQuery,
      criteria,
      hasAppliedCriteria,
    );

    const freeText = hasAppliedCriteria ? criteria.freeText : "";
    return rankLocationsByKeywords(hardFiltered, freeText);
  }, [allLocations, criteria, deferredQuery, hasAppliedCriteria]);

  const filteredServices = useMemo(() => {
    if (activeCategory === "locali") return [];
    return filterServices(activeCategory, deferredQuery, allServices);
  }, [activeCategory, allServices, deferredQuery]);

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

  const searchSuggestions = useMemo(() => {
    if (activeCategory === "locali") {
      return allLocations.slice(0, 10).map((location) => ({
        id: location.id,
        label: location.name,
        subtitle: [location.city, location.zoneLabel].filter(Boolean).join(" · "),
      }));
    }

    return allServices
      .filter((service) => service.category === activeCategory)
      .slice(0, 10)
      .map((service) => ({
        id: service.id,
        label: service.name,
        subtitle: service.providerZone,
      }));
  }, [activeCategory, allLocations, allServices]);

  const effectiveGuestCount =
    criteria.guestCount ?? eventContext?.guestCount ?? EXPLORE_GUEST_MIN;
  const effectiveDateFrom = criteria.dateFrom ?? eventContext?.date ?? null;
  const effectiveDateTo =
    criteria.dateTo ?? criteria.dateFrom ?? eventContext?.date ?? null;

  const criteriaSummary = useMemo(() => {
    if (!hasAppliedCriteria) return null;
    const parts: string[] = [];
    if (criteria.dates.length > 0) {
      parts.push(
        criteria.dates.map((value) => formatDate(value)).join(" · "),
      );
    } else if (criteria.dateFrom) {
      const fromLabel = formatDate(criteria.dateFrom);
      const toLabel =
        criteria.dateTo && criteria.dateTo !== criteria.dateFrom
          ? formatDate(criteria.dateTo)
          : null;
      parts.push(toLabel ? `${fromLabel} – ${toLabel}` : fromLabel);
    }
    if (criteria.guestCount) parts.push(`${criteria.guestCount} invitati`);
    if (criteria.budgetMin != null && criteria.budgetMin > 0 && criteria.budgetMax) {
      parts.push(
        `${formatCurrency(criteria.budgetMin)}–${formatCurrency(criteria.budgetMax)}`,
      );
    } else if (criteria.budgetMax) {
      parts.push(`fino a ${formatCurrency(criteria.budgetMax)}`);
    }
    if (criteria.freeText.trim()) parts.push("ordinato per descrizione");
    return parts.length > 0 ? parts.join(" · ") : "Criteri dalla Home";
  }, [criteria, hasAppliedCriteria]);

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

  const buildServiceHref = useCallback((service: ServiceProvider): string => {
    const params = new URLSearchParams();
    params.set("category", service.category);
    params.set("hours", "4");
    params.set("guestCount", String(effectiveGuestCount));

    if (eventContext) {
      params.set("eventId", eventContext.id);
      params.set("dateFrom", eventContext.date);
      params.set(
        "eventAddress",
        `${eventContext.locationName}, ${eventContext.city}`,
      );
    } else {
      if (effectiveDateFrom) params.set("dateFrom", effectiveDateFrom);
      if (effectiveDateTo) params.set("dateTo", effectiveDateTo);
    }

    return `/service/${service.id}?${params.toString()}`;
  }, [
    effectiveDateFrom,
    effectiveDateTo,
    effectiveGuestCount,
    eventContext,
  ]);
  const locationHrefById = useMemo(
    () =>
      new Map(
        filteredLocations.map((location) => [
          location.id,
          buildLocationHrefFromCriteria(location.id, criteria, {
            guestCount: eventContext?.guestCount,
            date: eventContext?.date,
          }),
        ]),
      ),
    [criteria, eventContext?.date, eventContext?.guestCount, filteredLocations],
  );

  return (
    <div className="min-w-0 space-y-5 lg:space-y-6">
      <Suspense fallback={null}>
        <ExploreUrlParamsSync
          onCategory={onCategoryParam}
          onEventId={onEventIdParam}
          onView={onViewParam}
        />
      </Suspense>
      <header className="relative min-w-0 space-y-4">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-extrabold tracking-tight text-primary-black">
            Esplora
          </h1>
          <p className="mt-1 text-sm text-primary-black/60">
            Location e servizi per la tua festa
          </p>
        </div>
        <div className="rounded-3xl border border-primary-black/10 bg-primary-black/[0.03] p-1.5">
          <div className="-mx-0.5 flex min-w-0 flex-nowrap items-stretch gap-1.5 overflow-x-auto px-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {EXPLORE_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => selectCategory(category.id)}
                  className={cn(
                    "flex shrink-0 items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 transition-colors duration-150",
                    isActive
                      ? category.activeClass
                      : "bg-surface text-primary-black/55 hover:bg-surface-2 hover:text-primary-black/80",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-ink-inverse" : category.iconClass,
                    )}
                    aria-hidden
                  />
                  <span className="whitespace-nowrap text-xs font-semibold leading-none sm:text-sm">
                    {category.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <ExploreSearchBar
        key={activeCategory}
        query={query}
        onQueryChange={setQuery}
        placeholder={SEARCH_PLACEHOLDERS[activeCategory]}
        suggestions={searchSuggestions}
        storageKey={`vibeup-explore-recent-${activeCategory}`}
        forceClosed={activeTab !== "explore"}
      />

      {activeCategory === "locali" && criteriaSummary ? (
        <div className="flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-brand-teal/20 bg-brand-teal/10 p-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-teal">
              Criteri dalla Home
            </p>
            <p className="mt-1 text-sm font-bold leading-snug text-primary-black">
              {criteriaSummary}
            </p>
          </div>
          <button
            type="button"
            onClick={clearCriteria}
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-brand-pink"
          >
            Rimuovi
          </button>
        </div>
      ) : null}

      {(activeCategory === "dj" || activeCategory === "fotografo") && (
        <div className="relative min-w-0">
          <button
            type="button"
            onClick={toggleDiscountBanner}
            aria-expanded={discountBannerOpen}
            className={cn(
              "flex w-full min-w-0 items-center gap-3 rounded-2xl border-2 border-brand-pink bg-gradient-to-r from-brand-pink/20 via-brand-pink/10 to-brand-teal/15 px-4 py-3 text-left transition-colors",
              discountBannerOpen
                ? "rounded-b-none border-b-0 bg-gradient-to-br from-brand-pink/15 via-surface to-brand-teal/10"
                : "hover:from-brand-pink/25 hover:to-brand-teal/20",
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-primary-black">
              <Megaphone className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black leading-snug text-primary-black">
                Ottieni sconti invitando il tuo{" "}
                {activeCategory === "dj" ? "DJ" : "fotografo"} di fiducia
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-brand-pink transition-transform",
                discountBannerOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>

          {discountBannerOpen && (
            <div className="overflow-hidden rounded-b-2xl border-2 border-t-0 border-brand-pink">
              <DiscountInviteBanner
                categoryLabel={SERVICE_INVITE_CATEGORY_LABELS[activeCategory]}
                contact={inviteContact}
                sent={inviteSent}
                onContactChange={handleInviteContactChange}
                onSubmit={handleInviteSubmit}
                className="rounded-none border-0 shadow-none"
              />
            </div>
          )}
        </div>
      )}

      {activeCategory === "locali" && (
        <div className="flex rounded-2xl border border-primary-black/10 bg-primary-black/[0.04] p-1">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors duration-150",
              view === "list"
                ? "bg-brand-teal font-semibold text-ink-inverse shadow-sm"
                : "text-primary-black/50",
            )}
          >
            Location
          </button>
          <button
            type="button"
            onClick={() => setView("compare")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors duration-150",
              view === "compare"
                ? "bg-brand-teal text-ink-inverse shadow-sm"
                : "bg-surface text-primary-black/70 hover:bg-surface-2",
            )}
          >
            <GitCompareArrows
              className={cn(
                "h-4 w-4",
                view === "compare" ? "text-ink-inverse" : "text-primary-black/70",
              )}
              strokeWidth={2.75}
              aria-hidden
            />
            Confronta
            {compareLocationIds.length > 0 && (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                  view === "compare"
                    ? "bg-ink-inverse/15 text-ink-inverse"
                    : "bg-brand-teal-strong/15 text-brand-teal-strong",
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
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className="min-w-0 text-sm text-primary-black/60">
              {filteredServices.length}{" "}
              {filteredServices.length === 1
                ? "servizio trovato"
                : "servizi trovati"}
            </p>
          </div>

          {filteredServices.length > 0 ? (
            <>
              <ul className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredServices.map((service) => (
                <li key={service.id} className="min-w-0 h-full">
                  <ServiceCard
                      service={service}
                      href={buildServiceHref(service)}
                      isFavorite={favoriteServiceIdSet.has(service.id)}
                      onToggleFavorite={handleToggleFavoriteService}
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
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className="min-w-0 text-sm text-primary-black/60">
              {filteredLocations.length}{" "}
              {filteredLocations.length === 1
                ? "location trovata"
                : "location trovate"}
              {hasAppliedCriteria && criteria.freeText.trim() ? (
                <span className="text-brand-teal">
                  {" "}
                  · ordinate per affinità
                </span>
              ) : null}
            </p>
            {compareLocationIds.length > 0 && (
              <p className="text-xs text-brand-teal">
                {compareLocationIds.length}/{MAX_COMPARE_LOCATIONS} in confronto
              </p>
            )}
          </div>

          {filteredLocations.length > 0 ? (
            <>
              <ul className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLocations.map((location, index) => (
                <li key={location.id} className="min-w-0 h-full">
                  <LocationCard
                    location={location}
                    isFavorite={favoriteLocationIdSet.has(location.id)}
                    isCompareSelected={compareLocationIdSet.has(location.id)}
                    onToggleFavorite={handleToggleFavoriteLocation}
                    onToggleCompare={handleToggleCompareLocation}
                    priority={index === 0}
                    href={locationHrefById.get(location.id)}
                  />
                </li>
              ))}
            </ul>
            {compareLocationIds.length > 0 ? (
              <div className="sticky bottom-24 z-20 sm:bottom-28">
                <button
                  type="button"
                  onClick={() => setView("compare")}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-teal px-4 py-3 text-sm font-black text-ink-inverse shadow-[0_10px_30px_-12px_rgba(62,207,207,0.9)]"
                >
                  <GitCompareArrows className="h-4 w-4" strokeWidth={2.75} aria-hidden />
                  Confronta {compareLocationIds.length} location
                </button>
              </div>
            ) : null}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-primary-black/15 bg-primary-black/[0.02] p-8 text-center">
              <p className="text-sm text-primary-black/60">
                Nessuna location corrisponde ai criteri selezionati.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  clearCriteria();
                }}
                className="mt-3 text-sm font-medium text-brand-teal"
              >
                Mostra tutto il catalogo
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-primary-black">
              Confronta location
            </h2>
            <p className="mt-1 text-sm text-primary-black/60">
              Aggiungi fino a {MAX_COMPARE_LOCATIONS} locali dai risultati,
              poi confronta prezzo, servizi e caparra quando ne selezioni almeno 2.
            </p>
          </div>

          <CompareFavorites
            locations={compareLocations}
            onRemove={removeCompareLocation}
          />
        </section>
      )}
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
  const showProfilePhoto =
    service.category === "dj" || service.category === "fotografo";
  const ProfileFallbackIcon =
    service.category === "fotografo" ? Camera : Disc3;
  const photos = uniqueImages([
    service.imageUrl,
    ...(service.galleryImageUrls ?? []),
  ]);

  return (
    <article className="h-full overflow-hidden rounded-2xl border border-primary-black/12 bg-background shadow-sm transition-colors duration-150 hover:border-primary-black">
      {showProfilePhoto ? (
        <SoftNavLink href={href} className="flex items-start gap-3 p-4">
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-primary-black/10 bg-primary-black/[0.04]">
            {service.imageUrl ? (
              <SafeImage
                src={service.imageUrl}
                alt={`Foto profilo di ${service.name}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-primary-black/35">
                <ProfileFallbackIcon className="h-6 w-6" aria-hidden />
              </span>
            )}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
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
            <span className="shrink-0 self-start rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-ink-inverse">
              {getServicePriceLabel(service)}
            </span>
          </div>
        </SoftNavLink>
      ) : (
        <>
          {photos.length > 0 && (
            <ImageCarousel
              images={photos}
              alt={service.name}
              frameClassName="aspect-[16/9]"
              sizes="(max-width: 448px) 100vw, 360px"
              showDots={photos.length > 1}
              renderSlide={(_image, _index, imageNode) => (
                <SoftNavLink href={href} className="absolute inset-0 block">
                  {imageNode}
                </SoftNavLink>
              )}
            />
          )}
          <SoftNavLink
            href={href}
            className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
          >
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
            <span className="shrink-0 self-start rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-ink-inverse">
              {getServicePriceLabel(service)}
            </span>
          </SoftNavLink>
        </>
      )}
      <div className={cn("px-4 pb-4", showProfilePhoto && "pt-0")}>
        <button
          type="button"
          onClick={() => onToggleFavorite(service.id)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition-colors",
            isFavorite
              ? "border-brand-pink bg-brand-pink text-white"
              : "border-primary-black/10 bg-paper text-ink-inverse hover:border-brand-pink/40 hover:text-brand-pink",
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
    </article>
  );
});
