"use client";

import { DjCard } from "@/components/explore/dj-card";
import { LocationCard } from "@/components/explore/location-card";
import { DemoHomeLockedDim } from "@/components/demo/demo-confy-guide";
import { DemoHomeCreateWrap } from "@/components/demo/demo-home-tip";
import { PartyWizard } from "@/components/home/party-wizard";
import { HorizontalTouchScroll } from "@/components/ui/horizontal-touch-scroll";
import { queueExploreCategory } from "@/components/screens/explore-screen";
import { useAppState } from "@/context/app-state-context";
import { useDemoMode } from "@/context/demo-mode-context";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { useProfileCommunications } from "@/context/profile-communications-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { getRequestStatusShortLabel } from "@/lib/availability/request-status-display";
import { withDemoShell } from "@/lib/demo/shell";
import { replaceHomeHref } from "@/lib/home-navigation";
import { buildLocationHrefFromCriteria } from "@/lib/location-href";
import { MOCK_LOCATIONS } from "@/lib/mock/locations";
import {
  SERVICE_PROVIDERS,
  type ServiceProvider,
} from "@/lib/mock/service-providers";
import { formatDate } from "@/lib/utils";
import {
  isManagedListingLive,
  type ManagedServiceListing,
} from "@/types/admin";
import type { ExploreCategory, Location } from "@/types/location";
import type { PartyCriteria } from "@/types/party-criteria";
import { ArrowRight, Bell, Building2, Cake, Camera, ChevronRight, Disc3, Gift, ShieldCheck, UtensilsCrossed } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type HomeNotification = {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
};

function formatRelative(iso: string) {
  const stamp = Date.parse(iso);
  if (!Number.isFinite(stamp)) return "";
  const diff = Date.now() - stamp;
  if (diff < 60_000) return "Ora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min fa`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ore fa`;
  return formatDate(iso);
}

function managedListingToDj(listing: ManagedServiceListing): ServiceProvider {
  return {
    id: listing.id,
    category: "dj",
    name: listing.name,
    description: listing.description,
    providerZone: listing.providerZone,
    price: listing.price,
    priceSuffix: listing.priceSuffix,
    imageUrl: listing.imageUrl,
    galleryImageUrls: listing.galleryImageUrls,
    musicTypes: listing.musicTypes,
    partyTypes: listing.partyTypes,
  };
}

const HOME_PARTY_PICKS: {
  id: ExploreCategory;
  label: string;
  icon: typeof Building2;
  tint: string;
}[] = [
  { id: "locali", label: "Location", icon: Building2, tint: "bg-brand-teal/20 text-brand-teal" },
  { id: "dj", label: "DJ", icon: Disc3, tint: "bg-brand-pink/20 text-brand-pink" },
  { id: "fotografo", label: "Fotografo", icon: Camera, tint: "bg-[#4A8FE7]/20 text-[#8EB6F2]" },
  { id: "altri", label: "Torta", icon: Cake, tint: "bg-[#E8A54B]/20 text-[#E8A54B]" },
  { id: "altri", label: "Security", icon: ShieldCheck, tint: "bg-brand-teal/20 text-brand-teal" },
  { id: "altri", label: "Catering", icon: UtensilsCrossed, tint: "bg-brand-pink/20 text-brand-pink" },
  { id: "decorazioni", label: "Decorazioni", icon: Gift, tint: "bg-[#2BB673]/20 text-[#3DDB8C]" },
];

function buildDjHrefFromCriteria(djId: string, criteria: PartyCriteria): string {
  const params = new URLSearchParams();
  params.set("category", "dj");
  if (criteria.guestCount) {
    params.set("guestCount", String(criteria.guestCount));
  }
  if (criteria.dates.length > 0) {
    params.set("dates", criteria.dates.join(","));
  }
  if (criteria.dateFrom) params.set("dateFrom", criteria.dateFrom);
  if (criteria.dateTo) params.set("dateTo", criteria.dateTo);
  return `/service/${djId}?${params.toString()}`;
}

export function HomeScreen() {
  const { criteria, servicesStepRequest } = usePartyCriteria();
  const { isDemoMode, dismissHomeTip } = useDemoMode();
  const { setTab } = useTabNavigation();
  const {
    currentUser,
    events,
    favoriteLocationIds,
    favoriteServiceIds,
    managedListings,
    toggleFavoriteLocation,
    toggleFavoriteService,
  } = useAppState();
  const { communications } = useProfileCommunications();
  const { requests } = useAvailabilityRequests();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStart, setWizardStart] = useState<"services" | null>(null);
  const seenServicesRequest = useRef(0);

  useEffect(() => {
    if (
      servicesStepRequest === 0 ||
      servicesStepRequest === seenServicesRequest.current
    ) {
      return;
    }
    seenServicesRequest.current = servicesStepRequest;
    setWizardStart("services");
    setWizardOpen(true);
  }, [servicesStepRequest]);

  function openPartyPick(category: ExploreCategory) {
    if (isDemoMode) {
      dismissHomeTip();
      setWizardStart(null);
      setWizardOpen(true);
      return;
    }
    queueExploreCategory(category);
    setTab("explore");
    replaceHomeHref(withDemoShell(`/?tab=explore&category=${category}`, false));
  }

  function handleToggleFavorite(id: string) {
    toggleFavoriteLocation(id);
  }

  function handleToggleFavoriteDj(id: string) {
    toggleFavoriteService(id);
  }

  const notifications = useMemo(() => {
    const items: HomeNotification[] = [];

    for (const request of requests) {
      if (request.requesterUserId !== currentUser.id) continue;
      if (
        request.status !== "pending_user_confirm" &&
        request.status !== "pending_user_review_proposal" &&
        request.status !== "declined" &&
        request.status !== "expired" &&
        request.status !== "confirmed"
      ) {
        continue;
      }
      items.push({
        id: `req-${request.id}`,
        title: getRequestStatusShortLabel(
          request.status,
          request.confirmationDeadline,
        ),
        body: `${request.eventPayload.title} · ${request.locationName}`,
        timeLabel: formatRelative(request.updatedAt),
      });
    }

    for (const item of communications) {
      if (item.kind === "deposit_policy") continue;
      items.push({
        id: item.id,
        title: item.title,
        body: item.body,
        timeLabel: formatRelative(item.createdAt),
      });
    }

    return items.slice(0, 8);
  }, [communications, currentUser.id, requests]);

  const visibleNotifications = notifications.slice(0, 4);

  const suggestedLocations = useMemo(() => {
    const byId = new Map<string, Location>();
    for (const loc of MOCK_LOCATIONS) byId.set(loc.id, loc);
    for (const listing of managedListings) {
      if (
        listing.category === "locali" &&
        isManagedListingLive(listing) &&
        "location" in listing
      ) {
        byId.set(listing.location.id, listing.location);
      }
    }

    const favorites = favoriteLocationIds
      .map((id) => byId.get(id))
      .filter((loc): loc is Location => Boolean(loc));

    const fromEvents = events
      .map((event) =>
        event.locationId ? byId.get(event.locationId) : undefined,
      )
      .filter((loc): loc is Location => Boolean(loc));

    const rest = [...byId.values()].sort(
      (a, b) => b.contactsBeenHere.count - a.contactsBeenHere.count,
    );

    const merged = [...favorites, ...fromEvents, ...rest];
    const unique: Location[] = [];
    const seen = new Set<string>();
    for (const loc of merged) {
      if (seen.has(loc.id)) continue;
      seen.add(loc.id);
      unique.push(loc);
      if (unique.length >= 8) break;
    }
    return unique;
  }, [events, favoriteLocationIds, managedListings]);

  const suggestedDjs = useMemo(() => {
    const byId = new Map<string, ServiceProvider>();
    for (const service of SERVICE_PROVIDERS) {
      if (service.category === "dj") byId.set(service.id, service);
    }
    for (const listing of managedListings) {
      if (listing.category === "dj" && isManagedListingLive(listing)) {
        byId.set(listing.id, managedListingToDj(listing));
      }
    }

    const favorites = favoriteServiceIds
      .map((id) => byId.get(id))
      .filter((dj): dj is ServiceProvider => Boolean(dj));

    const fromEvents = events.flatMap((event) =>
      event.services
        .filter((service) => service.category === "dj")
        .map((service) => {
          const needle = service.providerName.trim().toLowerCase();
          return [...byId.values()].find(
            (dj) => dj.name.trim().toLowerCase() === needle,
          );
        }),
    ).filter((dj): dj is ServiceProvider => Boolean(dj));

    const rest = [...byId.values()];
    const merged = [...favorites, ...fromEvents, ...rest];
    const unique: ServiceProvider[] = [];
    const seen = new Set<string>();
    for (const dj of merged) {
      if (seen.has(dj.id)) continue;
      seen.add(dj.id);
      unique.push(dj);
      if (unique.length >= 8) break;
    }
    return unique;
  }, [events, favoriteServiceIds, managedListings]);

  return (
    <div className="min-w-0 w-full max-w-full space-y-5 lg:space-y-6">
      <h1 className="flex min-w-0 max-w-full items-baseline justify-center gap-[0.16em] font-[family-name:var(--font-brand)] text-[1.75rem] font-bold tracking-tight text-white">
        <span className="shrink-0">
          <span className="text-brand-teal">V</span>ibe
          <span className="text-brand-pink">U</span>p
        </span>
        <span className="inline-block shrink-0 font-[family-name:var(--font-events-script)] text-[1.15rem] font-medium leading-none text-white">
          events
        </span>
      </h1>

      <section className="min-w-0 max-w-full rounded-2xl border border-brand-teal/25 bg-brand-teal/10 p-5">
        <h2 className="max-w-full text-pretty text-[2rem] font-bold leading-tight tracking-tight text-primary-black">
          Organizza il tuo 18
        </h2>
        <p className="mt-2 text-sm font-medium text-primary-black/55">
          Location, DJ, fotografo e tutto il resto. In un&apos;unica app.
        </p>
        <DemoHomeCreateWrap>
          <button
            type="button"
            onClick={() => {
              setWizardStart(null);
              setWizardOpen(true);
            }}
            className="mt-4 flex h-[60px] w-full items-center justify-between rounded-2xl bg-brand-pink px-5 text-lg font-bold text-[#0F1115]"
          >
            Crea la tua festa
            <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
        </DemoHomeCreateWrap>
        <DemoHomeLockedDim className="mt-4 min-w-0">
          <h3 className="text-sm font-bold text-primary-black">Tutto per la tua festa</h3>
          <HorizontalTouchScroll className="mt-2 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-2">
              {HOME_PARTY_PICKS.map((pick) => {
                const Icon = pick.icon;
                return (
                  <button
                    key={pick.label}
                    type="button"
                    onClick={() => openPartyPick(pick.id)}
                    className="flex h-24 w-[84px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl bg-surface px-1"
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${pick.tint}`}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-center text-[11px] font-bold leading-tight text-primary-black">
                      {pick.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </HorizontalTouchScroll>
        </DemoHomeLockedDim>
      </section>

      <DemoHomeLockedDim className="min-w-0 max-w-full">
      {isDemoMode ? null : <section className="min-w-0 max-w-full space-y-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold text-primary-black">
            <Bell className="h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
            Notifiche
          </h2>
          <button
            type="button"
            onClick={() => setTab("profile")}
            className="touch-target inline-flex shrink-0 items-center justify-center gap-0.5 px-1 text-xs font-semibold text-brand-teal"
          >
            Vedi tutte
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        {visibleNotifications.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-primary-black/15 bg-primary-black/[0.02] px-4 py-8 text-center text-sm text-primary-black/50">
            Nessuna notifica per ora. Quando una richiesta cambia stato, la
            trovi qui.
          </p>
        ) : (
          <ul className="space-y-2">
            {visibleNotifications.map((item) => (
              <li key={item.id}>
                <div className="rounded-2xl border border-primary-black/8 bg-background p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-primary-black">
                      {item.title}
                    </p>
                    <span className="shrink-0 text-[11px] text-primary-black/40">
                      {item.timeLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-primary-black/55">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>}

      <section className="min-w-0 max-w-full space-y-3">
        <h2 className="text-lg font-bold text-primary-black">
          Location suggerite per te
        </h2>
        <HorizontalTouchScroll className="pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-3">
          {suggestedLocations.map((location) => (
            <div
              key={location.id}
              className="w-[16.5rem] shrink-0"
            >
              <LocationCard
                location={location}
                href={buildLocationHrefFromCriteria(location.id, criteria)}
                isFavorite={favoriteLocationIds.includes(location.id)}
                isCompareSelected={false}
                showCompare={false}
                onToggleFavorite={handleToggleFavorite}
                onToggleCompare={() => undefined}
              />
            </div>
          ))}
          </div>
        </HorizontalTouchScroll>
      </section>

      {suggestedDjs.length > 0 ? (
        <section className="min-w-0 max-w-full space-y-3">
          <h2 className="text-lg font-bold text-primary-black">
            DJ suggeriti per te
          </h2>
          <HorizontalTouchScroll className="pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-3">
            {suggestedDjs.map((dj) => (
              <div
                key={dj.id}
                className="w-[16.5rem] shrink-0"
              >
                <DjCard
                  dj={dj}
                  href={buildDjHrefFromCriteria(dj.id, criteria)}
                  isFavorite={favoriteServiceIds.includes(dj.id)}
                  onToggleFavorite={handleToggleFavoriteDj}
                />
              </div>
            ))}
            </div>
          </HorizontalTouchScroll>
        </section>
      ) : null}
      </DemoHomeLockedDim>

      <PartyWizard
        open={wizardOpen}
        startStep={wizardStart}
        onClose={() => {
          setWizardOpen(false);
          setWizardStart(null);
        }}
      />
    </div>
  );
}
