import { LocationPageClient } from "@/components/location/location-page-client";
import { pageMetadata } from "@/lib/seo";
import { resolvePublicLocation } from "@/lib/resolve-public-listing";
import type { Location } from "@/types/location";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface LocationPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    guestCount?: string;
    partyType?: string;
    dateFrom?: string;
    dateTo?: string;
    dates?: string;
  }>;
}

function locationPageMetadata(location: Location): Metadata {
  const where = location.zoneLabel
    ? `${location.city}, ${location.zoneLabel}`
    : location.city;
  return pageMetadata({
    title: location.name,
    description: `${location.name} a ${where}: ${location.description}`,
    path: `/location/${location.id}`,
    image: location.imageUrl
      ? {
          url: location.imageUrl,
          alt: `Foto di ${location.name}`,
        }
      : undefined,
  });
}

export async function generateMetadata({
  params,
}: LocationPageProps): Promise<Metadata> {
  const { id } = await params;
  const location = await resolvePublicLocation(id);
  if (!location) notFound();
  return locationPageMetadata(location);
}

export default async function LocationPage({
  params,
  searchParams,
}: LocationPageProps) {
  const { id } = await params;
  const location = await resolvePublicLocation(id);
  if (!location) notFound();

  const initialQuoteContext = await searchParams;
  return (
    <LocationPageClient
      id={id}
      initialLocation={location}
      initialQuoteContext={initialQuoteContext}
    />
  );
}
