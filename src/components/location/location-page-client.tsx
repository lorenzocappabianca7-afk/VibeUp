"use client";

import { LocationDetailView } from "@/components/location/location-detail-view";
import { useAppState } from "@/context/app-state-context";
import { getLocationById } from "@/lib/location";
import type { ManagedLocationListing } from "@/types/admin";
import Link from "next/link";

interface LocationPageClientProps {
  id: string;
  initialQuoteContext?: {
    guestCount?: string;
    partyType?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export function LocationPageClient({
  id,
  initialQuoteContext,
}: LocationPageClientProps) {
  const { managedListings } = useAppState();
  const managedLocation = managedListings.find(
    (listing): listing is ManagedLocationListing =>
      listing.category === "locali" &&
      listing.published &&
      listing.location.id === id,
  );
  const location = managedLocation?.location ?? getLocationById(id);

  if (!location) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-md bg-background px-4 pt-8 lg:max-w-6xl lg:px-8">
        <div className="rounded-2xl border border-primary-black/10 p-6 text-center">
          <h1 className="text-xl font-bold text-primary-black">
            Location non trovata
          </h1>
          <p className="mt-2 text-sm text-primary-black/60">
            Questa pubblicazione non e&apos; disponibile o non e&apos; stata ancora pubblicata.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-2xl bg-brand-teal px-5 py-3 text-sm font-bold text-white"
          >
            Torna a Esplora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background px-4 pt-6 shadow-none sm:shadow-[0_0_60px_-15px_rgba(15,15,17,0.12)] lg:max-w-6xl lg:px-8 lg:pt-8">
      <LocationDetailView
        location={location}
        initialQuoteContext={initialQuoteContext}
      />
    </div>
  );
}
