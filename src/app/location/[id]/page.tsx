import { LocationPageClient } from "@/components/location/location-page-client";

interface LocationPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    guestCount?: string;
    partyType?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function LocationPage({
  params,
  searchParams,
}: LocationPageProps) {
  const { id } = await params;
  const initialQuoteContext = await searchParams;
  return <LocationPageClient id={id} initialQuoteContext={initialQuoteContext} />;
}
