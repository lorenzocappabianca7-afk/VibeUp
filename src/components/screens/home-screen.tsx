"use client";

import { LocationCard } from "@/components/explore/location-card";
import { PartyWizard } from "@/components/home/party-wizard";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/context/app-state-context";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { useProfileCommunications } from "@/context/profile-communications-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { getRequestStatusShortLabel } from "@/lib/availability/request-status-display";
import { MOCK_LOCATIONS } from "@/lib/mock/locations";
import { formatDate } from "@/lib/utils";
import { isManagedListingLive } from "@/types/admin";
import type { Location } from "@/types/location";
import { Bell, ChevronRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

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

export function HomeScreen() {
  const { homeBannerText } = usePartyCriteria();
  const { setTab } = useTabNavigation();
  const { currentUser, events, favoriteLocationIds, managedListings, toggleFavoriteLocation } =
    useAppState();
  const { communications } = useProfileCommunications();
  const { requests } = useAvailabilityRequests();
  const [wizardOpen, setWizardOpen] = useState(false);

  function handleToggleFavorite(id: string) {
    toggleFavoriteLocation(id);
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

  return (
    <div className="min-w-0 space-y-6 pb-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-teal via-brand-teal/85 to-brand-pink/70 p-5 text-ink-inverse shadow-sm">
        <div className="relative z-10">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-inverse/75">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            VibeUp Home
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {homeBannerText}
          </h1>
          <p className="mt-2 max-w-sm text-sm font-medium text-ink-inverse/80">
            Dimmi data, invitati e stile: ti mostriamo le location più affini.
          </p>
          <Button
            className="mt-4 w-full rounded-2xl bg-paper text-ink-inverse hover:bg-paper-deep sm:w-auto"
            onClick={() => setWizardOpen(true)}
          >
            Crea la tua festa
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-primary-black">
            <Bell className="h-4 w-4 text-brand-teal" aria-hidden />
            Notifiche
          </h2>
          <button
            type="button"
            onClick={() => setTab("profile")}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-teal"
          >
            Vedi tutte
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        {visibleNotifications.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-primary-black/12 bg-primary-black/[0.02] px-4 py-5 text-center text-sm text-primary-black/50">
            Nessuna notifica per ora. Quando una richiesta cambia stato, la
            trovi qui.
          </p>
        ) : (
          <ul className="space-y-2">
            {visibleNotifications.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-primary-black/8 bg-surface px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-semibold text-primary-black">
                    {item.title}
                  </p>
                  <span className="shrink-0 text-[11px] text-primary-black/40">
                    {item.timeLabel}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-primary-black/55">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-primary-black">
          Location suggerite per te
        </h2>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {suggestedLocations.map((location) => (
            <div
              key={location.id}
              className="w-[min(78vw,18rem)] shrink-0 sm:w-72"
            >
              <LocationCard
                location={location}
                href={`/location/${location.id}`}
                isFavorite={favoriteLocationIds.includes(location.id)}
                isCompareSelected={false}
                onToggleFavorite={handleToggleFavorite}
                onToggleCompare={() => undefined}
              />
            </div>
          ))}
        </div>
      </section>

      <PartyWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
