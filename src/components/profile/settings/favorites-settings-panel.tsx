"use client";

import { SettingsShell } from "@/components/profile/settings/settings-shell";
import { SafeImage } from "@/components/ui/safe-image";
import { useAppState } from "@/context/app-state-context";
import { MOCK_LOCATIONS } from "@/lib/mock/locations";
import {
  SERVICE_PROVIDERS,
  type ServiceProvider,
} from "@/lib/mock/service-providers";
import type {
  ManagedLocationListing,
  ManagedServiceListing,
} from "@/types/admin";
import { formatCurrency, getLocationPricePresentation } from "@/lib/utils";
import { Briefcase, Heart, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

interface FavoritesSettingsPanelProps {
  onBack: () => void;
}

export function FavoritesSettingsPanel({ onBack }: FavoritesSettingsPanelProps) {
  const {
    favoriteLocationIds,
    favoriteServiceIds,
    managedListings,
    removeFavoriteLocation,
    removeFavoriteService,
  } = useAppState();

  const favoriteLocations = useMemo(() => {
    const managedLocations = managedListings
      .filter(
        (listing): listing is ManagedLocationListing =>
          listing.category === "locali" && listing.published,
      )
      .map((listing) => listing.location);
    const allLocations = Array.from(
      new Map(
        [...managedLocations, ...MOCK_LOCATIONS].map((location) => [
          location.id,
          location,
        ]),
      ).values(),
    );

    return favoriteLocationIds
      .map((id) => allLocations.find((location) => location.id === id))
      .filter((location): location is NonNullable<typeof location> =>
        Boolean(location),
      );
  }, [favoriteLocationIds, managedListings]);

  const favoriteServices = useMemo(() => {
    const managedServices: ServiceProvider[] = managedListings
      .filter(
        (listing): listing is ManagedServiceListing =>
          listing.category !== "locali" && listing.published,
      )
      .map((listing) => ({
        id: listing.id,
        category: listing.category,
        name: listing.name,
        description: listing.description,
        providerZone: listing.providerZone,
        price: listing.price,
        priceSuffix: listing.priceSuffix,
        imageUrl: listing.imageUrl,
        galleryImageUrls: listing.galleryImageUrls,
      }));
    const allServices = Array.from(
      new Map(
        [...managedServices, ...SERVICE_PROVIDERS].map((service) => [
          service.id,
          service,
        ]),
      ).values(),
    );

    return favoriteServiceIds
      .map((id) => allServices.find((service) => service.id === id))
      .filter((service): service is ServiceProvider => Boolean(service));
  }, [favoriteServiceIds, managedListings]);

  return (
    <SettingsShell
      title="I tuoi preferiti"
      subtitle="Location e servizi salvati con il cuore"
      onBack={onBack}
    >
      <section className="space-y-3 rounded-2xl border border-primary-black/10 bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-primary-black">
              <Heart className="h-4 w-4 text-brand-pink" aria-hidden />
              Location preferite
            </h2>
            <p className="mt-1 text-xs text-primary-black/55">
              Le location salvate con il cuore compariranno qui.
            </p>
          </div>
          {favoriteLocations.length > 0 && (
            <span className="rounded-full bg-brand-pink/15 px-2.5 py-1 text-xs font-bold text-brand-pink">
              {favoriteLocations.length}
            </span>
          )}
        </div>

        {favoriteLocations.length > 0 ? (
          <ul className="space-y-2">
            {favoriteLocations.map((location) => {
              const price = getLocationPricePresentation(location);
              return (
                <li
                  key={location.id}
                  className="relative overflow-hidden rounded-2xl border border-primary-black/8 bg-background"
                >
                  <Link
                    href={`/location/${location.id}`}
                    className="flex gap-3 p-2 pr-11"
                  >
                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl">
                      <SafeImage
                        src={location.imageUrl}
                        alt={location.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                    <div className="min-w-0 py-1">
                      <p className="truncate text-sm font-semibold text-primary-black">
                        {location.name}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-primary-black/50">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">
                          {location.zoneLabel} · {location.comune}
                        </span>
                      </p>
                      <p className="mt-2 text-xs font-bold text-brand-teal">
                        {price.eyebrow} {price.price} {price.unit}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold text-primary-black/45">
                        {price.badge}
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeFavoriteLocation(location.id)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background text-primary-black/45 shadow-sm transition-colors hover:text-brand-pink"
                    aria-label={`Rimuovi ${location.name} dai preferiti`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-primary-black/12 bg-background px-4 py-5 text-center">
            <p className="text-sm font-medium text-primary-black">
              Nessuna location preferita
            </p>
            <p className="mt-1 text-xs text-primary-black/55">
              Tocca il cuore su una location per salvarla qui.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-primary-black/10 bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-primary-black">
              Servizi preferiti
            </h2>
            <p className="mt-1 text-xs text-primary-black/55">
              DJ, fotografi, decorazioni e altri servizi salvati con il cuore.
            </p>
          </div>
          {favoriteServices.length > 0 && (
            <span className="rounded-full bg-brand-pink/15 px-2.5 py-1 text-xs font-bold text-brand-pink">
              {favoriteServices.length}
            </span>
          )}
        </div>

        {favoriteServices.length > 0 ? (
          <ul className="space-y-2">
            {favoriteServices.map((service) => (
              <li
                key={service.id}
                className="relative overflow-hidden rounded-2xl border border-primary-black/8 bg-background"
              >
                <Link
                  href={`/service/${service.id}?category=${service.category}`}
                  className="flex gap-3 p-2 pr-11"
                >
                  <div className="relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-teal/10 text-brand-teal">
                    {service.imageUrl ? (
                      <SafeImage
                        src={service.imageUrl}
                        alt={service.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <Briefcase className="h-6 w-6" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="truncate text-sm font-semibold text-primary-black">
                      {service.name}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-primary-black/50">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">{service.providerZone}</span>
                    </p>
                    <p className="mt-2 text-xs font-bold text-brand-teal">
                      {formatCurrency(service.price)}/{service.priceSuffix}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => removeFavoriteService(service.id)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background text-primary-black/45 shadow-sm transition-colors hover:text-brand-pink"
                  aria-label={`Rimuovi ${service.name} dai preferiti`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-primary-black/12 bg-background px-4 py-5 text-center">
            <p className="text-sm font-medium text-primary-black">
              Nessun servizio preferito
            </p>
            <p className="mt-1 text-xs text-primary-black/55">
              Tocca il cuore su DJ, fotografi, decorazioni o altri servizi per
              salvarli qui.
            </p>
          </div>
        )}
      </section>
    </SettingsShell>
  );
}
